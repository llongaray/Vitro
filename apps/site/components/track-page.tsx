"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function postEvent(body: Record<string, unknown>) {
  fetch("/api/v1/public/events", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => undefined);
}

export function TrackPage() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    postEvent({ event_type: "page_view", metadata: { path: pathname } });
    if (pathname.startsWith("/produtos/") && pathname !== "/produtos") {
      postEvent({ event_type: "product_view", entity_type: "product", entity_slug: pathname.split("/")[2] });
    } else if (pathname.startsWith("/categorias/")) {
      postEvent({ event_type: "category_view", entity_type: "category", entity_slug: pathname.split("/")[2] });
    } else if (pathname.startsWith("/busca")) {
      postEvent({ event_type: "search", metadata: { q: search.get("q") ?? "" } });
    }
  }, [pathname, search]);

  return null;
}
