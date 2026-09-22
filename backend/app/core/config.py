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
        if not url:
            return ""
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        # Remove surrounding brackets if present in password string
        if "postgresql://" in url and ":[" in url and "]@" in url:
            url = url.replace(":[", ":").replace("]@ ", "@").replace("]@", "@")

        # Convert direct Supabase IPv6-only host to IPv4 pooler host for Vercel compatibility
        if "db.fqjwjiltizsjzrinoiwv.supabase.co" in url:
            url = url.replace("db.fqjwjiltizsjzrinoiwv.supabase.co", "aws-0-ap-southeast-2.pooler.supabase.com")
            if "postgresql://postgres:" in url:
                url = url.replace("postgresql://postgres:", "postgresql://postgres.fqjwjiltizsjzrinoiwv:", 1)

        if "sslmode=" not in url:
            separator = "&" if "?" in url else "?"
            url = f"{url}{separator}sslmode=require"
        return url

    def get_runtime_database_url(self) -> str:
        """URL used by the live API engine.

        Prefer Supabase's TRANSACTION pooler (port 6543) over SESSION mode
        (port 5432). Session mode pins one Postgres backend per client for the
        whole connection lifetime and is capped at ~15 clients, which we exhaust
        under uvicorn --reload + a bounded SQLAlchemy pool. Transaction mode
        multiplexes many short, request-scoped connections onto a few backends,
        which is the correct mode for a stateless HTTP API.

        Migrations still use get_database_url() (session/direct) because DDL and
        advisory locks are not safe over the transaction pooler.
        """
        # Explicit override wins (e.g. RUNTIME_DATABASE_URL in the environment).
        override = os.getenv("RUNTIME_DATABASE_URL")
        if override:
            return override

        url = self.get_database_url()
        if not url:
            return url

        # Only rewrite when we're actually going through the Supabase pooler.
        if "pooler.supabase.com:5432" in url:
            url = url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543", 1)

        return url

settings = Settings()
