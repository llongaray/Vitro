"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";

type Seo = { title: string; description: string; og_image: string | null };

export function SeoPreview({
  autoTitle,
  autoDescription,
  manualTitle,
  manualDescription,
}: {
  autoTitle?: string;
  autoDescription?: string;
  manualTitle?: string;
  manualDescription?: string;
}) {
  const [seo, setSeo] = useState<Seo | null>(null);

  useEffect(() => {
    if (!autoTitle) return;
    const handle = window.setTimeout(() => {
      api("/seo/preview", {
        method: "POST",
        body: JSON.stringify({
          auto_title: autoTitle,
          auto_description: autoDescription || null,
          manual_title: manualTitle || null,
          manual_description: manualDescription || null,
        }),
      }).then(async (response) => {
        if (response.ok) setSeo(await response.json());
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [autoTitle, autoDescription, manualTitle, manualDescription]);

  if (!seo) return null;
  return (
    <div data-testid="seo-preview" className="grid gap-3 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
      <div>
        <p className="text-xs uppercase tracking-wide text-stone-500">Google</p>
        <p className="text-lg text-blue-800">{seo.title}</p>
        <p className="text-sm text-stone-600">{seo.description}</p>
      </div>
      <div className="rounded-xl bg-white p-3 ring-1 ring-stone-200">
        <p className="text-xs uppercase tracking-wide text-stone-500">Social</p>
        {seo.og_image ? <img src={seo.og_image} alt="" className="mt-2 h-24 w-full rounded-lg object-cover" /> : null}
        <p className="mt-2 font-medium">{seo.title}</p>
        <p className="text-sm text-stone-600">{seo.description}</p>
      </div>
    </div>
  );
}
