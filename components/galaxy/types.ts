import type { ReactNode } from "react";
import type { GalaxyNodes } from "@/lib/galaxy/nodes";

export type { GalaxyNodeData, GalaxyNodes } from "@/lib/galaxy/nodes";

export interface GalaxyProps {
  nodes: GalaxyNodes;
  selectedId: string | null;
  onSelect?: (id: string | null) => void;
  /** Search matches; non-matching nodes dim. null = no filter. */
  highlightIds?: ReadonlySet<string> | null;
  /** Increment to fly the camera back to the overview. */
  resetKey?: number;
  /** Fire Galaxy Ignition as soon as the renderer is created (diagnostic reveal). */
  igniteOnMount?: boolean;
  /** Extra R3F content rendered inside the scene (e.g. the teacher Constellation's pillars and storms). */
  children?: ReactNode;
}

export interface MiniGalaxyProps {
  nodes: GalaxyNodes;
  focusId: string;
  onSelect?: (id: string) => void;
  className?: string;
}
