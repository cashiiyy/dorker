import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "SearchLens AI"
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
    
    # Database
    DATABASE_URL: str = "sqlite:///./searchlens.db"
    
    # Preview constraints
    PREVIEW_MAX_BYTES: int = 512 * 1024  # 512 KB
    PREVIEW_TIMEOUT_SECONDS: float = 6.0
    PREVIEW_MAX_REDIRECTS: int = 3

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
