"use client";

import { useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { Menu, X, ChevronDown } from "lucide-react";
import { locales, localeNames } from "@/i18n/config";

interface NavigationProps {
  locale: string;
}

export function Navigation({ locale }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const handleLanguageChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
    setLangMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#0071e3] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-gray-900">EU-DOC</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm font-medium text-gray-900 hover:opacity-70 transition-opacity">Home</Link>
          <Link href="/search" className="text-sm font-medium text-gray-900 hover:opacity-70 transition-opacity">Search</Link>
          <Link href="/search?type=comp" className="text-sm font-medium text-gray-900 hover:opacity-70 transition-opacity">Companies</Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button className="text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1"
              onClick={() => setLangMenuOpen(!langMenuOpen)}>
              {localeNames[locale as keyof typeof localeNames]}
              <ChevronDown className="w-3 h-3" />
            </button>
            {langMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 py-1 rounded-xl shadow-xl z-50 min-w-[120px] bg-white border border-gray-200">
                  {locales.map((loc) => (
                    <button key={loc}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${locale === loc ? 'text-[#0071e3] font-semibold' : 'text-gray-700'}`}
                      onClick={() => handleLanguageChange(loc)}>
                      {localeNames[loc]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button className="md:hidden p-1" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-6 py-4 space-y-3">
            <Link href="/" className="block text-sm font-medium py-2 text-gray-900" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link href="/search" className="block text-sm font-medium py-2 text-gray-900" onClick={() => setMobileMenuOpen(false)}>Search</Link>
            <Link href="/search?type=comp" className="block text-sm font-medium py-2 text-gray-900" onClick={() => setMobileMenuOpen(false)}>Companies</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
