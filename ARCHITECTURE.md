# MedRoute — architecture technique

## Vue d'ensemble

```
Utilisateur
    │
    ▼
[Next.js App]  ──────────────────────────────────────────────┐
    │                                                         │
    │ REST + Server Actions                                   │
    ▼                                                         │
[FastAPI Backend]                                             │
    │                                                         │
    ├── [Claude API] ←── [LlamaIndex RAG] ←── [Pinecone]     │
    │        │                                    │           │
    │        │                          [HAS + Ameli data]   │
    │        ▼                                               │
    │   [Parcours JSON]                                       │
    │        │                                               │
    ├── [Supabase DB] ──────────────────────────────────────►│
    │                                                         │
    ├── [Redis Cache]                                         │
    │                                                         │
    └── [Mapbox API] + [Doctolib API (mock)]                  │
                                                              │
[Puppeteer Service] ◄─────────────────────────────────────────┘
    │
    ▼
  PDF
```

---

## Décisions d'architecture (ADR)

### ADR-001 : FastAPI plutôt que Next.js API routes pour le backend IA

**Décision** : Séparer le backend IA dans un service FastAPI indépendant.

**Raison** : Les appels Claude + RAG peuvent durer 5-15 secondes. Next.js API routes ont un timeout de 10s sur Vercel (plan gratuit). FastAPI sur Fly.io n'a pas cette contrainte et permet le streaming de réponse.

**Conséquence** : Deux déploiements à gérer, mais meilleure scalabilité et pas de timeout.

---

### ADR-002 : Supabase plutôt qu'un PostgreSQL nu

**Décision** : Utiliser Supabase comme backend de données.

**Raison** : Auth intégrée, Row-Level Security natif (critique pour les données de santé), SDK TypeScript bien typé, Storage pour les PDFs générés. Économise 2-3 semaines de setup.

**Conséquence** : Dépendance à un service tiers. Acceptable en MVP.

---

### ADR-003 : Pinecone pour les embeddings médicaux

**Décision** : Pinecone comme base vectorielle, Cohere Embed v3 pour les embeddings.

**Raison** : Cohere Embed v3 est multilingue nativement (français correct sans traduction). Pinecone gère bien les namespaces (un par source : `has`, `ameli`, `orphanet`).

**Conséquence** : Coût supplémentaire (~$70/mois à volume faible). Acceptable.

---

### ADR-004 : Streaming des réponses Claude

**Décision** : Utiliser le streaming de l'API Claude pour afficher le parcours au fur et à mesure.

**Raison** : C'est le "wow factor" central du produit. Le parcours se construit devant l'utilisateur comme une installation en temps réel. Sans streaming, l'UX est une attente de 8 secondes suivie d'un affichage brutal.

**Implémentation** : FastAPI stream → Server-Sent Events → React `useEffect` avec `EventSource`.

---

## Flux de données — génération d'un parcours

```
1. Utilisateur soumet le formulaire (symptômes + contexte)

2. Next.js → POST /api/parcours/generate
   Body: { symptoms, age, sex, city, duree, intensite, antecedents }

3. FastAPI valide avec Pydantic → SymptomInput

4. Service AI :
   a. Embed les symptômes (Cohere)
   b. Recherche dans Pinecone (top-5 pathologies similaires)
   c. Construit le prompt avec contexte RAG
   d. Appel Claude avec streaming activé

5. Claude retourne un JSON structuré via streaming :
   {
     hypotheses: [...],
     urgence: "non_urgent" | "urgent" | "absolu",
     parcours: [
       { etape, type_praticien, raison, delai_jours, cout_estime, examens }
     ],
     confidence: 0.87
   }

6. FastAPI stream → SSE → frontend

7. Frontend reçoit les chunks → anime le parcours au fur et à mesure

8. Une fois complet : sauvegarde en DB (Supabase) + lance enrichissement async :
   - Géolocalisation des praticiens (Mapbox)
   - Disponibilités Doctolib (mock en MVP)
   - Calcul financier détaillé

9. UI finale : parcours complet + carte + dashboard financier
```

---

## Schéma de base de données

### Table `users` (gérée par Supabase Auth)
Pas de table custom — on utilise `auth.users` de Supabase.

