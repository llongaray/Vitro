"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Input, Notice } from "@vitrio/ui";
import { PanelFeedback } from "@/components/panel-page";
import { api, readError } from "@/lib/api";
import { runPanelLoad } from "@/lib/panel-guards";

type Member = { id: string; name: string; email: string; role: string; is_active: boolean };

export default function TeamPage() {
  const [items, setItems] = useState<Member[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function load() {
    await runPanelLoad(setLoading, setLoadError, async () => {
      const response = await api("/users");
      if (!response.ok) throw new Error(await readError(response));
      setItems(await response.json());
    });
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const response = await api("/users", {
      method: "POST",
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        password: data.get("password"),
        role: data.get("role"),
      }),
    });
    setMessage(response.ok ? "Pessoa adicionada." : await readError(response));
    if (response.ok) formElement.reset();
    await load();
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-[40px] font-normal leading-none">Equipe</h1>
      <p className="text-base text-[var(--muted)]">Quem acessa o painel e com qual papel.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        <Input data-testid="user-name" name="name" placeholder="Nome" required minLength={2} />
        <Input data-testid="user-email" name="email" type="email" placeholder="E-mail" required />
        <Input data-testid="user-password" name="password" type="password" placeholder="Senha" required minLength={8} />
        <select data-testid="user-role" name="role" className="rounded-xl border border-stone-300 px-3 py-2 text-sm" defaultValue="EDITOR">
          <option value="ADMIN">Administrador</option>
          <option value="EDITOR">Editor</option>
          <option value="VIEWER">Leitura</option>
          <option value="OWNER">Responsável</option>
        </select>
        <button data-testid="user-submit" className="w-fit inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]" type="submit">
          Convidar
        </button>
      </form>
      {message ? <Notice tone={message.startsWith("Pessoa") ? "success" : "error"} title={message} /> : null}
      <PanelFeedback loading={loading} error={loadError} onRetry={load} empty={!loading && items.length === 0} emptyTitle="Nenhuma pessoa na equipe" emptyText="Convide quem vai cuidar da loja." />
      <ul className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>
              {item.name} · {item.email}
            </span>
            <span className="text-stone-500">{item.role}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
