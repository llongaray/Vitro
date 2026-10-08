"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Input } from "@vitrio/ui";
import { SeoPreview } from "@/components/seo-preview";
import { api, readError } from "@/lib/api";

const schema = z.object({ name: z.string().min(1, "Informe o nome") });
type FormValues = z.infer<typeof schema>;
type Category = { id: string; name: string; slug: string; is_active: boolean };

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "" } });

  async function load() {
    const response = await api("/categories");
    if (response.ok) setItems(await response.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(values: FormValues) {
    const response = await api("/categories", { method: "POST", body: JSON.stringify(values) });
    if (!response.ok) {
      form.setError("root", { message: await readError(response) });
      return;
    }
    form.reset();
    await load();
  }

  return (
    <main>
      <h1 className="text-3xl font-semibold">Categorias</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 flex flex-wrap items-end gap-3">
        <label className="min-w-64">
          Nome
          <Input data-testid="category-name" {...form.register("name")} />
        </label>
        <SeoPreview autoTitle={form.watch("name")} />
        <button data-testid="category-submit" className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white" type="submit">
          Adicionar
        </button>
      </form>
      {form.formState.errors.root ? <p className="mt-2 text-sm text-red-700">{form.formState.errors.root.message}</p> : null}
      <ul className="mt-6 divide-y divide-stone-200 rounded-2xl bg-white ring-1 ring-stone-200">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-3">
            <span>{item.name}</span>
            <span className="text-sm text-stone-500">{item.is_active ? "Ativa" : "Inativa"}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
