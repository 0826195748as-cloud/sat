import { disconnect } from "@/server/tiktokManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const state = await disconnect();
  return Response.json({ ok: true, state });
}
