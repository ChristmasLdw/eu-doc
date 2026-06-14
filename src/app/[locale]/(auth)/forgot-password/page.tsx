"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Mail, ArrowLeft, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("auth.errors.invalidEmail"));
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      // TODO: Implement actual password reset
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSent(true);
    } catch {
      setError("Failed to send reset link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Left - Brand */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8 shadow-2xl">
            <FileText className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-bold mb-4">{t("auth.forgotTitle")}</h1>
          <p className="text-lg text-blue-100 text-center max-w-md">
            {t("auth.forgotSubtitle")}
          </p>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-muted/30">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="p-8">
            {sent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Email Sent!</h2>
                <p className="text-muted-foreground mb-6">
                  We&apos;ve sent a password reset link to <strong>{email}</strong>. Please check
                  your inbox.
                </p>
                <Button variant="outline" className="w-full">
                  <Link href="/login">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("auth.backToLogin")}
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold">{t("auth.forgotTitle")}</h2>
                  <p className="text-muted-foreground mt-1">{t("auth.forgotSubtitle")}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("auth.email")}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
                    {isLoading ? t("common.loading") : t("auth.sendResetLink")}
                  </Button>
                </form>

                <div className="text-center mt-6">
                  <Link
                    href="/login"
                    className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t("auth.backToLogin")}
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
