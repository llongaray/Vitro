"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Input, Notice } from "@vitrio/ui";
import { PanelFeedback } from "@/components/panel-page";
import { api, readError } from "@/lib/api";
import { runPanelLoad } from "@/lib/panel-guards";

const schema = z.object({ title: z.string().min(1), url: z.string().optional() });
type Banner = { id: string; title: string; active: boolean; desktop_url: string | null };

export default function BannersPage() {
  const [items, setItems] = useState<Banner[]>([]);
  const [mediaId, setMediaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saved, setSaved] = useState(false);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { title: "", url: "" } });

  async function load() {
    await runPanelLoad(setLoading, setLoadError, async () => {
      const response = await api("/banners");
      if (!response.ok) throw new Error(await readError(response));
      setItems(await response.json());
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function upload(file: File) {
    const body = new FormData();
    body.set("file", file);
    body.set("folder", "banners");
    const response = await api("/media", { method: "POST", body });
    if (!response.ok) {
      form.setError("root", { message: await readError(response) });
      return;
    }
    const media = await response.json();
    setMediaId(media.id);
  }

  async function onSubmit(values: z.infer<typeof schema>) {
    const response = await api("/banners", {
      method: "POST",
      body: JSON.stringify({ title: values.title, url: values.url || null, desktop_media_id: mediaId || null, active: true }),
    });
    if (!response.ok) {
      form.setError("root", { message: await readError(response) });
      return;
    }
    form.reset();
    setMediaId("");
    setSaved(true);
    await load();
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-[40px] font-normal leading-none">Banners</h1>
      <p className="text-base text-[var(--muted)]">Imagens da vitrine, na ordem em que a loja publicou.</p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-6">
        <label>
          Título
          <Input {...form.register("title")} />
        </label>
        <label>
          Link
          <Input {...form.register("url")} placeholder="/produtos" />
        </label>
        <label>
          Imagem
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} />
        </label>
        {form.formState.errors.root ? <p className="text-sm text-red-700" role="alert">{form.formState.errors.root.message}</p> : null}
        <button className="w-fit inline-flex min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-3.5 text-[15px] text-[var(--surface)]" type="submit">
          Publicar banner
        </button>
      </form>
      {saved ? <Notice tone="success" title="Banner publicado" /> : null}
      <PanelFeedback loading={loading} error={loadError} onRetry={load} empty={!loading && items.length === 0} emptyTitle="Nenhum banner" emptyText="Publique a primeira imagem da vitrine." />
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-stone-200">
            {item.desktop_url ? <img src={item.desktop_url} alt="" className="h-16 w-28 rounded-lg object-cover" /> : null}
            <span>{item.title}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
