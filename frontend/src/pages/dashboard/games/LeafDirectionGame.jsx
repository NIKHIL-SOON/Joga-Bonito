import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowUp, ArrowDown, ArrowRight, Timer, Heart, Trophy, RotateCcw } from "lucide-react";
import { createSession, endSession } from "../../../api/sessions";
import GameButton from "../../../components/GameButton";
import Confetti from "../../../components/Confetti";
import AdaptiveCoachNote from "../../../components/AdaptiveCoachNote";
import SessionStartBanner from "../../../components/SessionStartBanner";

const TOTAL_ROUNDS = 12;
const START_LIVES = 3;
const DIRECTIONS = ["up", "down", "left", "right"];
const OFFSET = { up: { dx: 0, dy: -34 }, down: { dx: 0, dy: 34 }, left: { dx: -34, dy: 0 }, right: { dx: 34, dy: 0 } };
const ROTATION = { up: 0, right: 90, down: 180, left: 270 };

function randomDirection() {
  return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
}

function revealDurationFor(round) {
  const tier = Math.floor(round / 3);
  return Math.max(900, 1800 - tier * 250);
}

// The Adaptive Engine's 1-10 difficulty maps onto which round tier this
// session starts in — a higher difficulty skips the slow warm-up rounds.
function startingRoundIndexFor(difficulty) {
  const d = Math.min(10, Math.max(1, difficulty || 1));
  return Math.min(TOTAL_ROUNDS - 3, Math.round(((d - 1) / 9) * (TOTAL_ROUNDS - 3)));
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function LeafDirectionGame() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState(() => ({ color: "orange", pointDir: "up", moveDir: "up" }));
  const [phase, setPhase] = useState("showing"); // "showing" | "answering"
  const [hasMoved, setHasMoved] = useState(false);
  const [feedback, setFeedback] = useState(null); // "correct" | "wrong" | null
  const [lives, setLives] = useState(START_LIVES);
  const [score, setScore] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState("playing");
  const [finalStats, setFinalStats] = useState(null);
  const [starting, setStarting] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [startMeta, setStartMeta] = useState(null);

  const startedAtRef = useRef();
  if (startedAtRef.current === undefined) startedAtRef.current = Date.now();
  const answerWaitStartRef = useRef(Date.now());
  const sessionActiveRef = useRef(false);
  const latenciesRef = useRef([]);
  const scoreRef = useRef(0);
  const totalsRef = useRef({ correct: 0, wrong: 0 });

  useEffect(() => {
    let cancelled = false;
    createSession({ gameId: "leaves-direction" })
      .then((data) => {
        if (cancelled) return;
        sessionActiveRef.current = true;
        startedAtRef.current = Date.now();
        setRoundIndex(startingRoundIndexFor(data.difficulty));
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

  // Set up each round: pick a fresh leaf, then animate its drift, then open for answers.
  useEffect(() => {
    if (starting) return;
    const color = Math.random() < 0.5 ? "orange" : "yellow";
    const pointDir = randomDirection();
    const moveDir = randomDirection();
    setRound({ color, pointDir, moveDir });
    setPhase("showing");
    setHasMoved(false);
    setFeedback(null);

    const revealMs = revealDurationFor(roundIndex);
    const startTimer = setTimeout(() => setHasMoved(true), 60);
    const revealTimer = setTimeout(() => {
      setPhase("answering");
      answerWaitStartRef.current = Date.now();
    }, 60 + revealMs);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(revealTimer);
    };
  }, [roundIndex, starting]);

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

    const stats = { score: scoreRef.current, accuracy, timeTaken, mistakes: wrong, averageLatencyMs, won };
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

  const handleAnswer = (direction) => {
    if (starting || status !== "playing" || phase !== "answering" || feedback) return;

    const correctAnswer = round.color === "orange" ? round.pointDir : round.moveDir;
    const isCorrect = direction === correctAnswer;

    if (isCorrect) {
      latenciesRef.current.push(Date.now() - answerWaitStartRef.current);
      totalsRef.current.correct += 1;
      const tier = Math.floor(roundIndex / 3);
      scoreRef.current += 15 + tier * 5;
      setScore(scoreRef.current);
      setFeedback("correct");
    } else {
      totalsRef.current.wrong += 1;
      setFeedback("wrong");
    }

    setTimeout(() => {
      if (!isCorrect) {
        const nextLives = lives - 1;
        setLives(nextLives);
        if (nextLives <= 0) {
          finishGame(false);
          return;
        }
      }
      if (roundIndex + 1 >= TOTAL_ROUNDS) {
        finishGame(true);
      } else {
        setRoundIndex((r) => r + 1);
      }
    }, 700);
  };

  // Keyboard support alongside the on-screen arrow pad.
  useEffect(() => {
    const handler = (e) => {
      const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      handleAnswer(dir);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, feedback, lives, roundIndex, starting, status, round]);

  const handlePlayAgain = () => {
    window.location.reload();
  };

  const offset = hasMoved ? OFFSET[round.moveDir] : { dx: 0, dy: 0 };

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

      <h2 className="text-xl font-bold text-[#1E293B] dark:text-white mb-1">{t("games.leafDirection.title")}</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        {status === "finished" ? t("games.common.roundComplete") : (
          <>
            {t("games.leafDirection.roundOf", { current: roundIndex + 1, total: TOTAL_ROUNDS })}{" "}
            <span className="text-orange-600 dark:text-orange-400 font-semibold">{t("games.leafDirection.orangeLabel")}</span>
            {t("games.leafDirection.orangeRule")}{" "}
            <span className="text-yellow-600 dark:text-yellow-400 font-semibold">{t("games.leafDirection.yellowLabel")}</span>
            {t("games.leafDirection.yellowRule")}
          </>
        )}
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
            {finalStats.won ? t("games.leafDirection.finishWon") : t("games.common.goodEffort")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">{t("games.common.wellSpottedOutThere")}</p>

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
        <div className="flex flex-col items-center">
          <p
            className={`mb-3 text-sm font-semibold uppercase tracking-wide ${
              phase === "answering" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-slate-500"
            }`}
          >
            {phase === "answering" ? t("games.leafDirection.yourTurnLabel") : t("games.leafDirection.watchingLabel")}
          </p>

          {/* Stage */}
          <div
            className={`relative w-48 h-48 mb-8 rounded-3xl bg-[#F0F6FC] dark:bg-slate-800 overflow-hidden flex items-center justify-center ${
              feedback === "wrong" ? "animate-shake" : ""
            }`}
          >
            <div
              className="transition-transform ease-in-out"
              style={{
                transitionDuration: `${revealDurationFor(roundIndex)}ms`,
                transform: `translate(${offset.dx}px, ${offset.dy}px)`,
              }}
            >
              <svg
                key={roundIndex}
                viewBox="0 0 24 24"
                fill="currentColor"
                className={`w-16 h-16 transition-transform duration-200 ${
                  round.color === "orange" ? "text-orange-500" : "text-yellow-400"
                } ${feedback === "correct" ? "scale-110" : feedback === "wrong" ? "opacity-50" : ""}`}
                style={{ transform: `rotate(${ROTATION[round.pointDir]}deg)`, transformOrigin: "50% 50%" }}
              >
                <path d="M12 3C6 7 4 10 4 13C4 17.5 7.5 21 12 21C16.5 21 20 17.5 20 13C20 10 18 7 12 3Z" />
              </svg>
            </div>

            {feedback && (
              <div
                className={`absolute inset-0 flex items-center justify-center text-4xl font-bold ${
                  feedback === "correct" ? "text-emerald-500" : "text-red-400"
                }`}
              >
                {feedback === "correct" ? "✓" : "✗"}
              </div>
            )}
          </div>

          {/* D-pad */}
          <div className="grid grid-cols-3 gap-2 w-40">
            <div />
            <button
              type="button"
              onClick={() => handleAnswer("up")}
              disabled={phase !== "answering" || starting}
              aria-label={t("games.leafDirection.upLabel")}
              className="aspect-square rounded-xl bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10 shadow-sm flex items-center justify-center text-[#1E293B] dark:text-white disabled:opacity-40 hover:shadow-md transition-shadow"
            >
              <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <div />
            <button
              type="button"
              onClick={() => handleAnswer("left")}
              disabled={phase !== "answering" || starting}
              aria-label={t("games.leafDirection.leftLabel")}
              className="aspect-square rounded-xl bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10 shadow-sm flex items-center justify-center text-[#1E293B] dark:text-white disabled:opacity-40 hover:shadow-md transition-shadow"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <div className="aspect-square rounded-xl bg-gray-50 dark:bg-slate-900" />
            <button
              type="button"
              onClick={() => handleAnswer("right")}
              disabled={phase !== "answering" || starting}
              aria-label="Right"
              className="aspect-square rounded-xl bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10 shadow-sm flex items-center justify-center text-[#1E293B] dark:text-white disabled:opacity-40 hover:shadow-md transition-shadow"
            >
              <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <div />
            <button
              type="button"
              onClick={() => handleAnswer("down")}
              disabled={phase !== "answering" || starting}
              aria-label="Down"
              className="aspect-square rounded-xl bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10 shadow-sm flex items-center justify-center text-[#1E293B] dark:text-white disabled:opacity-40 hover:shadow-md transition-shadow"
            >
              <ArrowDown className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <div />
          </div>

          <p className="mt-4 text-xs text-gray-400 dark:text-slate-500">
            Tip: you can also use your keyboard's arrow keys.
          </p>
        </div>
      )}
    </div>
  );
}

export default LeafDirectionGame;
