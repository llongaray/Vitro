import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { ProductCardView } from "@/components/product-card";
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
    <main className="mx-auto max-w-6xl px-6 py-10">
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
      <h1 className="font-serif text-5xl">{category.name}</h1>
      {category.description ? <p className="mt-3 max-w-2xl text-stone-600">{category.description}</p> : null}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {category.products.items.map((product) => (
          <ProductCardView key={product.slug} product={product} currency={site.tenant.currency} />
        ))}
      </div>
    </main>
  );
}
