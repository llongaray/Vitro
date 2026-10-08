"use client";

import { use } from "react";

import { ProductForm } from "@/components/product-form";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <main className="flex flex-col gap-4">
      <p className="text-[13px] text-[var(--muted)]">Produtos / Editar produto</p>
      <h1 className="text-[40px] font-normal leading-none">Editar produto</h1>
      <p className="text-base text-[var(--muted)]">Atualize os detalhes e publique na sua vitrine.</p>
      <ProductForm productId={id} />
    </main>
  );
}
