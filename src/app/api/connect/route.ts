import { connect } from "@/server/tiktokManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = typeof body?.username === "string" ? body.username : "";
    const state = await connect(username);
    return Response.json({ ok: true, state });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
