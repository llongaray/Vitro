import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.startsWith("/media")) {
    return NextResponse.next();
  }
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim();
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const api = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
  try {
    const response = await fetch(`${api}/api/v1/public/redirect?path=${encodeURIComponent(pathname)}`, {
      headers: { "x-forwarded-host": host, "x-forwarded-proto": proto },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.next();
    const data = (await response.json()) as { destination?: string; status_code?: number };
    if (!data.destination || data.destination === pathname) return NextResponse.next();
    return NextResponse.redirect(new URL(data.destination, `${proto}://${host}`), data.status_code || 301);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
