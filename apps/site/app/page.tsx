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
  const heroImage = site.featured_products.find((product) => product.image?.url)?.image;
  const blocks: Record<string, ReactNode> = {
    hero: (
      <section data-testid="home-hero" key="hero" className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-stone-200/80">
        <div className="grid items-center gap-8 p-6 md:grid-cols-[1.05fr_0.95fr] md:p-10 lg:gap-12 lg:p-14">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">{site.tenant.city || "Vitrine"}</p>
            <h1 className="mt-4 font-serif text-5xl leading-[0.95] text-stone-950 md:text-6xl">{site.tenant.trade_name}</h1>
            {heroText ? <p className="mt-5 max-w-md text-lg leading-relaxed text-stone-600">{heroText}</p> : null}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/produtos" className="rounded-full px-5 py-3 text-sm font-medium text-white" style={{ background: "var(--store)" }}>
                Ver produtos
              </Link>
              {about ? (
                <Link href={`/pagina/${about.slug}`} className="rounded-full bg-stone-100 px-5 py-3 text-sm font-medium text-stone-800">
                  Conheça a loja
                </Link>
              ) : (
                <ContactLink contact={site.tenant.contact} message="Olá! Vim pelo site e gostaria de mais informações." />
              )}
            </div>
          </div>
          <div className="relative">
            {heroImage?.url ? (
              <img src={heroImage.url} alt={heroImage.alt || site.tenant.trade_name} className="aspect-[5/4] w-full rounded-[1.5rem] bg-stone-50 object-contain p-6" />
            ) : (
              <div className="aspect-[5/4] rounded-[1.5rem] bg-stone-100" />
            )}
          </div>
        </div>
        <ul className="grid gap-4 border-t border-stone-100 px-6 py-5 text-sm text-stone-600 sm:grid-cols-3 md:px-10">
          <li>Atendimento direto com a loja</li>
          <li>Peças selecionadas</li>
          <li>{[site.tenant.city, site.tenant.state].filter(Boolean).join(" · ") || site.tenant.business_hours}</li>
        </ul>
      </section>
    ),
    banners: (
      <section data-testid="home-banners" key="banners">
        <BannerSlider banners={site.banners} />
      </section>
    ),
    categories: (
      <section data-testid="home-categories" key="categories">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Explore</p>
            <h2 className="mt-2 font-serif text-4xl">Categorias</h2>
          </div>
          <Link href="/produtos" className="text-sm underline">
            Ver todas
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {site.categories.map((category) => (
            <Link key={category.slug} href={`/categorias/${category.slug}`} className="group overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-stone-200/80">
              <div className="aspect-[16/10] bg-stone-50">
                {category.image_url ? (
                  <img src={category.image_url} alt="" className="h-full w-full object-contain p-6 transition duration-300 group-hover:scale-105" />
                ) : (
                  <div className="grid h-full place-items-center font-serif text-4xl text-stone-300">{category.name.slice(0, 1)}</div>
                )}
              </div>
              <div className="px-5 py-4">
                <p className="font-serif text-2xl">{category.name}</p>
                {category.description ? <p className="mt-1 text-sm text-stone-500">{category.description}</p> : null}
              </div>
            </Link>
          ))}
        </div>
      </section>
    ),
    featured: (
      <div key="featured" className="space-y-12">
        <section data-testid="home-featured">
          <div className="flex items-end justify-between gap-4">
            <div>
            <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Seleção</p>
            <h2 className="mt-2 font-serif text-4xl">Destaques</h2>
          </div>
            <Link href="/produtos" className="text-sm underline">
              Ver catálogo
            </Link>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {site.featured_products.map((product) => (
              <ProductCardView key={product.slug} product={product} currency={site.tenant.currency} />
            ))}
          </div>
        </section>
        <AdSlots ads={site.ads} position="HOME_MIDDLE" />
      </div>
    ),
    promotions: site.promotions.length ? (
      <section data-testid="home-promotions" key="promotions">
        <h2 className="font-serif text-4xl">Promoções</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {site.promotions.map((product) => (
            <ProductCardView key={product.slug} product={product} currency={site.tenant.currency} />
          ))}
        </div>
      </section>
    ) : (
      <section data-testid="home-promotions" key="promotions" className="hidden" />
    ),
    clearance: site.clearance.length ? (
      <section data-testid="home-clearance" key="clearance">
        <h2 className="font-serif text-4xl">Liquidação</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {site.clearance.map((product) => (
            <ProductCardView key={product.slug} product={product} currency={site.tenant.currency} />
          ))}
        </div>
      </section>
    ) : (
      <section data-testid="home-clearance" key="clearance" className="hidden" />
    ),
    about: about ? (
      <section data-testid="home-about" key="about" className="grid gap-6 rounded-[2rem] bg-white p-8 ring-1 ring-stone-200/80 md:grid-cols-[1fr_auto] md:items-center md:p-10">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">A loja</p>
          <h2 className="mt-2 font-serif text-4xl">Sobre</h2>
          <p className="mt-3 max-w-xl text-stone-600">{site.tenant.description}</p>
        </div>
        <Link href={`/pagina/${about.slug}`} className="rounded-full bg-stone-900 px-5 py-3 text-center text-sm text-white">
          Conheça a loja
        </Link>
      </section>
    ) : (
      <section data-testid="home-about" key="about" className="hidden" />
    ),
  };
  return (
    <main className="mx-auto max-w-6xl space-y-16 px-6 py-8 md:py-12">
      <JsonLd data={structured} />
      <AdSlots ads={site.ads} position="HOME_TOP" />
      {order.map((id) => blocks[id] ?? null)}
    </main>
  );
}
