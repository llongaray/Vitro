import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ detail: "Não autorizado" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const tag = typeof body.tag === "string" ? body.tag : "";
  if (!tag.startsWith("tenant:")) {
    return NextResponse.json({ detail: "Tag inválida" }, { status: 422 });
  }
  revalidateTag(tag);
  return NextResponse.json({ revalidated: true });
}
