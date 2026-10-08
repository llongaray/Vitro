"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PanelFeedback } from "@/components/panel-page";
import { api, readError } from "@/lib/api";
import { runPanelLoad } from "@/lib/panel-guards";

type Product = { id: string; name: string; slug: string; published: boolean; is_active: boolean };

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function load() {
    await runPanelLoad(setLoading, setLoadError, async () => {
      const response = await api("/products?limit=100");
      if (!response.ok) throw new Error(await readError(response));
      const body = await response.json();
      setItems(body.items ?? []);
    });
  }

  useEffect(() => {
    void load();
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
      <PanelFeedback loading={loading} error={loadError} onRetry={load} empty={!loading && items.length === 0} emptyTitle="Nenhum produto cadastrado" emptyText="Publique o primeiro produto da vitrine." />
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
