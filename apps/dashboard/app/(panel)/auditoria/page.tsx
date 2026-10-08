"use client";

import { useEffect, useState } from "react";

import { PanelFeedback, PanelPage } from "@/components/panel-page";
import { api, readError } from "@/lib/api";

type Entry = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

export default function AuditPage() {
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    const response = await api("/audit");
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
    <PanelPage title="Auditoria" lede="O que mudou na loja e quando.">
      <PanelFeedback loading={loading} error={loadError} onRetry={load} empty={!loading && items.length === 0} emptyTitle="Nenhum registro ainda" emptyText="As alterações da loja aparecem nesta lista." />
      <ul className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 text-sm">
            <span>
              {item.action} · {item.entity_type}
            </span>
            <time className="text-[var(--muted)]">{new Date(item.created_at).toLocaleString("pt-BR")}</time>
          </li>
        ))}
      </ul>
    </PanelPage>
  );
}
