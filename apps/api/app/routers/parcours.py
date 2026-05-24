import asyncio
import json
import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from ..middleware.auth import verify_jwt
from ..models.symptom import SymptomInput
from ..models.parcours import EtapePatchRequest, ParcoursDB
from ..services.claude_client import stream_parcours
from ..services.rag_service import get_rag_context
from ..services.financial_service import get_remboursement
from ..db.supabase import get_supabase
from ..db.redis import get_redis
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


async def _check_rate_limit(user_id: str) -> None:
    redis = await get_redis()
    key = f"rate:parcours:{user_id}"
    count = await redis.get(key)
    if count and int(count) >= settings.rate_limit_parcours_per_day:
        raise HTTPException(status_code=429, detail="Limite de 10 parcours par jour atteinte")
    pipe = redis.pipeline()
    pipe.incr(key)
    pipe.expire(key, 86400)
    await pipe.execute()


def _format_delai(days: int) -> str:
    if days <= 0:
        return "Immédiatement"
    if days == 1:
        return "Dans les 24h"
    if days <= 2:
        return "Dans les 48h"
    if days <= 7:
        return "Dans la semaine"
    if days <= 14:
        return "Sous 2 semaines"
    if days <= 30:
        return "Sous 1 mois"
    return f"Sous {days} jours"


def _map_hypothese(h: dict) -> dict:
    return {
        "pathologie": h.get("nom", h.get("pathologie", "")),
        "probabilite": h.get("probabilite", 0),
        "description": h.get("explication", h.get("description", "")),
        "alerte": bool(h.get("signes_alarme")) or h.get("alerte", False),
    }


def _map_etape(e: dict, remboursement: float) -> dict:
    days = e.get("delai_recommande_jours")
    delai = _format_delai(int(days)) if days is not None else e.get("delai", "")
    return {
        "index": e.get("index", 0),
        "type_praticien": e.get("type_praticien", ""),
        "motif": e.get("raison", e.get("motif", "")),
        "delai": delai,
        "cout_estime": e.get("cout_estime_eur", e.get("cout_estime", 0)),
        "remboursement_secu": remboursement,
    }


async def _generate_sse(input: SymptomInput, user_id: str):
    rag_context = await get_rag_context(input.symptoms, input.age, input.city)

    urgence = "non_urgent"
    confidence = 1.0
    hypotheses_display: list[dict] = []
    etapes_display: list[dict] = []

    async for line in stream_parcours(input, rag_context):
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            logger.warning("ndjson_parse_error", extra={"line_preview": line[:120]})
            continue

        etype = event.get("event")

        if etype == "urgence_absolue":
            yield f"event: urgence_absolue\ndata: {json.dumps({'message': 'Appelez le 15 immédiatement', 'numero': '15'})}\n\n"
            return

        elif etype == "hypotheses":
            urgence = event.get("urgence", "non_urgent")
            confidence = float(event.get("confidence", 1.0))

            if confidence < 0.60:
                yield f"event: error\ndata: {json.dumps({'code': 'LOW_CONFIDENCE', 'message': 'Vos symptômes sont complexes, nous recommandons une consultation directe'})}\n\n"
                return

            hypotheses_display = [_map_hypothese(h) for h in event.get("hypotheses", [])]
            payload = {"hypotheses": hypotheses_display, "urgence": urgence, "confidence": confidence}
            yield f"event: hypotheses\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"

        elif etype == "etape":
            remboursement = get_remboursement(
                event.get("type_praticien", ""),
                float(event.get("cout_estime_eur", event.get("cout_estime", 0))),
            )
            etape_display = _map_etape(event, remboursement)
            etapes_display.append(etape_display)
            yield f"event: etape\ndata: {json.dumps(etape_display, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.4)

        elif etype == "complete":
            if etapes_display:
                financier = {
                    "cout_total": round(sum(e["cout_estime"] for e in etapes_display), 2),
                    "secu": round(sum(e["remboursement_secu"] for e in etapes_display), 2),
                    "rac": round(sum(e["cout_estime"] - e["remboursement_secu"] for e in etapes_display), 2),
                }
                yield f"event: financier\ndata: {json.dumps(financier)}\n\n"

            parcours_id = str(uuid.uuid4())
            age_range = f"{(input.age // 10) * 10}-{(input.age // 10) * 10 + 10}"

            try:
                supabase = get_supabase()
                supabase.table("parcours").insert({
                    "id": parcours_id,
                    "user_id": user_id,
                    "symptoms_summary": input.symptoms[:100],
                    "age_range": age_range,
                    "city": input.city,
                    "hypotheses": hypotheses_display,
                    "urgence_level": urgence,
                    "ai_confidence": confidence,
                    "etapes": etapes_display,
                    "cout_total_estime": financier["cout_total"] if etapes_display else 0,
                    "rac_estime": financier["rac"] if etapes_display else 0,
                }).execute()
            except Exception as exc:
                logger.error("supabase_save_error", extra={"error": str(exc)})

            logger.info(
                "parcours_generated",
                extra={
                    "parcours_id": parcours_id,
                    "ai_confidence": confidence,
                    "urgence_level": urgence,
                },
            )

            message = event.get("message_utilisateur", "")
            complete_payload = {"parcours_id": parcours_id, "message_utilisateur": message}
            yield f"event: complete\ndata: {json.dumps(complete_payload, ensure_ascii=False)}\n\n"


