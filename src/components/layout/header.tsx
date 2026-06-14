"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { Menu, X, Globe, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { locales, localeNames } from "@/i18n/config";

interface HeaderProps {
  locale: string;
}

export function Header({ locale }: HeaderProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const handleLanguageChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
    setLangOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-background">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight">{t("common.appName")}</span>
        </Link>

        {/* Nav Links - Desktop */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("common.home")}
          </Link>
          <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("common.search")}
          </Link>
          <Link href={{ pathname: "/search", query: { type: "comp", page: "1" } }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("common.browseCompanies")}
          </Link>
          <Link href={{ pathname: "/search", query: { type: "doc", page: "1" } }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("common.browseCategories")}
          </Link>
        </nav>

        {/* Actions - Desktop */}
        <div className="hidden md:flex items-center gap-3">
          {/* Language */}
          <div className="relative">
            <button
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setLangOpen(!langOpen)}
            >
              <Globe className="w-3.5 h-3.5" />
              {localeNames[locale as keyof typeof localeNames]}
              <ChevronDown className="w-3 h-3" />
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div className="absolute right-0 top-full mt-2 py-1 rounded-xl shadow-xl z-50 min-w-[100px] bg-card border border-border">
                  {locales.map((loc) => (
                    <button
                      key={loc}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary ${locale === loc ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                      onClick={() => handleLanguageChange(loc)}
                    >
                      {localeNames[loc]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Theme */}
          <button
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {/* CTA Buttons */}
          <Link href="/login" className="btn-pill-outline text-xs px-4 py-2">
            {t("common.login")}
          </Link>
          <Link href="/register" className="btn-dark text-xs px-4 py-2">
            {t("common.register")}
          </Link>
        </div>

        {/* Mobile */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-6 py-4 space-y-3">
            <Link href="/" className="block text-sm py-2" onClick={() => setMobileOpen(false)}>{t("common.home")}</Link>
            <Link href="/search" className="block text-sm py-2" onClick={() => setMobileOpen(false)}>{t("common.search")}</Link>
            <Link href={{ pathname: "/search", query: { type: "comp", page: "1" } }} className="block text-sm py-2" onClick={() => setMobileOpen(false)}>{t("common.browseCompanies")}</Link>
            <Link href={{ pathname: "/search", query: { type: "doc", page: "1" } }} className="block text-sm py-2" onClick={() => setMobileOpen(false)}>{t("common.browseCategories")}</Link>
            <div className="pt-3 border-t border-border flex gap-2">
              <Link href="/login" className="btn-pill-outline text-xs flex-1 justify-center">{t("common.login")}</Link>
              <Link href="/register" className="btn-dark text-xs flex-1 justify-center">{t("common.register")}</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
