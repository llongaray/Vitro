"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Notice } from "@vitrio/ui";
import { PanelFeedback } from "@/components/panel-page";
import { api, readError } from "@/lib/api";
import { runPanelLoad } from "@/lib/panel-guards";

const labels: Record<string, string> = {
  hero: "Hero",
  banners: "Banners",
  categories: "Categorias",
  featured: "Destaques",
  promotions: "Promoções",
  clearance: "Liquidação",
  about: "Sobre",
};

export default function AppearancePage() {
  const [fontPair, setFontPair] = useState("classic");
  const [heroText, setHeroText] = useState("");
  const [order, setOrder] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [themes, setThemes] = useState<{ id: string; name: string; fonts: string }[]>([]);

  async function load() {
    await runPanelLoad(setLoading, setLoadError, async () => {
      const [appearance, themeResponse] = await Promise.all([api("/appearance"), api("/themes")]);
      if (!appearance.ok) throw new Error(await readError(appearance));
      const data = await appearance.json();
      setFontPair(data.font_pair);
      setHeroText(data.hero_text ?? "");
      setOrder(data.section_order ?? []);
      if (themeResponse.ok) setThemes(await themeResponse.json());
    });
  }

  useEffect(() => {
    void load();
  }, []);

  async function applyTheme(id: string) {
    const response = await api(`/themes/${id}/apply`, { method: "POST" });
    if (!response.ok) {
      setMessageOk(false);
      setMessage(await readError(response));
      return;
    }
    setMessageOk(true);
    const data = await response.json();
    setFontPair(data.font_pair);
    setOrder(data.section_order);
    setMessage("Tema aplicado.");
  }

  function move(id: string, direction: number) {
    setOrder((current) => {
      const index = current.indexOf(id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item!);
      return copy;
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const response = await api("/appearance", {
      method: "PATCH",
      body: JSON.stringify({ font_pair: fontPair, hero_text: heroText, section_order: order }),
    });
    setMessageOk(response.ok);
    setMessage(response.ok ? "Aparência salva." : await readError(response));
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-[40px] font-normal leading-none">Aparência</h1>
      <p className="text-base text-[var(--muted)]">Tema, texto do hero e a ordem das seções da home.</p>
      <PanelFeedback loading={loading} error={loadError} onRetry={load} />
      <div className="grid gap-3 sm:grid-cols-2">
        {themes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            data-testid={`theme-apply-${theme.id}`}
            className="rounded-2xl bg-white p-4 text-left ring-1 ring-stone-200"
            onClick={() => applyTheme(theme.id)}
          >
            <span className="block font-medium">{theme.name}</span>
            <span className="mt-1 block text-sm text-stone-500">{theme.fonts}</span>
          </button>
        ))}
      </div>
      <form onSubmit={save} className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        <label className="block text-sm">
          Par de fontes
          <select className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2" value={fontPair} onChange={(event) => setFontPair(event.target.value)}>
            <option value="classic">Atual — Fraunces e Outfit</option>
            <option value="editorial">Alternativa — Source Serif e Source Sans</option>
          </select>
        </label>
        <label className="block text-sm">
          Texto do hero
          <textarea className="mt-1 min-h-24 w-full rounded-xl border border-stone-300 px-3 py-2" value={heroText} onChange={(event) => setHeroText(event.target.value)} />
        </label>
        <div className="rounded-3xl bg-white p-6 ring-1 ring-stone-200" data-testid="hero-preview">
          <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Prévia</p>
          <p className="mt-3 font-serif text-4xl">Sua loja</p>
          <p className="mt-3 text-stone-600">{heroText || "O texto do hero aparece aqui."}</p>
        </div>
        <ol className="space-y-2" data-testid="section-list">
          {order.map((id) => (
            <li key={id} data-section={id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200">
              <span>{labels[id] ?? id}</span>
              <span className="flex gap-2">
                <button type="button" data-testid={`section-up-${id}`} className="rounded-full bg-stone-100 px-3 py-1 text-sm" onClick={() => move(id, -1)}>
                  Subir
                </button>
                <button type="button" data-testid={`section-down-${id}`} className="rounded-full bg-stone-100 px-3 py-1 text-sm" onClick={() => move(id, 1)}>
                  Descer
                </button>
              </span>
            </li>
          ))}
        </ol>
        {message ? <Notice tone={messageOk ? "success" : "error"} title={message} /> : null}
        <p className="sr-only" data-testid="appearance-saved">
          {message}
        </p>
        <button data-testid="appearance-submit" className="w-fit inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]" type="submit">
          Salvar aparência
        </button>
      </form>
    </main>
  );
}
