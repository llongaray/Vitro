"use client";

import { FormEvent, useState, type ReactNode } from "react";

import { ContactLink } from "@/components/contact-link";

type Coupon = { code: string; scope_label: string; discount_type: string; discount_value: number };
type SiteContact = { type: string; value: string | null; template: string | null; label: string };

const benefits = [
  {
    title: "Receba cupons exclusivos",
    text: "Quando a loja oferecer um código de cadastro, ele aparece na hora.",
    icon: "tag",
  },
  {
    title: "Fique por dentro das novidades",
    text: "A loja guarda seu contato para avisar lançamentos.",
    icon: "bell",
  },
  {
    title: "Ofertas da loja",
    text: "Promoções e condições especiais da vitrine.",
    icon: "gift",
  },
  {
    title: "Contato rápido",
    text: "Depois do cadastro, fale com a loja pelo canal que ela escolheu.",
    icon: "chat",
  },
];

function Icon({ name }: { name: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "tag") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path {...common} d="M20 13l-7 7-9-9V4h7l9 9z" />
        <circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === "bell") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path {...common} d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16z" />
        <path {...common} d="M10 19a2 2 0 0 0 4 0" />
      </svg>
    );
  }
  if (name === "gift") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path {...common} d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13" />
        <path {...common} d="M12 7c0-2 1.2-3.5 2.8-3.5S16 5.4 16 7M12 7c0-2-1.2-3.5-2.8-3.5S8 5.4 8 7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path {...common} d="M5 16.5A7 7 0 1 1 12 20H6l-1 2v-5.5z" />
    </svg>
  );
}

function FieldIcon({ children }: { children: ReactNode }) {
  return <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">{children}</span>;
}

export default function SignupPage() {
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [contact, setContact] = useState<SiteContact | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/public/customers", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        accepted_terms: form.get("accepted_terms") === "on",
        accepted_marketing: form.get("accepted_marketing") === "on",
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Não foi possível cadastrar");
      return;
    }
    const body = await response.json();
    setCoupon(body.coupon);
    setDone(true);
    const site = await fetch("/api/v1/public/site", { headers: { "x-forwarded-host": window.location.host } });
    if (site.ok) {
      const payload = await site.json();
      setContact(payload.tenant.contact);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
      <div className="text-center">
        <h1 className="font-serif text-5xl">{done ? "Cadastro feito" : "Cadastro"}</h1>
        <p className="mx-auto mt-3 max-w-xl text-stone-600">
          {done
            ? "A loja recebeu seu contato. Se houver um código, ele aparece abaixo."
            : "Deixe seu contato para receber ofertas, novidades da loja e o cupom de cadastro, quando a loja tiver um."}
        </p>
      </div>
      <div className="mt-8 overflow-hidden rounded-[1.75rem] bg-white shadow-[0_20px_60px_-30px_rgba(28,25,23,0.35)] ring-1 ring-stone-200/70 md:grid md:aspect-[2/1] md:grid-cols-2">
        <section className="relative min-h-0 bg-[#f9eee4] bg-[url('/cadastro-presente.png')] bg-[length:auto_100%] bg-right bg-no-repeat md:h-full">
          <div className="relative z-10 px-6 py-6 md:max-w-[15.5rem]">
            <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Vantagens de se cadastrar</p>
            <div className="mt-2 h-px w-16 bg-stone-300/80" />
            <h2 className="mt-3 font-serif text-3xl leading-tight">Mais benefícios para você</h2>
            <ul className="mt-5 space-y-3">
              {benefits.map((item) => (
                <li key={item.title} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-stone-700 ring-1 ring-stone-200/70">
                    <Icon name={item.icon} />
                  </span>
                  <span>
                    <span className="block text-sm font-medium leading-tight">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-stone-600">{item.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="flex min-h-0 flex-col justify-center px-6 py-6 md:h-full">
          {done ? (
            <div>
              <h2 className="font-serif text-3xl">Pronto</h2>
              {coupon ? (
                <p className="mt-4 text-lg">
                  Seu código é <strong data-testid="coupon-code">{coupon.code}</strong>, válido para {coupon.scope_label}.
                </p>
              ) : (
                <p className="mt-4 text-stone-600">Recebemos seu cadastro.</p>
              )}
              {contact ? (
                <div className="mt-8">
                  <ContactLink contact={contact} message={coupon ? `Olá! Acabei de me cadastrar. Meu cupom é ${coupon.code}.` : "Olá! Acabei de me cadastrar na loja."} />
                </div>
              ) : null}
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-2.5">
              <div>
                <h2 className="font-serif text-2xl">Cadastre-se agora</h2>
                <p className="mt-0.5 text-xs text-stone-500">É rápido e gratuito. Sem senha.</p>
              </div>
              <label className="text-xs">
                Nome
                <span className="relative mt-1 block">
                  <FieldIcon>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                      <path fill="none" stroke="currentColor" strokeWidth="1.6" d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-7 8a7 7 0 0 1 14 0" />
                    </svg>
                  </FieldIcon>
                  <input data-testid="customer-name" name="name" required placeholder="Seu nome completo" className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-sm" />
                </span>
              </label>
              <label className="text-xs">
                E-mail
                <span className="relative mt-1 block">
                  <FieldIcon>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                      <path fill="none" stroke="currentColor" strokeWidth="1.6" d="M4 6h16v12H4zM4 7l8 6 8-6" />
                    </svg>
                  </FieldIcon>
                  <input data-testid="customer-email" name="email" type="email" required placeholder="seu@email.com" className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-sm" />
                </span>
              </label>
              <label className="text-xs">
                Telefone
                <span className="relative mt-1 block">
                  <FieldIcon>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                      <path fill="none" stroke="currentColor" strokeWidth="1.6" d="M8 3h3l1 4-2 1a12 12 0 0 0 6 6l1-2 4 1v3a2 2 0 0 1-2 2A16 16 0 0 1 6 5a2 2 0 0 1 2-2z" />
                    </svg>
                  </FieldIcon>
                  <input data-testid="customer-phone" name="phone" required minLength={8} placeholder="(11) 91234-5678" className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-sm" />
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs text-stone-700">
                <input data-testid="customer-terms" name="accepted_terms" type="checkbox" required className="mt-1" />
                Aceito os termos e a política de privacidade
              </label>
              <label className="flex items-start gap-2 text-xs text-stone-700">
                <input name="accepted_marketing" type="checkbox" className="mt-1" />
                Quero receber novidades e ofertas exclusivas da loja
              </label>
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <button data-testid="customer-submit" className="mt-1 rounded-full bg-stone-950 px-5 py-2.5 text-sm text-white" type="submit">
                Cadastrar →
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
