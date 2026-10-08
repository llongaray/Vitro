"use client";

import { useEffect, useState } from "react";

import { api, readError } from "@/lib/api";

const moduleLabels: Record<string, string> = {
  coupons: "Cupons",
  analytics: "Analytics",
  seo_audit: "Auditoria SEO",
  ads: "Anúncios",
};

const triggerLabels: Record<string, string> = {
  customer_signup: "Avisar quando um cliente se cadastra",
  coupon_claim: "Avisar quando um cupom é resgatado",
  contact_click: "Avisar quando alguém clica em contato",
};

type ModuleRow = { module: string; enabled: boolean; platform_enabled: boolean };
type AutomationRow = { trigger: string; enabled: boolean };

export default function ModulesPage() {
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [automations, setAutomations] = useState<AutomationRow[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const [moduleResponse, automationResponse] = await Promise.all([api("/modules"), api("/automations")]);
    if (moduleResponse.ok) setModules(await moduleResponse.json());
    if (automationResponse.ok) setAutomations(await automationResponse.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleModule(row: ModuleRow) {
    const response = await api(`/modules/${row.module}`, { method: "PUT", body: JSON.stringify({ enabled: !row.enabled }) });
    setMessage(response.ok ? "Módulo atualizado." : await readError(response));
    await load();
  }

  async function toggleAutomation(row: AutomationRow) {
    const response = await api(`/automations/${row.trigger}`, { method: "PUT", body: JSON.stringify({ enabled: !row.enabled }) });
    setMessage(response.ok ? "Automação atualizada." : await readError(response));
    await load();
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-[40px] font-normal leading-none">Módulos</h1>
      <ul className="space-y-3">
        {modules.map((row) => (
          <li key={row.module} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200">
            <span>{moduleLabels[row.module] ?? row.module}</span>
            <button
              type="button"
              data-testid={`module-${row.module}`}
              disabled={!row.platform_enabled && !row.enabled}
              className="inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)] disabled:opacity-50"
              onClick={() => toggleModule(row)}
            >
              {row.enabled ? "Ligado" : "Desligado"}
            </button>
          </li>
        ))}
      </ul>
      <h2 className="font-serif text-3xl">Automações</h2>
      <ul className="space-y-3">
        {automations.map((row) => (
          <li key={row.trigger} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200">
            <span>{triggerLabels[row.trigger] ?? row.trigger}</span>
            <button type="button" className="rounded-full bg-stone-100 px-3 py-1 text-sm" onClick={() => toggleAutomation(row)}>
              {row.enabled ? "Ligada" : "Desligada"}
            </button>
          </li>
        ))}
      </ul>
      {message ? <p className="text-sm">{message}</p> : null}
    </main>
  );
}
