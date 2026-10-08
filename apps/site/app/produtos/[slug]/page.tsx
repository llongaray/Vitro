import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContactLink } from "@/components/contact-link";
import { AdSlots } from "@/components/ad-slots";
import { Gallery } from "@/components/gallery";
import { JsonLd } from "@/components/json-ld";
import { getSite, publicGet, requestOrigin } from "@/lib/api";
import { productMessage, seoMetadata } from "@/lib/seo";
import type { ProductDetail } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [site, product] = await Promise.all([getSite(), publicGet<ProductDetail>(`/api/v1/public/products/${slug}`)]);
  if (!site || !product) return { title: "Produto" };
  const { origin } = await requestOrigin();
  return seoMetadata(product.seo, `/produtos/${slug}`, origin);
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [site, product] = await Promise.all([getSite(), publicGet<ProductDetail>(`/api/v1/public/products/${slug}`)]);
  if (!site || !product) notFound();
  const { origin } = await requestOrigin();
  const url = `${origin}/produtos/${product.slug}`;
  const shown = product.promotional_price ?? product.price;
  const sidebar = site.ads?.some((ad) => ad.position === "SIDEBAR");
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-5 py-8 md:px-16 md:py-16">
      <AdSlots ads={site.ads} position="PRODUCT_PAGE" />
      <div className={`grid gap-10 ${sidebar ? "lg:grid-cols-[1fr_240px]" : ""}`}>
        <div className="grid gap-10 md:grid-cols-2">
          {product.json_ld ? <JsonLd data={product.json_ld} /> : null}
          <Gallery images={product.images.length ? product.images : product.image ? [product.image] : []} name={product.name} />
          <div>
            {product.category_slug ? (
              <Link href={`/categorias/${product.category_slug}`} className="text-sm text-stone-500">
                {product.category_name}
              </Link>
            ) : null}
            <h1 className="mt-2 font-serif text-5xl leading-none" data-testid="product-title">
              {product.name}
            </h1>
            {product.brand ? <p className="mt-2 text-sm uppercase tracking-wide text-stone-500">{product.brand}</p> : null}
            <p className="mt-4 text-lg">{product.price_visible && shown != null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: site.tenant.currency }).format(shown) : "Preço sob consulta"}</p>
            {product.stock_display ? <p className="mt-2 text-sm text-stone-500">{product.stock_display}</p> : null}
            {product.description ? <div className="mt-6 whitespace-pre-wrap text-stone-700">{product.description}</div> : null}
            <div className="mt-8">
              <ContactLink contact={site.tenant.contact} message={productMessage(site.tenant.contact.template, product.name, url)} />
            </div>
          </div>
        </div>
        {sidebar ? (
          <aside>
            <AdSlots ads={site.ads} position="SIDEBAR" />
          </aside>
        ) : null}
      </div>
    </main>
  );
}
