import { manualAdjust } from "@/server/tiktokManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const delta = Number(body?.delta);
  if (!Number.isFinite(delta) || delta === 0) {
    return Response.json({ ok: false, error: "Geçersiz değer" }, { status: 400 });
  }
  const note = typeof body?.note === "string" ? body.note : "Manuel";
  const state = await manualAdjust(delta, note);
  return Response.json({ ok: true, state });
}
