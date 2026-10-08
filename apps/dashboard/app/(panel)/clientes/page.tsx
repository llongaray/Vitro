"use client";

import { useEffect, useState } from "react";

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
    <main>
      <h1 className="text-3xl font-semibold">Clientes</h1>
      <ul className="mt-6 divide-y rounded-2xl bg-white ring-1 ring-stone-200">
        {items.map((item) => (
          <li key={item.id} className="px-4 py-3">
            <p>{item.name}</p>
            <p className="text-sm text-stone-500">
              {item.email} {item.phone ? `· ${item.phone}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
