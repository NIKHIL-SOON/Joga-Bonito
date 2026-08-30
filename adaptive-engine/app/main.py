import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.adaptive import router as adaptive_router
from app.core.config import settings
from app.core.database import close_db, get_db_path, init_db, is_db_available
from app.schemas.adaptive import HealthResponse

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting Adaptive Engine — db={get_db_path()}, groq_configured={settings.is_groq_configured}")
    try:
        await init_db()
        app.state.db = True
        logger.info(f"Local SQLite ready at {get_db_path()}")
    except Exception as e:
        logger.warning(f"SQLite init failed: {e} — continuing without DB")
        app.state.db = None
    yield
    # Shutdown
    try:
        await close_db()
    except Exception as e:
        logger.warning(f"Error closing DB: {e}")


app = FastAPI(
    title="Adaptive Engine",
    description="AI-Based Cognitive Gaming — Adaptive Difficulty Microservice (Local SQLite, no external DB)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow main backend on any origin (Render dashboard + localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse, tags=["health"], summary="Health check")
async def health():
    # Use global check (lifespan sets both _db and app.state.db to same object)
    db_status = "connected" if is_db_available() else "disconnected"
    return HealthResponse(
        status="healthy",
        service="adaptive-engine",
        database=db_status,
        groq_configured=settings.is_groq_configured,
    )


@app.get("/", tags=["health"], summary="Root")
async def root():
    return {
        "service": "adaptive-engine",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "adaptive_get": "/api/v1/adaptive/{user_id}",
        "adaptive_post": "/api/v1/adaptive/score",
        "database": get_db_path(),
        "storage": "local-sqlite",
    }


app.include_router(adaptive_router)

# For direct `python -m app.main` without mentioning server explicitly in docs,
# but Render will use the start command from README.
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", str(settings.PORT)))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
