import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Link from "next/link";

import { StorePage } from "@/components/store-page";
import { getSite, publicGet, requestOrigin } from "@/lib/api";
import { seoMetadata } from "@/lib/seo";
import type { Seo } from "@/lib/types";

type Payload = { title: string; slug: string; content: string; seo: Seo };
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await publicGet<Payload>(`/api/v1/public/pages/${slug}`);
  if (!page) return { title: "Página" };
  const { origin } = await requestOrigin();
  return seoMetadata(page.seo, `/pagina/${slug}`, origin);
}

export default async function InstitutionalPage({ params }: Props) {
  const { slug } = await params;
  const page = await publicGet<Payload>(`/api/v1/public/pages/${slug}`);
  if (!page) notFound();
  return (
    <StorePage crumb={page.title} title={page.title}>
      <article className="whitespace-pre-wrap rounded-2xl bg-[var(--surface)] p-6 text-[var(--ink)]">{page.content}</article>
      <Link href="/produtos" className="inline-flex min-h-11 w-fit items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]">
        Ver catálogo
      </Link>
    </StorePage>
  );
}
