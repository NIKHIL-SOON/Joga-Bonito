import logging
from fastapi import APIRouter, HTTPException, Request

from app.schemas.adaptive import GetStateResponse, ScoreRequest, ScoreResponse
from app.services.adaptive_service import get_user_state, process_score

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/adaptive", tags=["adaptive"])


def _get_db(request: Request):
    # Retrieve shared DB from app state (set in lifespan)
    return getattr(request.app.state, "db", None)


@router.get("/{user_id}", response_model=GetStateResponse, summary="Get adaptive state")
async def get_adaptive_state(user_id: str, request: Request):
    if not user_id or not user_id.strip():
        raise HTTPException(status_code=422, detail="user_id is required")
    user_id = user_id.strip()
    if len(user_id) > 128:
        raise HTTPException(status_code=422, detail="user_id too long (max 128)")
    try:
        db = _get_db(request)
        result = await get_user_state(db, user_id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"GET /adaptive/{user_id} failed: {e}")
        raise HTTPException(status_code=500, detail="Internal error retrieving adaptive state")


@router.post("/score", response_model=ScoreResponse, summary="Submit game score and get next level")
async def submit_score(payload: ScoreRequest, request: Request):
    try:
        db = _get_db(request)
        result = await process_score(db, payload)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"POST /adaptive/score failed for {payload.user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal error processing score")
