"use client";

import { useEffect, useState } from "react";

import { PanelFeedback } from "@/components/panel-page";
import { api, readError } from "@/lib/api";
import { runPanelLoad } from "@/lib/panel-guards";

type Item = { ok: boolean; label: string; entity: string };

export default function SeoPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function load() {
    await runPanelLoad(setLoading, setLoadError, async () => {
      const response = await api("/seo/audit");
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
