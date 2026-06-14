import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { locales } from "@/i18n/config";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ThemeProvider } from "@/components/layout/theme-provider";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as any)) {
    notFound();
  }

  return (
    <NextIntlClientProvider locale={locale} messages={await getMessages(locale)}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen flex flex-col">
          <Header locale={locale} />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}

async function getMessages(locale: string) {
  try {
    return (await import(`../../../messages/${locale}.json`)).default;
  } catch {
    notFound();
  }
}
