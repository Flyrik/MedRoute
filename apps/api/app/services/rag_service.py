import hashlib
import json
import logging
import cohere
from pinecone import Pinecone
from ..config import settings
from ..db.redis import get_redis

logger = logging.getLogger(__name__)

NAMESPACES = ["has", "ameli", "orphanet"]
TOP_K = 5


def _cache_key(symptoms: str, age_range: str, city: str) -> str:
    raw = f"{symptoms}|{age_range}|{city}"
    return f"rag:{hashlib.sha256(raw.encode()).hexdigest()}"


def _age_range(age: int) -> str:
    bucket = (age // 10) * 10
    return f"{bucket}-{bucket + 10}"


async def get_rag_context(symptoms: str, age: int, city: str) -> str:
    cache_key = _cache_key(symptoms, _age_range(age), city)
    redis = await get_redis()

    cached = await redis.get(cache_key)
    if cached:
        return cached

    co = cohere.Client(settings.cohere_api_key)
    embed_response = co.embed(
        texts=[symptoms],
        model="embed-multilingual-v3.0",
        input_type="search_query",
    )
    vector = embed_response.embeddings[0]

    pc = Pinecone(api_key=settings.pinecone_api_key)
    index = pc.Index(settings.pinecone_index_name)

    chunks: list[str] = []
    for ns in NAMESPACES:
        results = index.query(
            vector=vector,
            top_k=TOP_K,
            namespace=ns,
            include_metadata=True,
        )
        for match in results.matches:
            if match.metadata and "text" in match.metadata:
                chunks.append(match.metadata["text"])

    context = "\n\n---\n\n".join(chunks)
    await redis.setex(cache_key, settings.redis_cache_ttl, context)
    return context
