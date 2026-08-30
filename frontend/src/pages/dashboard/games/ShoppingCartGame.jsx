import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Timer, ShoppingCart, Star, Trophy, RotateCcw, Tag } from "lucide-react";
import { createSession, endSession } from "../../../api/sessions";
import GameButton from "../../../components/GameButton";
import Confetti from "../../../components/Confetti";
import AdaptiveCoachNote from "../../../components/AdaptiveCoachNote";
import SessionStartBanner from "../../../components/SessionStartBanner";

const ITEM_POOL = [
  { name: "Apple", key: "apple", emoji: "🍎" },
  { name: "Bread", key: "bread", emoji: "🍞" },
  { name: "Milk", key: "milk", emoji: "🥛" },
  { name: "Eggs", key: "eggs", emoji: "🥚" },
  { name: "Cheese", key: "cheese", emoji: "🧀" },
  { name: "Banana", key: "banana", emoji: "🍌" },
  { name: "Orange", key: "orange", emoji: "🍊" },
  { name: "Juice", key: "juice", emoji: "🧃" },
  { name: "Cookies", key: "cookies", emoji: "🍪" },
  { name: "Rice", key: "rice", emoji: "🍚" },
  { name: "Yogurt", key: "yogurt", emoji: "🥣" },
  { name: "Chocolate", key: "chocolate", emoji: "🍫" },
];

// 8 levels: 1-4 simply ramp budget/prices/cart space; 5-8 add a coupon to plan around.
const LEVELS = [
  { budget: 20, cartLimit: 8, priceRange: [2, 6] },
  { budget: 22, cartLimit: 7, priceRange: [2, 7] },
  { budget: 24, cartLimit: 6, priceRange: [3, 8] },
  { budget: 26, cartLimit: 6, priceRange: [3, 9] },
  { budget: 28, cartLimit: 6, priceRange: [3, 9], coupon: { percent: 10 } },
  { budget: 30, cartLimit: 5, priceRange: [4, 10], coupon: { percent: 15 } },
  { budget: 32, cartLimit: 5, priceRange: [4, 11], coupon: { percent: 20 } },
  { budget: 34, cartLimit: 5, priceRange: [5, 12], coupon: { percent: 25 } },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildLevelItems(levelConfig) {
  const pool = [...ITEM_POOL].sort(() => Math.random() - 0.5).slice(0, 9);
  return pool.map((item, i) => ({
    id: `${i}-${item.name}`,
    ...item,
    price: randomInt(levelConfig.priceRange[0], levelConfig.priceRange[1]),
  }));
}

function effectivePrice(price, couponApplied, coupon) {
  if (!couponApplied || !coupon) return price;
  return Math.round(price * (1 - coupon.percent / 100) * 100) / 100;
}

/** Best achievable item count under budget/cart limit — greedy cheapest-first is optimal for maximizing count. */
function bestPossibleCount(items, budget, cartLimit, couponApplied, coupon) {
  const sorted = [...items].sort(
    (a, b) => effectivePrice(a.price, couponApplied, coupon) - effectivePrice(b.price, couponApplied, coupon)
  );
  let total = 0;
  let count = 0;
  for (const item of sorted) {
    const price = effectivePrice(item.price, couponApplied, coupon);
    if (count >= cartLimit) break;
    if (total + price > budget) continue;
    total += price;
    count += 1;
  }
  return count;
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function StarRating({ count }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          className={`w-6 h-6 ${
            n <= count ? "text-amber-400 fill-amber-400 animate-bounce-in" : "text-gray-200 dark:text-slate-600"
          }`}
          style={n <= count ? { animationDelay: `${n * 120}ms`, animationFillMode: "backwards" } : undefined}
        />
      ))}
    </div>
  );
}

