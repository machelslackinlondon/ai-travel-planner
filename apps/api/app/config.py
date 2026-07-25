from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def default_catalog_path() -> str:
    return str(Path(__file__).resolve().parents[3] / "libs/catalog/seed/items.json")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    environment: str = Field(default="development", validation_alias="ENVIRONMENT")
    demo_mode: bool = Field(default=True, validation_alias="DEMO_MODE")
    cors_origins: str = Field(default="http://localhost:3000,http://127.0.0.1:3000", validation_alias="CORS_ORIGINS")
    catalog_path: str = Field(default_factory=default_catalog_path, validation_alias="CATALOG_PATH")

    mongodb_uri: str | None = Field(default=None, validation_alias="MONGODB_URI")
    mongodb_database: str = Field(default="visit_jamaica", validation_alias="MONGODB_DATABASE")

    elasticsearch_url: str | None = Field(default=None, validation_alias="ELASTICSEARCH_URL")
    elasticsearch_api_key: str | None = Field(default=None, validation_alias="ELASTICSEARCH_API_KEY")
    elasticsearch_username: str | None = Field(default=None, validation_alias="ELASTICSEARCH_USERNAME")
    elasticsearch_password: str | None = Field(default=None, validation_alias="ELASTICSEARCH_PASSWORD")
    elasticsearch_index: str = Field(default="visit-jamaica-content", validation_alias="ELASTICSEARCH_INDEX")
    elasticsearch_auto_index: bool = Field(default=False, validation_alias="ELASTICSEARCH_AUTO_INDEX")
    search_admin_key: str | None = Field(default=None, validation_alias="SEARCH_ADMIN_KEY")

    ai_enabled: bool = Field(default=False, validation_alias="AI_ENABLED")
    ai_gateway_api_key: str | None = Field(default=None, validation_alias="AI_GATEWAY_API_KEY")
    ai_model: str = Field(default="openai/gpt-4o-mini", validation_alias="AI_MODEL")
    ai_timeout_ms: int = Field(default=4500, ge=250, le=30_000, validation_alias="AI_TIMEOUT_MS")
    ai_max_daily_calls: int = Field(default=100, ge=0, validation_alias="AI_MAX_DAILY_CALLS")
    ai_max_session_calls_per_hour: int = Field(default=3, ge=0, validation_alias="AI_MAX_SESSION_CALLS_PER_HOUR")
    event_max_session_calls_per_hour: int = Field(default=30, ge=0, validation_alias="EVENT_MAX_SESSION_CALLS_PER_HOUR")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
