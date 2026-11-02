import { en, es, fr, pt } from "@skillex/shared";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

const LOCALES = {
  en,
  es,
  fr,
  pt,
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (
    !locale ||
    !routing.locales.includes(locale as (typeof routing.locales)[number])
  ) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: LOCALES[locale as keyof typeof LOCALES],
  };
});
