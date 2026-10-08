"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { NotificationBell } from "@/components/notification-bell";

const ALL = ["OWNER", "ADMIN", "EDITOR", "VIEWER"];
const STORE = ["OWNER", "ADMIN"];
const CATALOG = ["OWNER", "ADMIN", "EDITOR"];

const primary = [
  { href: "/", label: "Visão geral", testid: "nav-home", roles: ALL },
  { href: "/produtos", label: "Produtos", testid: "nav-produtos", roles: ALL },
  { href: "/categorias", label: "Categorias", testid: "nav-categorias", roles: ALL },
  { href: "/banners", label: "Banners", testid: "nav-banners", roles: CATALOG },
  { href: "/paginas", label: "Páginas", testid: "nav-paginas", roles: CATALOG },
  { href: "/aparencia", label: "Aparência", testid: "nav-aparencia", roles: STORE },
  { href: "/configuracoes", label: "Configurações", testid: "nav-configuracoes", roles: STORE },
];

const more = [
  { href: "/promocoes", label: "Promoções", testid: "nav-promocoes", roles: CATALOG },
  { href: "/liquidacao", label: "Liquidação", testid: "nav-liquidacao", roles: CATALOG },
  { href: "/cupons", label: "Cupons", testid: "nav-cupons", roles: STORE },
  { href: "/clientes", label: "Clientes", testid: "nav-clientes", roles: ALL },
  { href: "/anuncios", label: "Anúncios", testid: "nav-anuncios", roles: STORE },
  { href: "/importar", label: "Importar", testid: "nav-importar", roles: STORE },
  { href: "/integracoes", label: "Integrações", testid: "nav-integracoes", roles: STORE },
  { href: "/modulos", label: "Módulos", testid: "nav-modulos", roles: STORE },
  { href: "/contato", label: "Contato", testid: "nav-contato", roles: STORE },
  { href: "/seo", label: "SEO", testid: "nav-seo", roles: STORE },
  { href: "/auditoria", label: "Auditoria", testid: "nav-auditoria", roles: STORE },
  { href: "/equipe", label: "Equipe", testid: "nav-equipe", roles: ["OWNER"] },
];

const titles: Record<string, string> = {
  "/": "Visão geral",
  "/produtos": "Produtos",
  "/categorias": "Categorias",
  "/banners": "Banners",
  "/paginas": "Páginas",
  "/aparencia": "Aparência",
  "/configuracoes": "Configurações",
};

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

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!ready) return <p className="p-8 text-sm text-[var(--muted)]">Abrindo o painel...</p>;

  function itemActive(href: string) {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  }

  function NavGroup({ items, label }: { items: typeof primary; label: string }) {
    const visible = items.filter((link) => link.roles.includes(role));
    if (!visible.length) return null;
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{label}</p>
        {visible.map((link) => (
          <Link key={link.href} href={link.href} data-testid={link.testid} className={`text-base ${itemActive(link.href) ? "text-[var(--brand)]" : "text-[var(--ink)]"}`}>
            {link.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 md:p-8">
      <header className="flex flex-wrap items-center gap-4 rounded-2xl bg-[var(--surface)] px-8 py-8">
        <p className="text-2xl text-[var(--brand)]">Vitrio</p>
        <p className="text-sm text-[var(--muted)]">
          {storeName}
          {" / "}
          {currentTitle(pathname)}
        </p>
        <div className="ml-auto flex items-center gap-4 text-sm text-[var(--muted)]">
          <NotificationBell />
          <span>{accountName}</span>
          <button type="button" onClick={logout} className="text-sm text-[var(--muted)]">
            Sair
          </button>
        </div>
      </header>
      <div className="mt-4 flex flex-col items-start gap-4 lg:flex-row">
        <aside className="flex w-full flex-col gap-8 rounded-2xl bg-[var(--surface)] p-6 lg:w-[220px] lg:shrink-0">
          <NavGroup items={primary} label="Gestão da loja" />
          <NavGroup items={more} label="Mais" />
        </aside>
        <div className="min-w-0 w-full flex-1">{children}</div>
      </div>
    </div>
  );
}
