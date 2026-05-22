from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    anthropic_api_key: str
    claude_model: str = "claude-sonnet-4-6"
    claude_timeout_seconds: int = 30

    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    pinecone_api_key: str
    pinecone_index_name: str
    pinecone_environment: str = "us-east-1-aws"

    cohere_api_key: str

    redis_url: str = "redis://localhost:6379"
    redis_cache_ttl: int = 86400

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
