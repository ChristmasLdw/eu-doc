"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Download,
  FileBadge2,
  FileText,
  Globe2,
  Maximize2,
  ShieldCheck,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockCertificates } from "@/lib/mock-library-data";

const cert = mockCertificates[0];

export default function CertDetailPage() {
  const t = useTranslations();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [pdfFullscreen, setPdfFullscreen] = useState(false);

  const images = cert.previewImages?.map((src, index) => ({ src, alt: `${cert.productName}-${index + 1}` })) ?? [];

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setScale(1);
    setLightboxOpen(true);
  };

  const statusTone =
    cert.status === "ACTIVE"
      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
      : cert.status === "EXPIRED"
        ? "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
        : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";

  const reviewTone =
    cert.reviewStatus === "APPROVED"
      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
      : cert.reviewStatus === "REJECTED"
        ? "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
        : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";

  return (
    <div className="min-h-screen bg-background">
      {lightboxOpen && images.length > 0 && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl" onClick={() => setLightboxOpen(false)}>
          <button
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute left-6 top-6 text-sm text-white/60">
            {lightboxIndex + 1} / {images.length}
          </div>
          {images.length > 1 ? (
            <>
              <button
                className="absolute left-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightboxIndex((index) => (index > 0 ? index - 1 : images.length - 1));
                  setScale(1);
                }}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                className="absolute right-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightboxIndex((index) => (index < images.length - 1 ? index + 1 : 0));
                  setScale(1);
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}
          <div className="max-h-[80vh] max-w-[85vw]" onClick={(event) => event.stopPropagation()}>
            <img
              src={images[lightboxIndex].src}
              alt={images[lightboxIndex].alt}
              className="max-h-[80vh] max-w-full object-contain transition-transform duration-200"
              style={{ transform: `scale(${scale})` }}
            />
          </div>
          <div
            className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full bg-black/60 px-5 py-3 backdrop-blur-md"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="text-white/80 hover:text-white" onClick={() => setScale((value) => Math.max(0.5, value - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-12 text-center text-sm text-white">{Math.round(scale * 100)}%</span>
            <button className="text-white/80 hover:text-white" onClick={() => setScale((value) => Math.min(3, value + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </button>
            <div className="h-5 w-px bg-white/20" />
            <a href={images[lightboxIndex].src} download className="text-white/80 hover:text-white">
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      {pdfFullscreen && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-card">
          <div className="flex h-12 items-center justify-between border-b border-border px-6">
            <span className="text-sm font-medium text-foreground">{cert.certificateNumber}</span>
            <div className="flex items-center gap-3">
              <a href={cert.pdfUrl} download className="text-sm font-medium text-primary">
                {t("cert.download")}
              </a>
              <button onClick={() => setPdfFullscreen(false)}>
                <X className="h-5 w-5 text-foreground" />
              </button>
            </div>
          </div>
          <iframe src={`${cert.pdfUrl}#toolbar=1`} className="h-full w-full border-0" title="Certificate PDF Fullscreen" />
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            {t("common.home")}
          </Link>
          <span>/</span>
          <Link href="/search" className="hover:text-foreground">
            {t("common.search")}
          </Link>
          <span>/</span>
          <span className="text-foreground">{cert.certificateNumber}</span>
        </div>

        <Link href="/search" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("search.backToResults")}
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-border/70 bg-card p-8 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                  {cert.certifiedType}
                </Badge>
                <Badge className={statusTone}>{t(`cert.${cert.status.toLowerCase()}`)}</Badge>
                <Badge className={reviewTone}>{t(`search.review.${cert.reviewStatus.toLowerCase()}`)}</Badge>
              </div>

              <div className="mt-5 space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">{cert.productName}</h1>
                <p className="text-base leading-7 text-muted-foreground">{cert.description}</p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-background p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("search.result.company")}</div>
                  <div className="mt-2 text-sm font-medium text-foreground">{cert.company?.name}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("search.result.model")}</div>
                  <div className="mt-2 text-sm font-medium text-foreground">{cert.model}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("search.result.expiry")}</div>
                  <div className="mt-2 text-sm font-medium text-foreground">{cert.expiryDate}</div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-border/70 bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t("cert.previewSectionTitle")}</h2>
                  <p className="text-sm text-muted-foreground">{t("cert.previewSectionSubtitle")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPdfFullscreen(true)}>
                    <Maximize2 className="mr-1 h-3.5 w-3.5" /> {t("cert.fullscreen")}
                  </Button>
                  <Button size="sm" onClick={() => window.open(cert.pdfUrl, "_blank")}>
                    <Download className="mr-1 h-3.5 w-3.5" /> {t("cert.download")}
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 p-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-3">
                  {images.map((image, index) => (
                    <button
                      key={image.src}
                      className="group block aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border/60 bg-background p-4 text-left transition-all hover:shadow-md"
                      onClick={() => openLightbox(index)}
                    >
                      <img src={image.src} alt={image.alt} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
                    </button>
                  ))}
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
                  <iframe src={`${cert.pdfUrl}#toolbar=0`} className="h-[520px] w-full border-0" title="Certificate PDF" />
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-border/70 bg-card p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">{t("cert.details")}</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-background p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.16em]">{t("search.result.company")}</span>
                  </div>
                  <div className="text-sm font-medium text-foreground">{cert.company?.name}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <FileBadge2 className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.16em]">{t("search.result.category")}</span>
                  </div>
                  <div className="text-sm font-medium text-foreground">{cert.category?.name}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Globe2 className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.16em]">{t("search.result.country")}</span>
                  </div>
                  <div className="text-sm font-medium text-foreground">{cert.company?.country}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.16em]">{t("search.result.issueDate")}</span>
                  </div>
                  <div className="text-sm font-medium text-foreground">{cert.issueDate}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.16em]">{t("search.result.expiry")}</span>
                  </div>
                  <div className="text-sm font-medium text-foreground">{cert.expiryDate}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.16em]">{t("search.result.uploader")}</span>
                  </div>
                  <div className="text-sm font-medium text-foreground">{cert.uploadedBy}</div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="sticky top-20 rounded-[2rem] border border-border/70 bg-card p-6 shadow-sm">
              <h3 className="text-base font-semibold text-foreground">{t("cert.recordSummaryTitle")}</h3>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <span className="text-sm text-muted-foreground">{t("search.result.certificateNumber")}</span>
                  <span className="text-sm font-medium text-foreground">{cert.certificateNumber}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <span className="text-sm text-muted-foreground">{t("search.result.model")}</span>
                  <span className="text-sm font-medium text-foreground">{cert.model}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <span className="text-sm text-muted-foreground">{t("cert.status")}</span>
                  <Badge className={statusTone}>{t(`cert.${cert.status.toLowerCase()}`)}</Badge>
                </div>
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <span className="text-sm text-muted-foreground">{t("cert.reviewStatus")}</span>
                  <Badge className={reviewTone}>{t(`search.review.${cert.reviewStatus.toLowerCase()}`)}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("cert.languages")}</span>
                  <span className="text-sm font-medium text-foreground">{cert.languages.join(", ")}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Button className="h-11 w-full rounded-xl" onClick={() => window.open(cert.pdfUrl, "_blank")}>
                  <Download className="mr-2 h-4 w-4" /> {t("cert.download")}
                </Button>
                <Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => setPdfFullscreen(true)}>
                  <Maximize2 className="mr-2 h-4 w-4" /> {t("cert.fullscreen")}
                </Button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-sm">
              <h3 className="text-base font-semibold text-foreground">{t("cert.auditTitle")}</h3>
              <div className="mt-4 rounded-2xl border border-border/60 bg-background p-4 text-sm leading-6 text-muted-foreground">
                {cert.auditStatusNote}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
