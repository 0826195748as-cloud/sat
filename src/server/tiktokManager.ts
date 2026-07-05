import { db } from "@/db";
import { eventLog, gameState } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type ScoreEvent = {
  id: number;
  type: "rose" | "gift" | "manual" | "reset" | "system";
  giftName: string;
  sender: string;
  quantity: number;
  delta: number;
  scoreAfter: number;
  at: number;
};

export type StateSnapshot = {
  username: string;
  score: number;
  rosePoints: number;
  giftPoints: number;
  roseCount: number;
  giftCount: number;
  status: ConnectionStatus;
  statusMessage: string;
  roomId: string;
  viewerCount: number;
  likeCount: number;
};

type Broadcast =
  | { kind: "state"; state: StateSnapshot }
  | { kind: "event"; event: ScoreEvent };

type Subscriber = (data: Broadcast) => void;

// Names that count as a "rose" (subtract points). Case-insensitive substring.
const ROSE_KEYWORDS = ["rose", "gül", "gul"];
// TikTok classic Rose gift ids.
const ROSE_GIFT_IDS = new Set<number>([5655, 5824]);

type Manager = {
  state: StateSnapshot;
  subscribers: Set<Subscriber>;
  connection: unknown;
  loaded: boolean;
  eventCounter: number;
};

const globalForManager = globalThis as typeof globalThis & {
  __tiktokManager?: Manager;
};

function createManager(): Manager {
  return {
    state: {
      username: "",
      score: 0,
      rosePoints: -1,
      giftPoints: 1,
      roseCount: 0,
      giftCount: 0,
      status: "idle",
      statusMessage: "Hazır. Bir TikTok kullanıcı adı girip bağlan.",
      roomId: "",
      viewerCount: 0,
      likeCount: 0,
    },
    subscribers: new Set(),
    connection: null,
    loaded: false,
    eventCounter: 0,
  };
}

const manager: Manager = globalForManager.__tiktokManager ?? createManager();
globalForManager.__tiktokManager = manager;

async function ensureLoaded() {
  if (manager.loaded) return;
  manager.loaded = true;
  try {
    const rows = await db.select().from(gameState).where(eq(gameState.id, 1)).limit(1);
    if (rows.length === 0) {
      await db.insert(gameState).values({ id: 1 }).onConflictDoNothing();
    } else {
      const row = rows[0];
      manager.state.username = row.username;
      manager.state.score = row.score;
      manager.state.rosePoints = row.rosePoints;
      manager.state.giftPoints = row.giftPoints;
      manager.state.roseCount = row.roseCount;
      manager.state.giftCount = row.giftCount;
    }
  } catch (err) {
    console.error("Failed to load game state", err);
  }
}

function broadcast(data: Broadcast) {
  for (const sub of manager.subscribers) {
    try {
      sub(data);
    } catch {
      // ignore broken subscriber
    }
  }
}

function broadcastState() {
  broadcast({ kind: "state", state: { ...manager.state } });
}

async function persistState() {
  try {
    await db
      .update(gameState)
      .set({
        username: manager.state.username,
        score: manager.state.score,
        rosePoints: manager.state.rosePoints,
        giftPoints: manager.state.giftPoints,
        roseCount: manager.state.roseCount,
        giftCount: manager.state.giftCount,
        updatedAt: new Date(),
      })
      .where(eq(gameState.id, 1));
  } catch (err) {
    console.error("Failed to persist state", err);
  }
}

async function recordEvent(
  type: ScoreEvent["type"],
  giftName: string,
  sender: string,
  quantity: number,
  delta: number,
): Promise<void> {
  manager.state.score += delta;
  if (type === "rose") manager.state.roseCount += quantity;
  if (type === "gift") manager.state.giftCount += quantity;
  const scoreAfter = manager.state.score;
  manager.eventCounter += 1;
  const event: ScoreEvent = {
    id: manager.eventCounter,
    type,
    giftName,
    sender,
    quantity,
    delta,
    scoreAfter,
    at: Date.now(),
  };
  broadcast({ kind: "event", event });
  broadcastState();
  try {
    await db.insert(eventLog).values({
      type,
      giftName,
      sender,
      quantity,
      delta,
      scoreAfter,
    });
    await persistState();
  } catch (err) {
    console.error("Failed to record event", err);
  }
}

function isRose(giftName: string, giftId: number): boolean {
  if (ROSE_GIFT_IDS.has(giftId)) return true;
  const name = (giftName || "").toLowerCase();
  return ROSE_KEYWORDS.some((k) => name.includes(k));
}

export async function getSnapshot(): Promise<StateSnapshot> {
  await ensureLoaded();
  return { ...manager.state };
}

export async function getRecentEvents(limit = 50): Promise<ScoreEvent[]> {
  try {
    const rows = await db
      .select()
      .from(eventLog)
      .orderBy(desc(eventLog.id))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      type: r.type as ScoreEvent["type"],
      giftName: r.giftName,
      sender: r.sender,
      quantity: r.quantity,
      delta: r.delta,
      scoreAfter: r.scoreAfter,
      at: r.createdAt.getTime(),
    }));
  } catch {
    return [];
  }
}

export function subscribe(sub: Subscriber): () => void {
  manager.subscribers.add(sub);
  return () => {
    manager.subscribers.delete(sub);
  };
}

export async function updateSettings(opts: {
  rosePoints?: number;
  giftPoints?: number;
}): Promise<StateSnapshot> {
  await ensureLoaded();
  if (typeof opts.rosePoints === "number") manager.state.rosePoints = Math.trunc(opts.rosePoints);
  if (typeof opts.giftPoints === "number") manager.state.giftPoints = Math.trunc(opts.giftPoints);
  await persistState();
  broadcastState();
  return { ...manager.state };
}

