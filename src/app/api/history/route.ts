import { clearHistory, getRecentEvents } from "@/server/tiktokManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const events = await getRecentEvents(50);
  return Response.json({ ok: true, events });
}

export async function DELETE() {
  await clearHistory();
  return Response.json({ ok: true });
}
