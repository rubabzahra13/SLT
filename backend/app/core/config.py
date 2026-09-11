import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
root_dir = os.path.dirname(backend_dir)

class Settings(BaseSettings):
    PROJECT_NAME: str = "SLT CRM Backend"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api"

    # Database
    DATABASE_URL: str = ""
    SUPABASE_DIRECT_CONNECTION_STRING: str = ""

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://slt-teal.vercel.app",
        "https://slt-nuzhat-rubab-zahras-projects.vercel.app",
    ]

    # Google OAuth Configuration
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8001/api/pilot2/inboxes/oauth/callback"
    FRONTEND_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=[
            os.path.join(root_dir, ".env"),
            os.path.join(backend_dir, ".env"),
        ],
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
        # Vercel/serverless cannot use Supabase direct :5432 — prefer pooler :6543.
        if os.getenv("VERCEL") and url and "pooler.supabase.com" not in url:
            url = url.replace(
                "postgresql://postgres:",
                "postgresql://postgres.fqjwjiltizsjzrinoiwv:",
            ).replace(
                "@db.fqjwjiltizsjzrinoiwv.supabase.co:5432/",
                "@aws-0-us-east-1.pooler.supabase.com:5432/",
            )
        if url and "sslmode=" not in url:
            separator = "&" if "?" in url else "?"
            url = f"{url}{separator}sslmode=require"
        return url

settings = Settings()
