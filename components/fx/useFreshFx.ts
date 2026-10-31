"use client";

import { useEffect, useState } from "react";
import { FX_LIFETIME_MS, type FxEvent } from "@/lib/fx";
import { useStore } from "@/lib/store";

/** Effect events that arrived after mount, each kept for its lifetime (never replays old events). */
export function useFreshFx(): FxEvent[] {
  const [active, setActive] = useState<FxEvent[]>([]);
  useEffect(() => {
    let lastId = useStore.getState().fxSeq - 1;
    const timers = new Set<number>();
    const unsub = useStore.subscribe((s) => {
      const fresh = s.fx.filter((e) => e.id > lastId);
      if (fresh.length === 0) return;
      lastId = fresh[fresh.length - 1].id;
      setActive((a) => [...a, ...fresh]);
      for (const e of fresh) {
        const t = window.setTimeout(() => {
          timers.delete(t);
          setActive((a) => a.filter((x) => x.id !== e.id));
        }, FX_LIFETIME_MS[e.kind]);
        timers.add(t);
      }
    });
    return () => {
      unsub();
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);
  return active;
}
