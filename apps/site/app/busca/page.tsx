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
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-serif text-5xl">Busca</h1>
      <form action="/busca" className="mt-6 flex gap-3">
        <input data-testid="search-input" name="q" defaultValue={q} className="rounded-full border border-stone-300 px-4 py-2" />
        <button data-testid="search-submit" className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white">
          Buscar
        </button>
      </form>
      <p className="mt-4 text-sm text-stone-500">{catalog.total} resultado(s)</p>
      {q && catalog.total === 0 ? <EmptyCatalog title="Nenhum produto encontrado" text="Tente outro termo ou volte ao catálogo." /> : null}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.items.map((product) => (
          <ProductCardView key={product.slug} product={product} currency={site.tenant.currency} />
        ))}
      </div>
    </main>
  );
}
