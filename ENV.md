# MedRoute — variables d'environnement

## Comment utiliser ce fichier

1. Copier `.env.example` en `.env.local` (frontend) et `apps/api/.env` (backend)
2. Remplir les valeurs réelles (jamais committer les fichiers `.env`)
3. Pour l'équipe : partager via un gestionnaire de secrets (1Password, Doppler)

---

## Frontend — `apps/web/.env.local`

```bash
# ─── Supabase ───────────────────────────────────────────────────────────────
# URL de ton projet Supabase (visible dans Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co

# Clé publique Supabase (anon key — safe côté client)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ─── Mapbox ─────────────────────────────────────────────────────────────────
# Token public Mapbox pour les cartes
# Créer sur https://account.mapbox.com/
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoibWVkcm91dGUiLCJhIjoiY...

# ─── API Backend ────────────────────────────────────────────────────────────
# URL de l'API FastAPI
# Dev : http://localhost:8000
# Prod : https://api.medroute.app
NEXT_PUBLIC_API_URL=http://localhost:8000

# ─── Feature flags ──────────────────────────────────────────────────────────
# Activer les vraies APIs (Doctolib, etc.) ou utiliser les mocks
# En dev : toujours false
NEXT_PUBLIC_USE_LIVE_APIS=false

# Activer les analytics (désactiver en dev)
NEXT_PUBLIC_ANALYTICS_ENABLED=false
```

---

## Backend — `apps/api/.env`

```bash
# ─── Claude / Anthropic ─────────────────────────────────────────────────────
# Clé API Anthropic
# Obtenir sur https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-api03-...

# Modèle à utiliser (ne pas changer sans raison)
CLAUDE_MODEL=claude-sonnet-4-6

# Timeout en secondes pour les appels Claude
CLAUDE_TIMEOUT_SECONDS=30

# ─── Supabase ───────────────────────────────────────────────────────────────
# URL du projet Supabase
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co

# Clé service role (accès complet — NE JAMAIS exposer côté client)
# Obtenir dans Supabase > Settings > API > service_role key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ─── Pinecone ───────────────────────────────────────────────────────────────
# Clé API Pinecone
# Obtenir sur https://app.pinecone.io/
PINECONE_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Nom de l'index Pinecone (créer avant de lancer)
PINECONE_INDEX_NAME=medroute-medical

# Environnement Pinecone
PINECONE_ENVIRONMENT=us-east-1-aws

# ─── Cohere ─────────────────────────────────────────────────────────────────
# Clé API Cohere pour les embeddings
# Obtenir sur https://dashboard.cohere.com/
COHERE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ─── Redis ──────────────────────────────────────────────────────────────────
# URL Redis
# Dev : redis://localhost:6379
# Prod : redis://default:password@host:6379
REDIS_URL=redis://localhost:6379

# TTL du cache en secondes (24h = 86400)
REDIS_CACHE_TTL=86400

# ─── Sécurité ───────────────────────────────────────────────────────────────
# Secret JWT pour validation côté backend (copier depuis Supabase > Settings > JWT Secret)
SUPABASE_JWT_SECRET=your-jwt-secret

# Origines CORS autorisées (séparées par des virgules)
CORS_ORIGINS=http://localhost:3000,https://medroute.app

# ─── Rate limiting ───────────────────────────────────────────────────────────
# Nombre max de générations de parcours par utilisateur par 24h
RATE_LIMIT_PARCOURS_PER_DAY=10

# ─── Environnement ──────────────────────────────────────────────────────────
# "development" | "staging" | "production"
ENVIRONMENT=development

# Port d'écoute FastAPI
PORT=8000

# ─── Logging ────────────────────────────────────────────────────────────────
# Niveau de log : DEBUG | INFO | WARNING | ERROR
LOG_LEVEL=DEBUG

# ─── APIs externes (désactivées en dev) ──────────────────────────────────────
# Activer les vraies APIs ou utiliser les mocks
USE_LIVE_DOCTOLIB=false
USE_LIVE_AMELI=false

# Clé API Doctolib (uniquement si USE_LIVE_DOCTOLIB=true)
# DOCTOLIB_API_KEY=

# ─── Puppeteer / PDF ─────────────────────────────────────────────────────────
# Chemin vers l'exécutable Chromium (laisser vide pour auto-detect)
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# URL du service de rendu PDF (si externalisé)
# PDF_SERVICE_URL=http://localhost:3001
```

---

## Secrets à ne jamais committer

Les fichiers suivants sont dans `.gitignore` — vérifier qu'ils y sont bien :

```
.env
.env.local
.env.production
.env.staging
apps/api/.env
apps/web/.env.local
```

---

## Setup rapide en dev (valeurs minimales)

Pour démarrer le projet en local avec les mocks, seuls ces secrets sont nécessaires :

1. `ANTHROPIC_API_KEY` — obligatoire même en dev
2. `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
3. `PINECONE_API_KEY` + `PINECONE_INDEX_NAME`
4. `COHERE_API_KEY`
5. `NEXT_PUBLIC_MAPBOX_TOKEN`

Tout le reste peut rester aux valeurs par défaut du fichier `.env.example`.
