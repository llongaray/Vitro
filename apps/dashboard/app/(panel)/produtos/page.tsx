"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";

type Product = { id: string; name: string; slug: string; published: boolean; is_active: boolean };

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    api("/products?limit=100").then(async (response) => {
      if (response.ok) {
        const body = await response.json();
        setItems(body.items);
      }
    });
  }, []);

  return (
    <main>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Produtos</h1>
        <Link data-testid="new-product" href="/produtos/novo" className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white">
          Novo produto
        </Link>
      </div>
      <ul className="mt-6 divide-y divide-stone-200 rounded-2xl bg-white ring-1 ring-stone-200">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-3">
            <Link href={`/produtos/${item.id}`}>{item.name}</Link>
            <span className="text-sm text-stone-500">{item.published && item.is_active ? "Publicado" : "Oculto"}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
