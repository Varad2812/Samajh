import type { ComponentType } from "react";
import type { LabMisconception, Variant } from "@/lib/lab/physics";

export type LabControl =
  | { kind: "slider"; label: string; min: number; max: number; step: number; initial: number; format: (v: number) => string }
  | { kind: "toggle"; label: string; options: [string, string]; initial: 0 | 1 };

export interface LabSimProps {
  variant: Variant;
  /** Slider value, or 0/1 for a toggle. */
  param: number;
  reducedMotion: boolean;
}

export interface LabSim {
  mcId: LabMisconception;
  title: string;
  camera: [number, number, number];
  target?: [number, number, number];
  control?: LabControl;
  /** One line under each half. */
  said: string;
  real: string;
  Scene: ComponentType<LabSimProps>;
}
