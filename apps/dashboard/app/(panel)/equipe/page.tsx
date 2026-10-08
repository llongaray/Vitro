"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Input } from "@vitrio/ui";
import { api, readError } from "@/lib/api";

type Member = { id: string; name: string; email: string; role: string; is_active: boolean };

export default function TeamPage() {
  const [items, setItems] = useState<Member[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await api("/users");
    if (response.ok) setItems(await response.json());
  }

  useEffect(() => {
    load();
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
    <main className="mx-auto max-w-3xl space-y-8">
      <h1 className="font-serif text-4xl">Equipe</h1>
      <form onSubmit={onSubmit} className="grid max-w-xl gap-3">
        <Input data-testid="user-name" name="name" placeholder="Nome" required minLength={2} />
        <Input data-testid="user-email" name="email" type="email" placeholder="E-mail" required />
        <Input data-testid="user-password" name="password" type="password" placeholder="Senha" required minLength={8} />
        <select data-testid="user-role" name="role" className="rounded-xl border border-stone-300 px-3 py-2 text-sm" defaultValue="EDITOR">
          <option value="ADMIN">Administrador</option>
          <option value="EDITOR">Editor</option>
          <option value="VIEWER">Leitura</option>
          <option value="OWNER">Responsável</option>
        </select>
        <button data-testid="user-submit" className="w-fit rounded-full bg-stone-900 px-4 py-2 text-sm text-white" type="submit">
          Convidar
        </button>
      </form>
      {message ? <p className="text-sm">{message}</p> : null}
      <ul className="divide-y divide-stone-200 rounded-2xl bg-white ring-1 ring-stone-200">
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
