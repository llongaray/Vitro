import type { Metadata } from "next";
import { notFound } from "next/navigation";

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
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-5xl">{page.title}</h1>
      <div className="mt-6 whitespace-pre-wrap text-stone-700">{page.content}</div>
    </main>
  );
}
