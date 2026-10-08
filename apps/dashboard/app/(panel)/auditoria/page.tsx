"use client";

import { useEffect, useState } from "react";

import { Notice } from "@vitrio/ui";
import { PanelPage } from "@/components/panel-page";
import { api } from "@/lib/api";

type Entry = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

export default function AuditPage() {
  const [items, setItems] = useState<Entry[]>([]);

  useEffect(() => {
    api("/audit").then(async (response) => {
      if (response.ok) {
        const body = await response.json();
        setItems(body.items);
      }
    });
  }, []);

  return (
    <PanelPage title="Auditoria" lede="O que mudou na loja e quando.">
      {items.length === 0 ? <Notice tone="empty" title="Nenhum registro ainda" text="As alterações da loja aparecem nesta lista." /> : null}
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
