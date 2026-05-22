# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

`apps/web` is scaffolded (Next.js 16, React 19, Tailwind v4, TypeScript strict). `apps/api` (FastAPI) has not been created yet. Architecture, API contracts, and database schemas are fully documented in [ARCHITECTURE.md](ARCHITECTURE.md), [API.md](API.md), and [ROADMAP.md](ROADMAP.md).

## What MedRoute Is

"GPS du parcours de soin" — users describe symptoms in natural language, Claude generates a personalized care pathway (parcours) with step-by-step animation, practitioner map, and financial breakdown. The core UX differentiator is real-time SSE streaming that builds the parcours visually, step by step.

## Monorepo Structure

```
apps/
  web/          # Next.js 16 + React 19 frontend (Vercel) — scaffolded
  api/          # FastAPI backend (Fly.io) — not yet created
packages/       # shared types (optional)
```

`apps/web` uses the Next.js App Router (`app/` directory). Path alias `@/*` resolves to `apps/web/*`.

## Development Commands

**Frontend** (`apps/web/`):
```bash
pnpm dev          # Next.js dev server (localhost:3000)
pnpm build        # production build
pnpm lint         # ESLint
```
Note: `type-check` script is not yet in `apps/web/package.json` — add `"type-check": "tsc --noEmit"` when setting up CI.

**Backend** (`apps/api/`) — once created:
```bash
uvicorn app.main:app --reload   # FastAPI dev server (localhost:8000)
pytest                          # run tests
```

**Monorepo root**:
```bash
pnpm install      # install all workspaces
pnpm -r dev       # run all dev servers
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript strict, Tailwind CSS v4, Framer Motion |
| UI | shadcn/ui style, Inter font, green accent `#1D9E75` |
| Visualization | D3.js (timeline/charts), Mapbox GL JS (practitioner map) |
| Forms | Zod validation |
| Streaming | `EventSource` SSE → `useParcoursStream` hook |
| Backend | FastAPI, Python 3.9+, Pydantic v2, Uvicorn |
| AI | Claude API (streaming), LlamaIndex RAG, Cohere Embed v3 |
| Vector DB | Pinecone (namespaces: `has`, `ameli`, `orphanet`) |
| Database | Supabase (PostgreSQL + Auth + RLS + Storage) |
| Cache | Redis (24h TTL, key = hash of symptom tokens + age range + city) |
| PDF | Puppeteer (separate Node service) |
| Monitoring | Sentry (both), Langfuse (Claude tracing) |

## Architecture Decision Records

**ADR-001**: FastAPI is separate from Next.js API routes because Claude+RAG calls take 5-15s and Vercel's free plan has a 10s timeout. FastAPI on Fly.io supports streaming with no timeout.

**ADR-002**: Supabase instead of bare PostgreSQL — integrated auth, native RLS (critical for health data), typed TS SDK, built-in Storage for PDFs.

**ADR-003**: Pinecone + Cohere Embed v3 — multilingual natively (correct French without translation). RAG sources: HAS, Ameli, Orphanet only (no PubMed in MVP).

**ADR-004**: Streaming SSE is the core "wow factor". FastAPI streams → SSE → React `EventSource` → parcours animates step by step (400ms between steps).

## Data Flow

```
SymptomForm → POST /parcours/generate → FastAPI
  → Cohere embed symptoms → Pinecone (top-5 similar pathologies)
  → Build prompt with RAG context → Claude (streaming)
  → SSE events: hypotheses → etape → etape → financier → complete
  → Supabase DB save + async: Mapbox geocoding + Doctolib (mock) + financial calc
```

## Key Pydantic Models (Backend)

```python
class SymptomInput(BaseModel):
    symptoms: str        # 10-2000 chars
    age: int             # 1-120
    sexe: Literal["homme", "femme", "autre"]
    city: str            # max 100 chars
    duree_jours: int | None
    intensite: int | None  # 1-10
    antecedents: list[str] | None  # max 20
    mutuelle: str | None

class ParcoursParse(BaseModel):
    hypotheses: list[Hypothese]
    urgence: Literal["non_urgent", "urgent", "absolu"]
    parcours: list[Etape]
    confidence: float
    message_utilisateur: str
    disclaimer: str  # always present
```

## SSE Event Format

```
event: hypotheses
data: {"hypotheses": [...], "urgence": "non_urgent", "confidence": 0.87}

event: etape
data: {"index": 0, "type_praticien": "Médecin généraliste", ...}

event: financier
data: {"cout_total": 340.50, "secu": 180.00, "rac": 160.50}

event: complete
data: {"parcours_id": "uuid", "message_utilisateur": "..."}

event: urgence_absolue     # closes stream immediately, no parcours generated
data: {"message": "Appelez le 15 immédiatement", "numero": "15"}
```

## Database Schema (Supabase)

Three tables: `parcours`, `etape_log`, `praticiens_cache`. Full SQL in [ARCHITECTURE.md](ARCHITECTURE.md). All tables have Row Level Security enabled — users can only access their own data via `auth.uid() = user_id`.

## Environment Setup

Minimum required secrets to run locally (all others default in `.env.example`):
1. `ANTHROPIC_API_KEY`
2. `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
3. `PINECONE_API_KEY` + `PINECONE_INDEX_NAME`
4. `COHERE_API_KEY`
5. `NEXT_PUBLIC_MAPBOX_TOKEN`

Copy `ENV.md` templates to `apps/web/.env.local` and `apps/api/.env`. Never commit `.env` files.

## Critical Business Rules

**Medical safety** (non-negotiable):
- `urgence = "absolu"` → immediately show full-screen red UI with "Appelez le 15", close SSE stream, no parcours generated
- Never use the word "diagnostic" anywhere in the UI
- Always show disclaimer: "MedRoute ne remplace pas un avis médical"
- If AI confidence < 60%: show "Vos symptômes sont complexes, nous recommandons une consultation directe"

**Health data** (RGPD + HDS compliance):
- Logs must **never** contain symptoms or health data — log only: `parcours_id`, `latency_ms`, `ai_confidence`, `urgence_level`
- Rate limit: 10 parcours generations per user per 24h
- CORS whitelist: `localhost:3000` and `medroute.app` only (never `*`)
- Input max: symptoms 2000 chars, `antecedents` max 20 items

## Claude System Prompt (reference)

The system prompt for parcours generation is in [ROADMAP.md](ROADMAP.md) under "Prompts Claude". Key: Claude must respond with valid JSON only (no markdown wrapper), using exclusively HAS/Ameli RAG context, in accessible French for non-medical users.

## Performance Targets

- Parcours generation: < 8s P95
- Practitioner map: < 2s
- PDF generation: < 5s (async, non-blocking)
- Redis cache hit rate target: ~30% (common symptoms recur)

## Definition of Done

A feature is done when: merged to `main` via reviewed PR, CI passes (lint + typecheck), functional in production/staging, no health data appears in logs.
