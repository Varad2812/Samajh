"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { CONCEPTS } from "@/lib/data/concepts";
import { galaxyLayout } from "@/lib/galaxy/layout";
import { TOKENS } from "@/lib/utils";
import { ConceptNode } from "./ConceptNode";
import { PrereqEdges } from "./PrereqEdges";
import { ClusterLabels, Starfield } from "./Starfield";
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
  onSelect?: (id: string) => void;
}

/** Scene contents shared by KnowledgeGalaxy and MiniGalaxy. */
export function GalaxyScene({ nodes, selectedId, visibleIds, activeIds, reducedMotion, compact = false, onSelect }: Props) {
  const { positions } = galaxyLayout();
  return (
    <>
      <color attach="background" args={[TOKENS.bg]} />
      <fog attach="fog" args={[TOKENS.bg, compact ? 10 : 28, compact ? 30 : 60]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 8, 0]} intensity={30} color={TOKENS.accent2} />
      <Starfield reducedMotion={reducedMotion} />
      <PrereqEdges nodes={nodes} activeIds={activeIds} reducedMotion={reducedMotion} />
      {CONCEPTS.map((c) => (
        <ConceptNode
          key={c.id}
          concept={c}
          position={positions[c.id]}
          data={nodes[c.id]}
          selected={selectedId === c.id}
          dimmed={visibleIds !== null && !visibleIds.has(c.id)}
          reducedMotion={reducedMotion}
          onSelect={onSelect}
        />
      ))}
      {!compact && <ClusterLabels />}
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={0.2} intensity={0.9} />
        <Vignette offset={0.3} darkness={0.75} />
      </EffectComposer>
    </>
  );
}
