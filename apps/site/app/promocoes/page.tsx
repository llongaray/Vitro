import type { Metadata } from "next";

import { EmptyCatalog } from "@/components/empty-catalog";
import { ProductCardView } from "@/components/product-card";
import { getSite, publicGet, requestOrigin } from "@/lib/api";
import { seoMetadata } from "@/lib/seo";
import type { ProductCard } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  if (!site) return { title: "Promoções" };
  const { origin } = await requestOrigin();
  return seoMetadata({ ...site.tenant.seo, title: `Promoções · ${site.tenant.seo.title}` }, "/promocoes", origin);
}

export default async function PromotionsPage() {
  const [site, payload] = await Promise.all([getSite(), publicGet<{ items: ProductCard[] }>("/api/v1/public/promotions")]);
  if (!site || !payload) return <main className="p-8">Loja não encontrada</main>;
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-5 py-8 md:px-16 md:py-16">
      <h1 className="font-serif text-5xl leading-none">Promoções</h1>
      <p className="max-w-xl text-[var(--muted)]">Campanhas ativas da loja, com o preço da vitrine.</p>
      {payload.items.length === 0 ? <EmptyCatalog title="Nenhuma promoção agora" text="Quando houver uma campanha no prazo, os produtos entram nesta página." /> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {payload.items.map((product) => (
          <ProductCardView key={product.slug} product={product} currency={site.tenant.currency} />
        ))}
      </div>
    </main>
  );
}
