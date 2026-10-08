import { headers } from "next/headers";

import type { SitePayload } from "./types";

const API = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";

export async function requestOrigin() {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost";
  const proto = incoming.get("x-forwarded-proto") ?? "http";
  return { host, origin: `${proto}://${host}`, tag: host.split(":")[0] };
}

export async function publicGet<T>(path: string, options?: { fresh?: boolean }): Promise<T | null> {
  const { host, tag } = await requestOrigin();
  const response = await fetch(`${API}${path}`, {
    headers: {
      "x-forwarded-host": host,
      "x-forwarded-proto": (await headers()).get("x-forwarded-proto") ?? "http",
    },
    ...(options?.fresh
      ? { cache: "no-store" as const }
      : { next: { revalidate: 60, tags: [`tenant:${tag}`] } }),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Falha ao consultar a loja (${response.status})`);
  return response.json() as Promise<T>;
}

export async function getSite() {
  return publicGet<SitePayload>("/api/v1/public/site");
}
