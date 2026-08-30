import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Gamepad2, Flame, Brain, ArrowRight, Sparkles } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { fetchGames } from "../../api/games";
import { fetchSessionStats } from "../../api/sessions";
import { useAuth } from "../../context/AuthContext";
import { useCountUp } from "../../hooks/useCountUp";
import { GAME_THEME } from "../../constants/gameTheme";
import { DOMAIN_STYLES, DOMAIN_LABEL_KEYS } from "../../constants/domainTheme";

// stats.trend's "daily" bucket keys are UTC "YYYY-MM-DD" strings — parse and
// format in UTC so the label never silently shifts a day for viewers west of UTC.
function formatDayLabel(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function StatCard({ icon: Icon, label, value, delay }) {
  const animated = useCountUp(value);
  return (
    <div
      className="animate-fade-in-up bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-5 flex items-center gap-4"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <div className="w-11 h-11 rounded-xl bg-[#F0F6FC] dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-[#2563EB] dark:text-blue-400" strokeWidth={2} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#1E293B] dark:text-white leading-none">{animated}</p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{label}</p>
      </div>
    </div>
  );
}

function QuickPlayCard({ game, delay }) {
  const { t } = useTranslation();
  const theme = GAME_THEME[game.gameId];
  if (!theme) return null;

  return (
    <Link
      to={theme.route}
      className="animate-fade-in-up group flex-shrink-0 w-36 sm:w-40 rounded-2xl bg-white dark:bg-slate-800 shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <div className={`h-20 flex items-center justify-center bg-gradient-to-br ${theme.gradient}`}>
        <span className="text-4xl drop-shadow-md">{theme.emoji}</span>
      </div>
      <div className="p-3">
        <p className="text-sm font-bold text-[#1E293B] dark:text-white truncate">{game.name}</p>
        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#2563EB] dark:text-blue-400">
          {t("games.playNow")}
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
        </p>
      </div>
    </Link>
  );
}

function DashboardHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchGames(), fetchSessionStats("daily")])
      .then(([gamesData, statsData]) => {
        if (!cancelled) {
          setGames(gamesData);
          setStats(statsData);
        }
      })
      .catch(() => {
        if (!cancelled) setGames([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const domainCount = new Set(games.map((g) => g.cognitiveDomain)).size;
  const hasSessions = stats && stats.totalSessions > 0;

  const weekTrend = useMemo(
    () => (stats?.trend || []).slice(-7).map((point) => ({ ...point, label: formatDayLabel(point.date) })),
    [stats]
  );

  const topDomain = useMemo(() => {
    const breakdown = stats?.domainBreakdown || [];
    if (breakdown.length === 0) return null;
    return breakdown.reduce((best, d) => (d.count > (best?.count || 0) ? d : best), null);
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <div className="bg-[#F0F6FC] dark:bg-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <p className="text-[#2563EB] dark:text-blue-400 font-semibold tracking-wider uppercase text-xs mb-2">
            {t("common.dailyCompanion")}
          </p>
          <h2 className="text-2xl font-bold text-[#1E293B] dark:text-white mb-1">
            {t("dashboardHome.welcomeBack", { name: user?.name?.split(" ")[0] })}
          </h2>
          <p className="text-gray-600 dark:text-slate-400 max-w-md">
            {t("dashboardHome.welcomeSubtext")}
          </p>
        </div>

        <Link
          to="/dashboard/games"
          className="group flex-shrink-0 inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-base font-semibold text-white bg-[#2563EB] hover:bg-[#1d4ed8] shadow-md shadow-blue-500/20 transition-colors"
        >
          {t("dashboardHome.browseGames")}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Gamepad2}
          label={t("dashboardHome.statGamesAvailable")}
          value={loading ? 0 : games.length}
          delay={0}
        />
        <StatCard
          icon={Brain}
          label={t("dashboardHome.statCognitiveAreas")}
          value={loading ? 0 : domainCount}
          delay={80}
        />
        <StatCard icon={Flame} label={t("dashboardHome.statDayStreak")} value={stats?.streak || 0} delay={160} />
      </div>

      {/* Quick play */}
      {!loading && games.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-bold text-[#1E293B] dark:text-white">{t("dashboardHome.quickPlayTitle")}</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">{t("dashboardHome.quickPlaySubtitle")}</p>
            </div>
            <Link
              to="/dashboard/games"
              className="hidden sm:inline text-sm font-semibold text-[#2563EB] dark:text-blue-400 hover:underline flex-shrink-0"
            >
              {t("dashboardHome.quickPlaySeeAll")}
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
            {games.map((game, i) => (
              <QuickPlayCard key={game._id || game.gameId} game={game} delay={i * 60} />
            ))}
          </div>
        </div>
      )}

      {/* This week at a glance */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-6">
          <p className="text-sm font-semibold text-[#1E293B] dark:text-white mb-4">
            {t("dashboardHome.weekGlanceTitle")}
          </p>
          {weekTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={weekTrend} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Avg accuracy"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.05)" }}
                />
                <Line
                  type="monotone"
                  dataKey="avgAccuracy"
                  stroke="#2563EB"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#2563EB" }}
                  activeDot={{ r: 5 }}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 dark:text-slate-400 py-8 text-center">
              {t("dashboardHome.weekGlanceEmpty")}
            </p>
          )}
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-6 flex flex-col justify-center">
          <div className="w-11 h-11 rounded-xl bg-[#F0F6FC] dark:bg-slate-700 flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5 text-[#2563EB] dark:text-blue-400" strokeWidth={2} />
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">{t("dashboardHome.topFocusArea")}</p>
          {topDomain ? (
            <span
              className={`inline-block w-fit px-3 py-1.5 rounded-full text-sm font-bold capitalize ${
                DOMAIN_STYLES[topDomain.domain] || "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {DOMAIN_LABEL_KEYS[topDomain.domain] ? t(DOMAIN_LABEL_KEYS[topDomain.domain]) : topDomain.domain}
            </span>
          ) : (
            <p className="text-lg font-bold text-[#1E293B] dark:text-white">{t("dashboardHome.noFocusAreaYet")}</p>
          )}
        </div>
      </div>

      {/* Nudge / recent activity */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-6">
        {hasSessions ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {t("dashboardHome.nudgeWithSessions", { count: stats.totalSessions, score: stats.bestScore })}{" "}
            <Link to="/dashboard/progress" className="font-semibold text-[#2563EB] dark:text-blue-400 hover:underline">
              {t("dashboardHome.viewFullProgress")}
            </Link>
          </p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {t("dashboardHome.nudgeEmpty")}{" "}
            <Link to="/dashboard/games" className="font-semibold text-[#2563EB] dark:text-blue-400 hover:underline">
              {t("dashboardHome.startFirstGame")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default DashboardHome;
