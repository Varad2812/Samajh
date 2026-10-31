import type { LabMisconception } from "@/lib/lab/physics";
import type { LabSim } from "../types";
import { circuitSim } from "./CircuitSim";
import { refractionSim } from "./RefractionSim";
import { skySim } from "./SkySim";
import { wireFieldSim } from "./WireFieldSim";

export const LAB_SIMS: Record<LabMisconception, LabSim> = {
  MC01: circuitSim,
  MC11: refractionSim,
  MC16: wireFieldSim,
  MC14: skySim,
};
