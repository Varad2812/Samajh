"use client";

import { useEffect } from "react";
import { fx, useStore } from "@/lib/store";

declare global {
  interface Window {
    __samajh?: { store: typeof useStore; fx: typeof fx };
  }
}

/** Rehydrates the persisted store on the client and binds the hidden Shift+D demo shortcut. */
export function StoreHydrator() {
  useEffect(() => {
    void useStore.persist.rehydrate();
    // Rehearsal / testing hook for triggering effects from the console (dev builds or ?debug).
    if (process.env.NODE_ENV !== "production" || new URLSearchParams(window.location.search).has("debug")) {
      window.__samajh = { store: useStore, fx };
    }
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
