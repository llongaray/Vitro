"use client";

import { FormEvent, useEffect, useState } from "react";

import { Input } from "@vitrio/ui";
import { api, readError } from "@/lib/api";

type Product = { id: string; name: string };
type Promotion = { id: string; name: string; active: boolean; products: { name: string }[] };

export default function PromotionsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<Promotion[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const [productResponse, promotionResponse] = await Promise.all([api("/products?limit=100"), api("/promotions")]);
    if (productResponse.ok) {
      const body = await productResponse.json();
      setProducts(body.items);
    }
    if (promotionResponse.ok) setItems(await promotionResponse.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const selected = form.getAll("product_id").map(String);
    const price = String(form.get("promotional_price") || "");
    const start = String(form.get("start_at") || "");
    const end = String(form.get("end_at") || "");
    const response = await api("/promotions", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description") || null,
        start_at: start ? new Date(start).toISOString() : null,
        end_at: end ? new Date(end).toISOString() : null,
        active: true,
        products: selected.map((product_id) => ({ product_id, promotional_price: price === "" ? null : Number(price) })),
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
    <main className="flex flex-col gap-4">
      <h1 className="text-[40px] font-normal leading-none">Promoções</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        <label>
          Nome
          <Input data-testid="promotion-name" name="name" required />
        </label>
        <label>
          Descrição
          <Input name="description" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            Início
            <Input data-testid="promotion-start" type="datetime-local" name="start_at" />
          </label>
          <label>
            Fim
            <Input data-testid="promotion-end" type="datetime-local" name="end_at" />
          </label>
        </div>
        <label>
          Preço promocional
          <Input data-testid="promotion-price" type="number" step="0.01" min="0" name="promotional_price" />
        </label>
        <fieldset className="grid gap-2">
          <legend className="text-sm">Produtos</legend>
          {products.map((product) => (
            <label key={product.id} className="flex items-center gap-2 font-normal">
              <input data-testid="promotion-product" type="checkbox" name="product_id" value={product.id} />
              {product.name}
            </label>
          ))}
        </fieldset>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button data-testid="promotion-submit" className="w-fit inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]" type="submit">
          Criar campanha
        </button>
      </form>
      <ul className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        {items.map((item) => (
          <li key={item.id} className="px-4 py-3">
            {item.name} <span className="text-sm text-stone-500">{item.products.map((product) => product.name).join(", ")}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
