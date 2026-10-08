"use client";

import { ProductForm } from "@/components/product-form";

export default function NewProductPage() {
  return (
    <main className="flex flex-col gap-4">
      <p className="text-[13px] text-[var(--muted)]">Produtos / Novo produto</p>
      <h1 className="text-[40px] font-normal leading-none">Novo produto</h1>
      <p className="text-base text-[var(--muted)]">Prepare os detalhes e publique na sua vitrine.</p>
      <ProductForm />
    </main>
  );
}
