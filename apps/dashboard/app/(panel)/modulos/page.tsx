"use client";

import { useEffect, useState } from "react";

import { Notice } from "@vitrio/ui";
import { PanelFeedback } from "@/components/panel-page";
import { api, readError } from "@/lib/api";
import { runPanelLoad } from "@/lib/panel-guards";

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
  const [messageOk, setMessageOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function load() {
    await runPanelLoad(setLoading, setLoadError, async () => {
      const [moduleResponse, automationResponse] = await Promise.all([api("/modules"), api("/automations")]);
      if (!moduleResponse.ok) throw new Error(await readError(moduleResponse));
      setModules(await moduleResponse.json());
      if (!automationResponse.ok) throw new Error(await readError(automationResponse));
      setAutomations(await automationResponse.json());
    });
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleModule(row: ModuleRow) {
    const response = await api(`/modules/${row.module}`, { method: "PUT", body: JSON.stringify({ enabled: !row.enabled }) });
    setMessageOk(response.ok);
    setMessage(response.ok ? "Módulo atualizado." : await readError(response));
    await load();
  }

  async function toggleAutomation(row: AutomationRow) {
    const response = await api(`/automations/${row.trigger}`, { method: "PUT", body: JSON.stringify({ enabled: !row.enabled }) });
    setMessageOk(response.ok);
    setMessage(response.ok ? "Automação atualizada." : await readError(response));
    await load();
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-[40px] font-normal leading-none">Módulos</h1>
      <p className="text-base text-[var(--muted)]">O que está ligado nesta loja e os avisos automáticos.</p>
      <PanelFeedback loading={loading} error={loadError} onRetry={load} empty={!loading && modules.length === 0} emptyTitle="Nenhum módulo" emptyText="A plataforma ainda não liberou módulos para esta loja." />
      <ul className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        {modules.map((row) => (
          <li key={row.module} className="flex items-center justify-between gap-4">
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
      <h2 className="text-[22px]">Automações</h2>
      <ul className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        {automations.map((row) => (
          <li key={row.trigger} className="flex items-center justify-between gap-4">
            <span>{triggerLabels[row.trigger] ?? row.trigger}</span>
            <button type="button" className="rounded-full bg-stone-100 px-3 py-1 text-sm" onClick={() => toggleAutomation(row)}>
              {row.enabled ? "Ligada" : "Desligada"}
            </button>
          </li>
        ))}
      </ul>
      {message ? <Notice tone={messageOk ? "success" : "error"} title={message} /> : null}
    </main>
  );
}
