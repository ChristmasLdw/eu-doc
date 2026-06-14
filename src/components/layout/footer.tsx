import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t border-border">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-background">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-medium">{t("common.appName")}</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/search" className="hover:text-foreground transition-colors">{t("common.search")}</Link>
            <Link href={{ pathname: "/search", query: { type: "comp", page: "1" } }} className="hover:text-foreground transition-colors">{t("common.browseCompanies")}</Link>
            <Link href={{ pathname: "/search", query: { type: "doc", page: "1" } }} className="hover:text-foreground transition-colors">{t("common.browseCategories")}</Link>
            <Link href="/agreement" className="hover:text-foreground transition-colors">{t("auth.userAgreement")}</Link>
          </div>

          {/* Copyright */}
          <div className="text-xs text-muted-foreground">
            ©2024 EU-DOC
          </div>
        </div>
      </div>
    </footer>
  );
}
