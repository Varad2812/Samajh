"use client";

import { CONCEPT_BY_ID } from "@/lib/data/concepts";
import type { FxEvent } from "@/lib/fx";
import { galaxyLayout, nodeRadius, RING_TILT } from "@/lib/galaxy/layout";
import { TOKENS } from "@/lib/utils";
import { Burst } from "./Burst";
import { MasteryShockwave } from "./MasteryShockwave";
import { MisconceptionStrike } from "./MisconceptionStrike";

/** Renders the per-concept effects (strike, shatter, shockwave) for fresh store events. */
export function FxLayer({ events, reducedMotion }: { events: FxEvent[]; reducedMotion: boolean }) {
  if (reducedMotion) return null;
  const { positions } = galaxyLayout();
  return (
    <>
      {events.map((e) => {
        if (e.kind === "ignition") return null;
        const pos = positions[e.conceptId];
        const r = nodeRadius(CONCEPT_BY_ID[e.conceptId].weight);
        if (!pos) return null;
        switch (e.kind) {
          case "strike":
            return <MisconceptionStrike key={e.id} target={pos} nodeRadius={r} seed={e.id} />;
          case "shatter":
            // The orbiting satellite breaks apart into violet + white sparks.
            return (
              <Burst key={e.id} origin={pos} color={TOKENS.misconception} color2="#FFFFFF" count={110} speed={1.2} life={1.1} size={1.5} startRadius={r * 2.3} ring tilt={RING_TILT} seed={e.id} />
            );
          case "shockwave":
            return <MasteryShockwave key={e.id} position={pos} nodeRadius={r} from={e.from} to={e.to} seed={e.id} />;
        }
      })}
    </>
  );
}
