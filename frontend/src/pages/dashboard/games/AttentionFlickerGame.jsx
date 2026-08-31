import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Timer, Heart, Trophy, RotateCcw } from "lucide-react";
import { createSession, endSession } from "../../../api/sessions";
import GameButton from "../../../components/GameButton";
import Confetti from "../../../components/Confetti";
import AdaptiveCoachNote from "../../../components/AdaptiveCoachNote";
import SessionStartBanner from "../../../components/SessionStartBanner";

const MAX_LEVEL = 8;
const START_LIVES = 3;

function getLevelConfig(level) {
  const gridSize = Math.min(3 + Math.floor((level - 1) / 2), 5);
  const totalBoxes = gridSize * gridSize;
  const flickerCount = Math.min(2 + (level - 1), Math.max(3, Math.floor(totalBoxes * 0.35)));
  // More boxes to remember needs more time to look at them — grows with level,
  // capped so later levels stay challenging rather than turning into a slideshow.
  const flashDurationMs = Math.min(1200 + (level - 1) * 180, 2400);
  return { gridSize, totalBoxes, flickerCount, flashDurationMs };
}

function pickRandomIndices(total, count) {
  const pool = Array.from({ length: total }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return new Set(pool.slice(0, count));
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function AttentionFlickerGame() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [level, setLevel] = useState(1);
  const [roundSeed, setRoundSeed] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [flickered, setFlickered] = useState(new Set());
  const [found, setFound] = useState(new Set());
  const [wrongBox, setWrongBox] = useState(null);
  const [phase, setPhase] = useState("flashing"); // "flashing" | "guessing"
  const [score, setScore] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState("playing"); // "playing" | "finished"
  const [finalStats, setFinalStats] = useState(null);
  const [starting, setStarting] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [startMeta, setStartMeta] = useState(null);

  const startedAtRef = useRef();
  if (startedAtRef.current === undefined) startedAtRef.current = Date.now();
  const revealAtRef = useRef(null);
  const latenciesRef = useRef([]);
  const totalsRef = useRef({ correct: 0, wrong: 0 });
  const scoreRef = useRef(0);
  const sessionActiveRef = useRef(false);

  // Start a tracked session on mount. The Adaptive Engine decides the
  // starting level — we don't begin flashing until we know it, so the round
  // doesn't restart mid-animation once it arrives.
  useEffect(() => {
    let cancelled = false;
    createSession({ gameId: "attention-flow" })
      .then((data) => {
        if (cancelled) return;
        sessionActiveRef.current = true;
        startedAtRef.current = Date.now();
        setLevel(Math.min(MAX_LEVEL, Math.max(1, data.difficulty || 1)));
        setStartMeta({ difficulty: data.difficulty, adaptive: data.adaptive });
      })
      .catch(() => {
        if (!cancelled) setSaveError(t("games.common.sessionStartError"));
      })
      .finally(() => {
        if (!cancelled) setStarting(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Each round: flash a fresh set of boxes, then let the player guess.
  useEffect(() => {
    if (starting) return;
    const { totalBoxes, flickerCount, flashDurationMs } = getLevelConfig(level);
    const nextFlickered = pickRandomIndices(totalBoxes, flickerCount);
    setFlickered(nextFlickered);
    setFound(new Set());
    setPhase("flashing");

    const timeout = setTimeout(() => {
      setPhase("guessing");
      revealAtRef.current = Date.now();
    }, flashDurationMs);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, roundSeed, starting]);

  // Live timer.
  useEffect(() => {
    if (status !== "playing") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const finishGame = async (won) => {
    const timeTaken = Math.floor((Date.now() - startedAtRef.current) / 1000);
    const { correct, wrong } = totalsRef.current;
    const accuracy = correct + wrong > 0 ? correct / (correct + wrong) : 0;
    const latencies = latenciesRef.current;
    const averageLatencyMs = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

    const stats = {
      score: scoreRef.current,
      accuracy,
      timeTaken,
      mistakes: wrong,
      averageLatencyMs,
      won,
      levelReached: level,
    };
    setFinalStats(stats);
    setStatus("finished");

    if (sessionActiveRef.current) {
      try {
        const result = await endSession({
          score: stats.score,
          accuracy: stats.accuracy,
          timeTaken: stats.timeTaken,
          mistakes: stats.mistakes,
          averageLatencyMs: stats.averageLatencyMs,
          hintsUsed: 0,
        });
        setFinalStats((prev) => ({ ...prev, adaptive: result.adaptive }));
      } catch {
        setSaveError(t("games.common.sessionSaveError"));
      }
    }
  };

  const handleBoxClick = (index) => {
    if (starting || status !== "playing" || phase !== "guessing") return;
    if (found.has(index)) return;

    if (flickered.has(index)) {
      latenciesRef.current.push(Date.now() - (revealAtRef.current || Date.now()));
      totalsRef.current.correct += 1;
      scoreRef.current += level * 10;
      setScore(scoreRef.current);

      const nextFound = new Set(found);
      nextFound.add(index);
      setFound(nextFound);

      if (nextFound.size === flickered.size) {
        if (level >= MAX_LEVEL) {
          finishGame(true);
        } else {
          setLevel((l) => l + 1);
        }
      }
    } else {
      totalsRef.current.wrong += 1;
      setWrongBox(index);
      setTimeout(() => setWrongBox(null), 400);

      const nextLives = lives - 1;
      setLives(nextLives);

      if (nextLives <= 0) {
        finishGame(false);
      } else {
        setRoundSeed((s) => s + 1);
      }
    }
  };

  const handlePlayAgain = () => {
    setRoundSeed((s) => s + 1);
    setLives(START_LIVES);
    setWrongBox(null);
    setScore(0);
    scoreRef.current = 0;
    totalsRef.current = { correct: 0, wrong: 0 };
    latenciesRef.current = [];
    setElapsed(0);
    setFinalStats(null);
    setSaveError("");
    setStatus("playing");
    sessionActiveRef.current = false;
    setStarting(true);
    setStartMeta(null);

    createSession({ gameId: "attention-flow" })
      .then((data) => {
        sessionActiveRef.current = true;
        startedAtRef.current = Date.now();
        setLevel(Math.min(MAX_LEVEL, Math.max(1, data.difficulty || 1)));
        setStartMeta({ difficulty: data.difficulty, adaptive: data.adaptive });
      })
      .catch(() => setSaveError(t("games.common.sessionStartError")))
      .finally(() => setStarting(false));
  };

  const { gridSize } = getLevelConfig(level);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => navigate("/dashboard/games")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#1E293B] dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          {t("games.common.backToGames")}
        </button>

        {status !== "finished" && (
          <div className="flex items-center gap-4 text-sm font-semibold text-[#1E293B] dark:text-white">
            <span>{t("games.common.pointsShort", { score })}</span>
            <span className="flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-[#2563EB] dark:text-blue-400" strokeWidth={2} />
              {formatTime(elapsed)}
            </span>
            <span className="flex items-center gap-1">
              {Array.from({ length: START_LIVES }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-4 h-4 ${i < lives ? "text-red-400 fill-red-400" : "text-gray-200 dark:text-slate-600"}`}
                  strokeWidth={2}
                />
              ))}
            </span>
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold text-[#1E293B] dark:text-white mb-1">{t("games.attentionFlow.title")}</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        {status === "finished"
          ? t("games.common.roundComplete")
          : phase === "flashing"
            ? t("games.attentionFlow.watchInstruction")
            : t("games.attentionFlow.tapInstruction", { level })}
      </p>

      {status !== "finished" && !starting && <SessionStartBanner difficulty={startMeta?.difficulty} adaptive={startMeta?.adaptive} />}

      {saveError && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {saveError}
        </div>
      )}

      {status === "finished" && finalStats ? (
        <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-8 flex flex-col items-center text-center animate-bounce-in overflow-hidden">
          {finalStats.won && <Confetti />}
          <div className="w-16 h-16 rounded-2xl bg-[#F0F6FC] dark:bg-slate-700 flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-[#2563EB] dark:text-blue-400" strokeWidth={2} />
          </div>
          <h3 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-1">
            {finalStats.won ? t("games.attentionFlow.finishWon") : t("games.common.goodEffort")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
            {t("games.attentionFlow.finishSubtitle", { level: finalStats.levelReached })}
          </p>

          <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-8">
            <div>
              <p className="text-2xl font-bold text-[#1E293B] dark:text-white">{finalStats.score}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{t("games.common.score")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E293B] dark:text-white">
                {Math.round(finalStats.accuracy * 100)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{t("games.common.accuracy")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E293B] dark:text-white">
                {formatTime(finalStats.timeTaken)}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{t("games.common.time")}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <GameButton color="blue" className="flex-1 py-3 text-sm" onClick={handlePlayAgain}>
              <RotateCcw className="w-4 h-4" strokeWidth={2} />
              {t("games.common.playAgain")}
            </GameButton>
            <Link
              to="/dashboard/progress"
              className="flex-1 inline-flex items-center justify-center py-3 rounded-2xl text-sm font-bold text-[#1E293B] dark:text-white bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              {t("games.common.viewProgress")}
            </Link>
          </div>

          <AdaptiveCoachNote adaptive={finalStats.adaptive} />
        </div>
      ) : (
        <div
          className="grid gap-3 max-w-md mx-auto"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: gridSize * gridSize }).map((_, index) => {
            const isFlashing = phase === "flashing" && flickered.has(index);
            const isFound = found.has(index);
            const isWrong = wrongBox === index;

            let tone = "bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10";
            if (isFlashing) tone = "bg-[#2563EB] ring-1 ring-[#2563EB] animate-pop-in";
            if (isFound) tone = "bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-400 animate-bounce-in";
            if (isWrong) tone = "bg-red-100 dark:bg-red-950/40 ring-2 ring-red-400 animate-shake";

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleBoxClick(index)}
                disabled={starting || phase === "flashing" || isFound}
                aria-label={t("games.attentionFlow.boxLabel", { number: index + 1 })}
                className={`aspect-square rounded-xl transition-colors duration-150 ${tone}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AttentionFlickerGame;
