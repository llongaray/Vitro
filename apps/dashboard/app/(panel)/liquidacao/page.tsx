"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PanelFeedback } from "@/components/panel-page";
import { api, readError } from "@/lib/api";
import { runPanelLoad } from "@/lib/panel-guards";

type Product = { id: string; name: string; is_clearance: boolean; clearance_label: string | null };

export default function ClearancePage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function load() {
    await runPanelLoad(setLoading, setLoadError, async () => {
      const response = await api("/products?limit=100");
      if (!response.ok) throw new Error(await readError(response));
      const body = await response.json();
      setItems((body.items ?? []).filter((item: Product) => item.is_clearance));
    });
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-[40px] font-normal leading-none">Liquidação</h1>
      <p className="text-base text-[var(--muted)]">A vigência e o rótulo ficam no cadastro do produto.</p>
      <PanelFeedback loading={loading} error={loadError} onRetry={load} empty={!loading && items.length === 0} emptyTitle="Nenhum produto em liquidação" emptyText="Marque a liquidação no cadastro do produto." />
      <ul className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-3">
            <span>{item.clearance_label || item.name}</span>
            <Link href={`/produtos/${item.id}`} className="text-sm underline">
              Editar
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
