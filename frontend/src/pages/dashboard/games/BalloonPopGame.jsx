import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Timer, Heart, Trophy, RotateCcw } from "lucide-react";
import { createSession, endSession } from "../../../api/sessions";
import GameButton from "../../../components/GameButton";
import Celebration from "../../../components/Celebration";
import AdaptiveCoachNote from "../../../components/AdaptiveCoachNote";
import SessionStartBanner from "../../../components/SessionStartBanner";

const LEVELS = [
  { count: 6, bombs: 0 },
  { count: 7, bombs: 1 },
  { count: 8, bombs: 1 },
  { count: 9, bombs: 2 },
  { count: 10, bombs: 2 },
  { count: 11, bombs: 3 },
];

const COLORS = [
  "bg-red-400",
  "bg-blue-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-purple-400",
  "bg-pink-400",
  "bg-cyan-400",
  "bg-orange-400",
  "bg-lime-400",
  "bg-indigo-400",
  "bg-fuchsia-400",
];

const START_LIVES = 3;

function buildBoard(config) {
  const { count, bombs } = config;
  const targetCount = count - bombs;
  const numbers = Array.from({ length: targetCount }, (_, i) => i + 1);
  const items = [
    ...numbers.map((n) => ({ number: n, isBomb: false })),
    ...Array.from({ length: bombs }, () => ({ number: null, isBomb: true })),
  ];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.map((item, i) => ({
    id: `${i}-${Math.random()}`,
    ...item,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 1.5,
    status: "up", // "up" | "popped" | "detonated"
  }));
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function BalloonPopGame() {
  const navigate = useNavigate();
  const [levelIndex, setLevelIndex] = useState(0);
  const [balloons, setBalloons] = useState(() => buildBoard(LEVELS[0]));
  const [expectedNumber, setExpectedNumber] = useState(1);
  const [shakeId, setShakeId] = useState(null);
  const [celebrating, setCelebrating] = useState(false);
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
  const levelStartRef = useRef(Date.now());
  const sessionActiveRef = useRef(false);
  const latenciesRef = useRef([]);
  const scoreRef = useRef(0);
  const totalsRef = useRef({ correct: 0, wrong: 0 });

  // The Adaptive Engine decides the starting level — we hold off rendering
  // the board until we know it, instead of showing level 1 then swapping.
  useEffect(() => {
    let cancelled = false;
    createSession({ gameId: "balloon-pop" })
      .then((data) => {
        if (cancelled) return;
        sessionActiveRef.current = true;
        startedAtRef.current = Date.now();
        const startIndex = Math.min(LEVELS.length - 1, Math.max(0, (data.difficulty || 1) - 1));
        setLevelIndex(startIndex);
        setBalloons(buildBoard(LEVELS[startIndex]));
        levelStartRef.current = Date.now();
        setStartMeta({ difficulty: data.difficulty, adaptive: data.adaptive });
      })
      .catch(() => {
        if (!cancelled) setSaveError("Couldn't start a tracked session — you can still play, but your score won't be saved.");
      })
      .finally(() => {
        if (!cancelled) setStarting(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        setSaveError("Your game finished, but we couldn't save the result. Check your connection.");
      }
    }
  };

  const handleBalloonClick = (balloon) => {
    if (starting || status !== "playing" || balloon.status !== "up") return;

    if (balloon.isBomb) {
      totalsRef.current.wrong += 1;
      setBalloons((bs) => bs.map((b) => (b.id === balloon.id ? { ...b, status: "detonated" } : b)));
      setShakeId(balloon.id);
      setTimeout(() => setShakeId(null), 400);

      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) finishGame(false);
      return;
    }

    if (balloon.number === expectedNumber) {
      latenciesRef.current.push(Date.now() - levelStartRef.current);
      totalsRef.current.correct += 1;
      scoreRef.current += 15;
      setScore(scoreRef.current);
      setBalloons((bs) => bs.map((b) => (b.id === balloon.id ? { ...b, status: "popped" } : b)));

      const remaining = balloons.filter((b) => !b.isBomb && b.status === "up" && b.id !== balloon.id);
      if (remaining.length === 0) {
        setCelebrating(true);
        setTimeout(() => {
          setCelebrating(false);
          if (levelIndex + 1 >= LEVELS.length) {
            finishGame(true);
          } else {
            const nextIndex = levelIndex + 1;
            setLevelIndex(nextIndex);
            setBalloons(buildBoard(LEVELS[nextIndex]));
            setExpectedNumber(1);
            levelStartRef.current = Date.now();
          }
        }, 1000);
      } else {
        setExpectedNumber((n) => n + 1);
      }
    } else {
      totalsRef.current.wrong += 1;
      setShakeId(balloon.id);
      setTimeout(() => setShakeId(null), 400);

      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) finishGame(false);
    }
  };

  const handlePlayAgain = () => {
    window.location.reload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => navigate("/dashboard/games")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#1E293B] dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          Back to games
        </button>

        {status !== "finished" && (
          <div className="flex items-center gap-4 text-sm font-semibold text-[#1E293B] dark:text-white">
            <span>{score} pts</span>
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

      <h2 className="text-xl font-bold text-[#1E293B] dark:text-white mb-1">Balloon Pop</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        {status === "finished" ? (
          "Great popping!"
        ) : (
          <>
            Level {levelIndex + 1} of {LEVELS.length} — pop the balloons in order, starting with{" "}
            <span className="font-bold text-[#2563EB] dark:text-blue-400">{expectedNumber}</span>. Watch out for 💣!
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
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-8 flex flex-col items-center text-center animate-bounce-in">
          <div className="w-16 h-16 rounded-2xl bg-[#F0F6FC] dark:bg-slate-700 flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-[#2563EB] dark:text-blue-400" strokeWidth={2} />
          </div>
          <h3 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-1">
            {finalStats.won ? "You popped every level!" : "Nice popping!"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Well spotted out there.</p>

          <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-8">
            <div>
              <p className="text-2xl font-bold text-[#1E293B] dark:text-white">{finalStats.score}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E293B] dark:text-white">
                {Math.round(finalStats.accuracy * 100)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Accuracy</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E293B] dark:text-white">
                {formatTime(finalStats.timeTaken)}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Time</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <GameButton color="blue" className="flex-1 py-3 text-sm" onClick={handlePlayAgain}>
              <RotateCcw className="w-4 h-4" strokeWidth={2} />
              Play again
            </GameButton>
            <Link
              to="/dashboard/progress"
              className="flex-1 inline-flex items-center justify-center py-3 rounded-2xl text-sm font-bold text-[#1E293B] dark:text-white bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              View progress
            </Link>
          </div>

          <AdaptiveCoachNote adaptive={finalStats.adaptive} />
        </div>
      ) : starting ? (
        <div className="min-h-[320px] rounded-3xl bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10 animate-pulse" />
      ) : (
        <div className="relative bg-gradient-to-b from-sky-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-3xl p-6 sm:p-10 min-h-[320px]">
          {celebrating && <Celebration title="Level clear! 🎈" subtitle="On to the next batch…" />}

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {balloons.map((balloon) => {
              const isGone = balloon.status === "popped";
              const isShaking = shakeId === balloon.id;

              return (
                <button
                  key={balloon.id}
                  type="button"
                  onClick={() => handleBalloonClick(balloon)}
                  disabled={starting || balloon.status !== "up"}
                  style={{ animationDelay: `${balloon.delay}s` }}
                  className={`relative w-16 h-20 sm:w-20 sm:h-24 flex items-center justify-center transition-all duration-300 ${
                    isGone ? "scale-0 opacity-0" : "animate-float-y"
                  } ${isShaking ? "animate-shake" : ""}`}
                >
                  <div
                    className={`absolute inset-0 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] shadow-md ${
                      balloon.status === "detonated" ? "bg-gray-400 dark:bg-slate-600" : balloon.color
                    }`}
                  />
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0"
                    style={{
                      borderLeft: "4px solid transparent",
                      borderRight: "4px solid transparent",
                      borderTop: "6px solid rgba(0,0,0,0.2)",
                    }}
                  />
                  <span className="relative text-lg sm:text-xl font-extrabold text-white drop-shadow">
                    {balloon.isBomb ? "💣" : balloon.number}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default BalloonPopGame;
