"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { galaxyLayout } from "@/lib/galaxy/layout";
import { masteryColor, TOKENS } from "@/lib/utils";
import type { GalaxyNodes } from "./types";

const nodeColor = (nodes: GalaxyNodes, id: string) =>
  new THREE.Color(nodes[id].estimated ? TOKENS.unknown : masteryColor(nodes[id].p));

const PARTICLES_PER_EDGE = 2;
const SPEED = 0.22; // edge lengths per second

interface Props {
  nodes: GalaxyNodes;
  /** Edges touching any of these brighten. */
  activeIds: ReadonlySet<string>;
  reducedMotion: boolean;
}

/** Prerequisite → dependent lines (one draw call) plus particles flowing toward the dependent (instanced). */
export function PrereqEdges({ nodes, activeIds, reducedMotion }: Props) {
  const { positions, edges } = galaxyLayout();
  const particles = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const ends = useMemo(
    () => edges.map(([a, b]) => [new THREE.Vector3(...positions[a]), new THREE.Vector3(...positions[b])] as const),
    [edges, positions],
  );

  const { base, active } = useMemo(() => {
    const colorOf = (id: string) => nodeColor(nodes, id);
    const build = (list: (readonly [string, string])[], bright: boolean) => {
      const g = new THREE.BufferGeometry();
      const pos: number[] = [];
      const col: number[] = [];
      for (const [a, b] of list) {
        pos.push(...positions[a], ...positions[b]);
        const ca = bright ? new THREE.Color(TOKENS.accent) : colorOf(a);
        const cb = bright ? colorOf(b) : new THREE.Color(TOKENS.muted);
        col.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b);
      }
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      return g;
    };
    const touching = edges.filter(([a, b]) => activeIds.has(a) || activeIds.has(b));
    return { base: build(edges, false), active: build(touching, true) };
  }, [edges, positions, nodes, activeIds]);

  useLayoutEffect(() => () => {
    base.dispose();
    active.dispose();
  }, [base, active]);

  // Particle colour = prerequisite mastery ("knowledge flows").
  useLayoutEffect(() => {
    const mesh = particles.current;
    if (!mesh) return;
    edges.forEach(([a, b], i) => {
      const touching = activeIds.has(a) || activeIds.has(b);
      const c = nodeColor(nodes, a).lerp(new THREE.Color(TOKENS.text), 0.35).multiplyScalar(touching ? 2.2 : 1.2);
      for (let k = 0; k < PARTICLES_PER_EDGE; k++) mesh.setColorAt(i * PARTICLES_PER_EDGE + k, c);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [edges, nodes, activeIds]);

  useFrame((state) => {
    const mesh = particles.current;
    if (!mesh) return;
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    ends.forEach(([a, b], i) => {
      const len = a.distanceTo(b);
      for (let k = 0; k < PARTICLES_PER_EDGE; k++) {
        const u = (((t * SPEED * 6) / Math.max(len, 0.5) + k / PARTICLES_PER_EDGE + i * 0.137) % 1 + 1) % 1;
        dummy.position.lerpVectors(a, b, u);
        // Fade in/out at the ends by shrinking.
        const s = Math.sin(u * Math.PI);
        dummy.scale.setScalar(0.4 + 0.6 * s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i * PARTICLES_PER_EDGE + k, dummy.matrix);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <lineSegments geometry={base}>
        <lineBasicMaterial vertexColors transparent opacity={0.25} toneMapped={false} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={active}>
        <lineBasicMaterial vertexColors transparent opacity={0.9} toneMapped={false} depthWrite={false} />
      </lineSegments>
      <instancedMesh ref={particles} args={[undefined, undefined, edges.length * PARTICLES_PER_EDGE]} frustumCulled={false}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.9} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
