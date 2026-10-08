"use client";

import { use } from "react";

import { ProductForm } from "@/components/product-form";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <main>
      <h1 className="text-3xl font-semibold">Editar produto</h1>
      <ProductForm productId={id} />
    </main>
  );
}
