"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { TOKENS } from "@/lib/utils";

const DURATION_MS = 500;
const STARS = 260;

const section = (path: string) => (path.startsWith("/teacher") ? "teacher" : path.startsWith("/student") ? "student" : "other");

/**
 * Star-streak warp (DESIGN.md §4.2 item 5): switching between the Student and Teacher sections plays a 500ms
 * burst of points stretched along the view direction. 2D canvas, drawn imperatively (no React state per frame).
 */
export function RouteWarp() {
  const pathname = usePathname();
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef<string | null>(null);

  useEffect(() => {
    const prev = last.current;
    last.current = section(pathname);
    if (prev === null || prev === "other" || last.current === "other" || prev === last.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    el.width = w * dpr;
    el.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = [TOKENS.text, TOKENS.accent, TOKENS.accent2, TOKENS.mastered];
    // Stars in a cone ahead of the camera: (x, y) on the image plane at depth z.
    const stars = Array.from({ length: STARS }, (_, i) => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: 0.2 + Math.random() * 0.8,
      c: colors[i % colors.length],
    }));
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.max(w, h) * 0.5;
    const t0 = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / DURATION_MS);
      // Ease in-out speed; overlay fades in fast and out at the end.
      const speed = Math.sin(t * Math.PI);
      const alpha = t < 0.15 ? t / 0.15 : t > 0.7 ? (1 - t) / 0.3 : 1;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = `rgba(7,8,13,${0.82 * alpha})`;
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = "round";
      for (const s of stars) {
        const z0 = s.z;
        s.z = Math.max(0.02, s.z - 0.045 * speed);
        const x1 = cx + (s.x / z0) * scale * 0.25;
        const y1 = cy + (s.y / z0) * scale * 0.25;
        const x2 = cx + (s.x / s.z) * scale * 0.25;
        const y2 = cy + (s.y / s.z) * scale * 0.25;
        ctx.strokeStyle = s.c;
        ctx.globalAlpha = alpha * Math.min(1, 0.25 + (1 - s.z));
        ctx.lineWidth = 1 + (1 - s.z) * 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        if (s.z <= 0.02) s.z = 0.6 + Math.random() * 0.4;
      }
      ctx.globalAlpha = 1;
      if (t < 1) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    };
    el.style.display = "block";
    raf = requestAnimationFrame(frame);
    const done = window.setTimeout(() => (el.style.display = "none"), DURATION_MS + 50);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
      el.style.display = "none";
    };
  }, [pathname]);

  return <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-[60] hidden h-full w-full" data-testid="route-warp" />;
}
