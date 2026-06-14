import { SearchPageClient } from "@/components/search/search-page-client";

type SearchParamValue = string | string[] | undefined;
type SearchType = "company" | "product" | "category" | "model" | "certificate";

function pickFirst(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

const VALID_TYPES: SearchType[] = ["company", "product", "category", "model", "certificate"];

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, SearchParamValue>>;
}) {
  const [{ locale }, resolvedSearchParams] = await Promise.all([params, searchParams]);

  const rawType = pickFirst(resolvedSearchParams.type);
  const rawQuery = pickFirst(resolvedSearchParams.q);
  const rawPage = pickFirst(resolvedSearchParams.page);
  const rawCountry = pickFirst(resolvedSearchParams.country);

  const initialType = VALID_TYPES.includes(rawType as SearchType)
    ? (rawType as SearchType)
    : "product";
  const initialQuery = rawQuery ?? "";
  const initialPage = Number.isFinite(Number(rawPage)) ? Math.max(1, Number(rawPage)) : 1;
  const initialCountry = rawCountry ?? "";

  return (
    <SearchPageClient
      key={`${locale}:${initialType}:${initialQuery}:${initialCountry}:${initialPage}`}
      initialType={initialType}
      initialQuery={initialQuery}
      initialPage={initialPage}
      initialCountry={initialCountry}
      locale={locale}
    />
  );
}
