import type { Metadata } from "next";

import { EmptyCatalog } from "@/components/empty-catalog";
import { ProductCardView } from "@/components/product-card";
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
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-5 py-8 md:px-16 md:py-16">
      <h1 className="font-serif text-5xl leading-none">Busca</h1>
      <form action="/busca" className="flex flex-wrap items-center gap-4 rounded-2xl bg-[var(--surface)] p-4">
        <input data-testid="search-input" name="q" defaultValue={q} placeholder="Buscar produtos…" className="min-w-40 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--muted)]" />
        <button data-testid="search-submit" className="text-sm text-[var(--brand)]">
          Buscar
        </button>
      </form>
      <p className="text-sm text-[var(--muted)]">{catalog.total} {catalog.total === 1 ? "produto encontrado" : "produtos encontrados"}</p>
      {q && catalog.total === 0 ? <EmptyCatalog title="Nenhum produto encontrado" text="Tente outro termo ou volte ao catálogo." /> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.items.map((product) => (
          <ProductCardView key={product.slug} product={product} currency={site.tenant.currency} />
        ))}
      </div>
    </main>
  );
}
