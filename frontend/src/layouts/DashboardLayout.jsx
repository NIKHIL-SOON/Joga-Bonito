import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Gamepad2,
  LineChart,
  Settings,
  CircleUser,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const LOGO_ICON = (
  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

function NavItems({ onNavigate }) {
  const { t } = useTranslation();
  const navItems = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard, end: true },
    { to: "/dashboard/games", label: t("nav.games"), icon: Gamepad2 },
    { to: "/dashboard/progress", label: t("nav.progress"), icon: LineChart },
    { to: "/dashboard/settings", label: t("nav.settings"), icon: Settings },
    { to: "/dashboard/profile", label: t("nav.profile"), icon: CircleUser },
  ];

  return (
    <nav className="flex-1 space-y-1.5">
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
              isActive
                ? "bg-white text-[#1E293B] shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-gray-600 hover:bg-white/60 hover:text-[#1E293B] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            }`
          }
        >
          <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarFooter({ onLogout }) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={toggleTheme}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-gray-600 hover:bg-white/60 hover:text-[#1E293B] transition-colors dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        {theme === "dark" ? (
          <Sun className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
        ) : (
          <Moon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
        )}
        {theme === "dark" ? t("settings.light") : t("settings.dark")}
      </button>

      <button
        type="button"
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-400"
      >
        <LogOut className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
        {t("common.logout")}
      </button>
    </div>
  );
}

function DashboardLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row w-full bg-[#FFFDF5] dark:bg-slate-900">
      {/* Mobile top bar */}
      <div className="flex lg:hidden items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/10 bg-[#F0F6FC] dark:bg-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-[#1E293B] rounded-lg flex items-center justify-center">
            {LOGO_ICON}
          </div>
          <span className="text-base font-bold text-[#2563EB] dark:text-blue-400">
            Mindful Moments
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen((v) => !v)}
          aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
          className="p-2 rounded-lg text-[#1E293B] dark:text-white"
        >
          {mobileNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* SIDEBAR */}
      <aside
        className={`${
          mobileNavOpen ? "flex" : "hidden"
        } lg:flex flex-col w-full lg:w-72 lg:flex-shrink-0 lg:h-full bg-[#F0F6FC] dark:bg-slate-800 px-4 py-6 lg:px-5`}
      >
        <div className="hidden lg:flex items-center space-x-3 px-2 mb-8">
          <div className="w-10 h-10 bg-[#1E293B] rounded-xl flex items-center justify-center shadow-sm">
            {LOGO_ICON}
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-none text-[#1E293B] dark:text-white">
              mindful
            </span>
            <span className="text-lg font-bold leading-none text-[#2563EB] dark:text-blue-400">
              moments
            </span>
          </div>
        </div>

        <NavItems onNavigate={() => setMobileNavOpen(false)} />
        <SidebarFooter onLogout={handleLogout} />
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:h-full lg:overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 lg:px-12 lg:py-10">
          <header className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[#2563EB] dark:text-blue-400 font-semibold tracking-wider uppercase text-xs mb-1">
                {t("dashboardHome.greetingEyebrow")}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] dark:text-white">
                {t("dashboardHome.greeting", { name: user?.name?.split(" ")[0] || t("dashboardHome.thereFallback") })} 👋
              </h1>
            </div>
          </header>

          <div key={location.pathname} className="animate-fade-in-up">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;
