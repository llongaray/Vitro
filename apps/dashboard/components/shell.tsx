"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { NotificationBell } from "@/components/notification-bell";

const ALL = ["OWNER", "ADMIN", "EDITOR", "VIEWER"];
const STORE = ["OWNER", "ADMIN"];
const CATALOG = ["OWNER", "ADMIN", "EDITOR"];

const links = [
  { href: "/", label: "Visão geral", testid: "nav-home", roles: ALL },
  { href: "/produtos", label: "Produtos", testid: "nav-produtos", roles: ALL },
  { href: "/categorias", label: "Categorias", testid: "nav-categorias", roles: ALL },
  { href: "/clientes", label: "Clientes", testid: "nav-clientes", roles: ALL },
  { href: "/banners", label: "Banners", testid: "nav-banners", roles: CATALOG },
  { href: "/promocoes", label: "Promoções", testid: "nav-promocoes", roles: CATALOG },
  { href: "/liquidacao", label: "Liquidação", testid: "nav-liquidacao", roles: CATALOG },
  { href: "/cupons", label: "Cupons", testid: "nav-cupons", roles: STORE },
  { href: "/paginas", label: "Páginas", testid: "nav-paginas", roles: CATALOG },
  { href: "/aparencia", label: "Aparência", testid: "nav-aparencia", roles: STORE },
  { href: "/contato", label: "Contato", testid: "nav-contato", roles: STORE },
  { href: "/equipe", label: "Equipe", testid: "nav-equipe", roles: ["OWNER"] },
  { href: "/integracoes", label: "Integrações", testid: "nav-integracoes", roles: STORE },
  { href: "/modulos", label: "Módulos", testid: "nav-modulos", roles: STORE },
  { href: "/importar", label: "Importar", testid: "nav-importar", roles: STORE },
  { href: "/anuncios", label: "Anúncios", testid: "nav-anuncios", roles: STORE },
  { href: "/seo", label: "SEO", testid: "nav-seo", roles: STORE },
  { href: "/auditoria", label: "Auditoria", testid: "nav-auditoria", roles: STORE },
  { href: "/configuracoes", label: "Configurações", testid: "nav-configuracoes", roles: STORE },
];

const titles: Record<string, string> = Object.fromEntries(links.map((link) => [link.href, link.label]));

function currentTitle(pathname: string) {
  if (titles[pathname]) return titles[pathname];
  const match = Object.keys(titles)
    .filter((href) => href !== "/" && pathname.startsWith(href))
    .sort((a, b) => b.length - a.length)[0];
  return match ? titles[match] : "Painel";
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState("VIEWER");
  const [storeName, setStoreName] = useState("Loja");
  const [accountName, setAccountName] = useState("Minha conta");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include" }).then(async (response) => {
      if (!active) return;
      if (!response.ok) {
        router.replace("/login");
        return;
      }
      const body = await response.json();
      const { setAccessToken } = await import("@/lib/api");
      setAccessToken(body.access_token);
      const me = await api("/auth/me");
      if (me.ok) {
        const profile = await me.json();
        setRole(profile.role);
        if (profile.name) setAccountName(profile.name);
      }
      const settings = await api("/settings");
      if (settings.ok) {
        const store = await settings.json();
        if (store.trade_name) setStoreName(store.trade_name);
        if (store.primary_color) document.documentElement.style.setProperty("--brand", store.primary_color);
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!menuOpen) return;
    closeButtonRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function closeMenu(restoreFocus: boolean) {
    setMenuOpen(false);
    if (restoreFocus) menuButtonRef.current?.focus();
  }

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!ready) return <p className="p-8 text-sm text-[var(--muted)]">Abrindo o painel...</p>;

  function itemActive(href: string) {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  }

  const visible = links.filter((link) => link.roles.includes(role));

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 md:p-8">
      <header className="flex flex-wrap items-center gap-4 rounded-2xl bg-[var(--surface)] px-5 py-5 md:px-8 md:py-8">
        <p className="text-2xl text-[var(--brand)]">Vitrio</p>
        <p className="hidden text-sm text-[var(--muted)] sm:block">
          {storeName}
          {" / "}
          {currentTitle(pathname)}
        </p>
        <div className="ml-auto flex items-center gap-4 text-sm text-[var(--muted)]">
          <NotificationBell />
          <span className="hidden md:inline">{accountName}</span>
          <button
            ref={menuButtonRef}
            type="button"
            className="inline-flex min-h-11 items-center rounded-[10px] px-3 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="menu-painel"
            onClick={() => (menuOpen ? closeMenu(false) : setMenuOpen(true))}
          >
            {menuOpen ? "Fechar" : "Menu"}
          </button>
          <button type="button" onClick={logout}>
            Sair
          </button>
        </div>
      </header>
      <div className="mt-4 flex flex-col items-start gap-4 lg:flex-row">
        {menuOpen ? (
          <button type="button" className="fixed inset-0 z-20 bg-[var(--ink)]/30 lg:hidden" aria-label="Fechar menu" onClick={() => closeMenu(true)} />
        ) : null}
        <aside
          id="menu-painel"
          className={`w-full flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6 lg:static lg:flex lg:w-[220px] lg:shrink-0 lg:shadow-none ${menuOpen ? "fixed inset-x-4 top-28 z-30 flex max-h-[70vh] overflow-auto shadow-lg" : "hidden"}`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Gestão da loja</p>
            <button ref={closeButtonRef} type="button" className="min-h-11 px-2 lg:hidden" onClick={() => closeMenu(true)}>
              Fechar
            </button>
          </div>
          <nav className="flex flex-col gap-4" aria-label="Gestão da loja">
            {visible.map((link) => (
              <Link key={link.href} href={link.href} data-testid={link.testid} className={`text-base ${itemActive(link.href) ? "text-[var(--brand)]" : "text-[var(--ink)]"}`} onClick={() => setMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 w-full flex-1">{children}</div>
      </div>
    </div>
  );
}
