// Proof-of-work log for the Adaptive Engine integration. Every call this app
// makes to the external Adaptive Engine (both the "what level should this
// user start at" GET and the "here's how they did" POST) is appended here,
// verbatim, as one JSON object per line (JSONL). This is intentionally
// separate from the AdaptiveLog Mongo collection: that one exists for the
// app's own querying needs (per-user, per-game history); this one exists as
// a plain, tail-able, append-only file trail proving the engine was actually
// called and actually responded — including failures/timeouts, which the
// Mongo log never records.
//
// A failure to write this log must NEVER break the real request/response
// flow, so every write is wrapped in try/catch with a console.error fallback.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, "..", "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "adaptive-engine.log");

try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (err) {
  console.error("Failed to create adaptive engine log directory:", err.message);
}

/**
 * Appends one JSON line describing a single Adaptive Engine call.
 *
 * @param {Object} event
 * @param {"get_difficulty"|"score_submit"} event.type
 * @param {string} event.userId
 * @param {string} [event.gameId]
 * @param {Object} [event.request] - raw payload sent to the engine
 * @param {Object} [event.response] - raw payload the engine returned
 * @param {string} [event.error] - error/timeout message, if the call failed
 * @param {number} [event.durationMs] - how long the call took
 */
function logAdaptiveEvent({ type, userId, gameId, request, response, error, durationMs }) {
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    userId: userId ? String(userId) : undefined,
    gameId,
    durationMs,
    request,
    response,
    error,
  };

  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
  } catch (err) {
    // Logging must never break the real request/response flow.
    console.error("Failed to write adaptive engine log:", err.message);
  }
}

export { logAdaptiveEvent, LOG_FILE };
export default logAdaptiveEvent;
