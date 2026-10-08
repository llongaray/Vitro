"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/", label: "Início" },
  { href: "/produtos", label: "Catálogo" },
];

export function StoreNav({ aboutHref, extra }: { aboutHref?: string; extra?: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const items = [
    ...links,
    ...(aboutHref ? [{ href: aboutHref, label: "Sobre nós" }] : []),
    { href: "/contato", label: "Contato" },
    ...(extra ?? []),
  ];
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        className="text-sm text-[var(--muted)] md:hidden"
        aria-expanded={open}
        aria-controls="menu-publico"
        onClick={() => setOpen((value) => !value)}
      >
        Menu
      </button>
      <nav id="menu-publico" className={`${open ? "absolute left-0 right-0 top-full flex" : "hidden"} z-20 flex-col gap-4 bg-[var(--surface)] px-5 py-4 text-sm text-[var(--muted)] md:static md:flex md:flex-row md:gap-6 md:bg-transparent md:p-0`} aria-label="Principal">
        {items.map((item) => (
          <Link key={item.href + item.label} href={item.href} onClick={() => setOpen(false)}>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