export async function manualAdjust(delta: number, note = "Manuel"): Promise<StateSnapshot> {
  await ensureLoaded();
  await recordEvent("manual", note, "Operatör", 1, Math.trunc(delta));
  return { ...manager.state };
}

export async function resetScore(): Promise<StateSnapshot> {
  await ensureLoaded();
  manager.state.score = 0;
  manager.state.roseCount = 0;
  manager.state.giftCount = 0;
  manager.eventCounter += 1;
  const event: ScoreEvent = {
    id: manager.eventCounter,
    type: "reset",
    giftName: "Skor sıfırlandı",
    sender: "Operatör",
    quantity: 1,
    delta: 0,
    scoreAfter: 0,
    at: Date.now(),
  };
  broadcast({ kind: "event", event });
  broadcastState();
  try {
    await db.insert(eventLog).values({
      type: "reset",
      giftName: "Skor sıfırlandı",
      sender: "Operatör",
      quantity: 1,
      delta: 0,
      scoreAfter: 0,
    });
    await persistState();
  } catch (err) {
    console.error("Failed to reset", err);
  }
  return { ...manager.state };
}

export async function clearHistory(): Promise<void> {
  try {
    await db.execute(sql`TRUNCATE TABLE ${eventLog} RESTART IDENTITY`);
  } catch (err) {
    console.error("Failed to clear history", err);
  }
}

function setStatus(status: ConnectionStatus, message: string) {
  manager.state.status = status;
  manager.state.statusMessage = message;
  broadcastState();
}

export async function disconnect(): Promise<StateSnapshot> {
  await ensureLoaded();
  const conn = manager.connection as { disconnect?: () => void } | null;
  if (conn && typeof conn.disconnect === "function") {
    try {
      conn.disconnect();
    } catch {
      // ignore
    }
  }
  manager.connection = null;
  setStatus("disconnected", "Bağlantı kapatıldı.");
  return { ...manager.state };
}

export async function connect(username: string): Promise<StateSnapshot> {
  await ensureLoaded();
  const cleanUsername = username.trim().replace(/^@/, "");
  if (!cleanUsername) {
    setStatus("error", "Geçerli bir kullanıcı adı gir.");
    return { ...manager.state };
  }

  // Close any existing connection first.
  await disconnect();

  manager.state.username = cleanUsername;
  setStatus("connecting", `@${cleanUsername} canlı yayınına bağlanılıyor...`);
  await persistState();

  try {
    const mod = await import("tiktok-live-connector");
    const { TikTokLiveConnection, WebcastEvent } = mod as unknown as {
      TikTokLiveConnection: new (u: string, opts?: Record<string, unknown>) => any;
      WebcastEvent: Record<string, string>;
    };

    const options: Record<string, unknown> = {};
    if (process.env.SIGN_API_KEY) {
      options.signApiKey = process.env.SIGN_API_KEY;
    }

    const connection = new TikTokLiveConnection(cleanUsername, options);
    manager.connection = connection;

    connection.on(WebcastEvent.GIFT, (data: any) => {
      // For streakable gifts (giftType === 1) only count when the streak ends.
      const giftType = data?.giftType ?? data?.gift?.gift_type ?? data?.gift?.type;
      const repeatEnd = data?.repeatEnd ?? data?.repeat_end;
      if (giftType === 1 && !repeatEnd) {
        return; // streak still in progress
      }
      const giftName: string =
        data?.giftName ?? data?.gift?.name ?? data?.giftDetails?.giftName ?? "Hediye";
      const giftId: number = Number(data?.giftId ?? data?.gift?.id ?? 0);
      const quantity: number = Number(data?.repeatCount ?? data?.repeat_count ?? 1) || 1;
      const sender: string =
        data?.user?.uniqueId ?? data?.uniqueId ?? data?.user?.nickname ?? "Bilinmeyen";

      if (isRose(giftName, giftId)) {
        const delta = manager.state.rosePoints * quantity;
        void recordEvent("rose", giftName, sender, quantity, delta);
      } else {
        const delta = manager.state.giftPoints * quantity;
        void recordEvent("gift", giftName, sender, quantity, delta);
      }
    });

    connection.on(WebcastEvent.ROOM_USER, (data: any) => {
      const count = Number(data?.viewerCount ?? data?.viewer_count ?? 0);
      if (count) {
        manager.state.viewerCount = count;
        broadcastState();
      }
    });

    connection.on(WebcastEvent.LIKE, (data: any) => {
      const total = Number(data?.totalLikeCount ?? data?.total_like_count ?? 0);
      if (total) {
        manager.state.likeCount = total;
        broadcastState();
      }
    });

    connection.on(WebcastEvent.DISCONNECTED, () => {
      manager.connection = null;
      setStatus("disconnected", "TikTok bağlantısı kesildi.");
    });

    connection.on(WebcastEvent.STREAM_END, () => {
      manager.connection = null;
      setStatus("disconnected", "Yayın sona erdi.");
    });

    connection.on("error", (err: unknown) => {
      console.error("TikTok connection error", err);
    });

    const state = await connection.connect();
    manager.state.roomId = String(state?.roomId ?? "");
    setStatus("connected", `@${cleanUsername} yayınına bağlanıldı. Hediyeler otomatik sayılıyor.`);
  } catch (err) {
    manager.connection = null;
    const message = err instanceof Error ? err.message : String(err);
    setStatus("error", `Bağlanılamadı: ${message}`);
  }

  return { ...manager.state };
}
