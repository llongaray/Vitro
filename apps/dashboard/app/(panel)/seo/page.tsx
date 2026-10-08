"use client";

import { useEffect, useState } from "react";

import { PanelFeedback } from "@/components/panel-page";
import { api, readError } from "@/lib/api";

type Item = { ok: boolean; label: string; entity: string };

export default function SeoPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    const response = await api("/seo/audit");
    setLoading(false);
    if (!response.ok) {
      setLoadError(await readError(response));
      return;
    }
    const body = await response.json();
    setItems(body.items);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-[40px] font-normal leading-none">SEO</h1>
      <p className="text-base text-[var(--muted)]">Checklist técnico da vitrine. Não indica posição no Google.</p>
      <PanelFeedback loading={loading} error={loadError} onRetry={load} empty={!loading && items.length === 0} emptyTitle="Nenhum item na auditoria" emptyText="Quando houver páginas e produtos, o checklist aparece aqui." />
      <ul className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        {items.map((item, index) => (
          <li key={`${item.entity}-${item.label}-${index}`} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>
              {item.entity} · {item.label}
            </span>
            <span className={item.ok ? "text-emerald-700" : "text-red-700"}>{item.ok ? "Ok" : "Revisar"}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
