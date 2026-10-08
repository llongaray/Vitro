"use client";

import { useState, type FormEvent } from "react";

import { api, readError } from "@/lib/api";

export default function ImportPage() {
  const [message, setMessage] = useState("");

  async function send(event: FormEvent<HTMLFormElement>, path: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    const response = await api(path, { method: "POST", body });
    if (!response.ok) {
      setMessage(await readError(response));
      return;
    }
    const data = await response.json();
    setMessage(`Criados: ${data.created}. Atualizados: ${data.updated}. Erros: ${data.errors.length}.`);
    form.reset();
  }

  async function download(path: string, filename: string) {
    const response = await api(path);
    if (!response.ok) {
      setMessage(await readError(response));
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8">
      <h1 className="font-serif text-4xl">Importar e exportar</h1>
      <form className="space-y-3" onSubmit={(event) => send(event, "/imports/products")}>
        <h2 className="text-lg">Produtos</h2>
        <input data-testid="import-file" name="file" type="file" accept=".csv,text/csv" required className="block text-sm" />
        <button data-testid="import-submit" className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white" type="submit">
          Importar produtos
        </button>
      </form>
      <form className="space-y-3" onSubmit={(event) => send(event, "/imports/customers")}>
        <h2 className="text-lg">Clientes</h2>
        <p className="text-sm text-stone-600">Linha sem accepted_terms=true é rejeitada e não gera cupom.</p>
        <input name="file" type="file" accept=".csv,text/csv" required className="block text-sm" />
        <button className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white" type="submit">
          Importar clientes
        </button>
      </form>
      {message ? (
        <p data-testid="import-result" className="text-sm">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-full bg-stone-100 px-4 py-2 text-sm" onClick={() => download("/exports/products", "produtos.csv")}>
          Exportar produtos
        </button>
        <button type="button" className="rounded-full bg-stone-100 px-4 py-2 text-sm" onClick={() => download("/exports/customers", "clientes.csv")}>
          Exportar clientes
        </button>
        <button type="button" className="rounded-full bg-stone-100 px-4 py-2 text-sm" onClick={() => download("/exports/coupons", "cupons.csv")}>
          Exportar cupons
        </button>
        <button type="button" className="rounded-full bg-stone-100 px-4 py-2 text-sm" onClick={() => download("/exports/analytics", "analytics.csv")}>
          Exportar analytics
        </button>
      </div>
    </main>
  );
}
