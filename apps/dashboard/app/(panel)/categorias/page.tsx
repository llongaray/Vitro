"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Input, Notice } from "@vitrio/ui";
import { PanelPage } from "@/components/panel-page";
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
    <PanelPage title="Categorias" lede="Organize os produtos e facilite a descoberta.">
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        <label>
          Nome da categoria
          <Input data-testid="category-name" placeholder="Informe o nome da categoria" {...form.register("name")} />
        </label>
        <SeoPreview autoTitle={form.watch("name")} />
        {form.formState.errors.root ? <p className="text-sm text-red-700" role="alert">{form.formState.errors.root.message}</p> : null}
        <button data-testid="category-submit" className="inline-flex min-h-11 w-fit items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]" type="submit">
          Adicionar
        </button>
      </form>
      {items.length === 0 ? <Notice tone="empty" title="Nenhuma categoria cadastrada" text="Cadastre a primeira categoria da loja." /> : null}
      <ul className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4">
            <span>{item.name}</span>
            <span className="text-sm text-[var(--muted)]">{item.is_active ? "Ativa" : "Inativa"}</span>
          </li>
        ))}
      </ul>
    </PanelPage>
  );
}
