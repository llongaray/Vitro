import Link from "next/link";

import { formatPrice } from "@/lib/seo";
import type { ProductCard } from "@/lib/types";

export function ProductCardView({ product, currency }: { product: ProductCard; currency: string }) {
  return (
    <article className="group overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-stone-200/80 transition duration-300 hover:-translate-y-0.5 hover:shadow-md" data-testid="product-card">
      <Link href={`/produtos/${product.slug}`} className="block">
        {product.image?.url ? (
          <img src={product.image.thumb_url || product.image.url} alt={product.image.alt || product.name} className="aspect-[4/5] w-full bg-white object-contain p-4 transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex aspect-[4/5] items-end bg-stone-100 p-4 text-sm text-stone-500">Sem imagem</div>
        )}
        <div className="space-y-2 px-5 pb-5">
          {product.brand ? <p className="text-xs uppercase tracking-[0.16em] text-stone-400">{product.brand}</p> : null}
          <h2 className="font-serif text-2xl leading-tight">{product.name}</h2>
          {product.on_promotion ? <p className="text-xs uppercase tracking-wide text-amber-800">Promoção</p> : null}
          {product.on_clearance ? <p className="text-xs uppercase tracking-wide text-stone-500">{product.clearance_label || "Liquidação"}</p> : null}
          {product.short_description ? <p className="line-clamp-2 text-sm text-stone-600">{product.short_description}</p> : null}
          <p className="text-sm font-medium">
            {product.price_visible && (product.promotional_price ?? product.price) != null
              ? formatPrice((product.promotional_price ?? product.price) as number, currency)
              : "Preço sob consulta"}
          </p>
          {product.price_visible && product.promotional_price != null && product.price != null ? (
            <p className="text-xs text-stone-400 line-through">{formatPrice(product.price, currency)}</p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
