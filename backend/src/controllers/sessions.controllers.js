import asyncHandler from "../../utilities/asyncHandler.js";
import ApiError from "../../utilities/apiError.js";
import ApiResponse from "../../utilities/apiResponse.js";
import { Session } from "../models/session.models.js";
import { Performance } from "../models/performance.model.js";
import { Game } from "../models/game.models.js";
import { AdaptiveLog } from "../models/adaptiveLog.model.js";
import { getStartingDifficulty, reportScore } from "../utils/adaptiveEngine.js";

const RANGE_OPTIONS = ["daily", "weekly", "monthly"];

/** Groups a date into a bucket key for the given range ("daily" | "weekly" | "monthly").
 *
 * All three branches use UTC components deliberately. `completedAt` is stored
 * as a UTC instant (`new Date()`), and the "daily" branch has always read it
 * back via `toISOString()` (UTC). The "monthly"/"weekly" branches used to read
 * it back via `getFullYear()`/`getMonth()` (the *server's* local timezone),
 * which meant the exact same session instant could land in a different month
 * depending on which range was requested — e.g. a session at
 * 2026-08-31T18:45:00Z bucketed as daily "2026-08-31" but monthly "2026-09"
 * on a server running in a timezone ahead of UTC. Keeping every branch on UTC
 * keeps the three ranges internally consistent with each other. */
function bucketKeyFor(date, range) {
  const d = new Date(date);

  if (range === "monthly") {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  if (range === "weekly") {
    // ISO-ish week number, good enough for grouping/display purposes.
    const firstDayOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const pastDays = Math.floor((d - firstDayOfYear) / 86400000);
    const week = Math.ceil((pastDays + firstDayOfYear.getUTCDay() + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

const createSession = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { gameId } = req.body;

  if (!gameId) {
    throw new ApiError(400, "Game ID is required");
  }

  const normalizedGameId = String(gameId).trim().toLowerCase();

  // The Adaptive Engine is the single source of truth for difficulty — we
  // ask it what level this user should start at rather than deciding here.
  // If it's unreachable, fall back to level 1 instead of blocking play.
  const starting = await getStartingDifficulty(userId);

  const createdPerformance = await Performance.create({
    score: 0,
    accuracy: 0,
    timeTaken: 0,
    mistakes: 0,
    hintsUsed: 0,
    averageLatencyMs: 0,
  });

  const session = await Session.create({
    userId,
    gameId: normalizedGameId,
    difficulty: starting.difficulty,
    status: "in-progress",
    performance: createdPerformance._id,
  });

  res.cookie("_performance", createdPerformance._id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res.status(201).json(
    ApiResponse.success(201, "Session created successfully", {
      _id: session._id,
      userId: session.userId,
      gameId: session.gameId,
      difficulty: session.difficulty,
      status: session.status,
      performance: createdPerformance._id,
      startedAt: session.startedAt,
      adaptive: {
        analysis: starting.analysis,
        trend: starting.trend,
        isNewUser: starting.isNewUser,
        available: starting.available,
      },
    })
  );
});

const endSession = asyncHandler(async (req, res) => {
  const performanceId = req.cookies?._performance;

  if (!performanceId) {
    throw new ApiError(400, "No active performance session found");
  }

  const {
    score,
    accuracy,
    timeTaken,
    mistakes,
    hintsUsed,
    averageLatencyMs,
  } = req.body || {};

  const performanceUpdate = {};

  if (typeof score !== "undefined") performanceUpdate.score = Number(score);
  if (typeof accuracy !== "undefined") performanceUpdate.accuracy = Number(accuracy);
  if (typeof timeTaken !== "undefined") performanceUpdate.timeTaken = Number(timeTaken);
  if (typeof mistakes !== "undefined") performanceUpdate.mistakes = Number(mistakes);
  if (typeof hintsUsed !== "undefined") performanceUpdate.hintsUsed = Number(hintsUsed);
  if (typeof averageLatencyMs !== "undefined") performanceUpdate.averageLatencyMs = Number(averageLatencyMs);

  const performanceDoc = await Performance.findByIdAndUpdate(
    performanceId,
    performanceUpdate,
    { new: true }
  );

  if (!performanceDoc) {
    throw new ApiError(404, "Performance record not found");
  }

  const session = await Session.findOneAndUpdate(
    { performance: performanceId, status: "in-progress" },
    {
      status: "completed",
      completedAt: new Date(),
    },
    { new: true }
  );

  res.clearCookie("_performance", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  // Report this result to the Adaptive Engine and let IT decide what happens
  // next — this app must never compute the next difficulty itself.
  let adaptive = null;
  if (session) {
    const game = await Game.findOne({ gameId: session.gameId });
    const result = await reportScore({
      userId: session.userId,
      gameId: session.gameId,
      levelPlayed: session.difficulty,
      score: performanceDoc.score,
      accuracy: performanceDoc.accuracy,
      timeTaken: performanceDoc.timeTaken,
      mistakes: performanceDoc.mistakes,
      hintsUsed: performanceDoc.hintsUsed,
      cognitiveDomain: game?.cognitiveDomain,
    });

    adaptive = {
      decision: result.decision,
      currentLevel: result.currentLevel,
      nextDifficulty: result.nextDifficulty,
      analysis: result.analysis,
      trend: result.trend,
      challengeState: result.challengeState,
      available: result.available,
    };

    // Keep our own segregated, queryable record of exactly what was sent to
    // the Adaptive Engine and what it said back, per user per game — separate
    // from Session/Performance, which exist for the app's own bookkeeping.
    try {
      await AdaptiveLog.create({
        userId: session.userId,
        gameId: session.gameId,
        session: session._id,
        request: result.request,
        response: result.response,
        engineAvailable: result.available,
      });
    } catch (err) {
      // Never fail the user's request over a logging write.
      console.error("Failed to write AdaptiveLog:", err.message);
    }
  }

  return res.status(200).json(
    ApiResponse.success(200, "Session ended successfully", {
      performance: performanceDoc,
      adaptive,
    })
  );
});

/**
 * @desc    The current user's Adaptive Engine exchange history, segregated by
 *          game (or across all games if no gameId is given) — exactly what
 *          was sent to and received from the engine for each session.
 * @route   GET /api/sessions/adaptive-log?gameId=memory-match
 * @access  Private
 */
const getAdaptiveLog = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };

  if (req.query.gameId) {
    filter.gameId = String(req.query.gameId).trim().toLowerCase();
  }

  const logs = await AdaptiveLog.find(filter).sort({ createdAt: -1 }).limit(200);

  return res.status(200).json(
    ApiResponse.success(200, "Adaptive Engine log retrieved successfully", { logs })
  );
});

/**
 * @desc    List the current user's completed sessions, most recent first
 * @route   GET /api/sessions
 * @access  Private
 */
const getSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ userId: req.user._id, status: "completed" })
    .populate("performance")
    .sort({ completedAt: -1 })
    .limit(200);

  return res.status(200).json(
    ApiResponse.success(200, "Sessions retrieved successfully", { sessions })
  );
});

