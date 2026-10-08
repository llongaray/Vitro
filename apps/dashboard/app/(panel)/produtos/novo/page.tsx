"use client";

import { ProductForm } from "@/components/product-form";

export default function NewProductPage() {
  return (
    <main>
      <h1 className="text-3xl font-semibold">Novo produto</h1>
      <ProductForm />
    </main>
  );
}
