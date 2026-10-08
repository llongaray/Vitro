import Link from "next/link";
import type { ReactNode } from "react";

import { ProductCardView } from "@/components/product-card";
import type { ProductCard } from "@/lib/types";

export function StorePage({
  crumb,
  title,
  titleTestId,
  lede,
  children,
}: {
  crumb: string;
  title: string;
  titleTestId?: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-5 py-8 md:px-16 md:py-16">
      <p className="text-[13px] text-[var(--muted)]">
        <Link href="/">Início</Link>
        {" / "}
        {crumb}
      </p>
      <h1 className="font-serif text-5xl leading-none text-[var(--ink)]" data-testid={titleTestId}>
        {title}
      </h1>
      {lede ? <p className="max-w-3xl text-base text-[var(--muted)]">{lede}</p> : null}
      {children}
    </main>
  );
}

export function ProductGrid({ products, currency }: { products: ProductCard[]; currency: string }) {
  if (!products.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCardView key={product.slug} product={product} currency={currency} />
      ))}
    </div>
  );
}
