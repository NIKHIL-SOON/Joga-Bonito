import { createContext, useContext, useEffect, useState } from "react";
import i18n from "../i18n";

const STORAGE_KEY = "mm-language";

// The "Core 7" languages of Northeast India's Seven Sister states, plus
// English. English/Assamese/Bengali are fully translated; Meitei, Khasi, and
// Mizo are scaffolded with English content + a genuine native greeting,
// pending native-speaker translation (see each locale file's "_status").
// Nagamese (Nagaland's real lingua franca) has a full best-effort pass.
export const LANGUAGES = [
  { code: "en", englishName: "English", nativeName: "English" },
  { code: "as", englishName: "Assamese", nativeName: "অসমীয়া" },
  { code: "bn", englishName: "Bengali", nativeName: "বাংলা" },
  { code: "mni", englishName: "Manipuri (Meitei)", nativeName: "মৈতৈলোন্" },
  { code: "kha", englishName: "Khasi", nativeName: "Ka Ktien Khasi" },
  { code: "lus", englishName: "Mizo", nativeName: "Mizo ṭawng" },
  { code: "nag", englishName: "Nagamese", nativeName: "Nagamese" },
];

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(i18n.language || "en");

  useEffect(() => {
    i18n.changeLanguage(language);
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // best-effort persistence only
    }
  }, [language]);

  const setLanguage = (code) => {
    if (LANGUAGES.some((l) => l.code === code)) {
      setLanguageState(code);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
