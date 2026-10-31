"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Rehydrates the persisted store on the client and binds the hidden Shift+D demo shortcut. */
export function StoreHydrator() {
  useEffect(() => {
    void useStore.persist.rehydrate();
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      if (e.shiftKey && e.key.toLowerCase() === "d") useStore.getState().loadDemoProfile();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
