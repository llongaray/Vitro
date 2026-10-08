import type { Metadata } from "next";
import Link from "next/link";

import { EmptyCatalog } from "@/components/empty-catalog";
import { ProductCardView } from "@/components/product-card";
import { AdSlots } from "@/components/ad-slots";
import { getSite, publicGet, requestOrigin } from "@/lib/api";
import { seoMetadata } from "@/lib/seo";
import type { ProductPage } from "@/lib/types";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function catalogHref(page: number, category: string, sort: string, q: string) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (sort && sort !== "recent") params.set("sort", sort);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/produtos?${query}` : "/produtos";
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const site = await getSite();
  const params = await searchParams;
  const filtered = Boolean(one(params.q) || one(params.category) || one(params.page));
  const { origin } = await requestOrigin();
  if (!site) return { title: "Catálogo" };
  const meta = seoMetadata({ ...site.tenant.seo, title: `Catálogo · ${site.tenant.seo.title}` }, "/produtos", origin);
  if (filtered) meta.robots = { index: false, follow: true };
  return meta;
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = one(params.category) ?? "";
  const page = Number(one(params.page) ?? "1") || 1;
  const sort = one(params.sort) ?? "recent";
  const q = one(params.q) ?? "";
  const query = new URLSearchParams();
  if (category) query.set("category", category);
  if (q) query.set("q", q);
  query.set("page", String(page));
  query.set("sort", sort);
  const [site, catalog] = await Promise.all([
    getSite(),
    publicGet<ProductPage>(`/api/v1/public/products?${query.toString()}`),
  ]);
  if (!site || !catalog) return <main className="p-8">Loja não encontrada</main>;
  const pages = Math.max(1, Math.ceil(catalog.total / catalog.limit));
  const current = Math.min(page, pages);
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-5 py-8 md:px-16 md:py-16">
      <p className="text-[13px] text-[var(--muted)]">
        <Link href="/">Início</Link>
        {" / "}
        Catálogo
      </p>
      <h1 className="font-serif text-5xl leading-none text-[var(--ink)]">Encontre o seu favorito</h1>
      <p className="text-base text-[var(--muted)]">Explore nossa seleção. Entre em contato para comprar.</p>
      <form action="/produtos" className="flex flex-wrap items-center gap-4 rounded-2xl bg-[var(--surface)] p-4">
        {category ? <input type="hidden" name="category" value={category} /> : null}
        <input type="hidden" name="sort" value={sort} />
        <input data-testid="search-input" name="q" defaultValue={q} placeholder="Buscar produtos…" className="min-w-40 flex-1 bg-transparent text-base text-[var(--ink)] outline-none placeholder:text-[var(--muted)]" />
        <p className="text-sm text-[var(--brand)]">
          Ordenar:{" "}
          <Link href={catalogHref(1, category, "recent", q)} className={sort === "recent" ? "underline" : ""}>
            Mais recentes
          </Link>
          {" · "}
          <Link href={catalogHref(1, category, "name", q)} className={sort === "name" ? "underline" : ""}>
            Nome
          </Link>
          {" · "}
          <Link href={catalogHref(1, category, "featured", q)} className={sort === "featured" ? "underline" : ""}>
            Destaques
          </Link>
        </p>
        <button data-testid="search-submit" className="text-sm text-[var(--brand)]">
          Buscar
        </button>
      </form>
      <div className="mt-0">
        <AdSlots ads={site.ads} position="CATALOG_TOP" />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[230px_1fr]">
        <aside className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
          <p className="text-xl text-[var(--ink)]">Categorias</p>
          <nav className="flex flex-col gap-4 text-base text-[var(--muted)]" aria-label="Categorias">
            <Link href={catalogHref(1, "", sort, q)} className={!category ? "text-[var(--brand)]" : ""}>
              Todos os produtos
            </Link>
            {site.categories.map((item) => (
              <Link key={item.slug} href={catalogHref(1, item.slug, sort, q)} className={category === item.slug ? "text-[var(--brand)]" : ""}>
                {item.name}
              </Link>
            ))}
          </nav>
          {site.ads?.some((ad) => ad.position === "SIDEBAR") ? <AdSlots ads={site.ads} position="SIDEBAR" /> : null}
        </aside>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--muted)]">
            {catalog.total} {catalog.total === 1 ? "produto encontrado" : "produtos encontrados"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {catalog.items.map((product) => (
              <ProductCardView key={product.slug} product={product} currency={site.tenant.currency} />
            ))}
          </div>
          {catalog.total === 0 ? <EmptyCatalog title="Nenhum produto encontrado" text="Limpe os filtros ou volte mais tarde." action="Limpar filtros" /> : null}
          {pages > 1 ? (
            <nav className="flex flex-wrap items-center gap-6 text-sm text-[var(--brand)]" aria-label="Paginação">
              {current > 1 ? <Link href={catalogHref(current - 1, category, sort, q)}>← Anterior</Link> : <span className="text-[var(--muted)]">← Anterior</span>}
              {Array.from({ length: pages }, (_, index) => (
                <Link key={index} href={catalogHref(index + 1, category, sort, q)} className={current === index + 1 ? "font-medium" : ""}>
                  {index + 1}
                </Link>
              ))}
              {current < pages ? <Link href={catalogHref(current + 1, category, sort, q)}>Próxima →</Link> : <span className="text-[var(--muted)]">Próxima →</span>}
            </nav>
          ) : null}
        </div>
      </div>
    </main>
  );
}
