import Link from "next/link";

import type { SitePayload } from "@/lib/types";

export function StoreHeader({ site }: { site: SitePayload }) {
  const about = site.pages.find((page) => page.slug === "sobre") ?? site.pages[0];
  return (
    <header className="bg-[var(--surface)]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-white focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-5 py-5 md:px-10 md:py-10">
        <Link href="/" className="font-serif text-[28px] leading-none text-[var(--ink)]">
          {site.tenant.logo_url ? <img src={site.tenant.logo_url} alt="" className="mr-3 inline h-9 w-9 rounded-full object-cover" /> : null}
          {site.tenant.trade_name}
        </Link>
        <nav className="flex flex-wrap justify-end gap-x-6 gap-y-2 text-sm text-[var(--muted)]" aria-label="Principal">
          <Link href="/">Início</Link>
          <Link href="/produtos">Catálogo</Link>
          {about ? <Link href={`/pagina/${about.slug}`}>Sobre nós</Link> : null}
          <Link href="/contato">Contato</Link>
        </nav>
      </div>
    </header>
  );
}

export function StoreFooter({ site }: { site: SitePayload }) {
  return (
    <footer className="mt-auto">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-6 text-sm text-[var(--muted)] md:px-16">
        <p>
          {site.tenant.trade_name}
          {" · "}
          <Link href="/contato">Atendimento e informações</Link>
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Rodapé">
          <Link href="/promocoes">Promoções</Link>
          <Link href="/liquidacao">Liquidação</Link>
          <Link href="/cadastro">Cadastro</Link>
          {site.pages
            .filter((page) => page.slug !== "sobre")
            .map((page) => (
              <Link key={page.slug} href={`/pagina/${page.slug}`}>
                {page.title}
              </Link>
            ))}
        </nav>
      </div>
    </footer>
  );
}
