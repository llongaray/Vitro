import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContactLink } from "@/components/contact-link";
import { StorePage } from "@/components/store-page";
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
    <StorePage crumb={product.name} title={product.name} titleTestId="product-title" lede="O pedido segue direto com a loja.">
      <AdSlots ads={site.ads} position="PRODUCT_PAGE" />
      {product.json_ld ? <JsonLd data={product.json_ld} /> : null}
      <div className={`grid items-start gap-4 ${sidebar ? "xl:grid-cols-[1fr_240px]" : ""}`}>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Gallery images={product.images.length ? product.images : product.image ? [product.image] : []} name={product.name} />
          <section className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
            {product.category_slug ? (
              <Link href={`/categorias/${product.category_slug}`} className="text-[10px] uppercase tracking-wide text-[var(--brand)]">
                {product.category_name}
              </Link>
            ) : null}
            {product.brand ? <p className="text-[10px] uppercase tracking-wide text-[var(--brand)]">{product.brand}</p> : null}
            <h2 className="text-lg">{product.name}</h2>
            <p className="text-[28px]">
              {product.price_visible && shown != null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: site.tenant.currency }).format(shown) : "Preço sob consulta"}
            </p>
            {product.stock_display ? <p className="text-sm text-[var(--muted)]">{product.stock_display}</p> : null}
            {product.description ? <div className="whitespace-pre-wrap text-[var(--muted)]">{product.description}</div> : null}
            <ContactLink contact={site.tenant.contact} message={productMessage(site.tenant.contact.template, product.name, url)} />
          </section>
        </div>
        {sidebar ? (
          <aside>
            <AdSlots ads={site.ads} position="SIDEBAR" />
          </aside>
        ) : null}
      </div>
    </StorePage>
  );
}
