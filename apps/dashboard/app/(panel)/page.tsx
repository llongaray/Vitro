"use client";

import { useEffect, useState } from "react";

import { PanelFeedback } from "@/components/panel-page";
import { api, readError } from "@/lib/api";
import { runPanelLoad } from "@/lib/panel-guards";

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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function loadSummary(start: string, end: string) {
    const params = new URLSearchParams();
    if (start) params.set("from", start);
    if (end) params.set("to", end);
    const query = params.toString();
    const response = await api(`/analytics/summary${query ? `?${query}` : ""}`);
    if (!response.ok) throw new Error(await readError(response));
    setSummary(await response.json());
  }

  async function load(start = from, end = to) {
    await runPanelLoad(setLoading, setLoadError, async () => {
      const overview = await api("/settings/overview");
      if (!overview.ok) throw new Error(await readError(overview));
      setData(await overview.json());
      await loadSummary(start, end);
    });
  }

  useEffect(() => {
    void load("", "");
  }, []);

  return (
    <main className="flex flex-col gap-4" data-testid="dashboard-home">
      <h1 className="text-[40px] font-normal leading-none">Visão geral</h1>
      <p className="text-base text-[var(--muted)]">Acompanhe o que está publicado e o interesse na vitrine.</p>
      <PanelFeedback loading={loading} error={loadError} onRetry={() => void load(from, to)} />
      <form
        className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void load(from, to);
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
        <button data-testid="analytics-filter" className="inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]" type="submit">
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
        <section className="rounded-2xl bg-[var(--surface)] p-5" data-testid="top-searches">
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
    <section className="rounded-2xl bg-[var(--surface)] p-5">
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
    <section className="rounded-2xl bg-[var(--surface)] p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value ?? "—"}</p>
    </section>
  );
}
