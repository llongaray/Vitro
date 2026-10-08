"use client";

import { FormEvent, useEffect, useState } from "react";

import { Input } from "@vitrio/ui";
import { api, readError } from "@/lib/api";

type Coupon = { id: string; code: string; name: string; grant_on_signup: boolean; active: boolean };

export default function CouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const response = await api("/coupons");
    if (response.ok) setItems(await response.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await api("/coupons", {
      method: "POST",
      body: JSON.stringify({
        code: form.get("code"),
        name: form.get("name"),
        discount_type: form.get("discount_type"),
        discount_value: Number(form.get("discount_value") || 0),
        grant_on_signup: form.get("grant_on_signup") === "on",
        scope: "ALL_PRODUCTS",
        active: true,
      }),
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    setError("");
    formElement.reset();
    await load();
  }

  return (
    <main>
      <h1 className="text-3xl font-semibold">Cupons</h1>
      <form onSubmit={onSubmit} className="mt-6 grid max-w-xl gap-4">
        <label>
          Código
          <Input data-testid="coupon-code-input" name="code" required />
        </label>
        <label>
          Nome
          <Input data-testid="coupon-name" name="name" required />
        </label>
        <label>
          Tipo
          <select name="discount_type" className="rounded-xl border border-stone-300 px-3 py-2" defaultValue="PERCENTAGE">
            <option value="PERCENTAGE">Percentual</option>
            <option value="FIXED">Valor fixo</option>
          </select>
        </label>
        <label>
          Valor
          <Input data-testid="coupon-value" name="discount_value" type="number" min="0" step="0.01" required />
        </label>
        <label className="flex items-center gap-2 font-normal">
          <input data-testid="coupon-signup" name="grant_on_signup" type="checkbox" />
          Entregar no cadastro
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button data-testid="coupon-submit" className="w-fit rounded-full bg-stone-900 px-4 py-2 text-sm text-white" type="submit">
          Criar cupom
        </button>
      </form>
      <ul className="mt-6 divide-y rounded-2xl bg-white ring-1 ring-stone-200">
        {items.map((item) => (
          <li key={item.id} className="px-4 py-3">
            {item.code} · {item.name}
            {item.grant_on_signup ? " · cadastro" : ""}
          </li>
        ))}
      </ul>
    </main>
  );
}
