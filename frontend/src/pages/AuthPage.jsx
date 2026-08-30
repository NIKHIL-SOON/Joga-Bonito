import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sun, Moon } from "lucide-react";
import { AuthApiError } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import LanguageMenu from "../components/LanguageMenu";

const LOGO_ICON = (
  <svg
    className="w-5 h-5 text-white"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

function AuthPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isSignup = mode === "signup";
  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSwitchMode = (next) => {
    if (next === mode) return;
    setError("");
    setMode(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.target);
    const name = formData.get("name")?.trim();
    const email = formData.get("email")?.trim();
    const password = formData.get("password");

    setSubmitting(true);
    try {
      if (isSignup) {
        await register({ name, email, password });
      } else {
        await login({ email, password });
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message = err instanceof AuthApiError ? err.message : t("auth.genericError");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen lg:h-screen flex flex-col lg:flex-row w-full lg:overflow-hidden bg-[#FFFDF5] dark:bg-slate-900">
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <LanguageMenu />
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? t("common.switchToLight") : t("common.switchToDark")}
          title={theme === "dark" ? t("common.switchToLight") : t("common.switchToDark")}
          className="w-10 h-10 rounded-full bg-white/80 dark:bg-slate-700/80 backdrop-blur ring-1 ring-black/5 dark:ring-white/10 shadow-sm flex items-center justify-center text-[#1E293B] dark:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" strokeWidth={2} /> : <Moon className="w-5 h-5" strokeWidth={2} />}
        </button>
      </div>

      {/* LEFT PANEL */}
      <div className="relative flex-1 lg:h-full lg:overflow-y-auto bg-[#F0F6FC] dark:bg-slate-800 px-8 py-10 lg:px-14 lg:py-10 flex flex-col justify-between overflow-hidden">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-blue-200/50 dark:bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-amber-100/60 dark:bg-amber-400/10 blur-3xl" />

        {/* Header */}
        <header className="relative flex justify-between items-start w-full max-w-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#1E293B] dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm">
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

          <p className="text-gray-500 dark:text-slate-400 text-sm hidden md:block max-w-[14rem] text-right">
            {t("common.tagline")}
          </p>
        </header>

        {/* Content */}
        <div className="relative mt-8 lg:mt-0 max-w-2xl">
          <p className="text-[#2563EB] dark:text-blue-400 font-semibold tracking-wider uppercase text-xs mb-3">
            {t("common.dailyCompanion")}
          </p>

          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-[#1E293B] dark:text-white leading-[1.1] mb-3">
            {t("auth.headline1")}{" "}
            <span className="text-[#2563EB] dark:text-blue-400">{t("auth.headline2")}</span>
          </h1>

          <p className="text-base lg:text-lg text-gray-600 dark:text-slate-400 mt-3 max-w-lg leading-relaxed">
            {t("auth.subtext")}
          </p>

          <div className="hidden sm:block mt-6 rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5 dark:ring-white/10">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLC5dyudzSMvl6SL_5ZK6Zfm1SBPhb5O9IxG1IvTJUWIhn9UQ_k46UKyRJXnNuh9I2mKWf42vhze8C6e4jinGfFwWeCY01IckVTxCPEi_TapSmDTFeozrp89eowZm4qV_lJbEsrEIQCEDQ6cC4EoTMMP4a_RYQmtxKy5f6t18Tvzq-Q97Uyjw70o8kV-pfqHF3Qc7oy0whc3UGvR6AdzAWpevaeQzCU2anoKHgMZLRGJs-3F5NNBl2kS0ZyGJtwj9CgaQ"
              alt={t("auth.imageAlt")}
              className="w-full h-auto object-cover block"
            />
          </div>
          <p className="hidden sm:block mt-3 text-sm text-gray-500 dark:text-slate-400 italic">
            {t("auth.imageCaption")}
          </p>
        </div>

        <p className="relative text-gray-400 dark:text-slate-500 text-xs mt-8 lg:mt-0 hidden lg:block">
          © {new Date().getFullYear()} Mindful Moments
        </p>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 lg:h-full lg:overflow-y-auto flex items-center justify-center px-6 py-10 lg:p-10 border-t lg:border-t-0 border-black/5 dark:border-white/10">
        <div className="w-full max-w-md py-4">
          {/* Mobile Logo */}
          <div className="flex items-center space-x-3 mb-6 lg:hidden">
            <div className="w-9 h-9 bg-[#1E293B] dark:bg-slate-700 rounded-xl flex items-center justify-center">
              {LOGO_ICON}
            </div>

            <span className="text-lg font-bold text-[#2563EB] dark:text-blue-400">
              Mindful Moments
            </span>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-black/5 dark:shadow-none ring-1 ring-black/5 dark:ring-white/10 p-6 sm:p-8">
            {/* Mode switch */}
            <div className="relative flex bg-gray-100 dark:bg-slate-700 rounded-full p-1 mb-6">
              <div
                className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white dark:bg-slate-600 shadow-sm transition-transform duration-300 ease-out"
                style={{ transform: isSignup ? "translateX(calc(100% + 4px))" : "translateX(0)" }}
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => handleSwitchMode("login")}
                className={`relative z-10 flex-1 py-2 rounded-full text-sm font-semibold transition-colors duration-300 ${
                  !isSignup
                    ? "text-[#1E293B] dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {t("auth.tabSignIn")}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode("signup")}
                className={`relative z-10 flex-1 py-2 rounded-full text-sm font-semibold transition-colors duration-300 ${
                  isSignup
                    ? "text-[#1E293B] dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {t("auth.tabSignUp")}
              </button>
            </div>

            {/* Heading */}
            <div key={mode} className="animate-fade-in-up">
              <p className="text-[#2563EB] dark:text-blue-400 font-bold tracking-widest uppercase text-xs mb-2">
                {isSignup ? t("auth.eyebrowSignUp") : t("auth.eyebrowSignIn")}
              </p>

              <h2 className="text-2xl sm:text-3xl font-bold text-[#1E293B] dark:text-white mb-2">
                {isSignup ? t("auth.headingSignUp") : t("auth.headingSignIn")}
              </h2>

              <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
                {isSignup ? t("auth.subheadingSignUp") : t("auth.subheadingSignIn")}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="mb-5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400"
              >
                {error}
              </div>
            )}

            {/* AUTH FORM */}
            <form onSubmit={handleSubmit} noValidate>
              {/* Name (signup only) */}
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                  isSignup ? "grid-rows-[1fr] mb-4" : "grid-rows-[0fr] mb-0"
                }`}
              >
                <div
                  className={`overflow-hidden transition-opacity duration-200 ${
                    isSignup ? "opacity-100 delay-100" : "opacity-0"
                  }`}
                >
                  <label
                    className="block font-semibold text-gray-800 dark:text-slate-200 mb-1.5 text-sm"
                    htmlFor="name"
                  >
                    {t("auth.fullName")}
                  </label>

                  <input
                    className="block w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-sm focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-500/20 outline-none text-base py-2.5 px-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-shadow"
                    id="name"
                    name="name"
                    placeholder={t("auth.fullNamePlaceholder")}
                    autoComplete="name"
                    required={isSignup}
                    tabIndex={isSignup ? 0 : -1}
                    minLength={2}
                    type="text"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="mb-4">
                <label
                  className="block font-semibold text-gray-800 dark:text-slate-200 mb-1.5 text-sm"
                  htmlFor="email"
                >
                  {t("auth.emailAddress")}
                </label>

                <input
                  className="block w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-sm focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-500/20 outline-none text-base py-2.5 px-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-shadow"
                  id="email"
                  name="email"
                  placeholder={t("auth.emailPlaceholder")}
                  autoComplete="email"
                  required
                  type="email"
                />
              </div>

              {/* Password */}
              <div className="mb-4">
                <label
                  className="block font-semibold text-gray-800 dark:text-slate-200 mb-1.5 text-sm"
                  htmlFor="password"
                >
                  {t("auth.password")}
                </label>

                <input
                  className="block w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-sm focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-500/20 outline-none text-base py-2.5 px-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-shadow"
                  id="password"
                  name="password"
                  placeholder={t("auth.passwordPlaceholder")}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  type="password"
                />
              </div>

              {/* Submit Button */}
              <button
                className="group w-full flex justify-center items-center py-3 px-4 rounded-xl text-base font-semibold text-white bg-[#2563EB] hover:bg-[#1d4ed8] focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-500/20 shadow-md shadow-blue-500/20 transition-all duration-200 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                type="submit"
                disabled={submitting}
              >
                <span className="flex items-center">
                  {submitting
                    ? isSignup
                      ? t("auth.creatingAccount")
                      : t("auth.signingIn")
                    : isSignup
                      ? t("auth.createAccount")
                      : t("auth.signIn")}

                  {!submitting && (
                    <svg
                      className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  )}
                </span>
              </button>
            </form>
          </div>

          <p className="mt-6 flex items-start justify-center space-x-2 text-gray-400 dark:text-slate-500 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1 flex-shrink-0"></span>
            <span>{t("auth.trustNote")}</span>
          </p>
        </div>
      </div>
    </main>
  );
}

export default AuthPage;
