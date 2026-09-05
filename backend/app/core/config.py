import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "SLT CRM Backend"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api"

    # Database
    DATABASE_URL: str = ""
    SUPABASE_DIRECT_CONNECTION_STRING: str = ""

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "..", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def get_database_url(self) -> str:
        url = self.DATABASE_URL or self.SUPABASE_DIRECT_CONNECTION_STRING
        if not url:
            # Fallback check directly from os.environ
            url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DIRECT_CONNECTION_STRING", "")
        # Remove surrounding brackets if present in password string
        if "postgresql://" in url and ":[" in url and "]@" in url:
            url = url.replace(":[", ":").replace("]@ ", "@").replace("]@", "@")
        return url

settings = Settings()
