from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/promptshield"
    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_deployment: str = "gpt-4o-mini"
    environment: str = "development"
    log_level: str = "INFO"
    # Comma-separated list of allowed CORS origins for production.
    # e.g. "https://promptshield.vercel.app,https://promptshield-git-main-team.vercel.app"
    allowed_origins: str = ""

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cors_origins(self) -> list[str]:
        if not self.is_production:
            return ["*"]
        if self.allowed_origins:
            return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]
        return []


settings = Settings()
