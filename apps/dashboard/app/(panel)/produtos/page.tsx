"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Notice } from "@vitrio/ui";
import { api } from "@/lib/api";

type Product = { id: string; name: string; slug: string; published: boolean; is_active: boolean };

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    api("/products?limit=100").then(async (response) => {
      if (response.ok) {
        const body = await response.json();
        setItems(body.items);
      }
    });
  }, []);

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-normal leading-none">Produtos</h1>
          <p className="mt-4 text-base text-[var(--muted)]">Mantenha o catálogo organizado e atualizado.</p>
        </div>
        <Link data-testid="new-product" href="/produtos/novo" className="inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]">
          Novo produto
        </Link>
      </div>
      {items.length === 0 ? <Notice tone="empty" title="Nenhum produto cadastrado" text="Publique o primeiro produto da vitrine." /> : null}
      <ul className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4">
            <Link href={`/produtos/${item.id}`}>{item.name}</Link>
            <span className="text-sm text-[var(--muted)]">{item.published && item.is_active ? "Publicado" : "Oculto"}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
