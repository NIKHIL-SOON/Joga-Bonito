import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Timer, XCircle, Trophy, RotateCcw } from "lucide-react";
import { createSession, endSession } from "../../../api/sessions";
import GameButton from "../../../components/GameButton";
import Confetti from "../../../components/Confetti";
import AdaptiveCoachNote from "../../../components/AdaptiveCoachNote";
import SessionStartBanner from "../../../components/SessionStartBanner";

const SYMBOLS = ["🍎", "🌻", "🐶", "🌈", "⭐", "🎈", "🐱", "🍇"];
const DEFAULT_PAIRS = 6;

// The Adaptive Engine's 1-10 difficulty maps onto how many pairs this round has —
// the engine decides the level, the game just executes it.
function pairsForDifficulty(difficulty) {
  const d = Math.min(10, Math.max(1, difficulty || 1));
  return Math.min(SYMBOLS.length, 3 + Math.floor((d - 1) / 2));
}

function shuffledDeck(pairCount) {
  const deck = SYMBOLS.slice(0, pairCount).flatMap((symbol, i) => [
    { id: `${i}-a`, symbol },
    { id: `${i}-b`, symbol },
  ]);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.map((card, index) => ({ ...card, index }));
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function MemoryMatchGame() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cards, setCards] = useState(() => shuffledDeck(DEFAULT_PAIRS));
  const [flipped, setFlipped] = useState([]); // indices currently face-up, unmatched
  const [matched, setMatched] = useState(new Set());
  const [wrongPair, setWrongPair] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState("playing"); // "playing" | "checking" | "finished"
  const [finalStats, setFinalStats] = useState(null);
  const [starting, setStarting] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [startMeta, setStartMeta] = useState(null);

  // Lazy one-time init instead of useRef(Date.now()), which would call
  // Date.now() on every render just to have it discarded after the first.
  const startedAtRef = useRef();
  if (startedAtRef.current === undefined) startedAtRef.current = Date.now();
  const lastFlipAtRef = useRef(null);
  const latenciesRef = useRef([]);
  const sessionActiveRef = useRef(false);

  const beginSession = () => {
    setStarting(true);
    createSession({ gameId: "memory-match" })
      .then((data) => {
        sessionActiveRef.current = true;
        startedAtRef.current = Date.now();
        setCards(shuffledDeck(pairsForDifficulty(data.difficulty)));
        setStartMeta({ difficulty: data.difficulty, adaptive: data.adaptive });
      })
      .catch(() => setSaveError(t("games.common.sessionStartError")))
      .finally(() => setStarting(false));
  };

  // Start a session on mount — the sessions API's response already carries
  // this game's starting-level metadata from the Adaptive Engine.
  useEffect(() => {
    let cancelled = false;
    createSession({ gameId: "memory-match" })
      .then((data) => {
        if (cancelled) return;
        sessionActiveRef.current = true;
        startedAtRef.current = Date.now();
        setCards(shuffledDeck(pairsForDifficulty(data.difficulty)));
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

  // Live timer.
  useEffect(() => {
    if (status !== "playing" && status !== "checking") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const finishGame = async (finalMistakes) => {
    const timeTaken = Math.floor((Date.now() - startedAtRef.current) / 1000);
    const pairs = cards.length / 2;
    const accuracy = pairs / (pairs + finalMistakes);
    const score = Math.max(
      0,
      Math.round(pairs * 150 - finalMistakes * 25 - timeTaken * 1.5)
    );
    const latencies = latenciesRef.current;
    const averageLatencyMs = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

    const stats = { score, accuracy, timeTaken, mistakes: finalMistakes, averageLatencyMs };
    setFinalStats(stats);
    setStatus("finished");

    if (sessionActiveRef.current) {
      try {
        const result = await endSession({ ...stats, hintsUsed: 0 });
        setFinalStats((prev) => ({ ...prev, adaptive: result.adaptive }));
      } catch {
        setSaveError(t("games.common.sessionSaveError"));
      }
    }
  };

  const handleCardClick = (index) => {
    if (starting || status !== "playing") return;
    if (flipped.includes(index) || matched.has(index)) return;
    if (flipped.length === 2) return;

    const now = Date.now();
    const nextFlipped = [...flipped, index];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 1) {
      lastFlipAtRef.current = now;
      return;
    }

    if (lastFlipAtRef.current) {
      latenciesRef.current.push(now - lastFlipAtRef.current);
    }

    setStatus("checking");
    const [firstIndex, secondIndex] = nextFlipped;
    const isMatch = cards[firstIndex].symbol === cards[secondIndex].symbol;

    if (isMatch) {
      const nextMatched = new Set(matched);
      nextMatched.add(firstIndex);
      nextMatched.add(secondIndex);
      setMatched(nextMatched);
      setFlipped([]);
      setStatus("playing");

      if (nextMatched.size === cards.length) {
        finishGame(mistakes);
      }
    } else {
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setWrongPair(nextFlipped);
      setTimeout(() => {
        setFlipped([]);
        setWrongPair([]);
        setStatus("playing");
      }, 700);
    }
  };

  const handlePlayAgain = () => {
    setFlipped([]);
    setMatched(new Set());
    setWrongPair([]);
    setMistakes(0);
    setElapsed(0);
    setFinalStats(null);
    setSaveError("");
    setStatus("playing");
    latenciesRef.current = [];
    lastFlipAtRef.current = null;
    sessionActiveRef.current = false;
    setStartMeta(null);
    beginSession();
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
          {t("games.common.backToGames")}
        </button>

        {status !== "finished" && (
          <div className="flex items-center gap-4 text-sm font-semibold text-[#1E293B] dark:text-white">
            <span className="flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-[#2563EB] dark:text-blue-400" strokeWidth={2} />
              {formatTime(elapsed)}
            </span>
            <span className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-red-400" strokeWidth={2} />
              {mistakes}
            </span>
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold text-[#1E293B] dark:text-white mb-1">{t("games.memoryMatch.title")}</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        {t("games.memoryMatch.description")}
      </p>

      {status !== "finished" && !starting && <SessionStartBanner difficulty={startMeta?.difficulty} adaptive={startMeta?.adaptive} />}

      {saveError && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {saveError}
        </div>
      )}

      {status === "finished" && finalStats ? (
        <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-8 flex flex-col items-center text-center animate-bounce-in overflow-hidden">
          <Confetti />
          <div className="w-16 h-16 rounded-2xl bg-[#F0F6FC] dark:bg-slate-700 flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-[#2563EB] dark:text-blue-400" strokeWidth={2} />
          </div>
          <h3 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-1">{t("games.memoryMatch.finishTitle")}</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">{t("games.memoryMatch.finishSubtitle")}</p>

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
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 max-w-xl mx-auto">
          {cards.map((card, index) => {
            const isFaceUp = flipped.includes(index) || matched.has(index);
            const isWrong = wrongPair.includes(index);
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleCardClick(index)}
                disabled={starting || matched.has(index)}
                aria-label={
                  isFaceUp
                    ? t("games.memoryMatch.cardShowing", { symbol: card.symbol })
                    : t("games.memoryMatch.cardFaceDown")
                }
                className={`card-flip-scene aspect-square ${isWrong ? "animate-shake" : ""}`}
              >
                <div className={`card-flip-inner ${isFaceUp ? "is-flipped" : ""}`}>
                  <div className="card-face rounded-2xl bg-[#2563EB] shadow-sm flex items-center justify-center text-white text-xl font-bold">
                    ?
                  </div>
                  <div
                    className={`card-face card-face-back rounded-2xl shadow-sm flex items-center justify-center text-3xl sm:text-4xl ${
                      matched.has(index)
                        ? "bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-400 animate-bounce-in"
                        : isWrong
                          ? "bg-red-50 dark:bg-red-950/40 ring-2 ring-red-300"
                          : "bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10"
                    }`}
                  >
                    {card.symbol}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MemoryMatchGame;