/**
 * @desc    Aggregated progress stats (trend + domain breakdown) for the current user
 * @route   GET /api/sessions/stats?range=daily|weekly|monthly
 * @access  Private
 */
const getSessionStats = asyncHandler(async (req, res) => {
  const range = RANGE_OPTIONS.includes(req.query.range) ? req.query.range : "daily";

  const [sessions, games] = await Promise.all([
    Session.find({ userId: req.user._id, status: "completed" })
      .populate("performance")
      .sort({ completedAt: 1 }),
    Game.find({}),
  ]);

  const domainByGameId = Object.fromEntries(games.map((g) => [g.gameId, g.cognitiveDomain]));

  const buckets = new Map();
  const domainCounts = new Map();
  const sessionDates = new Set();
  let bestScore = 0;
  let accuracySum = 0;

  for (const session of sessions) {
    const perf = session.performance;
    if (!perf) continue;

    const completedAt = session.completedAt || session.startedAt;
    const bucketKey = bucketKeyFor(completedAt, range);

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { date: bucketKey, sessions: 0, scoreSum: 0, accuracySum: 0 });
    }
    const bucket = buckets.get(bucketKey);
    bucket.sessions += 1;
    bucket.scoreSum += perf.score || 0;
    bucket.accuracySum += perf.accuracy || 0;

    const domain = domainByGameId[session.gameId] || "other";
    domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);

    bestScore = Math.max(bestScore, perf.score || 0);
    accuracySum += perf.accuracy || 0;
    sessionDates.add(new Date(completedAt).toISOString().slice(0, 10));
  }

  const trend = Array.from(buckets.values())
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((bucket) => ({
      date: bucket.date,
      sessions: bucket.sessions,
      avgScore: Math.round(bucket.scoreSum / bucket.sessions),
      avgAccuracy: Math.round((bucket.accuracySum / bucket.sessions) * 100),
    }));

  const domainBreakdown = Array.from(domainCounts.entries()).map(([domain, count]) => ({
    domain,
    count,
  }));

  // Current streak: consecutive days up to today with at least one completed session.
  let streak = 0;
  const cursor = new Date();
  while (sessionDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return res.status(200).json(
    ApiResponse.success(200, "Session stats retrieved successfully", {
      range,
      totalSessions: sessions.length,
      bestScore,
      avgAccuracy: sessions.length ? Math.round((accuracySum / sessions.length) * 100) : 0,
      streak,
      trend,
      domainBreakdown,
    })
  );
});

export { createSession, endSession, getSessions, getSessionStats, getAdaptiveLog };