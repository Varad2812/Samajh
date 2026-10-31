"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSignals } from "@/components/fx/SceneSignals";
import { igniteAt } from "@/lib/galaxy/ignition";
import { galaxyLayout } from "@/lib/galaxy/layout";
import { EDGE_FRAGMENT, EDGE_VERTEX } from "@/lib/shaders/edge.glsl";
import { masteryColor, TOKENS } from "@/lib/utils";
import type { GalaxyNodes } from "./types";

const SEGMENTS = 20;
const SPEED = 0.18; // curve fractions per second for the travelling spark

interface Props {
  nodes: GalaxyNodes;
  /** Edges touching any of these brighten. */
  activeIds: ReadonlySet<string>;
  reducedMotion: boolean;
}

/** Quadratic bezier lifted upward (toward the usual camera position). */
function curveFor(a: THREE.Vector3, b: THREE.Vector3): THREE.QuadraticBezierCurve3 {
  const mid = a.clone().lerp(b, 0.5);
  mid.y += Math.min(1.6, 0.22 * a.distanceTo(b));
  return new THREE.QuadraticBezierCurve3(a, mid, b);
}

/**
 * Curved prerequisite edges with an animated dash shader flowing prereq → dependent (one draw call),
 * brightness = prereq mastery, plus one travelling spark per edge. Ignition draws each edge progressively.
 */
export function PrereqEdges({ nodes, activeIds, reducedMotion }: Props) {
  const { positions, edges } = galaxyLayout();
  const signals = useSignals();
  const material = useRef<THREE.ShaderMaterial>(null);
  const sparks = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const curves = useMemo(() => edges.map(([a, b]) => curveFor(new THREE.Vector3(...positions[a]), new THREE.Vector3(...positions[b]))), [edges, positions]);

  const geometry = useMemo(() => {
    const n = edges.length * SEGMENTS * 2;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const u = new Float32Array(n);
    const len = new Float32Array(n);
    const idx = new Float32Array(n);
    const bright = new Float32Array(n);
    const active = new Float32Array(n);
    const ignite = new Float32Array(n * 2);
    let v = 0;
    edges.forEach(([a, b], e) => {
      const pts = curves[e].getPoints(SEGMENTS);
      const length = curves[e].getLength();
      const c = new THREE.Color(nodes[a].estimated ? TOKENS.unknown : masteryColor(nodes[a].p));
      const isActive = activeIds.has(a) || activeIds.has(b) ? 1 : 0;
      for (let s = 0; s < SEGMENTS; s++) {
        for (const k of [s, s + 1]) {
          pos.set([pts[k].x, pts[k].y, pts[k].z], v * 3);
          col.set([c.r, c.g, c.b], v * 3);
          u[v] = k / SEGMENTS;
          len[v] = length;
          idx[v] = e;
          bright[v] = nodes[a].estimated ? 0.15 : nodes[a].p;
          active[v] = isActive;
          ignite.set([igniteAt(a), igniteAt(b)], v * 2);
          v++;
        }
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aU", new THREE.BufferAttribute(u, 1));
    g.setAttribute("aLen", new THREE.BufferAttribute(len, 1));
    g.setAttribute("aEdge", new THREE.BufferAttribute(idx, 1));
    g.setAttribute("aBright", new THREE.BufferAttribute(bright, 1));
    g.setAttribute("aActive", new THREE.BufferAttribute(active, 1));
    g.setAttribute("aIgnite", new THREE.BufferAttribute(ignite, 2));
    return g;
  }, [edges, curves, nodes, activeIds]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uIgnite: { value: 1000 }, uAccent: { value: new THREE.Color(TOKENS.accent) } }), []);

  // Spark colour = prerequisite mastery, brighter on active edges.
  useLayoutEffect(() => {
    const mesh = sparks.current;
    if (!mesh) return;
    edges.forEach(([a, b], i) => {
      const base = new THREE.Color(nodes[a].estimated ? TOKENS.unknown : masteryColor(nodes[a].p)).lerp(new THREE.Color(TOKENS.text), 0.35);
      mesh.setColorAt(i, base.multiplyScalar(activeIds.has(a) || activeIds.has(b) ? 2.4 : 1.3));
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [edges, nodes, activeIds]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const el = signals.ignitionElapsed(t);
    if (material.current) {
      material.current.uniforms.uTime.value = reducedMotion ? 0 : t;
      material.current.uniforms.uIgnite.value = el === Infinity ? 1000 : el;
    }
    const mesh = sparks.current;
    if (!mesh) return;
    edges.forEach(([, b], i) => {
      // Sparks appear once the edge has finished drawing.
      const drawn = el === Infinity || el > igniteAt(b);
      const k = (((reducedMotion ? 0 : t) * SPEED + i * 0.137) % 1 + 1) % 1;
      dummy.position.copy(curves[i].getPoint(k));
      dummy.scale.setScalar(drawn ? 0.4 + 0.6 * Math.sin(k * Math.PI) : 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <lineSegments geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={material}
          vertexShader={EDGE_VERTEX}
          fragmentShader={EDGE_FRAGMENT}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      <instancedMesh ref={sparks} args={[undefined, undefined, edges.length]} frustumCulled={false}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.9} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
