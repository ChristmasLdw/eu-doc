"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { ChevronDown, ChevronRight, Layers, FolderOpen, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Category } from "@/types";

interface SidebarProps {
  categories: Category[];
  locale: string;
  currentCategoryId?: string;
}

export function Sidebar({ categories, locale, currentCategoryId }: SidebarProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getLocalizedName = (item: { name: string; nameZh?: string }) => {
    return locale === "zh" && item.nameZh ? item.nameZh : item.name;
  };

  return (
    <aside className="w-full lg:w-[280px] shrink-0">
      <div className="sticky top-20 space-y-3">
        <h2 className="text-lg font-semibold px-1">{t("search.category")}</h2>

        {/* All Categories */}
        <Link
          href="/search"
          className={cn(
            "flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:border-blue-300",
            !currentCategoryId
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-md"
              : "border-border"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className={cn("font-semibold text-sm", !currentCategoryId && "text-blue-600")}>
                {t("search.certifiedType")}
              </div>
            </div>
          </div>
          {!currentCategoryId && (
            <div className="w-2 h-2 rounded-full bg-blue-500" />
          )}
        </Link>

        {/* Category List */}
        <div className="space-y-2">
          {categories.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            const isActive = currentCategoryId === category.id;
            const hasChildren = category.children && category.children.length > 0;

            return (
              <div key={category.id} className="rounded-xl border-2 overflow-hidden transition-all">
                {/* Parent Category */}
                <div
                  className={cn(
                    "flex items-center justify-between p-4 cursor-pointer transition-all hover:bg-accent/50",
                    isActive && "bg-blue-50/50 dark:bg-blue-950/20"
                  )}
                  onClick={() => hasChildren ? toggleCategory(category.id) : undefined}
                >
                  <Link
                    href={`/search?type=doc&q=${encodeURIComponent(getLocalizedName(category))}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                    onClick={(e) => isActive && e.preventDefault()}
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <div className={cn("font-semibold text-sm truncate", isActive && "text-blue-600")}>
                        {getLocalizedName(category)}
                      </div>
                      {category.count !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {category.count} {t("search.results", { count: category.count }).split(" ")[0]}
                        </span>
                      )}
                    </div>
                  </Link>

                  {hasChildren && (
                    <button className="p-1 rounded hover:bg-accent transition-colors shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  )}

                  {isActive && !hasChildren && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                </div>

                {/* Sub-categories */}
                {hasChildren && isExpanded && (
                  <>
                    <div className="h-px bg-border mx-4" />
                    <div className="p-3 pt-2 space-y-1">
                      {category.children!.map((child) => {
                        const isChildActive = currentCategoryId === child.id;
                        return (
                          <Link
                            key={child.id}
                            href={`/search?type=doc&q=${encodeURIComponent(getLocalizedName(child))}`}
                            className={cn(
                              "flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm",
                              isChildActive
                                ? "bg-blue-100/50 dark:bg-blue-900/20 text-blue-600 font-medium"
                                : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <span className="truncate">{getLocalizedName(child)}</span>
                            {child.count !== undefined && (
                              <Badge variant="secondary" className="ml-2 text-xs shrink-0">
                                {child.count}
                              </Badge>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
