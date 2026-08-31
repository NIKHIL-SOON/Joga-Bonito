import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";

// Surfaces the Adaptive Engine's starting-level metadata for this game —
// the same `adaptive` object the sessions API's createSession call already
// returns — right when the game loads. This app never invents a starting
// level or trend itself; it only displays what the engine already decided.
function SessionStartBanner({ difficulty, adaptive }) {
  const { t } = useTranslation();
  if (!adaptive || !adaptive.available) return null;

  const { analysis, trend, isNewUser } = adaptive;
  if (!analysis && (!trend || trend === "new_user")) return null;

  const TrendIcon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;
  const trendColor =
    trend === "improving"
      ? "text-emerald-600 dark:text-emerald-400"
      : trend === "declining"
        ? "text-amber-600 dark:text-amber-400"
        : "text-gray-500 dark:text-slate-400";
  const trendLabel =
    trend === "improving"
      ? t("games.common.trendImproving")
      : trend === "declining"
        ? t("games.common.trendDeclining")
        : trend === "steady"
          ? t("games.common.trendSteady")
          : trend;

  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl bg-[#F0F6FC] dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10 px-4 py-3 animate-fade-in-up">
      <div className="w-8 h-8 shrink-0 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-[#2563EB] dark:text-blue-400" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB] dark:text-blue-400 mb-0.5">
          {typeof difficulty === "number"
            ? t("games.common.startingAtLevel", { level: difficulty })
            : t("games.common.adaptiveEngine")}
        </p>
        {analysis && <p className="text-sm text-[#1E293B] dark:text-white">{analysis}</p>}
        {!isNewUser && trend && trend !== "new_user" && (
          <p className={`flex items-center gap-1.5 text-xs mt-1 font-semibold ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
            {t("games.common.recentTrend", { trend: trendLabel })}
          </p>
        )}
      </div>
    </div>
  );
}

export default SessionStartBanner;
