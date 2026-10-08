"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BadgePercent, Boxes, FileText, ImageIcon, LayoutDashboard, LogOut, Megaphone, MessageCircle, Package, Palette, Plug, ScrollText, Search, Settings, Shapes, Ticket, Upload, UserCog, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { NotificationBell } from "@/components/notification-bell";

const ALL = ["OWNER", "ADMIN", "EDITOR", "VIEWER"];
const STORE = ["OWNER", "ADMIN"];
const CATALOG = ["OWNER", "ADMIN", "EDITOR"];

const links = [
  { href: "/", label: "Início", icon: LayoutDashboard, testid: "nav-home", roles: ALL },
  { href: "/produtos", label: "Produtos", icon: Package, testid: "nav-produtos", roles: ALL },
  { href: "/categorias", label: "Categorias", icon: Shapes, testid: "nav-categorias", roles: ALL },
  { href: "/promocoes", label: "Promoções", icon: BadgePercent, testid: "nav-promocoes", roles: CATALOG },
  { href: "/liquidacao", label: "Liquidação", icon: BadgePercent, testid: "nav-liquidacao", roles: CATALOG },
  { href: "/cupons", label: "Cupons", icon: Ticket, testid: "nav-cupons", roles: STORE },
  { href: "/clientes", label: "Clientes", icon: Users, testid: "nav-clientes", roles: ALL },
  { href: "/banners", label: "Banners", icon: ImageIcon, testid: "nav-banners", roles: CATALOG },
  { href: "/paginas", label: "Páginas", icon: FileText, testid: "nav-paginas", roles: CATALOG },
  { href: "/anuncios", label: "Anúncios", icon: Megaphone, testid: "nav-anuncios", roles: STORE },
  { href: "/aparencia", label: "Aparência", icon: Palette, testid: "nav-aparencia", roles: STORE },
  { href: "/importar", label: "Importar", icon: Upload, testid: "nav-importar", roles: STORE },
  { href: "/integracoes", label: "Integrações", icon: Plug, testid: "nav-integracoes", roles: STORE },
  { href: "/modulos", label: "Módulos", icon: Boxes, testid: "nav-modulos", roles: STORE },
  { href: "/contato", label: "Contato", icon: MessageCircle, testid: "nav-contato", roles: STORE },
  { href: "/seo", label: "SEO", icon: Search, testid: "nav-seo", roles: STORE },
  { href: "/auditoria", label: "Auditoria", icon: ScrollText, testid: "nav-auditoria", roles: STORE },
  { href: "/equipe", label: "Equipe", icon: UserCog, testid: "nav-equipe", roles: ["OWNER"] },
  { href: "/configuracoes", label: "Configurações", icon: Settings, testid: "nav-configuracoes", roles: STORE },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState("VIEWER");

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

  if (!ready) return <p className="p-8 text-sm text-stone-500">Abrindo o painel...</p>;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-stone-200 bg-stone-900 text-stone-100 md:min-h-screen md:border-b-0">
        <div className="flex items-center justify-between px-5 py-5">
          <p className="font-semibold tracking-wide">Vitrio</p>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <a href="/" className="text-xs text-stone-300 underline">
              Ver loja
            </a>
          </div>
        </div>
        <nav className="flex gap-1 overflow-auto px-3 pb-4 md:grid">
          {links.filter((link) => link.roles.includes(role)).map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} data-testid={link.testid} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${active ? "bg-white text-stone-900" : "text-stone-200"}`}>
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <button type="button" onClick={logout} className="m-3 flex items-center gap-2 text-sm text-stone-300">
          <LogOut size={16} /> Sair
        </button>
      </aside>
      <div className="px-6 py-8">{children}</div>
    </div>
  );
}
