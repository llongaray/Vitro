"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Input, Notice } from "@vitrio/ui";
import { SeoPreview } from "@/components/seo-preview";
import { api, readError } from "@/lib/api";
import { claimSubmit, releaseSubmit, runPanelLoad } from "@/lib/panel-guards";

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
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sending, setSending] = useState(false);
  const submitLock = useRef({ busy: false });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { trade_name: "", show_prices: false, indexing_enabled: true },
  });

  async function load() {
    await runPanelLoad(setLoading, setLoadError, async () => {
      const response = await api("/settings");
      if (!response.ok) throw new Error(await readError(response));
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
        show_prices: Boolean(data.show_prices),
        seo_title: data.seo_title ?? "",
        seo_description: data.seo_description ?? "",
        indexing_enabled: data.indexing_enabled !== false,
      });
      setReady(true);
    });
  }

  useEffect(() => {
    void load();
  }, [form]);

  async function onSubmit(values: FormValues) {
    if (!ready || !claimSubmit(submitLock.current)) return;
    setSending(true);
    try {
    const response = await api("/settings", {
      method: "PATCH",
      body: JSON.stringify({ ...values, name: values.trade_name, site_name: values.trade_name }),
    });
    if (!response.ok) {
      setSaved(false);
      form.setError("root", { message: await readError(response) });
      return;
    }
    form.clearErrors("root");
    setSaved(true);
    } catch {
      setSaved(false);
      form.setError("root", { message: "A conexão falhou. Tente de novo." });
    } finally {
      releaseSubmit(submitLock.current);
      setSending(false);
    }
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-[40px] font-normal leading-none">Configurações</h1>
      <p className="text-base text-[var(--muted)]">Nome, cores e dados que a vitrine mostra para esta loja.</p>
      {loading ? <Notice tone="loading" title="Carregando" text="Buscando as configurações da loja." /> : null}
      {loadError ? (
        <Notice
          tone="error"
          title="Não foi possível carregar"
          text={loadError}
          action={
            <button type="button" className="inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]" onClick={() => void load()}>
              Tentar de novo
            </button>
          }
        />
      ) : null}
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6" aria-busy={sending}>
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
        {form.formState.errors.root ? <p data-testid="settings-error" className="text-sm text-red-700" role="alert">{form.formState.errors.root.message}</p> : null}
        {saved ? <Notice tone="success" title="Configurações salvas" text="A vitrine passa a usar estes dados." /> : null}
        <button data-testid="settings-submit" className="w-fit inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)] disabled:opacity-50" type="submit" disabled={!ready || loading || sending}>
          {sending ? "Salvando..." : "Salvar"}
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
  const [messageOk, setMessageOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState("");
  const lock = useRef({ busy: false });

  async function load() {
    await runPanelLoad(setLoading, setLoadError, async () => {
      const response = await api("/domains");
      if (!response.ok) throw new Error(await readError(response));
      setRows(await response.json());
    });
  }

  useEffect(() => {
    void load();
  }, []);

  async function run(action: string, task: () => Promise<void>) {
    if (!claimSubmit(lock.current)) return;
    setBusy(action);
    try {
      await task();
    } catch {
      setMessageOk(false);
      setMessage("A conexão falhou. Tente de novo.");
    } finally {
      releaseSubmit(lock.current);
      setBusy("");
    }
  }

  function add(event: FormEvent) {
    event.preventDefault();
    void run("add", async () => {
      const response = await api("/domains", { method: "POST", body: JSON.stringify({ hostname }) });
      if (!response.ok) {
        setMessageOk(false);
        setMessage(await readError(response));
        return;
      }
      setHostname("");
      setMessageOk(true);
      setMessage("Domínio adicionado.");
      await load();
    });
  }

  function verify(id: string) {
    void run(`verify:${id}`, async () => {
      const response = await api(`/domains/${id}/verify`, { method: "POST" });
      setMessageOk(response.ok);
      setMessage(response.ok ? "Domínio verificado." : await readError(response));
      await load();
    });
  }

  function primary(id: string) {
    void run(`primary:${id}`, async () => {
      const response = await api(`/domains/${id}/primary`, { method: "POST" });
      setMessageOk(response.ok);
      setMessage(response.ok ? "Domínio definido como primário." : await readError(response));
      await load();
    });
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
        <button data-testid="domain-submit" className="w-fit inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)] disabled:opacity-50" type="submit" disabled={Boolean(busy)}>
          {busy === "add" ? "Adicionando..." : "Adicionar"}
        </button>
      </form>
      {loading ? <Notice tone="loading" title="Carregando" text="Buscando os domínios da loja." /> : null}
      {loadError ? (
        <Notice
          tone="error"
          title="Não foi possível carregar"
          text={loadError}
          action={
            <button type="button" className="inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]" onClick={() => void load()}>
              Tentar de novo
            </button>
          }
        />
      ) : null}
      {!loading && !loadError && rows.length === 0 ? <Notice tone="empty" title="Nenhum domínio adicional" text="O endereço atual da loja continua valendo." /> : null}
      {message ? <p className={`text-sm ${messageOk ? "text-stone-700" : "text-red-700"}`} role={messageOk ? "status" : "alert"}>{message}</p> : null}
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
              <button type="button" data-testid="domain-verify" className="rounded-full bg-stone-100 px-3 py-1 disabled:opacity-50" onClick={() => verify(row.id)} disabled={Boolean(busy)}>
                {busy === `verify:${row.id}` ? "Aguarde..." : "Verificar"}
              </button>
              <button type="button" data-testid="domain-primary" className="rounded-full bg-stone-100 px-3 py-1 disabled:opacity-50" onClick={() => primary(row.id)} disabled={Boolean(busy)}>
                Tornar primário
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
