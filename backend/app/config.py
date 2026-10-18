import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ENV_PATH = PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    APP_NAME: str = "DORKER"
    APP_VERSION: str = "1.0.0"
    APP_TAGLINE: str = "Think. Dork. Discover."
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    
    # LM Studio settings
    LM_STUDIO_BASE_URL: str = "http://127.0.0.1:1234/v1"
    LM_STUDIO_MODEL: str = "qwen3.5-9b-uncensored-hauhaucs-aggressive"
    LM_STUDIO_TIMEOUT_SECONDS: float = 15.0
    
    # SERP API Settings
    SERP_PROVIDER: str = "serpapi"
    SERPAPI_API_KEY: str = ""
    SERP_RESULT_LIMIT: int = 10
    
    # Discord Integration
    DISCORD_WEBHOOK_URL: str = ""
    DISCORD_ENABLED: bool = True
    DISCORD_MAX_RESULTS_PER_MSG: int = 5
    
    # Database
    DATABASE_URL: str = "sqlite:///./searchlens.db" if (PROJECT_ROOT / "searchlens.db").exists() else "sqlite:///./dorker.db"
    
    # Preview constraints
    PREVIEW_MAX_BYTES: int = 512 * 1024  # 512 KB
    PREVIEW_TIMEOUT_SECONDS: float = 6.0
    PREVIEW_MAX_REDIRECTS: int = 3

    model_config = SettingsConfigDict(
        env_file=[str(ENV_PATH), ".env"],
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

