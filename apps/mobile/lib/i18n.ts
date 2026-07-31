import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import React from 'react';
import { en, es, fr, pt } from '@skil-ex2/shared';

export type Locale = 'en' | 'es' | 'fr' | 'pt';

const LOCALES: Record<Locale, any> = { en, es, fr, pt };

// Set up i18n-js with expo-localization
const i18n = new I18n({
  en,
  es,
  fr,
  pt,
});

// Set the locale once at the beginning of your app
i18n.locale = Localization.getLocales()[0]?.languageCode ?? 'en';
i18n.enableFallback = true; // Fall back to English if translation is missing

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  defaultLocale = 'en',
}: {
  children: React.ReactNode;
  defaultLocale?: Locale;
}) {
  const [locale, setLocale] = React.useState<Locale>(
    (Localization.getLocales()[0]?.languageCode as Locale) ?? defaultLocale,
  );

  const value = React.useMemo<I18nContextValue>(() => {
    return {
      locale,
      setLocale: (l: Locale) => {
        setLocale(l);
        i18n.locale = l;
      },
      t: (key, vars) => {
        if (vars) {
          return i18n.t(key, vars);
        }
        return i18n.t(key);
      },
    };
  }, [locale]);

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    // Fallback standalone (works outside provider, useful for early screens/signup)
    return {
      locale: (i18n.locale as Locale) ?? 'en',
      setLocale: (l: Locale) => {
        i18n.locale = l;
      },
      t: (key: string, vars?: Record<string, string | number>) => {
        if (vars) {
          return i18n.t(key, vars);
        }
        return i18n.t(key);
      },
    };
  }
  return ctx;
}

/**
 * Use this hook for page-level / component-level translations.
 * Usage: const t = useT('dashboard'); t('title')
 * Also accepts a direct dot-key: const t = useT(); t('common.cancel')
 */
export function useT(namespace?: string) {
  const { t } = useI18n();
  return React.useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (vars) {
        return t(fullKey, vars);
      }
      return t(fullKey);
    },
    [t, namespace],
  );
}

export const SUPPORTED_LOCALES: Locale[] = ['en', 'es', 'fr', 'pt'];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
};
