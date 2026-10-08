import type { Metadata } from "next";

import { EmptyCatalog } from "@/components/empty-catalog";
import { ProductGrid, StorePage } from "@/components/store-page";
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
    <StorePage crumb="Liquidação" title="Liquidação" lede="Peças com condição especial, enquanto durar o período.">
      <ProductGrid products={payload.items} currency={site.tenant.currency} />
      {payload.items.length === 0 ? <EmptyCatalog title="Ainda não há produtos nesta seleção" text="Explore o catálogo ou volte quando a loja marcar peças para queima." /> : null}
    </StorePage>
  );
}
