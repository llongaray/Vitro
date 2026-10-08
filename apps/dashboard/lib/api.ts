"use client";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export async function refreshSession() {
  const response = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include" });
  if (!response.ok) {
    accessToken = null;
    return null;
  }
  const body = await response.json();
  accessToken = body.access_token;
  return body;
}

export async function api(path: string, options: RequestInit = {}) {
  const run = async () => {
    const headers = new Headers(options.headers);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(`/api/v1${path}`, { ...options, headers, credentials: "include" });
  };
  let response = await run();
  if (response.status === 401 && !path.startsWith("/auth/")) {
    const renewed = await refreshSession();
    if (renewed) response = await run();
  }
  return response;
}

export async function readError(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail)) return body.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(" ");
  return "Não foi possível concluir";
}
