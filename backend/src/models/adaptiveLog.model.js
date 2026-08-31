import mongoose from "mongoose";

// One document per completed session's exchange with the Adaptive Engine —
// a verbatim, queryable record of exactly what was sent and what came back,
// segregated by user and by game (via the compound index below) so a
// specific user's history on a specific game can be pulled out cleanly.
const adaptiveLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gameId: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    // Exact payload sent to POST /api/v1/adaptive/score, in the engine's own
    // field names — not our internal camelCase — so this is a faithful
    // record of the real request, not a re-derived approximation of it.
    request: {
      user_id: { type: String, required: true },
      game_type: { type: String, required: true },
      score: { type: Number, required: true },
      level_played: { type: Number, required: true },
      accuracy: Number,
      response_time: Number,
      mistakes: Number,
      hints_used: Number,
      session_duration: Number,
      cognitive_domain: String,
    },
    // Exact response body the engine returned, verbatim. Null if the engine
    // was unreachable for this session (see engineAvailable).
    response: {
      decision: String,
      current_level: Number,
      recommended_level: Number,
      analysis: String,
      trend: String,
      challenge_state: String,
      confidence: Number,
      decision_source: String,
    },
    engineAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// The primary access pattern this collection exists for: "this user's
// history on this specific game," newest first.
adaptiveLogSchema.index({ userId: 1, gameId: 1, createdAt: -1 });

export const AdaptiveLog = mongoose.model("AdaptiveLog", adaptiveLogSchema);
export default AdaptiveLog;
