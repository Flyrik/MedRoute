# MedRoute — contrat API

## Base URL
- Dev : `http://localhost:8000`
- Prod : `https://api.medroute.app`

## Authentification
Tous les endpoints (sauf `/health`) requièrent un header `Authorization: Bearer <supabase_jwt>`.

Le token JWT est obtenu via Supabase Auth côté frontend et passé à chaque requête.

---

## Endpoints

### POST `/parcours/generate`
Génère un parcours de soin à partir des symptômes. Réponse en streaming SSE.

**Request body**
```json
{
  "symptoms": "Douleur thoracique à l'effort depuis 2 semaines, essoufflement",
  "age": 45,
  "sexe": "homme",
  "city": "Paris",
  "duree_jours": 14,
  "intensite": 6,
  "antecedents": ["hypertension", "cholesterol"],
  "mutuelle": "Mutuelle Générale"
}
```

**Validation**
- `symptoms` : string, 10-2000 chars, requis
- `age` : integer, 1-120, requis
- `sexe` : "homme" | "femme" | "autre", requis
- `city` : string, max 100 chars, requis
- `duree_jours` : integer, 0-3650, optionnel
- `intensite` : integer, 1-10, optionnel
- `antecedents` : array of strings, max 20 items, optionnel
- `mutuelle` : string, max 100 chars, optionnel

**Response** : Server-Sent Events stream

Format des events SSE :
```
event: hypotheses
data: {"hypotheses": [...], "urgence": "non_urgent", "confidence": 0.87}

event: etape
data: {"index": 0, "type_praticien": "Médecin généraliste", "raison": "...", ...}

event: etape
data: {"index": 1, "type_praticien": "Cardiologue", ...}

event: financier
data: {"cout_total": 340.50, "secu": 180.00, "rac": 160.50}

event: complete
data: {"parcours_id": "uuid", "message_utilisateur": "..."}

event: error
data: {"code": "LOW_CONFIDENCE", "message": "Vos symptômes sont complexes..."}
```

**Cas d'urgence absolue**
Si `urgence = "absolu"` dans les hypothèses, le stream envoie immédiatement :
```
event: urgence_absolue
data: {"message": "Appelez le 15 immédiatement", "numero": "15"}
```
Puis ferme la connexion. Aucun parcours n'est généré.

---

### GET `/parcours/{parcours_id}`
Récupère un parcours existant.

**Response 200**
```json
{
  "id": "uuid",
  "created_at": "2025-05-21T10:00:00Z",
  "hypotheses": [...],
  "urgence": "non_urgent",
  "etapes": [...],
  "etapes_completees": [0, 2],
  "financier": {
    "cout_total": 340.50,
    "secu": 180.00,
    "rac": 160.50
  },
  "pdf_url": "https://storage.supabase.co/..."
}
```

**Erreurs**
- `404` : parcours non trouvé
- `403` : parcours appartient à un autre utilisateur

---

### PATCH `/parcours/{parcours_id}/etapes`
Modifie les étapes d'un parcours (ajout, suppression, réordonnancement).

**Request body**
```json
{
  "action": "add" | "remove" | "complete" | "skip",
  "etape_index": 2,
  "etape_data": {
    "type_praticien": "Kinésithérapeute",
    "raison": "Rééducation",
    "delai_recommande_jours": 30,
    "cout_estime_eur": 25.0,
    "examens_associes": [],
    "optionnel": true
  }
}
```

**Response 200** : parcours mis à jour complet (même format que GET)

---

### POST `/parcours/{parcours_id}/pdf`
Déclenche la génération du PDF (async). Retourne immédiatement.

**Response 202**
```json
{
  "job_id": "uuid",
  "status": "processing"
}
```

Polling sur `GET /pdf/status/{job_id}` :
```json
{
  "status": "processing" | "ready" | "error",
  "pdf_url": "https://storage.supabase.co/..."  // présent si status=ready
}
```

---

### GET `/praticiens`
Récupère les praticiens disponibles pour une spécialité et une ville.

**Query params**
- `type` : string, requis (ex: "Cardiologue")
- `city` : string, requis
- `lat` : float, optionnel (pour trier par distance)
- `lng` : float, optionnel

**Response 200**
```json
{
  "praticiens": [
    {
      "id": "mock_001",
      "nom": "Dr. Sophie Martin",
      "specialite": "Cardiologue",
      "secteur": 1,
      "adresse": "12 rue de Rivoli, 75001 Paris",
      "lat": 48.8566,
      "lng": 2.3522,
      "prochain_rdv": "2025-05-28",
      "delai_jours": 7,
      "doctolib_url": "https://doctolib.fr/..."
    }
  ],
  "source": "mock",  // "mock" en dev, "live" en prod
  "cached": true
}
```

---

### GET `/health`
Healthcheck (pas d'auth requise).

**Response 200**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "dependencies": {
    "supabase": "ok",
    "redis": "ok",
    "pinecone": "ok",
    "claude": "ok"
  }
}
```

---

## Codes d'erreur

| Code | HTTP | Description |
|------|------|-------------|
| `INVALID_INPUT` | 422 | Validation Pydantic échouée |
| `URGENCE_ABSOLUE` | 200 (SSE) | Symptômes d'urgence absolue détectés |
| `LOW_CONFIDENCE` | 200 (SSE) | Confiance IA < 60% |
| `AI_TIMEOUT` | 504 | Claude n'a pas répondu dans les 30s |
| `RATE_LIMIT` | 429 | > 10 parcours en 24h |
| `UNAUTHORIZED` | 401 | Token JWT invalide ou expiré |
| `NOT_FOUND` | 404 | Ressource inexistante |
| `FORBIDDEN` | 403 | Accès refusé (RLS violation) |

---

## Headers CORS

```
Access-Control-Allow-Origin: https://medroute.app, http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```
