"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

/** Counts from `from` to `to` once mounted (600ms ease-out), writing straight to the DOM. */
export function AnimatedNumber({ from, to, format, className, style }: { from: number; to: number; format: (n: number) => string; className?: string; style?: React.CSSProperties }) {
  const el = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    if (reduce) {
      node.textContent = format(to);
      return;
    }
    const c = animate(from, to, { duration: 0.6, delay: 0.25, ease: "easeOut", onUpdate: (v) => (node.textContent = format(v)) });
    return () => c.stop();
  }, [from, to, format, reduce]);
  return (
    <span ref={el} className={className} style={style}>
      {format(reduce ? to : from)}
    </span>
  );
}