@router.post("/generate")
async def generate_parcours(
    input: SymptomInput,
    user: dict = Depends(verify_jwt),
):
    user_id = user.get("sub", "")
    await _check_rate_limit(user_id)
    return StreamingResponse(
        _generate_sse(input, user_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{parcours_id}")
async def get_parcours(parcours_id: uuid.UUID, user: dict = Depends(verify_jwt)) -> ParcoursDB:
    user_id = user.get("sub", "")
    supabase = get_supabase()
    result = supabase.table("parcours").select("*").eq("id", str(parcours_id)).single().execute()
    row = result.data
    if not row:
        raise HTTPException(status_code=404, detail="Parcours introuvable")
    if row["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    financier = None
    if row.get("cout_total_estime") is not None:
        secu = row.get("cout_total_estime", 0) - row.get("rac_estime", 0)
        financier = {
            "cout_total": row["cout_total_estime"],
            "secu": round(secu, 2),
            "rac": row["rac_estime"],
        }
    return ParcoursDB(
        id=row["id"],
        created_at=row["created_at"],
        hypotheses=row.get("hypotheses", []),
        urgence=row["urgence_level"],
        etapes=row.get("etapes", []),
        etapes_completees=row.get("etapes_completees", []),
        financier=financier,
        pdf_url=row.get("pdf_url"),
    )


@router.patch("/{parcours_id}/etapes")
async def patch_etapes(
    parcours_id: uuid.UUID,
    body: EtapePatchRequest,
    user: dict = Depends(verify_jwt),
):
    user_id = user.get("sub", "")
    supabase = get_supabase()
    result = supabase.table("parcours").select("*").eq("id", str(parcours_id)).single().execute()
    row = result.data
    if not row:
        raise HTTPException(status_code=404, detail="Parcours introuvable")
    if row["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    etapes: list[dict] = row["etapes"]
    completees: list[int] = row.get("etapes_completees", [])

    if body.action == "add" and body.etape_data:
        etapes.append(body.etape_data.model_dump())
    elif body.action == "remove":
        etapes = [e for e in etapes if e.get("index") != body.etape_index]
    elif body.action == "complete":
        if body.etape_index not in completees:
            completees.append(body.etape_index)
    elif body.action == "skip":
        completees = [i for i in completees if i != body.etape_index]

    supabase.table("parcours").update({
        "etapes": etapes,
        "etapes_completees": completees,
    }).eq("id", str(parcours_id)).execute()

    supabase.table("etape_log").insert({
        "parcours_id": str(parcours_id),
        "etape_index": body.etape_index,
        "action": body.action,
    }).execute()

    return await get_parcours(parcours_id, user)
