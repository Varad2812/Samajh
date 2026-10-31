"use client";

import dynamic from "next/dynamic";
import { GalaxyLoading } from "./GalaxyLoading";

/** Full Knowledge Galaxy (client-only WebGL). Fills its positioned parent. */
export const KnowledgeGalaxy = dynamic(() => import("./KnowledgeGalaxyCanvas"), {
  ssr: false,
  loading: () => <GalaxyLoading />,
});

/** Small focused galaxy: camera locked on a node and its 1-hop neighbours. Fills its positioned parent. */
export const MiniGalaxy = dynamic(() => import("./MiniGalaxyCanvas"), {
  ssr: false,
  loading: () => <GalaxyLoading label="Focusing…" />,
});

/** Teacher 3D Class Constellation: class-average colours, misconception pillars and storm clouds. */
export const ClassConstellation = dynamic(() => import("./ClassConstellationCanvas"), {
  ssr: false,
  loading: () => <GalaxyLoading label="Mapping the class…" />,
});

export type { GalaxyNodeData, GalaxyNodes } from "./types";
