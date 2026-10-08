"use client";

import { useState } from "react";

import { postEvent } from "./track-page";

type Banner = { title: string; url: string | null; desktop_url: string | null; mobile_url: string | null };

export function BannerSlider({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const visible = banners.filter((banner) => banner.desktop_url || banner.mobile_url);
  if (!visible.length) return null;
  const banner = visible[index % visible.length];
  const image = (
    <picture>
      {banner.mobile_url ? <source media="(max-width: 700px)" srcSet={banner.mobile_url} /> : null}
      <img src={banner.desktop_url || banner.mobile_url || ""} alt={banner.title} className="h-72 w-full object-cover md:h-[28rem]" />
    </picture>
  );
  return (
    <section className="relative overflow-hidden rounded-[2rem]" aria-label="Banners">
      {banner.url ? (
        <a href={banner.url} onClick={() => postEvent({ event_type: "banner_click", entity_type: "banner", entity_slug: banner.title })}>
          {image}
        </a>
      ) : (
        image
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-950/60 via-stone-950/10 to-transparent" />
      <p className="pointer-events-none absolute bottom-6 left-6 max-w-xl font-serif text-3xl text-white md:text-5xl">{banner.title}</p>
      {visible.length > 1 ? (
        <div className="absolute bottom-6 right-6 flex gap-2">
          {visible.map((item, itemIndex) => (
            <button
              key={item.title + itemIndex}
              type="button"
              aria-label={`Banner ${itemIndex + 1}`}
              className={`h-2.5 w-2.5 rounded-full ${itemIndex === index ? "bg-white" : "bg-white/40"}`}
              onClick={() => setIndex(itemIndex)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
