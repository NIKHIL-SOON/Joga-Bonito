import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// Surfaces the Adaptive Engine's own decision + analysis after a session ends.
// This app never computes "next level" itself — it only displays what the
// engine decided.
function AdaptiveCoachNote({ adaptive }) {
  const { t } = useTranslation();
  if (!adaptive || !adaptive.analysis) return null;

  const { decision, currentLevel, nextDifficulty, analysis } = adaptive;
  const changed = typeof nextDifficulty === "number" && typeof currentLevel === "number" && nextDifficulty !== currentLevel;

  const DecisionIcon = decision === "increase" ? TrendingUp : decision === "decrease" ? TrendingDown : Minus;
  const decisionColor =
    decision === "increase"
      ? "text-emerald-600 dark:text-emerald-400"
      : decision === "decrease"
        ? "text-amber-600 dark:text-amber-400"
        : "text-gray-500 dark:text-slate-400";

  return (
    <div className="w-full max-w-sm mt-4 rounded-2xl bg-[#F0F6FC] dark:bg-slate-700 px-4 py-3 text-left">
      <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB] dark:text-blue-400 mb-1">
        {t("games.common.coachNote")}
      </p>
      <p className="text-sm text-[#1E293B] dark:text-white">{analysis}</p>
      {changed && (
        <p className={`flex items-center gap-1.5 text-xs mt-2 font-semibold ${decisionColor}`}>
          <DecisionIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
          {t("games.common.nextTimeLevel", { from: currentLevel, to: nextDifficulty })}
        </p>
      )}
    </div>
  );
}

export default AdaptiveCoachNote;
