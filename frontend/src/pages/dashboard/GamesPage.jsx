import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Lock, Sparkles } from "lucide-react";
import { fetchGames } from "../../api/games";
import GameButton from "../../components/GameButton";
import { GAME_THEME } from "../../constants/gameTheme";
import { DOMAIN_STYLES, DOMAIN_LABEL_KEYS } from "../../constants/domainTheme";

function DomainBadge({ domain }) {
  const { t } = useTranslation();
  const style = DOMAIN_STYLES[domain] || "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300";
  const labelKey = DOMAIN_LABEL_KEYS[domain];
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold capitalize ${style}`}>
      {labelKey ? t(labelKey) : domain}
    </span>
  );
}

function GameCard({ game, delay }) {
  const { t } = useTranslation();
  const theme = GAME_THEME[game.gameId];

  return (
    <div
      className="animate-fade-in-up group bg-white dark:bg-slate-800 rounded-3xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:rotate-[0.5deg] hover:shadow-2xl"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <div
        className={`relative h-32 flex items-center justify-center overflow-hidden bg-gradient-to-br ${
          theme ? theme.gradient : "from-gray-300 to-gray-400"
        }`}
      >
        <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-2 w-16 h-16 rounded-full bg-white/10" />
        <span className="relative text-6xl drop-shadow-md animate-float-y">{theme ? theme.emoji : "🎮"}</span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="mb-2">
          <DomainBadge domain={game.cognitiveDomain} />
        </div>
        <h3 className="text-lg font-bold text-[#1E293B] dark:text-white mb-1">{game.name}</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 flex-1">{game.description}</p>

        {theme ? (
          <Link to={theme.route}>
            <GameButton color="blue" className="mt-4 w-full py-3 text-sm">
              <Sparkles className="w-4 h-4" strokeWidth={2} />
              {t("games.playNow")}
            </GameButton>
          </Link>
        ) : (
          <GameButton color="neutral" className="mt-4 w-full py-3 text-sm" disabled title={t("games.comingSoonTitle")}>
            <Lock className="w-4 h-4" strokeWidth={2} />
            {t("games.comingSoon")}
          </GameButton>
        )}
      </div>
    </div>
  );
}

function GamesPage() {
  const { t } = useTranslation();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchGames()
      .then((data) => {
        if (!cancelled) setGames(data);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="bg-gradient-to-r from-[#2563EB] to-indigo-500 rounded-3xl p-6 sm:p-8 mb-6 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-16 w-16 h-16 rounded-full bg-white/10" />
        <p className="text-blue-100 font-semibold tracking-wider uppercase text-xs mb-2">{t("games.hubEyebrow")}</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">{t("games.hubHeading")}</h2>
        <p className="text-blue-100 text-sm max-w-md">{t("games.hubSubtitle")}</p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-3xl bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && hasError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t("games.loadError")}
        </div>
      )}

      {!loading && !hasError && games.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-6 text-sm text-gray-500 dark:text-slate-400">
          {t("games.empty")}
        </div>
      )}

      {!loading && !hasError && games.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {games.map((game, i) => (
            <GameCard key={game._id || game.gameId} game={game} delay={i * 80} />
          ))}
        </div>
      )}
    </div>
  );
}

export default GamesPage;
