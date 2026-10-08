"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";

type Overview = { products: number; categories: number; banners: number; pages: number };
type Summary = {
  visits: number;
  users: number;
  views: number;
  clicks: number;
  customers: number;
  coupons: number;
  contact_conversion: number;
  top_products: { name: string; views: number }[];
  top_categories: { name: string; views: number }[];
  top_searches: { q: string; count: number }[];
};

export default function HomePage() {
  const [data, setData] = useState<Overview | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function loadSummary(start: string, end: string) {
    const params = new URLSearchParams();
    if (start) params.set("from", start);
    if (end) params.set("to", end);
    const query = params.toString();
    api(`/analytics/summary${query ? `?${query}` : ""}`).then(async (response) => {
      if (response.ok) setSummary(await response.json());
    });
  }

  useEffect(() => {
    api("/settings/overview").then(async (response) => {
      if (response.ok) setData(await response.json());
    });
    loadSummary("", "");
  }, []);

  return (
    <main data-testid="dashboard-home">
      <h1 className="text-3xl font-semibold">Início</h1>
      <p className="mt-2 text-stone-600">O que já está publicado na vitrine.</p>
      <form
        className="mt-4 flex flex-wrap items-end gap-3 text-sm"
        onSubmit={(event) => {
          event.preventDefault();
          loadSummary(from, to);
        }}
      >
        <label>
          De
          <input data-testid="analytics-from" type="date" className="mt-1 block rounded-xl border border-stone-300 px-3 py-2" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          Até
          <input data-testid="analytics-to" type="date" className="mt-1 block rounded-xl border border-stone-300 px-3 py-2" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <button data-testid="analytics-filter" className="rounded-full bg-stone-900 px-4 py-2 text-white" type="submit">
          Filtrar
        </button>
      </form>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Produtos" value={data?.products} />
        <Card label="Categorias" value={data?.categories} />
        <Card label="Banners" value={data?.banners} />
        <Card label="Páginas" value={data?.pages} />
        <Card label="Visitas" value={summary?.visits} />
        <Card label="Usuários" value={summary?.users} />
        <Card label="Visualizações" value={summary?.views} />
        <Card label="Cliques" value={summary?.clicks} />
        <Card label="Clientes" value={summary?.customers} />
        <Card label="Cupons" value={summary?.coupons} />
      </div>
      <p className="mt-6 text-sm text-stone-600">Conversão para contato: {summary ? `${Math.round(summary.contact_conversion * 100)}%` : "—"}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Ranked title="Produtos mais vistos" items={summary?.top_products} />
        <Ranked title="Categorias mais vistas" items={summary?.top_categories} />
        <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200" data-testid="top-searches">
          <h2 className="font-medium">Pesquisas</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(summary?.top_searches ?? []).map((item) => (
              <li key={item.q} className="flex justify-between">
                <span>{item.q}</span>
                <span>{item.count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

function Ranked({ title, items }: { title: string; items?: { name: string; views: number }[] }) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
      <h2 className="font-medium">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {(items ?? []).map((item) => (
          <li key={item.name} className="flex justify-between">
            <span>{item.name}</span>
            <span>{item.views}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Card({ label, value }: { label: string; value?: number }) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value ?? "—"}</p>
    </section>
  );
}
