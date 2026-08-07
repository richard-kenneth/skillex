import AsyncStorage from "@react-native-async-storage/async-storage";
import { en, es, fr, pt } from "@skil-ex2/shared";
import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";
import React from "react";
import { AppState } from "react-native";

export type Locale = "en" | "es" | "fr" | "pt";

export const SUPPORTED_LOCALES: Locale[] = ["en", "fr", "es", "pt"];

const LOCALES: Record<Locale, any> = { en, es, fr, pt };

const LOCALE_STORAGE_KEY = "@user_locale";

// Set up i18n-js with expo-localization
const i18n = new I18n({
  en,
  es,
  fr,
  pt,
});

i18n.enableFallback = true;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

function isValidLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}

function getSystemLocale(defaultLocale: Locale = "en"): Locale {
  const code = getLocales()[0]?.languageCode;
  return isValidLocale(code) ? code : defaultLocale;
}

/**
 * Fully formats translation strings for i18n-js on mobile platforms:
 * 1. Resolves ICU plural patterns `{count, plural, =1 {A} other {B}}`
 * 2. Replaces `{varName}` placeholder variables
 */
function formatTranslationVars(str: string, vars?: Record<string, string | number>): string {
  if (typeof str !== "string") return str;
  let result = str;
  if (vars) {
    if (result.includes("plural,")) {
      const countVal = vars.count !== undefined ? Number(vars.count) : 0;
      result = result.replace(/\{(\w+),\s*plural,\s*=1\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\}/g, (_, varName, oneText, otherText) => {
        const rawVal = vars[varName] !== undefined ? Number(vars[varName]) : countVal;
        return rawVal === 1 ? oneText : otherText.replace(/#/g, String(rawVal));
      });
    }
    Object.keys(vars).forEach((key) => {
      result = result.replaceAll(`{${key}}`, String(vars[key]));
    });
  }
  return result;
}

export function I18nProvider({
  children,
  defaultLocale = "en",
}: {
  children: React.ReactNode;
  defaultLocale?: Locale;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(() => {
    const initial = getSystemLocale(defaultLocale);
    i18n.locale = initial;
    return initial;
  });

  // Load saved locale from storage on mount
  React.useEffect(() => {
    let isMounted = true;
    const loadLocale = async () => {
      try {
        const savedLocale = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
        if (!isMounted) return;

        if (isValidLocale(savedLocale)) {
          setLocaleState(savedLocale);
          i18n.locale = savedLocale;
        } else {
          const systemLocale = getSystemLocale(defaultLocale);
          setLocaleState(systemLocale);
          i18n.locale = systemLocale;
        }
      } catch {
        if (!isMounted) return;
        const systemLocale = getSystemLocale(defaultLocale);
        setLocaleState(systemLocale);
        i18n.locale = systemLocale;
      }
    };
    loadLocale();
    return () => {
      isMounted = false;
    };
  }, [defaultLocale]);

  // Listen for app state changes to detect OS locale changes
  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        AsyncStorage.getItem(LOCALE_STORAGE_KEY).then((saved) => {
          if (!saved) {
            const systemLocale = getSystemLocale(defaultLocale);
            setLocaleState(systemLocale);
            i18n.locale = systemLocale;
          }
        });
      }
    });

    return () => subscription.remove();
  }, [defaultLocale]);

  const value = React.useMemo<I18nContextValue>(() => {
    return {
      locale,
      setLocale: (l: Locale) => {
        if (!isValidLocale(l)) return;
        setLocaleState(l);
        i18n.locale = l;
        AsyncStorage.setItem(LOCALE_STORAGE_KEY, l).catch(() => {});
      },
      t: (key, vars) => {
        // Force sync global instance to current state
        i18n.locale = locale;
        const raw = vars ? i18n.t(key, vars) : i18n.t(key);
        return formatTranslationVars(raw, vars);
      },
    };
  }, [locale]);

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  
  // FIX: Force standalone or fallback hooks to track state/force updates if needed,
  // but crucially ensure context consumers re-render when `locale` changes.
  if (!ctx) {
    const [currentLocale, setCurrentLocale] = React.useState<Locale>(
      (isValidLocale(i18n.locale) ? i18n.locale : "en") as Locale
    );

    return {
      locale: currentLocale,
      setLocale: (l: Locale) => {
        if (!isValidLocale(l)) return;
        i18n.locale = l;
        setCurrentLocale(l);
        AsyncStorage.setItem(LOCALE_STORAGE_KEY, l).catch(() => {});
      },
      t: (key: string, vars?: Record<string, string | number>) => {
        i18n.locale = currentLocale;
        const raw = vars ? i18n.t(key, vars) : i18n.t(key);
        return formatTranslationVars(raw, vars);
      },
    };
  }
  return ctx;
}

/**
 * FIXED: Wrapped with React.useMemo / dependencies pointing straight to `locale` 
 * so tab screens immediately invalidate their translation string caches when the language changes.
 */
export function useT(namespace?: string) {
  const { t, locale } = useI18n();
  
  return React.useMemo(() => {
    return (key: string, vars?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return vars ? t(fullKey, vars) : t(fullKey);
    };
  }, [t, namespace, locale]);
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  pt: "Português",
};