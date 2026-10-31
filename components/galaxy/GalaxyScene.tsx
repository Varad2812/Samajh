"use client";

import { useMemo } from "react";
import { FxLayer } from "@/components/fx/FxLayer";
import { PostStack } from "@/components/fx/PostStack";
import { useFreshFx } from "@/components/fx/useFreshFx";
import { STRIKE_IMPACT_MS } from "@/lib/fx";
import { TOKENS } from "@/lib/utils";
import { ConceptNode } from "./ConceptNode";
import { useGalaxyGraph, useGalaxyLayout } from "./GraphContext";
import { Dust } from "./Dust";
import { Nebulae } from "./Nebulae";
import { PrereqEdges } from "./PrereqEdges";
import { ClusterLabels, SelectedLabel, Starfield } from "./Starfield";
import type { GalaxyNodes } from "./types";

interface Props {
  nodes: GalaxyNodes;
  selectedId: string | null;
  /** Nodes outside this set dim (search, or MiniGalaxy's 1-hop focus). */
  visibleIds: ReadonlySet<string> | null;
  /** Edges touching these brighten. */
  activeIds: ReadonlySet<string>;
  reducedMotion: boolean;
  compact?: boolean;
  /** Hide DOM labels while Ignition plays. */
  igniting?: boolean;
  onSelect?: (id: string) => void;
}

/** Scene contents shared by KnowledgeGalaxy and MiniGalaxy. */
export function GalaxyScene({ nodes, selectedId, visibleIds, activeIds, reducedMotion, compact = false, igniting = false, onSelect }: Props) {
  const graph = useGalaxyGraph();
  const { positions } = useGalaxyLayout();
  const events = useFreshFx();

  // Shockwaves briefly brighten the concept's dependents; strikes reveal the new satellite at impact.
  const { boostAt, satelliteAt } = useMemo(() => {
    const boost: Record<string, number> = {};
    const sat: Record<string, number> = {};
    for (const e of events) {
      if (e.kind === "shockwave") {
        boost[e.conceptId] = e.at;
        for (const d of graph.concepts) if (d.prereqs.includes(e.conceptId)) boost[d.id] = e.at;
      } else if (e.kind === "strike") sat[e.conceptId] = e.at + (reducedMotion ? 0 : STRIKE_IMPACT_MS);
    }
    return { boostAt: boost, satelliteAt: sat };
  }, [events, reducedMotion, graph]);

  return (
    <>
      <color attach="background" args={[TOKENS.bg]} />
      <Starfield reducedMotion={reducedMotion} count={compact ? 1500 : 3500} />
      <Dust reducedMotion={reducedMotion} sizeScale={compact ? 0.3 : 1} />
      <Nebulae reducedMotion={reducedMotion} size={compact ? 9 : 11} />
      <PrereqEdges nodes={nodes} activeIds={activeIds} reducedMotion={reducedMotion} />
      {graph.concepts.filter((c) => nodes[c.id]).map((c) => (
        <ConceptNode
          key={c.id}
          concept={c}
          position={positions[c.id]}
          data={nodes[c.id]}
          selected={selectedId === c.id}
          dimmed={visibleIds !== null && !visibleIds.has(c.id)}
          reducedMotion={reducedMotion}
          compact={compact}
          boostAt={boostAt[c.id]}
          satelliteAt={satelliteAt[c.id]}
          onSelect={onSelect}
        />
      ))}
      {!compact && <ClusterLabels hidden={igniting} />}
      {!compact && <SelectedLabel id={selectedId} data={selectedId ? nodes[selectedId] : null} />}
      <FxLayer events={events} reducedMotion={reducedMotion} />
      <PostStack />
    </>
  );
}
