"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Mail, Lock, User, Eye, EyeOff, FileText, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function RegisterPage() {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordChecks = [
    { label: "8+ characters", valid: password.length >= 8 },
    { label: "Uppercase", valid: /[A-Z]/.test(password) },
    { label: "Lowercase", valid: /[a-z]/.test(password) },
    { label: "Number", valid: /\d/.test(password) },
    { label: "Special char", valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t("auth.errors.invalidEmail");
    }
    if (password.length < 8) {
      newErrors.password = t("auth.errors.passwordTooShort");
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = t("auth.errors.passwordMismatch");
    }
    if (!agreed) {
      newErrors.agreed = t("auth.errors.agreeRequired");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // TODO: Implement actual registration
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch {
      setErrors({ general: t("auth.errors.registerFailed") });
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
          <h1 className="text-4xl font-bold mb-4">{t("auth.registerTitle")}</h1>
          <p className="text-lg text-blue-100 text-center max-w-md">
            {t("auth.registerSubtitle")}
          </p>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-muted/30">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">{t("auth.registerTitle")}</h2>
              <p className="text-muted-foreground mt-1">{t("auth.registerSubtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm">
                  {errors.general}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">{t("auth.name")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

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
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Password Strength Indicators */}
                {password && (
                  <div className="grid grid-cols-5 gap-1 mt-2">
                    {passwordChecks.map((check) => (
                      <div
                        key={check.label}
                        className={`h-1 rounded-full transition-colors ${
                          check.valid ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    ))}
                  </div>
                )}
                {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="agree"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="agree" className="text-sm text-muted-foreground">
                  {t("auth.agreeToTerms")}{" "}
                  <Link href="/agreement" className="text-primary hover:underline">
                    {t("auth.userAgreement")}
                  </Link>
                </label>
              </div>
              {errors.agreed && <p className="text-sm text-red-500">{errors.agreed}</p>}

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? t("common.loading") : t("common.register")}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t("auth.or")}</span>
              </div>
            </div>

            <Button variant="outline" className="w-full h-11">
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t("auth.googleLogin")}
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {t("auth.signInSubtitle")}{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                {t("common.login")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
