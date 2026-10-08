"use client";

import { useEffect, useState } from "react";

import { Notice } from "@vitrio/ui";
import { PanelPage } from "@/components/panel-page";
import { api } from "@/lib/api";

type Customer = { id: string; name: string; email: string; phone: string | null; accepted_terms: boolean };

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);

  useEffect(() => {
    api("/customers").then(async (response) => {
      if (response.ok) setItems(await response.json());
    });
  }, []);

  return (
    <PanelPage title="Clientes" lede="Pessoas que deixaram contato na vitrine.">
      {items.length === 0 ? <Notice tone="empty" title="Nenhum cliente cadastrado" text="Os cadastros da vitrine aparecem aqui." /> : null}
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
