import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Timer, Heart, Trophy, RotateCcw } from "lucide-react";
import { createSession, endSession } from "../../../api/sessions";
import GameButton from "../../../components/GameButton";
import Celebration from "../../../components/Celebration";
import AdaptiveCoachNote from "../../../components/AdaptiveCoachNote";
import SessionStartBanner from "../../../components/SessionStartBanner";

const PANELS = [
  { id: "red", label: "Red", base: "bg-red-500", lit: "bg-red-300", glow: "shadow-[0_0_0_8px_rgba(239,68,68,0.35)]" },
  { id: "blue", label: "Blue", base: "bg-blue-500", lit: "bg-blue-300", glow: "shadow-[0_0_0_8px_rgba(59,130,246,0.35)]" },
  { id: "green", label: "Green", base: "bg-emerald-500", lit: "bg-emerald-300", glow: "shadow-[0_0_0_8px_rgba(16,185,129,0.35)]" },
  { id: "yellow", label: "Yellow", base: "bg-amber-400", lit: "bg-amber-200", glow: "shadow-[0_0_0_8px_rgba(251,191,36,0.35)]" },
];

const START_LIVES = 3;
const MAX_ROUND = 12;
const STEP_MS = 550;

function randomSequence(length) {
  return Array.from({ length }, () => PANELS[Math.floor(Math.random() * 4)].id);
}

// The Adaptive Engine's 1-10 difficulty maps onto the starting pattern
// length — a higher difficulty begins with a longer sequence to repeat.
function startingSequenceLengthFor(difficulty) {
  return Math.min(MAX_ROUND - 2, Math.max(1, difficulty || 1));
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function SimonPatternGame() {
  const navigate = useNavigate();
  const [sequence, setSequence] = useState([PANELS[Math.floor(Math.random() * 4)].id]);
  const [phase, setPhase] = useState("watching"); // "watching" | "guessing"
  const [userIndex, setUserIndex] = useState(0);
  const [litPanel, setLitPanel] = useState(null);
  const [wrongPanel, setWrongPanel] = useState(null);
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
  const guessWaitStartRef = useRef(Date.now());
  const sessionActiveRef = useRef(false);
  const latenciesRef = useRef([]);
  const scoreRef = useRef(0);
  const totalsRef = useRef({ correct: 0, wrong: 0 });

  useEffect(() => {
    let cancelled = false;
    createSession({ gameId: "simon-pattern" })
      .then((data) => {
        if (cancelled) return;
        sessionActiveRef.current = true;
        startedAtRef.current = Date.now();
        setSequence(randomSequence(startingSequenceLengthFor(data.difficulty)));
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

  // Play back the current sequence, one panel at a time.
  useEffect(() => {
    if (phase !== "watching" || starting) return;
    setUserIndex(0);

    let step = 0;
    const timers = [];
    const playNext = () => {
      if (step >= sequence.length) {
        setLitPanel(null);
        setPhase("guessing");
        guessWaitStartRef.current = Date.now();
        return;
      }
      setLitPanel(sequence[step]);
      timers.push(setTimeout(() => setLitPanel(null), STEP_MS * 0.6));
      step += 1;
      timers.push(setTimeout(playNext, STEP_MS));
    };
    const startTimer = setTimeout(playNext, 500);
    timers.push(startTimer);

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence, phase, starting]);

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

  const handlePanelClick = (panelId) => {
    if (starting || phase !== "guessing" || status !== "playing") return;

    setLitPanel(panelId);
    setTimeout(() => setLitPanel((p) => (p === panelId ? null : p)), 200);

    if (panelId === sequence[userIndex]) {
      latenciesRef.current.push(Date.now() - guessWaitStartRef.current);
      totalsRef.current.correct += 1;
      guessWaitStartRef.current = Date.now();
      const nextIndex = userIndex + 1;

      if (nextIndex === sequence.length) {
        const roundScore = 10 + sequence.length * 5;
        scoreRef.current += roundScore;
        setScore(scoreRef.current);
        setCelebrating(true);

        setTimeout(() => {
          setCelebrating(false);
          if (sequence.length >= MAX_ROUND) {
            finishGame(true);
          } else {
            setSequence((s) => [...s, PANELS[Math.floor(Math.random() * 4)].id]);
            setPhase("watching");
          }
        }, 900);
      } else {
        setUserIndex(nextIndex);
      }
    } else {
      totalsRef.current.wrong += 1;
      setWrongPanel(panelId);
      setTimeout(() => setWrongPanel(null), 450);

      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) {
        finishGame(false);
      } else {
        setPhase("watching"); // replay the same sequence
      }
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

      <h2 className="text-xl font-bold text-[#1E293B] dark:text-white mb-1">Simon Pattern</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        {status === "finished"
          ? "Great memory work!"
          : phase === "watching"
            ? "Watch the pattern light up…"
            : `Your turn — repeat the pattern (${sequence.length} step${sequence.length === 1 ? "" : "s"}).`}
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
            {finalStats.won ? "You maxed out the pattern!" : "Nice run!"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
            You made it to a {sequence.length}-step pattern.
          </p>

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
      ) : (
        <div className="relative max-w-sm mx-auto">
          {celebrating && <Celebration title="Nice one! 🎉" subtitle="Pattern grows by one…" />}

          <div className="grid grid-cols-2 gap-3">
            {PANELS.map((panel) => {
              const isLit = litPanel === panel.id;
              const isWrong = wrongPanel === panel.id;

              return (
                <button
                  key={panel.id}
                  type="button"
                  onClick={() => handlePanelClick(panel.id)}
                  disabled={starting || phase !== "guessing"}
                  aria-label={panel.label}
                  className={`game-btn aspect-square rounded-3xl transition-all duration-150 disabled:cursor-not-allowed ${
                    isWrong ? "bg-red-400 animate-shake" : isLit ? `${panel.lit} ${panel.glow} scale-[1.03]` : panel.base
                  } ${phase === "guessing" && !starting ? "hover:brightness-110 active:scale-95" : "opacity-90"}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SimonPatternGame;
