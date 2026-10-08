import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyCatalog } from "@/components/empty-catalog";
import { JsonLd } from "@/components/json-ld";
import { ProductGrid, StorePage } from "@/components/store-page";
import { getSite, publicGet, requestOrigin } from "@/lib/api";
import { seoMetadata } from "@/lib/seo";
import type { ProductPage, Seo } from "@/lib/types";

type Payload = { name: string; slug: string; description: string | null; seo: Seo; products: ProductPage };
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await publicGet<Payload>(`/api/v1/public/categories/${slug}`);
  if (!category) return { title: "Categoria" };
  const { origin } = await requestOrigin();
  return seoMetadata(category.seo, `/categorias/${slug}`, origin);
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [site, category] = await Promise.all([getSite(), publicGet<Payload>(`/api/v1/public/categories/${slug}`)]);
  if (!site || !category) notFound();
  const { origin } = await requestOrigin();
  return (
    <StorePage crumb={category.name} title={category.name} lede={category.description ?? undefined}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: `${origin}/` },
            { "@type": "ListItem", position: 2, name: category.name, item: `${origin}/categorias/${category.slug}` },
          ],
        }}
      />
      <ProductGrid products={category.products.items} currency={site.tenant.currency} />
      {category.products.items.length === 0 ? <EmptyCatalog title="Ainda não há produtos nesta seleção" text="Explore o catálogo ou escolha outra categoria." /> : null}
    </StorePage>
  );
}
