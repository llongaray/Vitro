"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Input } from "@vitrio/ui";
import { api, readError } from "@/lib/api";

const schema = z.object({ title: z.string().min(1), url: z.string().optional() });
type Banner = { id: string; title: string; active: boolean; desktop_url: string | null };

export default function BannersPage() {
  const [items, setItems] = useState<Banner[]>([]);
  const [mediaId, setMediaId] = useState("");
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { title: "", url: "" } });

  async function load() {
    const response = await api("/banners");
    if (response.ok) setItems(await response.json());
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
    await load();
  }

  return (
    <main>
      <h1 className="text-3xl font-semibold">Banners</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 grid max-w-xl gap-3">
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
        <button className="w-fit rounded-full bg-stone-900 px-4 py-2 text-sm text-white" type="submit">
          Publicar banner
        </button>
      </form>
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
