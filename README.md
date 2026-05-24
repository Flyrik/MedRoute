# MedRoute 🗺️

**Le GPS du parcours de soin** — Décrivez vos symptômes en langage naturel, obtenez en quelques secondes un parcours personnalisé avec les bons spécialistes, dans le bon ordre, et le coût estimé.

> ⚠️ MedRoute ne remplace pas un avis médical. En cas d'urgence, appelez le **15**.

---

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Auth & DB | Supabase (PostgreSQL + Auth + RLS) |
| Backend | FastAPI, Python 3.9+, Uvicorn |
| IA | Claude API (streaming SSE), LlamaIndex RAG |
| Vecteurs | Pinecone + Cohere Embed v3 |
| Carte | Mapbox GL JS |
| Cache | Redis (24h TTL) |
| Déploiement | Vercel (frontend) + Fly.io (backend) |

## Structure

```
apps/
  web/        # Next.js frontend (Vercel)
  api/        # FastAPI backend (Fly.io) — en cours
packages/     # types partagés (optionnel)
```

## Lancer en local

### Frontend

```bash
cd apps/web
cp .env.example .env.local   # remplir les clés
pnpm install
pnpm dev                     # http://localhost:3000
```

### Backend (une fois créé)

```bash
cd apps/api
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000
```

## Variables d'environnement

Voir `apps/web/.env.example` pour la liste complète.

Clés minimum pour faire tourner le frontend :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Fonctionnement

```
Formulaire symptômes
  → POST /parcours/generate (FastAPI)
  → Cohere embed → Pinecone RAG (HAS, Ameli, Orphanet)
  → Claude streaming → events SSE
  → UI animée étape par étape
  → Sauvegarde Supabase
```

Les events SSE arrivent dans cet ordre :
`hypotheses` → `etape` (×N) → `financier` → `complete`

## Règles médicales (non négociables)

- `urgence = absolu` → écran rouge immédiat + "Appelez le 15", stream coupé
- Jamais le mot "diagnostic" dans l'UI
- Disclaimer toujours visible
- Logs : jamais de symptômes — uniquement `parcours_id`, `latency_ms`, `ai_confidence`

## Roadmap

- [x] Landing page + Auth (Supabase)
- [x] Dashboard parcours
- [x] Formulaire symptômes (3 étapes, Zod)
- [x] Page résultat + animation SSE
- [x] Hook `useParcoursStream`
- [ ] Backend FastAPI
- [ ] Carte Mapbox praticiens
- [ ] Export PDF

## Licence

Projet privé — tous droits réservés.
