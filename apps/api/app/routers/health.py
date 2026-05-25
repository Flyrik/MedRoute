import jwt as pyjwt
from fastapi import APIRouter, Request
from ..db.supabase import get_supabase
from ..db.redis import get_redis
from ..config import settings

router = APIRouter()


@router.get("/health")
async def health():
    deps: dict[str, str] = {}

    try:
        client = get_supabase()
        client.table("parcours").select("id").limit(1).execute()
        deps["supabase"] = "ok"
    except Exception as e:
        deps["supabase"] = f"error: {e}"

    try:
        redis = await get_redis()
        await redis.ping()
        deps["redis"] = "ok"
    except Exception:
        deps["redis"] = "error"

    return {"status": "ok", "version": "0.1.0", "dependencies": deps}


@router.post("/debug/token")
async def debug_token(request: Request):
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "")
    if not token:
        return {"error": "Pas de token"}
    header = pyjwt.get_unverified_header(token)
    unverified = pyjwt.decode(token, options={"verify_signature": False})
    try:
        verified = pyjwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"], options={"verify_aud": False})
        return {"header": header, "payload": unverified, "verified": True}
    except Exception as e:
        return {"header": header, "payload": unverified, "verified": False, "error": str(e)}
