"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveStream } from "@/lib/useLiveStream";
import type { ScoreEvent, StateSnapshot } from "@/lib/types";

const statusMeta: Record<
  StateSnapshot["status"],
  { label: string; dot: string; text: string }
> = {
  idle: { label: "Boşta", dot: "bg-slate-400", text: "text-slate-300" },
  connecting: { label: "Bağlanıyor", dot: "bg-amber-400 animate-pulse", text: "text-amber-300" },
  connected: { label: "Bağlı", dot: "bg-emerald-400", text: "text-emerald-300" },
  disconnected: { label: "Kesildi", dot: "bg-slate-500", text: "text-slate-300" },
  error: { label: "Hata", dot: "bg-rose-500", text: "text-rose-300" },
};

function eventStyle(ev: ScoreEvent) {
  if (ev.type === "rose") return { icon: "🌹", color: "text-rose-300", bg: "bg-rose-500/10" };
  if (ev.type === "gift") return { icon: "🎁", color: "text-emerald-300", bg: "bg-emerald-500/10" };
  if (ev.type === "reset") return { icon: "♻️", color: "text-slate-300", bg: "bg-slate-500/10" };
  return { icon: "✋", color: "text-sky-300", bg: "bg-sky-500/10" };
}

export default function Home() {
  const { state, events, streamOnline } = useLiveStream(40);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [rosePoints, setRosePoints] = useState(-1);
  const [giftPoints, setGiftPoints] = useState(1);
  const [overlayUrl, setOverlayUrl] = useState("/overlay");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state) {
      setRosePoints(state.rosePoints);
      setGiftPoints(state.giftPoints);
      if (!username && state.username) setUsername(state.username);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.rosePoints, state?.giftPoints, state?.username]);

  useEffect(() => {
    setOverlayUrl(`${window.location.origin}/overlay`);
  }, []);

  const post = useCallback(async (url: string, body?: unknown) => {
    setBusy(true);
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
    } finally {
      setBusy(false);
    }
  }, []);

  const connect = () => post("/api/connect", { username });
  const disconnect = () => post("/api/disconnect");
  const reset = () => post("/api/reset");
  const adjust = (delta: number) => post("/api/adjust", { delta });
  const saveSettings = () => post("/api/settings", { rosePoints, giftPoints });

  const copyOverlay = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const sm = state ? statusMeta[state.status] : statusMeta.idle;
  const score = state?.score ?? 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              🌹 TikTok Gül Savaşı Sayacı
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Gül gelince skor düşer, diğer hediyeler skoru artırır. Tamamen otomatik.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-2 rounded-full bg-slate-800/70 px-4 py-2 text-sm font-semibold ${sm.text}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${sm.dot}`} />
              {sm.label}
            </span>
            <span
              className={`flex items-center gap-2 rounded-full bg-slate-800/70 px-3 py-2 text-xs font-medium ${
                streamOnline ? "text-emerald-300" : "text-slate-400"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${streamOnline ? "bg-emerald-400" : "bg-slate-500"}`}
              />
              Veri akışı
            </span>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column: controls */}
          <section className="space-y-6 lg:col-span-1">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                Yayın Bağlantısı
              </h2>
              <div className="flex items-center gap-2 rounded-xl bg-slate-800/80 px-3 focus-within:ring-2 focus-within:ring-indigo-500">
                <span className="text-slate-500">@</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && connect()}
                  placeholder="tiktok_kullanici_adi"
                  className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-500"
                />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={connect}
                  disabled={busy || !username.trim()}
                  className="flex-1 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Bağlan
                </button>
                <button
                  onClick={disconnect}
                  disabled={busy}
                  className="rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-600 disabled:opacity-40"
                >
                  Kes
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                {state?.statusMessage ?? "Yükleniyor..."}
              </p>
              {state?.status === "connected" && (
                <div className="mt-3 flex gap-4 text-xs text-slate-400">
                  <span>👁️ {state.viewerCount.toLocaleString("tr-TR")} izleyici</span>
                  <span>❤️ {state.likeCount.toLocaleString("tr-TR")} beğeni</span>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                Puan Ayarları
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-rose-300">🌹 Gül puanı</span>
                  <input
                    type="number"
                    value={rosePoints}
                    onChange={(e) => setRosePoints(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-emerald-300">🎁 Hediye puanı</span>
                  <input
                    type="number"
                    value={giftPoints}
                    onChange={(e) => setGiftPoints(Number(e.target.value))}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </label>
              </div>
              <button
                onClick={saveSettings}
                disabled={busy}
                className="mt-3 w-full rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-600 disabled:opacity-40"
              >
                Ayarları Kaydet
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                Manuel Kontrol
              </h2>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => adjust(-1)} disabled={busy} className="rounded-lg bg-rose-500/20 py-2 text-sm font-bold text-rose-300 hover:bg-rose-500/30">-1</button>
                <button onClick={() => adjust(-5)} disabled={busy} className="rounded-lg bg-rose-500/20 py-2 text-sm font-bold text-rose-300 hover:bg-rose-500/30">-5</button>
                <button onClick={() => adjust(1)} disabled={busy} className="rounded-lg bg-emerald-500/20 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/30">+1</button>
                <button onClick={() => adjust(5)} disabled={busy} className="rounded-lg bg-emerald-500/20 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/30">+5</button>
              </div>
              <button
                onClick={reset}
                disabled={busy}
                className="mt-3 w-full rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-600 disabled:opacity-40"
              >
                Skoru Sıfırla
              </button>
            </div>

            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5 shadow-xl">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-indigo-300">
                Overlay (OBS için)
              </h2>
              <p className="mb-3 text-xs text-slate-300">
                Bu adresi OBS'de &quot;Tarayıcı Kaynağı&quot; olarak ekle. Arka plan şeffaftır.
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={overlayUrl}
                  className="w-full rounded-lg bg-slate-900/80 px-3 py-2 text-xs text-slate-300 outline-none"
                />
                <button
                  onClick={copyOverlay}
                  className="whitespace-nowrap rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold hover:bg-indigo-400"
                >
                  {copied ? "Kopyalandı!" : "Kopyala"}
                </button>
              </div>
              <a
                href="/overlay"
                target="_blank"
                className="mt-2 inline-block text-xs font-semibold text-indigo-300 hover:underline"
              >
                Overlay'i yeni sekmede aç →
              </a>
            </div>
          </section>

          {/* Right column: score + feed */}
          <section className="space-y-6 lg:col-span-2">
            <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center shadow-2xl">
              <div
                className={`pointer-events-none absolute inset-0 opacity-40 blur-3xl transition-colors ${
                  score < 0 ? "bg-rose-600/30" : score > 0 ? "bg-emerald-600/30" : "bg-slate-600/20"
                }`}
              />
              <div className="relative">
                <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                  Anlık Skor
                </p>
                <p
                  className={`mt-2 text-7xl font-black tabular-nums sm:text-8xl ${
                    score < 0 ? "text-rose-400" : score > 0 ? "text-emerald-400" : "text-slate-200"
                  }`}
                >
                  {score > 0 ? "+" : ""}
                  {score}
                </p>
                <div className="mt-6 flex justify-center gap-8 text-sm">
                  <div className="rounded-2xl bg-rose-500/10 px-6 py-3">
                    <p className="text-2xl">🌹</p>
                    <p className="mt-1 text-2xl font-black tabular-nums text-rose-300">
                      {state?.roseCount ?? 0}
                    </p>
                    <p className="text-xs text-slate-400">Gül ({rosePoints} puan)</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/10 px-6 py-3">
                    <p className="text-2xl">🎁</p>
                    <p className="mt-1 text-2xl font-black tabular-nums text-emerald-300">
                      {state?.giftCount ?? 0}
                    </p>
                    <p className="text-xs text-slate-400">
                      Hediye ({giftPoints > 0 ? "+" : ""}
                      {giftPoints} puan)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                Canlı Akış
              </h2>
              <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                {events.length === 0 && (
                  <p className="py-10 text-center text-sm text-slate-500">
                    Henüz olay yok. Yayına bağlanınca hediyeler burada belirecek.
                  </p>
                )}
                {[...events].reverse().map((ev) => {
                  const st = eventStyle(ev);
                  return (
                    <div
                      key={`${ev.id}-${ev.at}`}
                      className={`flex items-center justify-between rounded-xl ${st.bg} px-4 py-2.5`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-xl">{st.icon}</span>
                        <div className="overflow-hidden">
                          <p className="truncate text-sm font-semibold">
                            {ev.sender}
                            {ev.quantity > 1 && ev.type !== "manual" && ev.type !== "reset" && (
                              <span className="ml-1 text-slate-400">x{ev.quantity}</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-slate-400">{ev.giftName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black tabular-nums ${st.color}`}>
                          {ev.delta > 0 ? "+" : ""}
                          {ev.delta}
                        </p>
                        <p className="text-xs text-slate-500">→ {ev.scoreAfter}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
