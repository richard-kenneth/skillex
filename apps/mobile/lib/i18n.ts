import React from 'react';
import en from '@/translations/en';
import es from '@/translations/es';
import fr from '@/translations/fr';
import pt from '@/translations/pt';

export type Locale = 'en' | 'es' | 'fr' | 'pt';

const LOCALES: Record<Locale, any> = { en, es, fr, pt };

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  has: (key: string) => boolean;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

function resolveKey(dict: any, key: string): string | null {
  if (typeof key !== 'string') return null;
  const parts = key.split('.');
  let curr: any = dict;
  for (const p of parts) {
    if (curr == null || typeof curr !== 'object') return null;
    curr = curr[p];
  }
  return typeof curr === 'string' ? curr : null;
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars || typeof str !== 'string') return str;
  let out = str;
  for (const [k, v] of Object.entries(vars)) {
    // Simple {key} replacement (non-ICU) - adequate for 95% of cases.
    // For ICU plural ({count, plural, =1 {...} other {...}}) we'd add a
    // lightweight parser, but for parity MVP we prefer the simpler form.
    const pattern = new RegExp(`\\{${k}\\}`, 'g');
    out = out.replace(pattern, String(v));
  }
  return out;
}

export function I18nProvider({
  children,
  defaultLocale = 'en',
}: {
  children: React.ReactNode;
  defaultLocale?: Locale;
}) {
  const [locale, setLocale] = React.useState<Locale>(defaultLocale);

  const value = React.useMemo<I18nContextValue>(() => {
    const dict = LOCALES[locale];
    return {
      locale,
      setLocale,
      has: (key) => resolveKey(dict, key) != null,
      t: (key, vars) => {
        const v = resolveKey(dict, key);
        if (v == null) {
          // Fallback to English dict to prevent missing strings on partially-translated locales.
          const fb = resolveKey(LOCALES.en, key);
          return fb ? interpolate(fb, vars) : key;
        }
        return interpolate(v, vars);
      },
    };
  }, [locale]);

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    // Fallback standalone (works outside provider, useful for early screens/signup)
    const dict = LOCALES.en;
    return {
      locale: 'en' as Locale,
      setLocale: (_: Locale) => {},
      has: (key: string) => resolveKey(dict, key) != null,
      t: (key: string, vars?: Record<string, string | number>) => {
        const v = resolveKey(dict, key);
        return v ? interpolate(v, vars) : key;
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
      return t(fullKey, vars);
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
