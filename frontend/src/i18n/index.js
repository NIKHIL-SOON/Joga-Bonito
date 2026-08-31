import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import as from "./locales/as.json";
import bn from "./locales/bn.json";
import mni from "./locales/mni.json";
import kha from "./locales/kha.json";
import lus from "./locales/lus.json";
import nag from "./locales/nag.json";

const STORAGE_KEY = "mm-language";

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // ignore — falls back to English
  }
  return "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    as: { translation: as },
    bn: { translation: bn },
    mni: { translation: mni },
    kha: { translation: kha },
    lus: { translation: lus },
    nag: { translation: nag },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React already escapes values
});

export default i18n;
