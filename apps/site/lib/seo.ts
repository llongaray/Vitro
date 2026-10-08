import type { Metadata } from "next";

import type { Contact, Seo } from "./types";

export function seoMetadata(seo: Seo, path: string, origin: string, googleVerification?: string | null): Metadata {
  const canonical = `${origin}${path}`;
  const images = seo.og_image
    ? [seo.og_image.startsWith("http") ? seo.og_image : `${origin}${seo.og_image}`]
    : undefined;
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical },
    robots: { index: seo.index, follow: seo.follow },
    verification: googleVerification ? { google: googleVerification } : undefined,
    openGraph: { title: seo.title, description: seo.description, url: canonical, images, locale: "pt_BR", type: "website" },
    twitter: { card: "summary_large_image", title: seo.title, description: seo.description, images },
  };
}

export function contactHref(contact: Contact, message: string) {
  const value = (contact.value ?? "").trim();
  if (!value) return null;
  const encoded = encodeURIComponent(message);
  if (contact.type === "whatsapp") {
    const digits = value.replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}?text=${encoded}` : null;
  }
  if (contact.type === "phone") return `tel:${value}`;
  if (contact.type === "email") return `mailto:${value}?body=${encoded}`;
  if (contact.type === "instagram") {
    return value.startsWith("http") ? value : `https://instagram.com/${value.replace(/^@/, "")}`;
  }
  if (contact.type === "url") return value;
  return null;
}

export function productMessage(template: string | null, name: string, url: string) {
  const base = template || "Olá! Vi o produto {product_name} no site e gostaria de mais informações.\n\n{product_url}";
  return base.replaceAll("{product_name}", name).replaceAll("{product_url}", url);
}

export function formatPrice(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}