### Table `parcours`
```sql
CREATE TABLE parcours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Données d'entrée (chiffrées au repos par Supabase)
  symptoms_summary TEXT NOT NULL,  -- résumé non-identifiant
  age_range TEXT,                  -- "20-30", "30-40" etc. (pas l'âge exact)
  city TEXT,

  -- Résultats IA
  hypotheses JSONB NOT NULL,
  urgence_level TEXT NOT NULL CHECK (urgence_level IN ('non_urgent', 'urgent', 'absolu')),
  ai_confidence DECIMAL(3,2),

  -- Parcours
  etapes JSONB NOT NULL,           -- array d'étapes
  etapes_completees JSONB DEFAULT '[]',

  -- Financier
  cout_total_estime DECIMAL(10,2),
  rac_estime DECIMAL(10,2),        -- reste à charge

  -- PDF
  pdf_url TEXT,                    -- URL Supabase Storage

  -- Statut
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'))
);

-- Row Level Security
ALTER TABLE parcours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their own parcours"
  ON parcours FOR ALL
  USING (auth.uid() = user_id);
```

### Table `etape_log`
```sql
CREATE TABLE etape_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcours_id UUID REFERENCES parcours(id) ON DELETE CASCADE,
  etape_index INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('completed', 'skipped', 'added', 'removed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table `praticiens_cache`
```sql
CREATE TABLE praticiens_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_praticien TEXT NOT NULL,
  city TEXT NOT NULL,
  data JSONB NOT NULL,             -- données Doctolib mockées
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX ON praticiens_cache (type_praticien, city);
```

---

## Contrat de données — réponse Claude

Claude doit retourner exclusivement du JSON valide selon ce schéma Pydantic :

```python
class Hypothese(BaseModel):
    nom: str                    # "Lombalgie commune"
    probabilite: float          # 0.0 à 1.0
    explication: str            # vulgarisée, max 100 mots
    signes_alarme: list[str]    # symptômes qui changeraient l'urgence

class Etape(BaseModel):
    index: int
    type_praticien: str         # "Médecin généraliste", "Cardiologue", etc.
    raison: str                 # pourquoi cette étape, max 50 mots
    delai_recommande_jours: int # délai recommandé (pas une urgence médicale)
    cout_estime_eur: float      # fourchette basse
    examens_associes: list[str] # ["ECG", "Prise de sang NFS"]
    optionnel: bool             # peut être sauté

class ParcoursParse(BaseModel):
    hypotheses: list[Hypothese]
    urgence: Literal["non_urgent", "urgent", "absolu"]
    parcours: list[Etape]
    confidence: float
    message_utilisateur: str    # message d'intro vulgarisé
    disclaimer: str             # toujours présent
```

---

## Sécurité

### Données de santé
- Supabase chiffre les données au repos (AES-256) par défaut
- Row Level Security sur toutes les tables — un utilisateur ne peut jamais voir les données d'un autre
- Les logs FastAPI ne doivent JAMAIS contenir de symptômes. Logger uniquement : `parcours_id`, `latency_ms`, `ai_confidence`, `urgence_level`
- Rotation des clés API : quarterly

### API
- Rate limiting : 10 générations de parcours par utilisateur par 24h
- Auth : JWT Supabase validé sur chaque endpoint FastAPI
- CORS : whitelist explicite (pas de `*`)
- Input sanitization : Pydantic v2 avec longueur max sur tous les champs texte libres (symptoms max 2000 chars)

---

## Performance

### Objectifs
- Génération parcours : < 8s (P95)
- Affichage carte praticiens : < 2s
- Génération PDF : < 5s

### Stratégie cache Redis
- Clé : `hash(symptoms_tokens + age_range + city)` — pas les données brutes
- TTL : 24h
- Invalidation : manuelle en cas de mise à jour de la base médicale
- Hit rate attendu : ~30% (les symptômes courants reviennent souvent)

### Optimisations prévues
- Prefetch des praticiens dès que la ville est saisie (avant soumission)
- PDF généré en async après l'affichage du parcours (pas bloquant)
- Streaming SSE pour que l'UI s'anime pendant que le backend calcule
