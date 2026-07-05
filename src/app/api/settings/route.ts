import { updateSettings } from "@/server/tiktokManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rosePoints = body?.rosePoints !== undefined ? Number(body.rosePoints) : undefined;
  const giftPoints = body?.giftPoints !== undefined ? Number(body.giftPoints) : undefined;
  const state = await updateSettings({
    rosePoints: Number.isFinite(rosePoints) ? rosePoints : undefined,
    giftPoints: Number.isFinite(giftPoints) ? giftPoints : undefined,
  });
  return Response.json({ ok: true, state });
}
