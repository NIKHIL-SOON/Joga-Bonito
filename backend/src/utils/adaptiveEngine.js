// Client for the external Adaptive Engine microservice — the single source
// of truth for difficulty progression. This app must never compute or guess
// difficulty itself; it only asks the engine and reports what happened.
//
// Contract (from the engine's own OpenAPI schema):
//   GET  /api/v1/adaptive/{user_id}      -> { current_level, trend, is_new_user, analysis, ... }
//   POST /api/v1/adaptive/score          -> { current_level, recommended_level, decision, analysis, ... }

import { logAdaptiveEvent } from "./adaptiveEngineLog.js";

const ADAPTIVE_URL = process.env.ADAPTIVE_ENGINE_URL || "https://adaptive-engine-ohnq.onrender.com";
const ADAPTIVE_TIMEOUT_MS = 8000;

// Our gameIds map onto the engine's expected game_type categories.
const GAME_TYPE_BY_ID = {
  "memory-match": "memory",
  "attention-flow": "attention",
  "leaves-direction": "attention",
  "shopping-cart": "planning",
  "simon-pattern": "pattern",
  "balloon-pop": "attention",
};

// Each game's own scoring formula produces a different range — normalize to
// the 0-100 scale the engine expects using each game's realistic ceiling.
const SCORE_CEILING_BY_ID = {
  "memory-match": 900,
  "attention-flow": 800,
  "leaves-direction": 360,
  "shopping-cart": 1500,
  "simon-pattern": 510,
  "balloon-pop": 630,
};

function gameTypeFor(gameId) {
  return GAME_TYPE_BY_ID[gameId] || "attention";
}

function normalizeScore(gameId, rawScore) {
  const ceiling = SCORE_CEILING_BY_ID[gameId] || 100;
  const pct = (Number(rawScore) || 0) / ceiling;
  return Math.round(Math.min(100, Math.max(0, pct * 100)));
}

async function fetchAdaptive(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ADAPTIVE_TIMEOUT_MS);
  try {
    const res = await fetch(`${ADAPTIVE_URL}${path}`, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`Adaptive engine responded ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetches the user's current difficulty level. Falls back to level 1 (new-player default) if the engine is unreachable. */
async function getStartingDifficulty(userId) {
  const startedAt = Date.now();
  try {
    const state = await fetchAdaptive(`/api/v1/adaptive/${encodeURIComponent(String(userId))}`);
    logAdaptiveEvent({
      type: "get_difficulty",
      userId,
      request: { user_id: String(userId) },
      response: state,
      durationMs: Date.now() - startedAt,
    });
    return {
      difficulty: Math.min(10, Math.max(1, Math.round(state.current_level) || 1)),
      analysis: state.analysis || "",
      trend: state.trend || "new_user",
      isNewUser: Boolean(state.is_new_user),
      available: true,
    };
  } catch (err) {
    console.error("Adaptive engine unavailable (get state):", err.message);
    logAdaptiveEvent({
      type: "get_difficulty",
      userId,
      request: { user_id: String(userId) },
      error: err.message,
      durationMs: Date.now() - startedAt,
    });
    return { difficulty: 1, analysis: "", trend: "new_user", isNewUser: true, available: false };
  }
}

/** Builds the exact request body the engine's /score endpoint expects. Exported
 * on its own so callers can persist precisely what was (or would be) sent,
 * without duplicating this normalization logic. */
function buildScorePayload({ userId, gameId, levelPlayed, score, accuracy, timeTaken, mistakes, hintsUsed, cognitiveDomain }) {
  return {
    user_id: String(userId),
    game_type: gameTypeFor(gameId),
    score: normalizeScore(gameId, score),
    level_played: Math.min(10, Math.max(1, levelPlayed || 1)),
    accuracy: typeof accuracy === "number" ? Math.round(Math.min(1, Math.max(0, accuracy)) * 100) : undefined,
    response_time: typeof timeTaken === "number" ? timeTaken : undefined,
    mistakes: typeof mistakes === "number" ? mistakes : undefined,
    hints_used: typeof hintsUsed === "number" ? hintsUsed : undefined,
    session_duration: typeof timeTaken === "number" ? timeTaken : undefined,
    cognitive_domain: cognitiveDomain,
  };
}

/** Reports a completed session's performance and gets back the next difficulty decision.
 * Returns the camelCase fields the rest of the app already consumes, plus the
 * verbatim `request`/`response` bodies for anyone that needs to log the exact exchange. */
async function reportScore(params) {
  const requestPayload = buildScorePayload(params);
  const startedAt = Date.now();

  const fallback = {
    decision: "maintain",
    currentLevel: params.levelPlayed,
    nextDifficulty: params.levelPlayed,
    analysis: "Nice work — your result has been saved.",
    trend: "stable",
    challengeState: "optimal",
    available: false,
    request: requestPayload,
    response: null,
  };

  try {
    const result = await fetchAdaptive("/api/v1/adaptive/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    });

    logAdaptiveEvent({
      type: "score_submit",
      userId: params.userId,
      gameId: params.gameId,
      request: requestPayload,
      response: result,
      durationMs: Date.now() - startedAt,
    });

    return {
      decision: result.decision,
      currentLevel: result.current_level,
      nextDifficulty: result.recommended_level,
      analysis: result.analysis,
      trend: result.trend,
      challengeState: result.challenge_state,
      confidence: result.confidence,
      available: true,
      request: requestPayload,
      response: result,
    };
  } catch (err) {
    console.error("Adaptive engine unavailable (submit score):", err.message);
    logAdaptiveEvent({
      type: "score_submit",
      userId: params.userId,
      gameId: params.gameId,
      request: requestPayload,
      error: err.message,
      durationMs: Date.now() - startedAt,
    });
    return fallback;
  }
}

export { getStartingDifficulty, reportScore, gameTypeFor, normalizeScore };
