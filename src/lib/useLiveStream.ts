"use client";

import { useEffect, useRef, useState } from "react";
import type { ScoreEvent, StateSnapshot } from "./types";

type StreamMessage =
  | { kind: "init"; state: StateSnapshot; recent: ScoreEvent[] }
  | { kind: "state"; state: StateSnapshot }
  | { kind: "event"; event: ScoreEvent };

export function useLiveStream(maxEvents = 40) {
  const [state, setState] = useState<StateSnapshot | null>(null);
  const [events, setEvents] = useState<ScoreEvent[]>([]);
  const [streamOnline, setStreamOnline] = useState(false);
  const [lastEvent, setLastEvent] = useState<ScoreEvent | null>(null);
  const seen = useRef<Set<number>>(new Set());

  useEffect(() => {
    const es = new EventSource("/api/stream");

    es.onopen = () => setStreamOnline(true);
    es.onerror = () => setStreamOnline(false);

    es.onmessage = (e) => {
      let msg: StreamMessage;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.kind === "init") {
        setState(msg.state);
        const recent = [...msg.recent].sort((a, b) => a.id - b.id);
        setEvents(recent.slice(-maxEvents));
        recent.forEach((ev) => seen.current.add(ev.id));
      } else if (msg.kind === "state") {
        setState(msg.state);
      } else if (msg.kind === "event") {
        const ev = msg.event;
        setLastEvent(ev);
        setEvents((prev) => [...prev.slice(-(maxEvents - 1)), ev]);
      }
    };

    return () => es.close();
  }, [maxEvents]);

  return { state, events, streamOnline, lastEvent };
}
