"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Input } from "@vitrio/ui";
import { SeoPreview } from "@/components/seo-preview";
import { api, readError } from "@/lib/api";

const schema = z.object({
  trade_name: z.string().min(2),
  description: z.string().optional(),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  business_hours: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  show_prices: z.boolean(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  indexing_enabled: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function SettingsPage() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { trade_name: "", show_prices: false, indexing_enabled: true },
  });

  useEffect(() => {
    api("/settings").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      form.reset({
        trade_name: data.trade_name ?? "",
        description: data.description ?? "",
        primary_color: data.primary_color ?? "#9a3412",
        secondary_color: data.secondary_color ?? "#1c1917",
        phone: data.phone ?? "",
        address: data.address ?? "",
        business_hours: data.business_hours ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        show_prices: data.show_prices,
        seo_title: data.seo_title ?? "",
        seo_description: data.seo_description ?? "",
        indexing_enabled: data.indexing_enabled,
      });
    });
  }, [form]);

  async function onSubmit(values: FormValues) {
    const response = await api("/settings", {
      method: "PATCH",
      body: JSON.stringify({ ...values, name: values.trade_name, site_name: values.trade_name }),
    });
    if (!response.ok) form.setError("root", { message: await readError(response) });
  }

  return (
    <main>
      <h1 className="text-3xl font-semibold">Configurações</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 grid max-w-xl gap-4">
        <label>
          Nome comercial
          <Input {...form.register("trade_name")} />
        </label>
        <label>
          Descrição
          <textarea className="min-h-24 rounded-xl border border-stone-300 px-3 py-2 text-sm" {...form.register("description")} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            Cor principal
            <Input type="color" {...form.register("primary_color")} />
          </label>
          <label>
            Cor de apoio
            <Input type="color" {...form.register("secondary_color")} />
          </label>
        </div>
        <label>
          Telefone
          <Input {...form.register("phone")} />
        </label>
        <label>
          Endereço
          <Input {...form.register("address")} />
        </label>
        <label>
          Horário
          <Input {...form.register("business_hours")} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            Cidade
            <Input {...form.register("city")} />
          </label>
          <label>
            Estado
            <Input {...form.register("state")} />
          </label>
        </div>
        <label>
          Título SEO
          <Input {...form.register("seo_title")} />
        </label>
        <label>
          Descrição SEO
          <Input {...form.register("seo_description")} />
        </label>
        <SeoPreview autoTitle={form.watch("trade_name")} autoDescription={form.watch("description")} manualTitle={form.watch("seo_title")} manualDescription={form.watch("seo_description")} />
        <label className="flex items-center gap-2 font-normal">
          <input type="checkbox" {...form.register("show_prices")} /> Mostrar preços na vitrine
        </label>
        <label className="flex items-center gap-2 font-normal">
          <input type="checkbox" {...form.register("indexing_enabled")} /> Permitir indexação
        </label>
        {form.formState.errors.root ? <p data-testid="settings-error" className="text-sm text-red-700">{form.formState.errors.root.message}</p> : null}
        <button data-testid="settings-submit" className="w-fit rounded-full bg-stone-900 px-4 py-2 text-sm text-white" type="submit">
          Salvar
        </button>
      </form>
      <DomainsPanel />
    </main>
  );
}

type DomainRow = {
  id: string;
  hostname: string;
  verified: boolean;
  is_primary: boolean;
  verification_token: string | null;
  dns_name: string;
};

function DomainsPanel() {
  const [rows, setRows] = useState<DomainRow[]>([]);
  const [hostname, setHostname] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const response = await api("/domains");
    if (response.ok) setRows(await response.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function add(event: FormEvent) {
    event.preventDefault();
    const response = await api("/domains", { method: "POST", body: JSON.stringify({ hostname }) });
    if (!response.ok) {
      setMessage(await readError(response));
      return;
    }
    setHostname("");
    setMessage("");
    await load();
  }

  async function verify(id: string) {
    const response = await api(`/domains/${id}/verify`, { method: "POST" });
    setMessage(response.ok ? "Domínio verificado." : await readError(response));
    await load();
  }

  async function primary(id: string) {
    const response = await api(`/domains/${id}/primary`, { method: "POST" });
    setMessage(response.ok ? "Domínio definido como primário." : await readError(response));
    await load();
  }

  return (
    <section className="mt-12 space-y-4">
      <h2 className="font-serif text-3xl">Domínio</h2>
      <p className="max-w-xl text-sm text-stone-600">
        O domínio novo nasce sem verificação e não abre a loja. Publique um TXT em <span className="font-mono">_vitrio-challenge.seudominio</span> com o token abaixo.
      </p>
      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <label>
          Hostname
          <Input data-testid="domain-hostname" value={hostname} onChange={(event) => setHostname(event.target.value)} placeholder="www.minhaloja.com.br" />
        </label>
        <button data-testid="domain-submit" className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white" type="submit">
          Adicionar
        </button>
      </form>
      {message ? <p className="text-sm text-stone-700">{message}</p> : null}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl bg-white p-4 text-sm ring-1 ring-stone-200">
            <p className="font-medium">{row.hostname}</p>
            <p className="mt-1 text-stone-500">{row.verified ? "Verificado" : "Aguardando TXT"}{row.is_primary ? " · primário" : ""}</p>
            {row.verification_token ? (
              <p className="mt-2 font-mono text-xs" data-testid="domain-token">
                {row.dns_name} = {row.verification_token}
              </p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button type="button" data-testid="domain-verify" className="rounded-full bg-stone-100 px-3 py-1" onClick={() => verify(row.id)}>
                Verificar
              </button>
              <button type="button" data-testid="domain-primary" className="rounded-full bg-stone-100 px-3 py-1" onClick={() => primary(row.id)}>
                Tornar primário
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
