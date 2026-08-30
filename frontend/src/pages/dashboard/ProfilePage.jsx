import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut, Mail, ShieldCheck, CalendarDays } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-100 dark:border-slate-700 last:border-0">
      <div className="w-9 h-9 rounded-lg bg-[#F0F6FC] dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#2563EB] dark:text-blue-400" strokeWidth={2} />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-[#1E293B] dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function ProfilePage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      })
    : "—";

  return (
    <div>
      <h2 className="text-xl font-bold text-[#1E293B] dark:text-white mb-1">{t("profile.title")}</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">{t("profile.subtitle")}</p>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">
              {user?.name?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
          <div>
            <p className="text-lg font-bold text-[#1E293B] dark:text-white">{user?.name}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{user?.email}</p>
          </div>
        </div>

        <div>
          <InfoRow icon={Mail} label={t("profile.emailAddress")} value={user?.email} />
          <InfoRow icon={ShieldCheck} label={t("profile.accountType")} value={user?.role || "user"} />
          <InfoRow icon={CalendarDays} label={t("profile.memberSince")} value={memberSince} />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60 transition-colors"
        >
          <LogOut className="w-4 h-4" strokeWidth={2} />
          {t("common.logout")}
        </button>
      </div>
    </div>
  );
}

export default ProfilePage;
