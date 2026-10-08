"use client";

import { FormEvent, useEffect, useState } from "react";

import { Input, Notice } from "@vitrio/ui";
import { PanelFeedback } from "@/components/panel-page";
import { api, readError } from "@/lib/api";

type Coupon = { id: string; code: string; name: string; grant_on_signup: boolean; active: boolean };

export default function CouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    const response = await api("/coupons");
    setLoading(false);
    if (!response.ok) {
      setLoadError(await readError(response));
      return;
    }
    setItems(await response.json());
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
    setSaved(true);
    formElement.reset();
    await load();
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-[40px] font-normal leading-none">Cupons</h1>
      <p className="text-base text-[var(--muted)]">Códigos de desconto e o cupom entregue no cadastro.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
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
        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        <button data-testid="coupon-submit" className="w-fit inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]" type="submit">
          Criar cupom
        </button>
      </form>
      {saved ? <Notice tone="success" title="Cupom criado" /> : null}
      <PanelFeedback loading={loading} error={loadError} onRetry={load} empty={!loading && items.length === 0} emptyTitle="Nenhum cupom" emptyText="Crie o primeiro código da loja." />
      <ul className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
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
