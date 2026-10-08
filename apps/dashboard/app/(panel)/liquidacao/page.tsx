"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";

type Product = { id: string; name: string; is_clearance: boolean; clearance_label: string | null };

export default function ClearancePage() {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    api("/products?limit=100").then(async (response) => {
      if (!response.ok) return;
      const body = await response.json();
      setItems(body.items.filter((item: Product) => item.is_clearance));
    });
  }, []);

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-[40px] font-normal leading-none">Liquidação</h1>
      <p className="mt-2 text-stone-600">A vigência e o rótulo ficam no cadastro do produto.</p>
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
