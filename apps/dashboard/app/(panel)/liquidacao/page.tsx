"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PanelFeedback } from "@/components/panel-page";
import { api, readError } from "@/lib/api";

type Product = { id: string; name: string; is_clearance: boolean; clearance_label: string | null };

export default function ClearancePage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    const response = await api("/products?limit=100");
    setLoading(false);
    if (!response.ok) {
      setLoadError(await readError(response));
      return;
    }
    const body = await response.json();
    setItems(body.items.filter((item: Product) => item.is_clearance));
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
