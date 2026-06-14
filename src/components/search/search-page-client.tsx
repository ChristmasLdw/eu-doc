"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { ArrowRight, CalendarDays, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sidebar } from "@/components/layout/sidebar";
import { browseCountries, mockCategories, mockCertificates } from "@/lib/mock-library-data";
import { cn } from "@/lib/utils";

type SearchType = "company" | "product" | "category" | "model" | "certificate";
type StatusFilter = "ALL" | "ACTIVE" | "EXPIRED" | "PENDING";

interface SearchPageClientProps {
  initialType: SearchType;
  initialQuery: string;
  initialPage: number;
  initialCountry: string;
  locale: string;
}

const PAGE_SIZE = 6;

export function SearchPageClient({
  initialType,
  initialQuery,
  initialPage,
  initialCountry,
  locale,
}: SearchPageClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const [searchType, setSearchType] = useState<SearchType>(initialType);
  const [searchKeyword, setSearchKeyword] = useState(initialQuery);
  const [selectedCountry, setSelectedCountry] = useState(initialCountry);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState("newest");

  const searchTypes = [
    { value: "company" as const, label: t("search.scope.company") },
    { value: "product" as const, label: t("search.scope.product") },
    { value: "category" as const, label: t("search.scope.category") },
    { value: "model" as const, label: t("search.scope.model") },
    { value: "certificate" as const, label: t("search.scope.certificate") },
  ];

  const statusOptions: StatusFilter[] = ["ALL", "ACTIVE", "EXPIRED", "PENDING"];

  const countryOptions = browseCountries.map((country) => ({
    value: country.label,
    label: locale === "zh" && country.labelZh ? country.labelZh : country.label,
    count: country.count,
  }));

  const pushSearch = ({
    nextType = searchType,
    nextQuery = searchKeyword,
    nextCountry = selectedCountry,
    nextPage = 1,
  }: {
    nextType?: SearchType;
    nextQuery?: string;
    nextCountry?: string;
    nextPage?: number;
  } = {}) => {
    const query: Record<string, string> = {
      type: nextType,
      page: String(nextPage),
    };

    if (nextQuery.trim()) {
      query.q = nextQuery.trim();
    }

    if (nextCountry) {
      query.country = nextCountry;
    }

    router.push({ pathname: "/search", query });
  };

  const filteredCertificates = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    const filtered = mockCertificates.filter((cert) => {
      if (selectedCountry && cert.company?.country !== selectedCountry) {
        return false;
      }

      if (selectedStatus !== "ALL" && cert.status !== selectedStatus) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      switch (searchType) {
        case "company":
          return (
            cert.company?.name.toLowerCase().includes(keyword) ||
            cert.company?.nameZh?.toLowerCase().includes(keyword)
          );
        case "product":
          return (
            cert.productName.toLowerCase().includes(keyword) ||
            cert.productNameZh?.toLowerCase().includes(keyword)
          );
        case "category":
          return (
            cert.category?.name.toLowerCase().includes(keyword) ||
            cert.category?.nameZh?.toLowerCase().includes(keyword)
          );
        case "model":
          return cert.model.toLowerCase().includes(keyword);
        case "certificate":
          return (
            cert.certificateNumber.toLowerCase().includes(keyword) ||
            cert.certifiedType.toLowerCase().includes(keyword)
          );
        default:
          return true;
      }
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "expiry":
          return (a.expiryDate || "").localeCompare(b.expiryDate || "");
        case "name":
          return a.productName.localeCompare(b.productName);
        default:
          return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
      }
    });
  }, [searchKeyword, searchType, selectedCountry, selectedStatus, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredCertificates.length / PAGE_SIZE));
  const currentPage = Math.min(initialPage, totalPages);
  const paginatedCertificates = filteredCertificates.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const getStatusTone = (status: StatusFilter | string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "EXPIRED":
        return "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-secondary text-secondary-foreground hover:bg-secondary";
    }
  };

  const getReviewTone = (reviewStatus: string) => {
    switch (reviewStatus) {
      case "APPROVED":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "REJECTED":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
                {t("search.searchWorkspace")}
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {t("search.pageTitle")}
                </h1>
                <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                  {t("search.pageSubtitle")}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{t("search.systemNoteTitle")}</div>
              <div className="mt-1">{t("search.systemNoteBody")}</div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background p-3 shadow-sm lg:flex-row lg:items-center">
              <div className="flex h-12 items-center rounded-xl bg-secondary/65 px-2 lg:w-[220px]">
                <Select
                  value={searchType}
                  onValueChange={(value) => setSearchType((value || "product") as SearchType)}
                >
                  <SelectTrigger className="h-full w-full border-0 bg-transparent shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {searchTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator orientation="vertical" className="hidden h-10 lg:block" />

              <div className="flex flex-1 items-center gap-3 rounded-xl border border-border/60 bg-background px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      pushSearch({ nextPage: 1 });
                    }
                  }}
                  placeholder={t(`search.placeholder.${searchType}`)}
                  className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>

              <Button size="lg" className="h-12 rounded-xl px-5" onClick={() => pushSearch({ nextPage: 1 })}>
                <Search className="mr-2 h-4 w-4" />
                {t("common.search")}
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {t("search.country")}
                </span>
                <button
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    !selectedCountry
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => {
                    setSelectedCountry("");
                    pushSearch({ nextCountry: "", nextPage: 1 });
                  }}
                >
                  {t("search.allCountries")}
                </button>
                {countryOptions.map((country) => (
                  <button
                    key={country.value}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selectedCountry === country.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => {
                      setSelectedCountry(country.value);
                      pushSearch({ nextCountry: country.value, nextPage: 1 });
                    }}
                  >
                    {country.label} · {country.count}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {t("search.statusLabel")}
                </span>
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selectedStatus === status
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setSelectedStatus(status)}
                  >
                    {status === "ALL" ? t("search.allStatus") : t(`cert.${status.toLowerCase()}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-6 lg:flex-row">
          <Sidebar categories={mockCategories} locale={locale} />

          <div className="flex-1 space-y-4">
            <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">
                  {t("search.results", { count: filteredCertificates.length })}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t("search.resultsSubtitle")}</p>
              </div>

              <Select value={sortBy} onValueChange={(value) => setSortBy(value || "newest")}>
                <SelectTrigger className="h-9 w-[180px] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t("search.sort.newest")}</SelectItem>
                  <SelectItem value="expiry">{t("search.sort.expiry")}</SelectItem>
                  <SelectItem value="name">{t("search.sort.product")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paginatedCertificates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
                <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">{t("search.noResults")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("search.tryAgain")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedCertificates.map((cert) => (
                  <Card key={cert.id} className="border-border/70 bg-card shadow-sm transition-all duration-200 hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1 space-y-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                              {cert.certifiedType}
                            </Badge>
                            <Badge className={cn("text-[11px]", getStatusTone(cert.status))}>
                              {t(`cert.${cert.status.toLowerCase()}`)}
                            </Badge>
                            <Badge className={cn("text-[11px]", getReviewTone(cert.reviewStatus))}>
                              {t(`search.review.${cert.reviewStatus.toLowerCase()}`)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{cert.certificateNumber}</span>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {t("search.result.company")}
                              </div>
                              <div className="mt-1 text-sm font-medium text-foreground">{cert.company?.name}</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {t("search.result.product")}
                              </div>
                              <div className="mt-1 text-sm font-medium text-foreground">{cert.productName}</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {t("search.result.model")}
                              </div>
                              <div className="mt-1 text-sm font-medium text-foreground">{cert.model}</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {t("search.result.expiry")}
                              </div>
                              <div className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                {cert.expiryDate}
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {t("search.result.category")}
                              </div>
                              <div className="mt-1 text-sm text-foreground">{cert.category?.name}</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {t("search.result.issueDate")}
                              </div>
                              <div className="mt-1 text-sm text-foreground">{cert.issueDate}</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {t("search.result.uploader")}
                              </div>
                              <div className="mt-1 text-sm text-foreground">{cert.uploadedBy}</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {t("search.result.country")}
                              </div>
                              <div className="mt-1 text-sm text-foreground">{cert.company?.country}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs text-secondary-foreground">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {cert.auditStatusNote}
                          </div>
                          <Link
                            href={`/cert/${cert.id}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                          >
                            {t("search.result.viewDetail")} <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {filteredCertificates.length > PAGE_SIZE ? (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => pushSearch({ nextPage: Math.max(1, currentPage - 1) })}
                >
                  {t("common.previous")}
                </Button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => pushSearch({ nextPage: page })}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => pushSearch({ nextPage: Math.min(totalPages, currentPage + 1) })}
                >
                  {t("common.next")}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
