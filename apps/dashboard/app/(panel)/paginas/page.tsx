"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Input, Notice } from "@vitrio/ui";
import { PanelFeedback } from "@/components/panel-page";
import { SeoPreview } from "@/components/seo-preview";
import { api, readError } from "@/lib/api";

const schema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  kind: z.enum(["about", "contact", "privacy", "terms", "custom"]),
  published: z.boolean(),
});
type PageItem = { id: string; title: string; slug: string; published: boolean };

export default function PagesPage() {
  const [items, setItems] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saved, setSaved] = useState(false);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { title: "", content: "", kind: "custom" as const, published: true } });

  async function load() {
    setLoading(true);
    setLoadError("");
    const response = await api("/pages");
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

  async function onSubmit(values: z.infer<typeof schema>) {
    const response = await api("/pages", { method: "POST", body: JSON.stringify(values) });
    if (!response.ok) {
      form.setError("root", { message: await readError(response) });
      return;
    }
    form.reset();
    setSaved(true);
    await load();
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-[40px] font-normal leading-none">Páginas</h1>
      <p className="text-base text-[var(--muted)]">Sobre, privacidade, termos e páginas da loja.</p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        <label>
          Título
          <Input {...form.register("title")} />
        </label>
        <label>
          Conteúdo
          <textarea className="min-h-32 rounded-xl border border-stone-300 px-3 py-2 text-sm" {...form.register("content")} />
        </label>
        <label>
          Tipo
          <select className="rounded-xl border border-stone-300 px-3 py-2" {...form.register("kind")}>
            <option value="about">Sobre</option>
            <option value="privacy">Privacidade</option>
            <option value="terms">Termos</option>
            <option value="contact">Contato</option>
            <option value="custom">Personalizada</option>
          </select>
        </label>
        <label className="flex items-center gap-2 font-normal">
          <input type="checkbox" {...form.register("published")} /> Publicar
        </label>
        <SeoPreview autoTitle={form.watch("title")} autoDescription={form.watch("content")} />
        {form.formState.errors.root ? <p className="text-sm text-red-700" role="alert">{form.formState.errors.root.message}</p> : null}
        <button className="w-fit inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]" type="submit">
          Salvar página
        </button>
      </form>
      {saved ? <Notice tone="success" title="Página salva" /> : null}
      <PanelFeedback loading={loading} error={loadError} onRetry={load} empty={!loading && items.length === 0} emptyTitle="Nenhuma página" emptyText="Publique o primeiro texto institucional." />
      <ul className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        {items.map((item) => (
          <li key={item.id} className="px-4 py-3">
            {item.title} <span className="text-sm text-stone-500">/{item.slug}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
