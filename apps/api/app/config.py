from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # IA
    gemini_api_key: str
    gemini_model: str = "gemini-1.5-flash"
    claude_timeout_seconds: int = 30

    # Supabase (obligatoire)
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # Pinecone + Cohere (optionnel — RAG désactivé si absent)
    pinecone_api_key: Optional[str] = None
    pinecone_index_name: Optional[str] = "medroute-medical"
    pinecone_environment: str = "us-east-1-aws"
    cohere_api_key: Optional[str] = None

    # Redis (optionnel — cache mémoire si absent)
    redis_url: Optional[str] = None
    redis_cache_ttl: int = 86400

    # App
    cors_origins: list[str] = ["http://localhost:3000", "https://medroute.app"]
    rate_limit_parcours_per_day: int = 10
    environment: str = "development"
    port: int = 8000
    log_level: str = "DEBUG"

    use_live_doctolib: bool = False
    use_live_ameli: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
