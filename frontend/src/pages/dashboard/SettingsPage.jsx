import { useTranslation } from "react-i18next";
import { Sun, Moon, Type, Check } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import SegmentedControl from "../../components/SegmentedControl";

function SettingRow({ title, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-5 first:pt-0 last:pb-0 border-b border-gray-100 dark:border-slate-700 last:border-0">
      <div className="max-w-sm">
        <p className="font-semibold text-[#1E293B] dark:text-white">{title}</p>
        <p className="text-sm text-gray-500 dark:text-slate-400">{description}</p>
      </div>
      {children}
    </div>
  );
}

function LanguageGrid() {
  const { language, setLanguage, languages } = useLanguage();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full sm:max-w-md">
      {languages.map((lang) => {
        const isActive = lang.code === language;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code)}
            className={`relative flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
              isActive
                ? "bg-blue-50 dark:bg-blue-950/40 ring-2 ring-[#2563EB]"
                : "bg-gray-50 dark:bg-slate-700 ring-1 ring-transparent hover:ring-black/10 dark:hover:ring-white/10"
            }`}
          >
            {isActive && (
              <Check className="absolute top-2 right-2 w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" strokeWidth={2.5} />
            )}
            <span className="text-sm font-semibold text-[#1E293B] dark:text-white">{lang.nativeName}</span>
            <span className="text-xs text-gray-500 dark:text-slate-400">{lang.englishName}</span>
          </button>
        );
      })}
    </div>
  );
}

function SettingsPage() {
  const { t } = useTranslation();
  const { theme, setTheme, textScale, setTextScale } = useTheme();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#1E293B] dark:text-white mb-1">{t("settings.title")}</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">{t("settings.subtitle")}</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-6">
        <p className="text-sm font-semibold text-[#1E293B] dark:text-white mb-1">{t("settings.appearance")}</p>

        <div>
          <SettingRow title={t("settings.themeTitle")} description={t("settings.themeDesc")}>
            <SegmentedControl
              className="w-full max-w-xs"
              value={theme}
              onChange={setTheme}
              options={[
                { value: "light", label: t("settings.light"), icon: <Sun className="w-4 h-4" strokeWidth={2} /> },
                { value: "dark", label: t("settings.dark"), icon: <Moon className="w-4 h-4" strokeWidth={2} /> },
              ]}
            />
          </SettingRow>

          <SettingRow title={t("settings.textSizeTitle")} description={t("settings.textSizeDesc")}>
            <SegmentedControl
              className="w-full max-w-xs"
              value={textScale}
              onChange={setTextScale}
              options={[
                { value: "normal", label: t("settings.normal"), icon: <Type className="w-3.5 h-3.5" strokeWidth={2} /> },
                { value: "large", label: t("settings.large"), icon: <Type className="w-5 h-5" strokeWidth={2} /> },
              ]}
            />
          </SettingRow>

          <SettingRow title={t("settings.languageTitle")} description={t("settings.languageDesc")}>
            <LanguageGrid />
          </SettingRow>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-6">
        <p className="text-sm font-semibold text-[#1E293B] dark:text-white mb-4">{t("settings.account")}</p>
        <div>
          <SettingRow title={t("settings.emailTitle")} description={t("settings.emailDesc")}>
            <p className="text-sm text-gray-600 dark:text-slate-300">{user?.email}</p>
          </SettingRow>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
