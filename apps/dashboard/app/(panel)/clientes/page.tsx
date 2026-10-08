"use client";

import { useEffect, useState } from "react";

import { PanelFeedback, PanelPage } from "@/components/panel-page";
import { api, readError } from "@/lib/api";

type Customer = { id: string; name: string; email: string; phone: string | null; accepted_terms: boolean };

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    const response = await api("/customers");
    setLoading(false);
    if (!response.ok) {
      setLoadError(await readError(response));
      return;
    }
    setItems(await response.json());
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <PanelPage title="Clientes" lede="Pessoas que deixaram contato na vitrine.">
      <PanelFeedback loading={loading} error={loadError} onRetry={load} empty={!loading && items.length === 0} emptyTitle="Nenhum cliente cadastrado" emptyText="Os cadastros da vitrine aparecem aqui." />
      <ul className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        {items.map((item) => (
          <li key={item.id}>
            <p>{item.name}</p>
            <p className="text-sm text-[var(--muted)]">
              {item.email} {item.phone ? `· ${item.phone}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </PanelPage>
  );
}
