import logging
import redis.asyncio as aioredis
from ..config import settings

logger = logging.getLogger(__name__)

_pool: aioredis.Redis | None = None
_use_memory = False


class _MemoryPipeline:
    def __init__(self, store: dict):
        self._store = store
        self._ops: list = []

    def incr(self, key: str):
        self._ops.append(("incr", key))
        return self

    def expire(self, key: str, ttl: int):
        self._ops.append(("expire", key, ttl))
        return self

    async def execute(self):
        results = []
        for op in self._ops:
            if op[0] == "incr":
                val = int(self._store.get(op[1], 0)) + 1
                self._store[op[1]] = str(val)
                results.append(val)
            elif op[0] == "expire":
                results.append(True)
        return results


class _MemoryRedis:
    """In-memory Redis stub — utilisé quand Redis n'est pas configuré."""

    def __init__(self):
        self._store: dict = {}

    async def get(self, key: str):
        return self._store.get(key)

    async def set(self, key: str, value: str):
        self._store[key] = value

    async def setex(self, key: str, ttl: int, value: str):
        self._store[key] = value

    def pipeline(self):
        return _MemoryPipeline(self._store)

    async def aclose(self):
        pass


_memory_redis = _MemoryRedis()


async def get_redis() -> aioredis.Redis | _MemoryRedis:
    global _pool, _use_memory

    if _use_memory:
        return _memory_redis

    if _pool is not None:
        return _pool

    if not settings.redis_url:
        logger.warning("Redis non configuré — cache mémoire activé")
        _use_memory = True
        return _memory_redis

    try:
        _pool = aioredis.from_url(settings.redis_url, decode_responses=True)
        await _pool.ping()
        return _pool
    except Exception:
        logger.warning("Connexion Redis échouée — cache mémoire activé")
        _use_memory = True
        return _memory_redis


async def close_redis() -> None:
    global _pool
    if _pool:
        await _pool.aclose()
        _pool = None
