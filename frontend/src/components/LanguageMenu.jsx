import { useState, useRef, useEffect } from "react";
import { Languages, Check } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// A compact icon-trigger dropdown for picking a language — used wherever
// space is tight (auth page corner, sidebar). Settings has its own fuller
// grid layout instead of this.
function LanguageMenu({ className = "" }) {
  const { language, setLanguage, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const current = languages.find((l) => l.code === language) || languages[0];

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        title={current.englishName}
        className="w-10 h-10 rounded-full bg-white/80 dark:bg-slate-700/80 backdrop-blur ring-1 ring-black/5 dark:ring-white/10 shadow-sm flex items-center justify-center text-[#1E293B] dark:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors"
      >
        <Languages className="w-5 h-5" strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 max-h-80 overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-black/5 dark:ring-white/10 py-2 z-30 animate-fade-in-up">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <span>
                <span className="block text-sm font-semibold text-[#1E293B] dark:text-white">
                  {lang.nativeName}
                </span>
                <span className="block text-xs text-gray-400 dark:text-slate-500">
                  {lang.englishName}
                </span>
              </span>
              {lang.code === language && (
                <Check className="w-4 h-4 text-[#2563EB] dark:text-blue-400 flex-shrink-0" strokeWidth={2.5} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageMenu;
