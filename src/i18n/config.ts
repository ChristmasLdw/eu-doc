import { defineRouting } from "next-intl/routing";

export const locales = ["en", "zh"] as const;
export const defaultLocale = "en" as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  zh: "中文",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
});
