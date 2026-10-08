"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Input } from "@vitrio/ui";
import { api, readError } from "@/lib/api";

const schema = z.object({
  contact_type: z.enum(["whatsapp", "phone", "instagram", "email", "url"]),
  contact_value: z.string().min(1, "Informe o contato"),
  contact_message_template: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ContactPage() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { contact_type: "whatsapp", contact_value: "", contact_message_template: "" },
  });

  useEffect(() => {
    api("/contacts").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      form.reset({
        contact_type: data.contact_type,
        contact_value: data.contact_value ?? "",
        contact_message_template: data.contact_message_template ?? "",
      });
    });
  }, [form]);

  async function onSubmit(values: FormValues) {
    const response = await api("/contacts", { method: "PATCH", body: JSON.stringify(values) });
    if (!response.ok) form.setError("root", { message: await readError(response) });
  }

  return (
    <main>
      <h1 className="text-3xl font-semibold">Contato</h1>
      <p className="mt-2 max-w-xl text-stone-600">O botão Tenho interesse usa este canal. Use {"{product_name}"} e {"{product_url}"} na mensagem.</p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 grid max-w-xl gap-4">
        <label>
          Canal
          <select className="rounded-xl border border-stone-300 px-3 py-2" {...form.register("contact_type")}>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Telefone</option>
            <option value="instagram">Instagram</option>
            <option value="email">E-mail</option>
            <option value="url">URL</option>
          </select>
        </label>
        <label>
          Valor
          <Input {...form.register("contact_value")} />
        </label>
        <label>
          Mensagem
          <textarea className="min-h-28 rounded-xl border border-stone-300 px-3 py-2 text-sm" {...form.register("contact_message_template")} />
        </label>
        {form.formState.errors.root ? <p className="text-sm text-red-700">{form.formState.errors.root.message}</p> : null}
        <button className="w-fit rounded-full bg-stone-900 px-4 py-2 text-sm text-white" type="submit">
          Salvar contato
        </button>
      </form>
    </main>
  );
}
