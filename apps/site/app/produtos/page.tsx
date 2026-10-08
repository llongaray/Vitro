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

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const site = await getSite();
  const params = await searchParams;
  const filtered = Boolean(one(params.q) || one(params.category) || one(params.page));
  const { origin } = await requestOrigin();
  if (!site) return { title: "Produtos" };
  const meta = seoMetadata({ ...site.tenant.seo, title: `Produtos · ${site.tenant.seo.title}` }, "/produtos", origin);
  if (filtered) meta.robots = { index: false, follow: true };
  return meta;
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = one(params.category) ?? "";
  const page = one(params.page) ?? "1";
  const query = new URLSearchParams();
  if (category) query.set("category", category);
  if (page) query.set("page", page);
  const [site, catalog] = await Promise.all([
    getSite(),
    publicGet<ProductPage>(`/api/v1/public/products?${query.toString()}`),
  ]);
  if (!site || !catalog) return <main className="p-8">Loja não encontrada</main>;
  const pages = Math.max(1, Math.ceil(catalog.total / catalog.limit));
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-serif text-5xl">Produtos</h1>
      <div className="mt-6">
        <AdSlots ads={site.ads} position="CATALOG_TOP" />
      </div>
      <form action="/busca" className="mt-6 flex flex-wrap gap-3">
        <input data-testid="search-input" name="q" placeholder="Pesquisar" className="rounded-full border border-stone-300 px-4 py-2" />
        <button data-testid="search-submit" className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white">
          Buscar
        </button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/produtos" className={!category ? "font-semibold" : ""}>
          Todas
        </Link>
        {site.categories.map((item) => (
          <Link key={item.slug} href={`/produtos?category=${item.slug}`} className={category === item.slug ? "font-semibold" : ""}>
            {item.name}
          </Link>
        ))}
      </div>
      <div className={`mt-8 grid gap-8 ${site.ads?.some((ad) => ad.position === "SIDEBAR") ? "lg:grid-cols-[1fr_240px]" : ""}`}>
        <div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.items.map((product) => (
              <ProductCardView key={product.slug} product={product} currency={site.tenant.currency} />
            ))}
          </div>
          {catalog.total === 0 ? <EmptyCatalog title="Nenhum produto publicado" text="A vitrine ainda não tem peças nesta seleção." /> : null}
          {pages > 1 ? (
            <nav className="mt-8 flex gap-3 text-sm" aria-label="Paginação">
              {Array.from({ length: pages }, (_, index) => (
                <Link key={index} href={`/produtos?page=${index + 1}${category ? `&category=${category}` : ""}`}>
                  {index + 1}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
        {site.ads?.some((ad) => ad.position === "SIDEBAR") ? (
          <aside>
            <AdSlots ads={site.ads} position="SIDEBAR" />
          </aside>
        ) : null}
      </div>
    </main>
  );
}
