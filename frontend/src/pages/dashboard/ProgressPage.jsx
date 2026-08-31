import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { LineChart as LineChartIcon, Trophy, Target, Flame, ListChecks, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fetchSessionStats, fetchSessions, fetchAdaptiveLog } from "../../api/sessions";
import { useCountUp } from "../../hooks/useCountUp";
import SegmentedControl from "../../components/SegmentedControl";

const STATUS_STYLE = {
  improving: {
    label: "Improving",
    icon: TrendingUp,
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  declining: {
    label: "Needs support",
    icon: TrendingDown,
    className: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  steady: {
    label: "Steady",
    icon: Minus,
    className: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
  },
};

const DOMAIN_COLORS = {
  memory: "#3b82f6",
  attention: "#a855f7",
  orientation: "#10b981",
  motor: "#f97316",
  executive: "#f43f5e",
  other: "#94a3b8",
};

const RANGE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function formatDateLabel(dateKey, range) {
  if (range === "monthly") {
    const [year, month] = dateKey.split("-");
    return new Date(Number(year), Number(month) - 1).toLocaleDateString(undefined, {
      month: "short",
      year: "2-digit",
    });
  }
  if (range === "weekly") {
    const [, week] = dateKey.split("-W");
    return `Wk ${Number(week)}`;
  }
  // dateKey is a UTC date-only string ("YYYY-MM-DD") from the backend's UTC
  // bucketing. `new Date(dateKey)` parses that as UTC midnight, but
  // .toLocaleDateString() renders in the viewer's local zone — for anyone
  // west of UTC that silently shifts the label back a day. Keep both the
  // parsing and the formatting in UTC so the label always matches the bucket.
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function StatCard({ icon: Icon, label, value, suffix = "" }) {
  const animated = useCountUp(value);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-[#F0F6FC] dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-[#2563EB] dark:text-blue-400" strokeWidth={2} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#1E293B] dark:text-white leading-none">
          {animated}
          {suffix}
        </p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{label}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-8 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#F0F6FC] dark:bg-slate-700 flex items-center justify-center mb-4">
        <LineChartIcon className="w-7 h-7 text-[#2563EB] dark:text-blue-400" strokeWidth={2} />
      </div>
      <h3 className="text-lg font-bold text-[#1E293B] dark:text-white mb-1">No sessions yet</h3>
      <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mb-5">
        Once you complete a game, your results will start appearing here — no
        rush, come back any time.
      </p>
      <Link
        to="/dashboard/games"
        className="inline-flex items-center justify-center py-2.5 px-5 rounded-xl text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1d4ed8] shadow-md shadow-blue-500/20 transition-colors"
      >
        Browse games
      </Link>
    </div>
  );
}

function humanizeGameId(gameId) {
  return gameId.replace(/-/g, " ");
}

function GameBreakdownCard({ breakdown }) {
  const status = STATUS_STYLE[breakdown.status];
  const StatusIcon = status.icon;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-bold text-[#1E293B] dark:text-white capitalize">{humanizeGameId(breakdown.gameId)}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Level {breakdown.latestLevel ?? "—"} · {breakdown.sessionsLogged} tracked session
            {breakdown.sessionsLogged === 1 ? "" : "s"}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${status.className}`}
        >
          <StatusIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
          {status.label}
        </span>
      </div>

      {breakdown.sparkline.length > 1 ? (
        <ResponsiveContainer width="100%" height={64}>
          <LineChart data={breakdown.sparkline} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <Line
              type="monotone"
              dataKey="score"
              stroke="#2563EB"
              strokeWidth={2}
              dot={false}
              animationDuration={700}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-gray-400 dark:text-slate-500 py-4 text-center">
          Play this game a few more times to see a trend.
        </p>
      )}
    </div>
  );
}

function ProgressPage() {
  const [range, setRange] = useState("daily");
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [gameLogs, setGameLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchSessionStats(range), fetchSessions()])
      .then(([statsData, sessionsData]) => {
        if (cancelled) return;
        setStats(statsData);
        setSessions(sessionsData.sessions || []);
      })
      .catch(() => {
        if (!cancelled) {
          setStats(null);
          setSessions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  // The Adaptive Engine's own exchange history, segregated by game — this
  // isn't range-dependent, so it's fetched once rather than on every toggle.
  useEffect(() => {
    let cancelled = false;
    fetchAdaptiveLog()
      .then((data) => {
        if (!cancelled) setGameLogs(data.logs || []);
      })
      .catch(() => {
        if (!cancelled) setGameLogs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const gameBreakdown = useMemo(() => {
    const byGame = new Map();
    for (const log of gameLogs) {
      if (!byGame.has(log.gameId)) byGame.set(log.gameId, []);
      byGame.get(log.gameId).push(log);
    }

    return Array.from(byGame.entries())
      .map(([gameId, logs]) => {
        // logs arrive newest-first from the API; chronological order for the sparkline.
        const chronological = [...logs].reverse();
        const latest = logs[0];
        const increases = logs.filter((l) => l.response?.decision === "increase").length;
        const decreases = logs.filter((l) => l.response?.decision === "decrease").length;
        const status = increases > decreases ? "improving" : decreases > increases ? "declining" : "steady";

        return {
          gameId,
          status,
          sessionsLogged: logs.length,
          latestLevel: latest.response?.recommended_level ?? latest.response?.current_level ?? latest.request?.level_played,
          sparkline: chronological.map((l, i) => ({ i, score: l.request?.score ?? 0 })),
        };
      })
      .sort((a, b) => b.sessionsLogged - a.sessionsLogged);
  }, [gameLogs]);

  const hasData = stats && stats.totalSessions > 0;

  const trendData = (stats?.trend || []).map((point) => ({
    ...point,
    label: formatDateLabel(point.date, range),
  }));

  const pieData = (stats?.domainBreakdown || []).map((d) => ({
    name: d.domain,
    value: d.count,
  }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1E293B] dark:text-white mb-1">Your progress</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            A gentle record of how your practice is going over time.
          </p>
        </div>
        {hasData && (
          <SegmentedControl
            className="w-full sm:w-auto"
            value={range}
            onChange={setRange}
            options={RANGE_OPTIONS}
          />
        )}
      </div>

      {loading && !stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && !hasData && <EmptyState />}

      {hasData && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={ListChecks} label="Sessions completed" value={stats.totalSessions} />
            <StatCard icon={Trophy} label="Best score" value={stats.bestScore} />
            <StatCard icon={Target} label="Avg accuracy" value={stats.avgAccuracy} suffix="%" />
            <StatCard icon={Flame} label="Day streak" value={stats.streak} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-6">
              <p className="text-sm font-semibold text-[#1E293B] dark:text-white mb-4">
                Accuracy trend
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart key={range} data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-slate-700" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
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
                    dot={{ r: 4, fill: "#2563EB" }}
                    activeDot={{ r: 6 }}
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-6">
              <p className="text-sm font-semibold text-[#1E293B] dark:text-white mb-4">
                Sessions by area
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart key={range}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    animationDuration={900}
                    animationEasing="ease-out"
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={DOMAIN_COLORS[entry.name] || DOMAIN_COLORS.other}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.05)" }} />
                  <Legend
                    verticalAlign="bottom"
                    height={24}
                    formatter={(value) => <span className="capitalize text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent sessions */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-6">
            <p className="text-sm font-semibold text-[#1E293B] dark:text-white mb-4">
              Recent sessions
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 dark:text-slate-500">
                    <th className="font-medium pb-2 pr-4">Game</th>
                    <th className="font-medium pb-2 pr-4">Date</th>
                    <th className="font-medium pb-2 pr-4">Score</th>
                    <th className="font-medium pb-2">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 6).map((session) => (
                    <tr
                      key={session._id}
                      className="border-t border-gray-100 dark:border-slate-700"
                    >
                      <td className="py-2.5 pr-4 font-semibold text-[#1E293B] dark:text-white capitalize">
                        {session.gameId.replace(/-/g, " ")}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500 dark:text-slate-400">
                        {new Date(session.completedAt || session.startedAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500 dark:text-slate-400">
                        {session.performance?.score ?? "—"}
                      </td>
                      <td className="py-2.5 text-gray-500 dark:text-slate-400">
                        {session.performance ? `${Math.round(session.performance.accuracy * 100)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Per-game breakdown — powered by the Adaptive Engine's own decision history */}
      {gameBreakdown.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-[#1E293B] dark:text-white mb-1">Game-by-game breakdown</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
            Whether you're progressing or could use more practice, per game — straight from the Adaptive Engine's own decisions.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gameBreakdown.map((breakdown) => (
              <GameBreakdownCard key={breakdown.gameId} breakdown={breakdown} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgressPage;
