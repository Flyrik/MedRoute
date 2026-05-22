from fastapi import APIRouter
from ..db.supabase import get_supabase
from ..db.redis import get_redis

router = APIRouter()


@router.get("/health")
async def health():
    deps: dict[str, str] = {}

    try:
        get_supabase()
        deps["supabase"] = "ok"
    except Exception:
        deps["supabase"] = "error"

    try:
        redis = await get_redis()
        await redis.ping()
        deps["redis"] = "ok"
    except Exception:
        deps["redis"] = "error"

    return {"status": "ok", "version": "0.1.0", "dependencies": deps}
