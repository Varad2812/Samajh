"use client";

import { Canvas } from "@react-three/fiber";
import { TOKENS } from "@/lib/utils";
import { useReducedMotion } from "@/components/galaxy/useReducedMotion";
import { SyncedControls, type CameraSync, type Side } from "./CameraSync";
import type { LabSim } from "./types";

const SIDES: { side: Side; title: string; tone: string }[] = [
  { side: "said", title: "What you said", tone: "text-weak border-weak/30 bg-weak/10" },
  { side: "real", title: "What really happens", tone: "text-mastered border-mastered/30 bg-mastered/10" },
];

/** Shared split view: the same sim twice ("said" vs "real") with one synchronized orbit camera. */
export function LabScene({ sim, param, sync }: { sim: LabSim; param: number; sync: CameraSync }) {
  const reducedMotion = useReducedMotion();
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2">
      {SIDES.map(({ side, title, tone }) => (
        <section key={side} className="relative flex min-h-[240px] flex-col overflow-hidden rounded-xl border border-border bg-bg" aria-label={title}>
          <div className={`absolute top-3 left-3 z-10 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone}`}>{title}</div>
          <div className="min-h-0 flex-1">
            <Canvas
              dpr={[1, 1.75]}
              camera={{ position: sim.camera, fov: 42, near: 0.1, far: 100 }}
              gl={{ antialias: true }}
              aria-label={`${title}: ${sim.title}`}
            >
              <color attach="background" args={[TOKENS.bg]} />
              <ambientLight intensity={0.55} />
              <directionalLight position={[3, 5, 4]} intensity={1.4} />
              <directionalLight position={[-4, -2, -3]} intensity={0.35} color={TOKENS.accent2} />
              <sim.Scene variant={side} param={param} reducedMotion={reducedMotion} />
              <SyncedControls sync={sync} side={side} />
            </Canvas>
          </div>
          <p className="border-t border-border bg-surface/80 px-3 py-2 text-xs leading-relaxed text-muted-foreground">{side === "said" ? sim.said : sim.real}</p>
        </section>
      ))}
    </div>
  );
}
