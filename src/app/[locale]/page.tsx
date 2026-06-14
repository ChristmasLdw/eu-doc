"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  FileBadge2,
  Globe2,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  browseCategories,
  browseCompanies,
  browseCountries,
  libraryStats,
  recentCertificates,
  verifiedCertificates,
} from "@/lib/mock-library-data";

type SearchScope = "docpic" | "comp" | "doc";

function getLocalizedLabel(locale: string, label: string, labelZh?: string) {
  return locale === "zh" && labelZh ? labelZh : label;
}

export default function HomePage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [searchScope, setSearchScope] = useState<SearchScope>("docpic");
  const [searchValue, setSearchValue] = useState("");

  const scopeOptions = useMemo(
    () => [
      { value: "docpic" as const, label: t("home.search.scopeCertificate") },
      { value: "comp" as const, label: t("home.search.scopeCompany") },
      { value: "doc" as const, label: t("home.search.scopeCategory") },
    ],
    [t]
  );

  const quickKeywords = useMemo(
    () => [
      t("home.search.quickCompany"),
      t("home.search.quickProduct"),
      t("home.search.quickModel"),
      t("home.search.quickCertificate"),
    ],
    [t]
  );

  const handleSearch = () => {
    const query: Record<string, string> = {
      type: searchScope,
      page: "1",
    };

    if (searchValue.trim()) {
      query.q = searchValue.trim();
    }

    router.push({ pathname: "/search", query });
  };

  return (
    <div className="bg-background">
      <section className="border-b border-border/70 bg-[linear-gradient(180deg,rgba(15,23,42,0.03),transparent)]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
            <div className="space-y-8">
              <div className="space-y-5">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
                  {t("home.hero.kicker")}
                </Badge>

                <div className="space-y-4">
                  <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                    {t("home.hero.title")}
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                    {t("home.hero.subtitle")}
                  </p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="flex h-12 items-center rounded-xl bg-secondary/70 px-2 lg:w-[220px]">
                    <Select
                      value={searchScope}
                      onValueChange={(value) => setSearchScope((value || "docpic") as SearchScope)}
                    >
                      <SelectTrigger className="h-full w-full border-0 bg-transparent shadow-none focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {scopeOptions.map((scope) => (
                          <SelectItem key={scope.value} value={scope.value}>
                            {scope.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-1 items-center gap-3 rounded-xl border border-border/60 bg-background px-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                      placeholder={t(`search.placeholder.${searchScope}`)}
                      className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                    />
                  </div>

                  <Button size="lg" className="h-12 rounded-xl px-6" onClick={handleSearch}>
                    <Search className="mr-2 h-4 w-4" />
                    {t("home.search.cta")}
                  </Button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="uppercase tracking-[0.18em]">{t("home.search.hintLabel")}</span>
                  {quickKeywords.map((keyword) => (
                    <button
                      key={keyword}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary"
                      onClick={() => setSearchValue(keyword)}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {libraryStats.map((stat) => (
                  <div key={stat.id} className="rounded-2xl border border-border/70 bg-card px-4 py-4 shadow-sm">
                    <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {t(`home.stats.${stat.id}`)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/70 pb-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("home.preview.title")}</p>
                  <p className="text-xs text-muted-foreground">{t("home.preview.subtitle")}</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {t("home.preview.badge")}
                </Badge>
              </div>

              <div className="mt-4 space-y-3">
                {verifiedCertificates.map((cert) => (
                  <Link
                    key={cert.id}
                    href={`/cert/${cert.id}`}
                    className="block rounded-2xl border border-border/60 bg-background p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                            {cert.certifiedType}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">{cert.certificateNumber}</span>
                        </div>
                        <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{cert.productName}</h3>
                        <p className="line-clamp-1 text-sm text-muted-foreground">{cert.company?.name}</p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <div>
                        <div className="uppercase tracking-[0.14em]">{t("home.preview.modelLabel")}</div>
                        <div className="mt-1 text-sm text-foreground">{cert.model}</div>
                      </div>
                      <div>
                        <div className="uppercase tracking-[0.14em]">{t("home.preview.expiryLabel")}</div>
                        <div className="mt-1 text-sm text-foreground">{cert.expiryDate}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
              {t("home.browse.kicker")}
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">{t("home.browse.title")}</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {t("home.browse.subtitle")}
            </p>
          </div>
          <Link href="/search" className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-foreground">
            {t("home.browse.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <CardTitle>{t("home.browse.companiesTitle")}</CardTitle>
              <CardDescription>{t("home.browse.companiesSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {browseCompanies.map((company) => (
                <Link
                  key={company.id}
                  href={{ pathname: "/search", query: { type: "comp", q: company.label, page: "1" } }}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-4 py-3 text-sm transition-colors hover:border-foreground/20 hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">
                      {getLocalizedLabel(locale, company.label, company.labelZh)}
                    </div>
                    <div className="text-xs text-muted-foreground">{company.meta}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{company.count}</span>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <FileBadge2 className="h-5 w-5" />
              </div>
              <CardTitle>{t("home.browse.categoriesTitle")}</CardTitle>
              <CardDescription>{t("home.browse.categoriesSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {browseCategories.map((category) => (
                <Link
                  key={category.id}
                  href={{ pathname: "/search", query: { type: "doc", q: category.label, page: "1" } }}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-4 py-3 text-sm transition-colors hover:border-foreground/20 hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">
                      {getLocalizedLabel(locale, category.label, category.labelZh)}
                    </div>
                    <div className="text-xs text-muted-foreground">{category.meta}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{category.count}</span>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <Globe2 className="h-5 w-5" />
              </div>
              <CardTitle>{t("home.browse.regionsTitle")}</CardTitle>
              <CardDescription>{t("home.browse.regionsSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {browseCountries.map((country) => (
                <Link
                  key={country.id}
                  href={{ pathname: "/search", query: { type: "docpic", country: country.label, page: "1" } }}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-4 py-3 text-sm transition-colors hover:border-foreground/20 hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">
                      {getLocalizedLabel(locale, country.label, country.labelZh)}
                    </div>
                    <div className="text-xs text-muted-foreground">{country.meta}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{country.count}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-y border-border/70 bg-secondary/25 py-14 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
                {t("home.recent.kicker")}
              </Badge>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">{t("home.recent.title")}</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {t("home.recent.subtitle")}
              </p>
            </div>
            <Link href="/search" className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-foreground">
              {t("home.recent.viewAll")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-sm">
            <div className="hidden grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_0.8fr] gap-4 border-b border-border/70 px-6 py-4 text-xs uppercase tracking-[0.16em] text-muted-foreground md:grid">
              <div>{t("home.table.company")}</div>
              <div>{t("home.table.product")}</div>
              <div>{t("home.table.model")}</div>
              <div>{t("home.table.status")}</div>
              <div>{t("home.table.expiry")}</div>
              <div>{t("home.table.action")}</div>
            </div>

            <div className="divide-y divide-border/70">
              {recentCertificates.map((cert) => (
                <div key={cert.id} className="grid gap-4 px-6 py-5 md:grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_0.8fr] md:items-center">
                  <div>
                    <div className="text-sm font-medium text-foreground">{cert.company?.name}</div>
                    <div className="text-xs text-muted-foreground">{cert.certificateNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm text-foreground">{cert.productName}</div>
                    <div className="text-xs text-muted-foreground">{cert.category?.name}</div>
                  </div>
                  <div className="text-sm text-foreground">{cert.model}</div>
                  <div>
                    <Badge
                      className={
                        cert.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : cert.status === "EXPIRED"
                            ? "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }
                    >
                      {t(`cert.${cert.status.toLowerCase()}`)}
                    </Badge>
                  </div>
                  <div className="text-sm text-foreground">{cert.expiryDate}</div>
                  <div>
                    <Link href={`/cert/${cert.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-foreground">
                      {t("home.table.view")} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-border/70 bg-card p-8 shadow-sm">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
              {t("home.workflow.kicker")}
            </Badge>
            <div className="mt-4 space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">{t("home.workflow.title")}</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {t("home.workflow.subtitle")}
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-background p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground">
                  <Search className="h-4 w-4" />
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("home.workflow.searchLabel")}</div>
                <div className="mt-2 text-base font-medium text-foreground">{t("home.workflow.searchTitle")}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("home.workflow.searchDescription")}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("home.workflow.previewLabel")}</div>
                <div className="mt-2 text-base font-medium text-foreground">{t("home.workflow.previewTitle")}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("home.workflow.previewDescription")}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("home.workflow.openLabel")}</div>
                <div className="mt-2 text-base font-medium text-foreground">{t("home.workflow.openTitle")}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("home.workflow.openDescription")}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/70 bg-foreground p-8 text-background shadow-sm">
            <Badge className="bg-white/10 text-white hover:bg-white/10">{t("home.cta.kicker")}</Badge>
            <div className="mt-4 space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight">{t("home.cta.title")}</h2>
              <p className="text-sm leading-6 text-white/70 sm:text-base">{t("home.cta.subtitle")}</p>
            </div>

            <div className="mt-8 space-y-4 text-sm text-white/70">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="font-medium text-white">{t("home.cta.noteTitle1")}</div>
                <div className="mt-1">{t("home.cta.noteBody1")}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="font-medium text-white">{t("home.cta.noteTitle2")}</div>
                <div className="mt-1">{t("home.cta.noteBody2")}</div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                variant="secondary"
                className="h-12 rounded-xl bg-white text-black hover:bg-white/90"
                onClick={() => router.push("/search")}
              >
                {t("home.cta.primary")}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="h-12 rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => router.push("/login")}
              >
                {t("home.cta.secondary")}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
