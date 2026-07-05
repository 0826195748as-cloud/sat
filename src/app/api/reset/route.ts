import { resetScore } from "@/server/tiktokManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const state = await resetScore();
  return Response.json({ ok: true, state });
}
