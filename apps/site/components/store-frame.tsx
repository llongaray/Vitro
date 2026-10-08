import Link from "next/link";

import { StoreNav } from "@/components/store-nav";
import type { SitePayload } from "@/lib/types";

export function StoreHeader({ site }: { site: SitePayload }) {
  const about = site.pages.find((page) => page.slug === "sobre") ?? site.pages.find((page) => /sobre/i.test(page.title));
  return (
    <header className="relative bg-[var(--surface)]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-white focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-5 py-5 md:px-10 md:py-10">
        <Link href="/" className="font-serif text-[28px] leading-none text-[var(--ink)]">
          {site.tenant.logo_url ? <img src={site.tenant.logo_url} alt="" className="mr-3 inline h-9 w-9 rounded-full object-cover" /> : null}
          {site.tenant.trade_name}
        </Link>
        <StoreNav aboutHref={about ? `/pagina/${about.slug}` : undefined} />
      </div>
    </header>
  );
}

export function StoreFooter({ site }: { site: SitePayload }) {
  const about = site.pages.find((page) => page.slug === "sobre");
  const privacy = site.pages.find((page) => page.slug === "privacidade" || /privacidade/i.test(page.title));
  const terms = site.pages.find((page) => page.slug === "termos" || /termos/i.test(page.title));
  return (
    <footer className="mt-auto px-5 pb-8 md:px-16">
      <div className="mx-auto flex max-w-[1312px] flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
        <p className="font-serif text-2xl text-[var(--ink)]">{site.tenant.trade_name}</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Rodapé">
          {about ? <Link href={`/pagina/${about.slug}`}>Sobre nós</Link> : null}
          <Link href="/contato">Contato</Link>
          {privacy ? <Link href={`/pagina/${privacy.slug}`}>Privacidade</Link> : null}
          {terms ? <Link href={`/pagina/${terms.slug}`}>Termos</Link> : null}
          <Link href="/promocoes">Promoções</Link>
          <Link href="/liquidacao">Liquidação</Link>
          <Link href="/cadastro">Cadastro</Link>
          {site.pages
            .filter((page) => page.slug !== about?.slug && page.slug !== privacy?.slug && page.slug !== terms?.slug)
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
