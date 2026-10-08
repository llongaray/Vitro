import type { Metadata } from "next";

import { EmptyCatalog } from "@/components/empty-catalog";
import { ProductCardView } from "@/components/product-card";
import { getSite, publicGet, requestOrigin } from "@/lib/api";
import { seoMetadata } from "@/lib/seo";
import type { ProductCard } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  if (!site) return { title: "Liquidação" };
  const { origin } = await requestOrigin();
  return seoMetadata({ ...site.tenant.seo, title: `Liquidação · ${site.tenant.seo.title}` }, "/liquidacao", origin);
}

export default async function ClearancePage() {
  const [site, payload] = await Promise.all([getSite(), publicGet<{ items: ProductCard[] }>("/api/v1/public/clearance")]);
  if (!site || !payload) return <main className="p-8">Loja não encontrada</main>;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-serif text-5xl">Liquidação</h1>
      <p className="mt-3 max-w-xl text-stone-600">Peças com condição especial, enquanto durar o período.</p>
      {payload.items.length === 0 ? <EmptyCatalog title="Nenhuma peça em liquidação" text="Quando a loja marcar produtos para queima, eles aparecem aqui." /> : null}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {payload.items.map((product) => (
          <ProductCardView key={product.slug} product={product} currency={site.tenant.currency} />
        ))}
      </div>
    </main>
  );
}
