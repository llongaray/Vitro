"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Input } from "@vitrio/ui";
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
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { title: "", content: "", kind: "custom" as const, published: true } });

  async function load() {
    const response = await api("/pages");
    if (response.ok) setItems(await response.json());
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
    await load();
  }

  return (
    <main>
      <h1 className="text-3xl font-semibold">Páginas</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 grid max-w-xl gap-3">
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
        <button className="w-fit rounded-full bg-stone-900 px-4 py-2 text-sm text-white" type="submit">
          Salvar página
        </button>
      </form>
      <ul className="mt-6 divide-y rounded-2xl bg-white ring-1 ring-stone-200">
        {items.map((item) => (
          <li key={item.id} className="px-4 py-3">
            {item.title} <span className="text-sm text-stone-500">/{item.slug}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
