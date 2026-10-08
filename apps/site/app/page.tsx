import Link from "next/link";
import type { ReactNode } from "react";

import { BannerSlider } from "@/components/banner-slider";
import { AdSlots } from "@/components/ad-slots";
import { ContactLink } from "@/components/contact-link";
import { JsonLd } from "@/components/json-ld";
import { ProductCardView } from "@/components/product-card";
import { RegisterStore } from "@/components/register-store";
import { getSite, requestOrigin } from "@/lib/api";

export default async function HomePage() {
  const site = await getSite().catch(() => null);
  if (!site) return <RegisterStore />;
  const about = site.pages.find((page) => page.slug === "sobre");
  const { origin } = await requestOrigin();
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Store",
        name: site.tenant.trade_name,
        description: site.tenant.description,
        url: origin,
        image: site.tenant.logo_url,
        address: {
          "@type": "PostalAddress",
          addressLocality: site.tenant.city,
          addressRegion: site.tenant.state,
          addressCountry: site.tenant.country,
        },
      },
      { "@type": "WebSite", name: site.tenant.trade_name, url: origin },
    ],
  };
  const order = site.tenant.section_order?.length
    ? site.tenant.section_order
    : ["hero", "banners", "categories", "featured", "promotions", "clearance", "about"];
  const heroText = site.tenant.hero_text || site.tenant.description;
  const banner = site.banners.find((item) => item.desktop_url || item.mobile_url);
  const featuredImage = site.featured_products.find((product) => product.image?.url)?.image;
  const heroImage = banner ? { url: banner.desktop_url || banner.mobile_url, alt: banner.title } : featuredImage;
  const blocks: Record<string, ReactNode> = {
    hero: (
      <section data-testid="home-hero" key="hero" className="grid items-start gap-4 rounded-2xl bg-[var(--soft)] p-6 md:grid-cols-[minmax(0,550px)_1fr] md:p-10">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-[var(--brand)]">{(site.tenant.city || "Vitrine").toUpperCase()}</p>
          <h1 className="font-serif text-5xl leading-none text-[var(--ink)] md:text-[64px]">{site.tenant.trade_name}</h1>
          {heroText ? <p className="max-w-[490px] text-lg text-[var(--muted)]">{heroText}</p> : null}
          <Link href="/produtos" className="inline-flex min-h-11 w-fit items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]">
            Explorar catálogo
          </Link>
        </div>
        <div className="flex h-[220px] items-center justify-center overflow-hidden rounded-2xl bg-[var(--image)] md:h-[350px]">
          {heroImage?.url ? (
            <img src={heroImage.url} alt={heroImage.alt || site.tenant.trade_name} className="h-full w-full object-contain" />
          ) : (
            <p className="px-5 text-sm text-[var(--muted)]">Banner da coleção</p>
          )}
        </div>
      </section>
    ),
    banners: (
      <section data-testid="home-banners" key="banners">
        <BannerSlider banners={site.banners} />
      </section>
    ),
    categories: (
      <section data-testid="home-categories" key="categories" className="flex flex-col gap-4">
        <h2 className="font-serif text-4xl text-[var(--ink)]">Feito para o seu dia a dia</h2>
        <p className="text-[15px] text-[var(--muted)]">
          <Link href="/produtos">Categorias</Link>
          {site.categories.map((category) => (
            <span key={category.slug}>
              {" · "}
              <Link href={`/categorias/${category.slug}`}>{category.name}</Link>
            </span>
          ))}
        </p>
      </section>
    ),
    featured: (
      <div key="featured" className="flex flex-col gap-4">
        <section data-testid="home-featured" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {site.featured_products.map((product) => (
            <ProductCardView key={product.slug} product={product} currency={site.tenant.currency} />
          ))}
        </section>
        <AdSlots ads={site.ads} position="HOME_MIDDLE" />
      </div>
    ),
    promotions: site.promotions.length ? (
      <section data-testid="home-promotions" key="promotions" className="flex flex-col gap-4">
        <h2 className="font-serif text-4xl">Promoções</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {site.promotions.map((product) => (
            <ProductCardView key={product.slug} product={product} currency={site.tenant.currency} />
          ))}
        </div>
      </section>
    ) : (
      <section data-testid="home-promotions" key="promotions" className="hidden" />
    ),
    clearance: site.clearance.length ? (
      <section data-testid="home-clearance" key="clearance" className="flex flex-col gap-4">
        <h2 className="font-serif text-4xl">Liquidação</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {site.clearance.map((product) => (
            <ProductCardView key={product.slug} product={product} currency={site.tenant.currency} />
          ))}
        </div>
      </section>
    ) : (
      <section data-testid="home-clearance" key="clearance" className="hidden" />
    ),
    about: (
      <section data-testid="home-about" key="about" className="flex flex-col gap-4 rounded-2xl bg-[var(--brand)] p-7 text-[var(--surface)]">
        <h2 className="font-serif text-[28px]">Encontrou algo especial?</h2>
        <p className="text-base">{site.tenant.description || "Converse com nossa equipe para saber mais."}</p>
        <div className="flex flex-wrap gap-4">
          {about ? (
            <Link href={`/pagina/${about.slug}`} className="inline-flex min-h-11 items-center rounded-[10px] bg-[var(--soft)] px-3.5 text-[15px] text-[var(--brand)]">
              Sobre nós
            </Link>
          ) : null}
          <ContactLink contact={site.tenant.contact} message="Olá! Vim pelo site e gostaria de mais informações." tone="soft" />
        </div>
      </section>
    ),
  };
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-5 py-8 md:px-16 md:py-16">
      <JsonLd data={structured} />
      <AdSlots ads={site.ads} position="HOME_TOP" />
      {order.map((id) => blocks[id] ?? null)}
    </main>
  );
}
