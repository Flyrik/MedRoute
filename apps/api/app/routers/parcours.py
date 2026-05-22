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
from ..services.financial_service import calculate_financier
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


async def _generate_sse(input: SymptomInput, user_id: str):
    rag_context = await get_rag_context(input.symptoms, input.age, input.city)
    accumulated = ""

    async for chunk in stream_parcours(input, rag_context):
        accumulated += chunk

    try:
        data = json.loads(accumulated)
    except json.JSONDecodeError:
        yield f"event: error\ndata: {json.dumps({'code': 'PARSE_ERROR', 'message': 'Erreur de génération'})}\n\n"
        return

    urgence = data.get("urgence", "non_urgent")

    if urgence == "absolu":
        yield f"event: urgence_absolue\ndata: {json.dumps({'message': 'Appelez le 15 immédiatement', 'numero': '15'})}\n\n"
        return

    confidence = data.get("confidence", 1.0)
    if confidence < 0.60:
        yield f"event: error\ndata: {json.dumps({'code': 'LOW_CONFIDENCE', 'message': 'Vos symptômes sont complexes, nous recommandons une consultation directe'})}\n\n"
        return

    yield f"event: hypotheses\ndata: {json.dumps({'hypotheses': data.get('hypotheses', []), 'urgence': urgence, 'confidence': confidence}, ensure_ascii=False)}\n\n"

    for etape in data.get("parcours", []):
        yield f"event: etape\ndata: {json.dumps(etape, ensure_ascii=False)}\n\n"

    financier = calculate_financier([e for e in data.get("parcours", [])])
    yield f"event: financier\ndata: {json.dumps(financier)}\n\n"

    parcours_id = str(uuid.uuid4())
    age_range = f"{(input.age // 10) * 10}-{(input.age // 10) * 10 + 10}"
    supabase = get_supabase()
    supabase.table("parcours").insert({
        "id": parcours_id,
        "user_id": user_id,
        "symptoms_summary": input.symptoms[:100],
        "age_range": age_range,
        "city": input.city,
        "hypotheses": data.get("hypotheses", []),
        "urgence_level": urgence,
        "ai_confidence": confidence,
        "etapes": data.get("parcours", []),
        "cout_total_estime": financier["cout_total"],
        "rac_estime": financier["rac"],
    }).execute()

    logger.info(
        "parcours_generated",
        extra={
            "parcours_id": parcours_id,
            "ai_confidence": confidence,
            "urgence_level": urgence,
            "latency_ms": 0,
        },
    )

    message = data.get("message_utilisateur", "")
    yield f"event: complete\ndata: {json.dumps({'parcours_id': parcours_id, 'message_utilisateur': message}, ensure_ascii=False)}\n\n"


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
        financier = {
            "cout_total": row["cout_total_estime"],
            "secu": 0,
            "rac": row["rac_estime"],
        }
    return ParcoursDB(
        id=row["id"],
        created_at=row["created_at"],
        hypotheses=row["hypotheses"],
        urgence=row["urgence_level"],
        etapes=row["etapes"],
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