function ShoppingCartGame() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [levelIndex, setLevelIndex] = useState(0);
  const [items, setItems] = useState(() => buildLevelItems(LEVELS[0]));
  const [cart, setCart] = useState(new Set());
  const [couponApplied, setCouponApplied] = useState(false);
  const [levelResult, setLevelResult] = useState(null); // { stars, count, best } | null
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
  const totalsRef = useRef({ missedItems: 0, accuracySum: 0, levelsPlayed: 0 });

  const level = LEVELS[levelIndex];

  // The Adaptive Engine decides the starting level — we hold off rendering
  // the board until we know it, instead of showing level 1 then swapping.
  useEffect(() => {
    let cancelled = false;
    createSession({ gameId: "shopping-cart" })
      .then((data) => {
        if (cancelled) return;
        sessionActiveRef.current = true;
        startedAtRef.current = Date.now();
        const startIndex = Math.min(LEVELS.length - 1, Math.max(0, (data.difficulty || 1) - 1));
        setLevelIndex(startIndex);
        setItems(buildLevelItems(LEVELS[startIndex]));
        levelStartRef.current = Date.now();
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

  useEffect(() => {
    if (status !== "playing") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const cartItems = useMemo(() => items.filter((i) => cart.has(i.id)), [items, cart]);
  const total = useMemo(
    () => cartItems.reduce((sum, i) => sum + effectivePrice(i.price, couponApplied, level.coupon), 0),
    [cartItems, couponApplied, level.coupon]
  );
  const remaining = Math.round((level.budget - total) * 100) / 100;
  const cartFull = cart.size >= level.cartLimit;

  const canAfford = (item) => {
    const price = effectivePrice(item.price, couponApplied, level.coupon);
    return price <= remaining + 0.001;
  };

  const toggleItem = (item) => {
    if (starting || levelResult) return;
    const next = new Set(cart);
    if (next.has(item.id)) {
      next.delete(item.id);
    } else {
      if (cartFull || !canAfford(item)) return;
      next.add(item.id);
    }
    setCart(next);
  };

  const finishGame = async () => {
    const timeTaken = Math.floor((Date.now() - startedAtRef.current) / 1000);
    const { missedItems, accuracySum, levelsPlayed } = totalsRef.current;
    const accuracy = levelsPlayed > 0 ? accuracySum / levelsPlayed : 0;
    const latencies = latenciesRef.current;
    const averageLatencyMs = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

    const stats = { score: scoreRef.current, accuracy, timeTaken, mistakes: missedItems, averageLatencyMs };
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

  const handleCheckout = () => {
    if (cart.size === 0 || starting) return;

    latenciesRef.current.push(Date.now() - levelStartRef.current);

    const best = bestPossibleCount(items, level.budget, level.cartLimit, couponApplied, level.coupon);
    const count = cart.size;
    const stars = count >= best ? 3 : count >= best - 1 ? 2 : 1;

    totalsRef.current.missedItems += Math.max(0, best - count);
    totalsRef.current.accuracySum += Math.min(1, best > 0 ? count / best : 1);
    totalsRef.current.levelsPlayed += 1;
    scoreRef.current += count * 20 + (stars === 3 ? 40 : stars === 2 ? 20 : 0);
    setScore(scoreRef.current);

    setLevelResult({ stars, count, best });

    setTimeout(() => {
      if (levelIndex + 1 >= LEVELS.length) {
        finishGame();
      } else {
        const nextIndex = levelIndex + 1;
        setLevelIndex(nextIndex);
        setItems(buildLevelItems(LEVELS[nextIndex]));
        setCart(new Set());
        setCouponApplied(false);
        setLevelResult(null);
        levelStartRef.current = Date.now();
      }
    }, 1800);
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
          {t("games.common.backToGames")}
        </button>

        {status !== "finished" && (
          <div className="flex items-center gap-4 text-sm font-semibold text-[#1E293B] dark:text-white">
            <span>{t("games.common.pointsShort", { score })}</span>
            <span className="flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-[#2563EB] dark:text-blue-400" strokeWidth={2} />
              {formatTime(elapsed)}
            </span>
            <span className="text-gray-500 dark:text-slate-400 font-medium">
              {t("games.shoppingCart.levelOf", { current: levelIndex + 1, total: LEVELS.length })}
            </span>
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold text-[#1E293B] dark:text-white mb-1">{t("games.shoppingCart.title")}</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        {status === "finished" ? t("games.shoppingCart.tripComplete") : t("games.shoppingCart.description")}
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
          <h3 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-1">{t("games.shoppingCart.finishTitle")}</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
            {t("games.shoppingCart.finishSubtitle", { count: LEVELS.length })}
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
              <p className="text-xs text-gray-500 dark:text-slate-400">{t("games.common.efficiency")}</p>
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
      ) : starting ? (
        <div className="max-w-3xl mx-auto h-64 rounded-3xl bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10 animate-pulse" />
      ) : (
        <div className="max-w-3xl mx-auto">
          {/* Budget / cart bar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-5 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">{t("games.shoppingCart.budgetRemaining")}</p>
                <p className={`text-xl font-bold ${remaining < level.budget * 0.15 ? "text-amber-500" : "text-[#1E293B] dark:text-white"}`}>
                  ${remaining.toFixed(2)}{" "}
                  <span className="text-sm font-medium text-gray-400 dark:text-slate-500">/ ${level.budget}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: level.cartLimit }).map((_, i) => (
                  <ShoppingCart
                    key={i}
                    className={`w-4 h-4 ${i < cart.size ? "text-[#2563EB] dark:text-blue-400" : "text-gray-200 dark:text-slate-600"}`}
                    strokeWidth={2}
                  />
                ))}
              </div>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-[#2563EB] transition-all duration-300"
                style={{ width: `${Math.min(100, (total / level.budget) * 100)}%` }}
              />
            </div>

            {level.coupon && (
              <button
                type="button"
                onClick={() => setCouponApplied((v) => !v)}
                disabled={!!levelResult}
                className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 border-dashed transition-colors ${
                  couponApplied
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                    : "border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-[#2563EB] hover:text-[#2563EB]"
                }`}
              >
                <Tag className="w-4 h-4" strokeWidth={2} />
                {t("games.shoppingCart.couponButtonLabel", {
                  label: t("games.shoppingCart.couponOffLabel", { percent: level.coupon.percent }),
                  status: couponApplied
                    ? t("games.shoppingCart.couponStatusApplied")
                    : t("games.shoppingCart.couponStatusTapToApply"),
                })}
              </button>
            )}
          </div>

          {/* Items grid */}
          {levelResult ? (
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-8 flex flex-col items-center text-center animate-bounce-in overflow-hidden">
              {levelResult.stars === 3 && <Confetti count={18} />}
              <StarRating count={levelResult.stars} />
              <p className="mt-3 font-semibold text-[#1E293B] dark:text-white">
                {t("games.shoppingCart.itemsInCart", { count: levelResult.count })}
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {levelResult.stars === 3
                  ? t("games.shoppingCart.perfectResult")
                  : t("games.shoppingCart.bestPossibleResult", { best: levelResult.best })}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                {items.map((item) => {
                  const inCart = cart.has(item.id);
                  const price = effectivePrice(item.price, couponApplied, level.coupon);
                  const disabled = !inCart && (cartFull || !canAfford(item));

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(item)}
                      disabled={starting || disabled}
                      className={`flex flex-col items-center gap-1 p-3 rounded-2xl shadow-sm transition-all ${
                        inCart
                          ? "bg-blue-50 dark:bg-blue-950/40 ring-2 ring-[#2563EB]"
                          : disabled
                            ? "bg-gray-50 dark:bg-slate-800/50 opacity-40 cursor-not-allowed"
                            : "bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10 hover:shadow-md hover:-translate-y-0.5"
                      }`}
                    >
                      <span className="text-3xl">{item.emoji}</span>
                      <span className="text-xs font-semibold text-[#1E293B] dark:text-white">
                        {t(`games.shoppingCart.items.${item.key}`)}
                      </span>
                      <span className="text-xs">
                        {couponApplied && level.coupon ? (
                          <>
                            <span className="line-through text-gray-400 dark:text-slate-500 mr-1">${item.price}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">${price}</span>
                          </>
                        ) : (
                          <span className="text-gray-500 dark:text-slate-400">${item.price}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.size === 0 || starting}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1d4ed8] shadow-md shadow-blue-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("games.shoppingCart.checkout", { count: cart.size })}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ShoppingCartGame;
