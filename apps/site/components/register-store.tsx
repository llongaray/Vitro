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
    <main className="mx-auto grid min-h-screen max-w-[1440px] items-center gap-4 px-5 py-8 lg:grid-cols-2 lg:px-16">
      <section className="rounded-2xl bg-[var(--soft)] p-8">
        <p className="text-2xl text-[var(--brand)]">Vitrio</p>
        <h1 className="mt-4 font-serif text-5xl leading-none">Sua loja merece uma vitrine</h1>
        <p className="mt-4 max-w-md text-[var(--muted)]">Catálogo, identidade visual e atendimento direto, sem carrinho.</p>
      </section>
      <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl bg-[var(--surface)] p-8">
        <Field name="store_name" label="Nome da loja" required />
        <Field name="slug" label="Endereço da loja" required placeholder="minha-loja" />
        <Field name="owner_name" label="Seu nome" required />
        <Field name="email" label="E-mail" type="email" required />
        <Field name="password" label="Senha" type="password" required minLength={8} />
        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        <button className="inline-flex min-h-11 w-fit items-center rounded-[10px] bg-[var(--brand,#245b45)] px-3.5 text-[15px] text-white" disabled={pending} type="submit">
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
        className="w-full rounded-lg bg-[var(--bg,#f4efe7)] px-3.5 py-3.5 text-[15px] font-normal outline-none"
        name={props.name}
        type={props.type ?? "text"}
        required={props.required}
        placeholder={props.placeholder}
        minLength={props.minLength}
      />
    </label>
  );
}
