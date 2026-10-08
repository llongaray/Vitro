"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Input } from "@vitrio/ui";
import { api, readError } from "@/lib/api";

const providers = [
  { id: "ga4", label: "Google Analytics 4" },
  { id: "meta_pixel", label: "Meta Pixel" },
  { id: "gtm", label: "Google Tag Manager" },
  { id: "search_console", label: "Search Console" },
];

type Integration = { provider: string; public_id: string; enabled: boolean };
type ApiKeyRow = { id: string; name: string; prefix: string; revoked_at: string | null };

export default function IntegrationsPage() {
  const [rows, setRows] = useState<Integration[]>([]);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { public_id: string; enabled: boolean }>>({});
  const [keyName, setKeyName] = useState("Site");
  const [freshKey, setFreshKey] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [integrations, apiKeys] = await Promise.all([api("/integrations"), api("/api-keys")]);
    if (integrations.ok) {
      const data = (await integrations.json()) as Integration[];
      setRows(data);
      setDrafts(Object.fromEntries(data.map((row) => [row.provider, { public_id: row.public_id, enabled: row.enabled }])));
    }
    if (apiKeys.ok) setKeys(await apiKeys.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function save(provider: string) {
    const draft = drafts[provider] ?? { public_id: "", enabled: true };
    const response = await api(`/integrations/${provider}`, {
      method: "PUT",
      body: JSON.stringify({ public_id: draft.public_id, enabled: draft.enabled }),
    });
    setMessage(response.ok ? "Integração salva." : await readError(response));
    await load();
  }

  async function createKey(event: FormEvent) {
    event.preventDefault();
    const response = await api("/api-keys", { method: "POST", body: JSON.stringify({ name: keyName }) });
    if (!response.ok) {
      setMessage(await readError(response));
      return;
    }
    const data = await response.json();
    setFreshKey(data.key);
    await load();
  }

  async function revoke(id: string) {
    await api(`/api-keys/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-[40px] font-normal leading-none">Integrações</h1>
      <p className="text-sm text-stone-600">Nesta fase entram só identificadores públicos. Um segredo, se informado depois, fica cifrado e não volta na resposta.</p>
      {providers.map((provider) => {
        const draft = drafts[provider.id] ?? { public_id: "", enabled: false };
        return (
          <form
            key={provider.id}
            className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-stone-200"
            onSubmit={(event) => {
              event.preventDefault();
              save(provider.id);
            }}
          >
            <h2 className="text-lg">{provider.label}</h2>
            <Input
              value={draft.public_id}
              placeholder="Identificador público"
              onChange={(event) => setDrafts((current) => ({ ...current, [provider.id]: { ...draft, public_id: event.target.value } }))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(event) => setDrafts((current) => ({ ...current, [provider.id]: { ...draft, enabled: event.target.checked } }))}
              />
              Ativa
            </label>
            <button className="w-fit inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]" type="submit">
              Salvar
            </button>
          </form>
        );
      })}
      <section className="space-y-3">
        <h2 className="font-serif text-3xl">Chave da API</h2>
        <form onSubmit={createKey} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Nome
            <Input value={keyName} onChange={(event) => setKeyName(event.target.value)} />
          </label>
          <button className="w-fit inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]" type="submit">
            Gerar chave
          </button>
        </form>
        {freshKey ? (
          <p className="rounded-2xl bg-amber-50 p-4 font-mono text-sm" data-testid="api-key-once">
            {freshKey}
          </p>
        ) : null}
        <ul className="space-y-2 text-sm">
          {keys.map((key) => (
            <li key={key.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200">
              <span>
                {key.name} · {key.prefix}… {key.revoked_at ? "revogada" : "ativa"}
              </span>
              {key.revoked_at ? null : (
                <button type="button" className="text-red-700" onClick={() => revoke(key.id)}>
                  Revogar
                </button>
              )}
            </li>
          ))}
        </ul>
        {rows.length ? null : null}
        {message ? <p className="text-sm">{message}</p> : null}
      </section>
    </main>
  );
}
