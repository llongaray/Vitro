"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Input, Notice } from "@vitrio/ui";
import { api, readError } from "@/lib/api";
import { runPanelLoad } from "@/lib/panel-guards";

const schema = z.object({
  contact_type: z.enum(["whatsapp", "phone", "instagram", "email", "url"]),
  contact_value: z.string().min(1, "Informe o contato"),
  contact_message_template: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ContactPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { contact_type: "whatsapp", contact_value: "", contact_message_template: "" },
  });

  async function load() {
    await runPanelLoad(setLoading, setLoadError, async () => {
      const response = await api("/contacts");
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json();
      form.reset({
        contact_type: data.contact_type,
        contact_value: data.contact_value ?? "",
        contact_message_template: data.contact_message_template ?? "",
      });
      setReady(true);
    });
  }

  useEffect(() => {
    void load();
  }, [form]);

  async function onSubmit(values: FormValues) {
    if (!ready) return;
    const response = await api("/contacts", { method: "PATCH", body: JSON.stringify(values) });
    if (!response.ok) {
      setSaved(false);
      form.setError("root", { message: await readError(response) });
      return;
    }
    setSaved(true);
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-[40px] font-normal leading-none">Contato</h1>
      <p className="text-base text-[var(--muted)]">O botão Tenho interesse usa este canal. Use {"{product_name}"} e {"{product_url}"} na mensagem.</p>
      {loading ? <Notice tone="loading" title="Carregando" text="Buscando o contato da loja." /> : null}
      {loadError ? <Notice tone="error" title="Não foi possível carregar" text={loadError} action={<button type="button" className="inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]" onClick={() => void load()}>Tentar de novo</button>} /> : null}
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        <label>
          Canal
          <select className="rounded-xl border border-stone-300 px-3 py-2" {...form.register("contact_type")}>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Telefone</option>
            <option value="instagram">Instagram</option>
            <option value="email">E-mail</option>
            <option value="url">URL</option>
          </select>
        </label>
        <label>
          Valor
          <Input {...form.register("contact_value")} />
        </label>
        <label>
          Mensagem
          <textarea className="min-h-28 rounded-xl border border-stone-300 px-3 py-2 text-sm" {...form.register("contact_message_template")} />
        </label>
        {form.formState.errors.root ? <p className="text-sm text-red-700" role="alert">{form.formState.errors.root.message}</p> : null}
        {saved ? <Notice tone="success" title="Contato salvo" /> : null}
        <button className="w-fit inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)] disabled:opacity-50" type="submit" disabled={!ready || loading || form.formState.isSubmitting}>
          Salvar contato
        </button>
      </form>
    </main>
  );
}
