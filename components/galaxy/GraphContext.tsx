"use client";

import { createContext, useContext } from "react";
import { PHYSICS_GRAPH, type GalaxyGraph } from "@/lib/galaxy/graph";
import { galaxyLayout } from "@/lib/galaxy/layout";

/** The concept graph the surrounding galaxy draws (Class 10 Physics unless a custom test provides one). */
export const GalaxyGraphContext = createContext<GalaxyGraph>(PHYSICS_GRAPH);

export const useGalaxyGraph = (): GalaxyGraph => useContext(GalaxyGraphContext);

export function useGalaxyLayout() {
  return galaxyLayout(useGalaxyGraph());
}
