"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";

type Item = { ok: boolean; label: string; entity: string };

export default function SeoPage() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    api("/seo/audit").then(async (response) => {
      if (response.ok) {
        const body = await response.json();
        setItems(body.items);
      }
    });
  }, []);

  return (
    <main>
      <h1 className="text-3xl font-semibold">SEO</h1>
      <p className="mt-2 max-w-2xl text-stone-600">Checklist técnico da vitrine. Não indica posição no Google.</p>
      <ul className="mt-6 divide-y rounded-2xl bg-white ring-1 ring-stone-200">
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
