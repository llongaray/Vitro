import Link from "next/link";

import { formatPrice } from "@/lib/seo";
import type { ProductCard } from "@/lib/types";

export function ProductCardView({ product, currency }: { product: ProductCard; currency: string }) {
  const label = product.on_clearance ? product.clearance_label || "Liquidação" : product.on_promotion ? "Promoção" : product.is_featured ? "Nova coleção" : product.brand;
  const price =
    product.price_visible && (product.promotional_price ?? product.price) != null
      ? formatPrice((product.promotional_price ?? product.price) as number, currency)
      : "Preço sob consulta";
  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-[var(--surface)] p-3" data-testid="product-card">
      <Link href={`/produtos/${product.slug}`} className="flex flex-col gap-4">
        {product.image?.url ? (
          <img src={product.image.thumb_url || product.image.url} alt={product.image.alt || product.name} className="h-40 w-full rounded-2xl bg-[var(--image)] object-contain" />
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-2xl bg-[var(--image)] px-5 text-sm text-[var(--muted)]">Foto do produto</div>
        )}
        {label ? <p className="text-[10px] uppercase tracking-wide text-[var(--brand)]">{label}</p> : null}
        <h2 className="text-lg text-[var(--ink)]">{product.name}</h2>
        {product.short_description ? <p className="line-clamp-2 text-sm text-[var(--muted)]">{product.short_description}</p> : null}
        <p className="text-[17px] text-[var(--ink)]">{price}</p>
        {product.price_visible && product.promotional_price != null && product.price != null ? (
          <p className="text-xs text-[var(--muted)] line-through">{formatPrice(product.price, currency)}</p>
        ) : null}
        <p className="text-[13px] text-[var(--brand)]">Ver detalhes →</p>
      </Link>
    </article>
  );
}
