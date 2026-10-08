"use client";

import { contactHref } from "@/lib/seo";
import type { Contact } from "@/lib/types";

import { postEvent } from "./track-page";

export function ContactLink({ contact, message, className = "" }: { contact: Contact; message: string; className?: string }) {
  const href = contactHref(contact, message);
  if (!href) return <p className="text-sm text-stone-500">Contato não configurado</p>;
  const external = href.startsWith("http");
  return (
    <a
      data-testid="contact-cta"
      href={href}
      onClick={() => postEvent({ event_type: "contact_click" })}
      className={`inline-flex rounded-full px-5 py-3 text-sm font-medium text-white ${className}`}
      style={{ background: "var(--store)" }}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {contact.label === "WhatsApp" ? "Tenho interesse" : contact.label}
    </a>
  );
}
