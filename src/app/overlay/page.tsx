"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveStream } from "@/lib/useLiveStream";
import type { ScoreEvent } from "@/lib/types";

type FloatItem = {
  key: string;
  side: "rose" | "gift";
  text: string;
  delta: number;
};

export default function Overlay() {
  const { state, lastEvent } = useLiveStream(10);
  const [floaters, setFloaters] = useState<FloatItem[]>([]);
  const [bump, setBump] = useState<"rose" | "gift" | null>(null);
  const lastId = useRef<number>(-1);

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.id === lastId.current) return;
    lastId.current = lastEvent.id;
    if (lastEvent.type === "reset" || lastEvent.delta === 0) return;

    const ev: ScoreEvent = lastEvent;
    const side: "rose" | "gift" = ev.type === "rose" ? "rose" : "gift";
    const item: FloatItem = {
      key: `${ev.id}-${ev.at}-${Math.random().toString(36).slice(2, 7)}`,
      side,
      text: `${ev.sender}${ev.quantity > 1 ? ` x${ev.quantity}` : ""}`,
      delta: ev.delta,
    };
    setFloaters((prev) => [...prev, item]);
    setBump(side);
    const t1 = setTimeout(() => setBump(null), 500);
    const t2 = setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.key !== item.key));
    }, 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [lastEvent]);

  const score = state?.score ?? 0;
  const roseCount = state?.roseCount ?? 0;
  const giftCount = state?.giftCount ?? 0;
  const rosePoints = state?.rosePoints ?? -1;
  const giftPoints = state?.giftPoints ?? 1;

  return (
    <div className="flex min-h-screen w-full items-start justify-center overflow-hidden bg-transparent p-6 font-sans">
      <style>{`
        html, body { background: transparent !important; }
        @keyframes floatUp {
          0% { opacity: 0; transform: translate(-50%, 10px) scale(0.8); }
          15% { opacity: 1; transform: translate(-50%, -6px) scale(1); }
          80% { opacity: 1; transform: translate(-50%, -70px) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -110px) scale(0.9); }
        }
        @keyframes popScale {
          0% { transform: scale(1); }
          45% { transform: scale(1.16); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div className="flex flex-col items-center gap-5">
        {/* Two counters side by side */}
        <div className="flex items-stretch gap-5">
          {/* ROSE */}
          <div
            className="relative flex w-44 flex-col items-center rounded-3xl border-4 border-rose-400/70 bg-rose-950/70 px-4 py-5 shadow-2xl backdrop-blur-md"
            style={bump === "rose" ? { animation: "popScale 0.5s ease-out" } : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/rose.svg" alt="Gül" className="h-24 w-24 drop-shadow-[0_4px_10px_rgba(244,63,94,0.5)]" />
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-rose-200/80">Gül</p>
            <p className="text-6xl font-black tabular-nums leading-none text-rose-300 drop-shadow-[0_3px_8px_rgba(0,0,0,0.6)]">
              {roseCount}
            </p>
            <span className="mt-1 rounded-full bg-rose-500/30 px-3 py-0.5 text-xs font-bold text-rose-200">
              adet {rosePoints}
            </span>

            {floaters
              .filter((f) => f.side === "rose")
              .map((f) => (
                <div
                  key={f.key}
                  className="pointer-events-none absolute left-1/2 top-0 flex items-center gap-1 whitespace-nowrap rounded-full bg-rose-500 px-3 py-1 text-sm font-black text-white shadow-lg"
                  style={{ animation: "floatUp 2.6s ease-out forwards" }}
                >
                  <span>🌹</span>
                  <span>{f.text}</span>
                  <span>
                    {f.delta > 0 ? "+" : ""}
                    {f.delta}
                  </span>
                </div>
              ))}
          </div>

          {/* TIKTOK / GIFT */}
          <div
            className="relative flex w-44 flex-col items-center rounded-3xl border-4 border-emerald-400/70 bg-emerald-950/70 px-4 py-5 shadow-2xl backdrop-blur-md"
            style={bump === "gift" ? { animation: "popScale 0.5s ease-out" } : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tiktok.svg" alt="TikTok" className="h-24 w-24 drop-shadow-[0_4px_10px_rgba(16,185,129,0.5)]" />
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-emerald-200/80">TikTok</p>
            <p className="text-6xl font-black tabular-nums leading-none text-emerald-300 drop-shadow-[0_3px_8px_rgba(0,0,0,0.6)]">
              {giftCount}
            </p>
            <span className="mt-1 rounded-full bg-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-200">
              adet {giftPoints > 0 ? "+" : ""}
              {giftPoints}
            </span>

            {floaters
              .filter((f) => f.side === "gift")
              .map((f) => (
                <div
                  key={f.key}
                  className="pointer-events-none absolute left-1/2 top-0 flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-500 px-3 py-1 text-sm font-black text-white shadow-lg"
                  style={{ animation: "floatUp 2.6s ease-out forwards" }}
                >
                  <span>🎁</span>
                  <span>{f.text}</span>
                  <span>
                    {f.delta > 0 ? "+" : ""}
                    {f.delta}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* TOTAL */}
        <div
          className={`w-full rounded-3xl border-4 px-10 py-5 text-center shadow-2xl backdrop-blur-md transition-colors duration-300 ${
            score < 0
              ? "border-rose-400/70 bg-rose-950/70"
              : score > 0
                ? "border-emerald-400/70 bg-emerald-950/70"
                : "border-slate-400/60 bg-slate-900/70"
          }`}
        >
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-white/70 drop-shadow">
            Toplam Skor
          </p>
          <p
            className={`text-7xl font-black leading-none tabular-nums drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] ${
              score < 0 ? "text-rose-300" : score > 0 ? "text-emerald-300" : "text-white"
            }`}
          >
            {score > 0 ? "+" : ""}
            {score}
          </p>
        </div>
      </div>
    </div>
  );
}
