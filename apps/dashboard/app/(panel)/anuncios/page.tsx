"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Input } from "@vitrio/ui";
import { api, readError } from "@/lib/api";

type Ad = { id: string; title: string; position: string; active: boolean };

export default function AdsPage() {
  const [items, setItems] = useState<Ad[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await api("/ads");
    if (response.ok) setItems(await response.json());
    else setMessage(await readError(response));
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const response = await api("/ads", {
      method: "POST",
      body: JSON.stringify({
        title: data.get("title"),
        url: data.get("url") || null,
        position: data.get("position"),
        active: true,
      }),
    });
    setMessage(response.ok ? "Anúncio publicado." : await readError(response));
    if (response.ok) formElement.reset();
    await load();
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-[40px] font-normal leading-none">Anúncios</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        <Input data-testid="ad-title" name="title" placeholder="Título" required />
        <Input data-testid="ad-url" name="url" placeholder="https://" />
        <select data-testid="ad-position" name="position" className="rounded-xl border border-stone-300 px-3 py-2 text-sm" defaultValue="HOME_TOP">
          <option value="HOME_TOP">Topo da home</option>
          <option value="HOME_MIDDLE">Meio da home</option>
          <option value="CATALOG_TOP">Topo do catálogo</option>
          <option value="PRODUCT_PAGE">Página do produto</option>
          <option value="SIDEBAR">Lateral</option>
        </select>
        <button data-testid="ad-submit" className="w-fit inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]" type="submit">
          Publicar
        </button>
      </form>
      {message ? <p className="text-sm">{message}</p> : null}
      <ul className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{item.title}</span>
            <span className="text-stone-500">{item.position}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
