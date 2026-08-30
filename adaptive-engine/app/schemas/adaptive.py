from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ── Request ──

class ScoreRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=128, description="Unique user identifier")
    game_type: str = Field(..., min_length=1, max_length=64, description="Game type: memory, attention, planning, pattern")
    score: int = Field(..., ge=0, le=100, description="Game score 0-100")
    level_played: int = Field(..., ge=1, le=10, description="Difficulty level played 1-10")

    # Extensible optional metrics (nullable for MVP, future-proof)
    accuracy: Optional[float] = Field(default=None, ge=0, le=100, description="Accuracy percentage")
    response_time: Optional[float] = Field(default=None, ge=0, description="Average response time in seconds")
    mistakes: Optional[int] = Field(default=None, ge=0, description="Number of mistakes")
    hints_used: Optional[int] = Field(default=None, ge=0, description="Number of hints used")
    session_duration: Optional[float] = Field(default=None, ge=0, description="Session duration in seconds")
    cognitive_domain: Optional[str] = Field(default=None, description="Cognitive domain")

    model_config = {"extra": "allow"}


# ── LLM Structured Response ──

class LLMResponse(BaseModel):
    recommended_level: int = Field(..., ge=1, le=10, description="Recommended difficulty level")
    decision: Literal["increase", "maintain", "decrease"] = Field(..., description="Decision type")
    confidence: float = Field(..., ge=0, le=1, description="Confidence 0-1")
    analysis: str = Field(..., min_length=10, max_length=500, description="Human-readable analysis")

    model_config = {"extra": "forbid"}


# ── API Responses ──

class ScoreResponse(BaseModel):
    user_id: str
    current_level: int = Field(..., ge=1, le=10)
    recommended_level: int = Field(..., ge=1, le=10)
    decision: Literal["increase", "maintain", "decrease"]
    challenge_state: Literal["too_easy", "optimal", "too_hard"]
    trend: Literal["improving", "stable", "declining", "new_user"]
    latest_score: int
    average_recent_score: float
    confidence: float = Field(..., ge=0, le=1)
    analysis: str
    decision_source: Literal["llm", "fallback", "fallback_llm_invalid", "fallback_llm_error", "fallback_no_groq"]


class GetStateResponse(BaseModel):
    user_id: str
    current_level: int = Field(..., ge=1, le=10)
    recent_scores: list[int] = Field(default_factory=list)
    average_score: float = 0.0
    trend: Literal["improving", "stable", "declining", "new_user"]
    is_new_user: bool
    analysis: str
    last_updated: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    service: str
    database: str = "connected"
    groq_configured: bool = False
