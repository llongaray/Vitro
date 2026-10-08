"use client";

import { useEffect, useState } from "react";

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
    <main className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl">Auditoria</h1>
      <ul className="mt-6 divide-y divide-stone-200 rounded-2xl bg-white ring-1 ring-stone-200">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>
              {item.action} · {item.entity_type}
            </span>
            <time className="text-stone-500">{new Date(item.created_at).toLocaleString("pt-BR")}</time>
          </li>
        ))}
      </ul>
    </main>
  );
}
