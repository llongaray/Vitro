"use client";

import { FormEvent, useState } from "react";

export function RegisterStore() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/auth/register-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_name: form.get("store_name"),
        slug: form.get("slug"),
        owner_name: form.get("owner_name"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(typeof body.detail === "string" ? body.detail : "Não foi possível criar a loja");
      return;
    }
    const current = new URL(window.location.href);
    const port = current.port ? `:${current.port}` : "";
    window.location.href = `${current.protocol}//${body.tenant.hostname}${port}/admin/login`;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-sm uppercase tracking-[0.2em] text-stone-500">Vitrio</p>
      <h1 className="mt-3 font-serif text-5xl text-stone-900">Crie sua vitrine</h1>
      <p className="mt-4 text-stone-600">Uma loja local, com catálogo e contato direto. Sem carrinho.</p>
      <form onSubmit={onSubmit} className="mt-8 grid gap-4">
        <Field name="store_name" label="Nome da loja" required />
        <Field name="slug" label="Endereço" required placeholder="minha-loja" />
        <Field name="owner_name" label="Seu nome" required />
        <Field name="email" label="E-mail" type="email" required />
        <Field name="password" label="Senha" type="password" required minLength={8} />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button className="rounded-full bg-stone-900 px-5 py-3 text-stone-50" disabled={pending} type="submit">
          {pending ? "Criando..." : "Criar loja"}
        </button>
      </form>
    </main>
  );
}

function Field(props: { name: string; label: string; type?: string; required?: boolean; placeholder?: string; minLength?: number }) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {props.label}
      <input
        className="rounded-xl border border-stone-300 px-3 py-2 font-normal"
        name={props.name}
        type={props.type ?? "text"}
        required={props.required}
        placeholder={props.placeholder}
        minLength={props.minLength}
      />
    </label>
  );
}
