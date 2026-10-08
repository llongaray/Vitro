import type { Metadata } from "next";

import { EmptyCatalog } from "@/components/empty-catalog";
import { ProductGrid, StorePage } from "@/components/store-page";
import { getSite, publicGet } from "@/lib/api";
import type { ProductPage } from "@/lib/types";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = { robots: { index: false, follow: true }, title: "Busca" };

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q) ?? "";
  const [site, catalog] = await Promise.all([
    getSite(),
    publicGet<ProductPage>(`/api/v1/public/products?q=${encodeURIComponent(q)}`, { fresh: true }),
  ]);
  if (!site || !catalog) return <main className="p-8">Loja não encontrada</main>;
  return (
    <StorePage crumb="Busca" title={q ? `Resultados para “${q}”` : "Busca"} lede="Encontre uma peça pelo nome ou por um detalhe.">
      <form action="/busca" className="flex flex-wrap items-center gap-4 rounded-2xl bg-[var(--surface)] p-4">
        <input data-testid="search-input" name="q" defaultValue={q} placeholder="Buscar produtos…" className="min-w-40 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--muted)]" />
        <button data-testid="search-submit" className="text-sm text-[var(--brand)]">
          Buscar
        </button>
      </form>
      <p className="text-sm text-[var(--muted)]">
        {catalog.total} {catalog.total === 1 ? "produto encontrado" : "produtos encontrados"}
      </p>
      {q && catalog.total === 0 ? <EmptyCatalog title="Nenhum produto encontrado" text="Tente outro termo ou volte ao catálogo." action="Limpar filtros" /> : null}
      <ProductGrid products={catalog.items} currency={site.tenant.currency} />
    </StorePage>
  );
}
