import Link from "next/link";

import type { SitePayload } from "@/lib/types";

export function StoreHeader({ site }: { site: SitePayload }) {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#f4efe7]/90 backdrop-blur">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-white focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          {site.tenant.logo_url ? <img src={site.tenant.logo_url} alt="" className="mr-3 inline h-9 w-9 rounded-full object-cover" /> : null}
          {site.tenant.trade_name}
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-700" aria-label="Principal">
          <Link href="/produtos">Produtos</Link>
          <Link href="/promocoes">Promoções</Link>
          <Link href="/liquidacao">Liquidação</Link>
          <Link href="/cadastro">Cadastro</Link>
          {site.pages.map((page) => (
            <Link key={page.slug} href={`/pagina/${page.slug}`}>
              {page.title}
            </Link>
          ))}
          <Link href="/contato">Contato</Link>
        </nav>
        <form action="/busca" className="ml-auto">
          <input name="q" placeholder="Buscar produtos" className="w-44 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm outline-none ring-stone-300 focus:ring-2 md:w-56" />
        </form>
      </div>
    </header>
  );
}

export function StoreFooter({ site }: { site: SitePayload }) {
  const place = [site.tenant.city, site.tenant.state].filter(Boolean).join(" · ");
  return (
    <footer className="mt-auto border-t border-stone-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-serif text-2xl">{site.tenant.trade_name}</p>
          {site.tenant.description ? <p className="mt-3 text-sm leading-relaxed text-stone-600">{site.tenant.description}</p> : null}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Loja</p>
          <nav className="mt-3 grid gap-2 text-sm text-stone-700" aria-label="Rodapé">
            <Link href="/produtos">Produtos</Link>
            <Link href="/promocoes">Promoções</Link>
            <Link href="/liquidacao">Liquidação</Link>
            <Link href="/cadastro">Cadastro</Link>
            <Link href="/contato">Contato</Link>
          </nav>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Contato</p>
          <div className="mt-3 grid gap-2 text-sm text-stone-700">
            {site.tenant.phone ? <p>{site.tenant.phone}</p> : null}
            {site.tenant.business_hours ? <p>{site.tenant.business_hours}</p> : null}
            {site.tenant.instagram ? <p>{site.tenant.instagram}</p> : null}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Endereço</p>
          <div className="mt-3 grid gap-2 text-sm text-stone-700">
            {site.tenant.address ? <p>{site.tenant.address}</p> : null}
            {place ? <p>{place}</p> : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
