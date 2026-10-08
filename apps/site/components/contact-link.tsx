"use client";

import { contactHref } from "@/lib/seo";
import type { Contact } from "@/lib/types";

import { postEvent } from "./track-page";

export function ContactLink({ contact, message, className = "", tone = "primary" }: { contact: Contact; message: string; className?: string; tone?: "primary" | "soft" }) {
  const href = contactHref(contact, message);
  if (!href) return <p className="text-sm text-[var(--muted)]">Contato não configurado</p>;
  const external = href.startsWith("http");
  const tones = {
    primary: "bg-[var(--brand)] text-[var(--surface)]",
    soft: "bg-[var(--soft)] text-[var(--brand)]",
  };
  return (
    <a
      data-testid="contact-cta"
      href={href}
      onClick={() => postEvent({ event_type: "contact_click" })}
      className={`inline-flex min-h-11 items-center rounded-[10px] px-3.5 py-3.5 text-[15px] ${tones[tone]} ${className}`}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {contact.label === "WhatsApp" ? "Falar com a loja" : contact.label}
    </a>
  );
}
