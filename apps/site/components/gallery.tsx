"use client";

import { useState } from "react";

import type { ProductImage } from "@/lib/types";

export function Gallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index];
  if (!current?.url) return <div className="flex h-80 items-center justify-center rounded-3xl bg-stone-200 text-stone-500">Sem imagem</div>;
  return (
    <div>
      <img src={current.url} alt={current.alt || name} className="h-[28rem] w-full rounded-3xl bg-stone-50 object-contain p-4" />
      {images.length > 1 ? (
        <div className="mt-3 flex gap-2">
          {images.map((image, imageIndex) => (
            <button key={image.url ?? imageIndex} type="button" onClick={() => setIndex(imageIndex)}>
              <img src={image.thumb_url || image.url || ""} alt="" className="h-16 w-16 rounded-xl object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
