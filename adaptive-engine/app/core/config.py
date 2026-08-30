from pathlib import Path

from pydantic_settings import BaseSettings
from pydantic import Field

_PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # Local SQLite (no external DB needed)
    DATABASE_URL: str = Field(default="sqlite:///./adaptive_engine.db", description="SQLite database URL")
    SQLITE_PATH: str = Field(default="./adaptive_engine.db", description="SQLite file path (derived from DATABASE_URL if not set)")

    # Groq
    GROQ_API_KEY: str = Field(default="", description="Groq API key")
    GROQ_MODEL: str = Field(default="openai/gpt-oss-20b", description="Groq model name (must support JSON mode)")
    GROQ_TIMEOUT: int = Field(default=8, description="Groq request timeout in seconds")
    GROQ_MAX_RETRIES: int = Field(default=1, description="Groq max retries")

    # Service
    RECENT_SCORES_LIMIT: int = Field(default=5, description="Number of recent scores to analyze")
    LOG_LEVEL: str = Field(default="INFO", description="Log level")
    PORT: int = Field(default=8001, description="Service port (Render sets automatically)")

    model_config = {
        "env_file": str(_PROJECT_ROOT / ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @property
    def is_groq_configured(self) -> bool:
        return bool(self.GROQ_API_KEY and self.GROQ_API_KEY != "your_groq_api_key_here" and self.GROQ_API_KEY.strip() != "")

    def get_sqlite_path(self) -> str:
        # Allow DATABASE_URL override: sqlite:///./file.db or sqlite:///:memory:
        # Always return absolute path so cwd doesn't matter
        if self.DATABASE_URL.startswith("sqlite:///"):
            path = self.DATABASE_URL.replace("sqlite:///", "", 1)
            # Handle sqlite:///:memory: -> :memory:
            if path == ":memory:":
                return ":memory:"
            p = Path(path)
            if not p.is_absolute():
                p = _PROJECT_ROOT / p
            return str(p.resolve())
        p = Path(self.SQLITE_PATH)
        if not p.is_absolute():
            p = _PROJECT_ROOT / p
        return str(p.resolve())


settings = Settings()
