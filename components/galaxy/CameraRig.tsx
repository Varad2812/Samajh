"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { galaxyLayout } from "@/lib/galaxy/layout";

export const HOME_POSITION = new THREE.Vector3(0, 13, 22);
export const HOME_TARGET = new THREE.Vector3(0, 0, 0);
const FLY_DURATION = 0.8;
const FOCUS_DISTANCE = 7;
const IDLE_BEFORE_ROTATE = 3;
/** While the side sheet is open, shift the projection so the focused node sits left of it. */
const SHEET_SHIFT_PX = 165;

interface Flight {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  t0: number | null;
}

const easeInOutCubic = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const controlsOf = (s: RootState) => s.controls as unknown as OrbitControlsImpl | null;

/** Fly-to on selection (≈800ms, controls disabled), fly home on reset, auto-rotate when idle. */
export function CameraRig({ selectedId, resetKey = 0, reducedMotion }: { selectedId: string | null; resetKey?: number; reducedMotion: boolean }) {
  const get = useThree((s) => s.get);
  const hasControls = useThree((s) => s.controls !== null);
  const flight = useRef<Flight | null>(null);
  const interacting = useRef(false);
  const lastInteraction = useRef(0);
  const now = useRef(0);
  const viewShift = useRef(0);

  const flyTo = (toPos: THREE.Vector3, toTarget: THREE.Vector3) => {
    const state = get();
    const controls = controlsOf(state);
    if (!controls) return;
    if (reducedMotion) {
      state.camera.position.copy(toPos);
      controls.target.copy(toTarget);
      controls.update();
      return;
    }
    flight.current = { fromPos: state.camera.position.clone(), toPos, fromTarget: controls.target.clone(), toTarget, t0: null };
  };

  useEffect(() => {
    const state = get();
    const controls = controlsOf(state);
    if (!selectedId || !controls) return;
    const target = new THREE.Vector3(...galaxyLayout().positions[selectedId]);
    const dir = state.camera.position.clone().sub(controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0.5, 1);
    flyTo(target.clone().add(dir.normalize().multiplyScalar(FOCUS_DISTANCE)), target);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fly only when the selection changes
  }, [selectedId, hasControls]);

  useEffect(() => {
    if (resetKey > 0) flyTo(HOME_POSITION.clone(), HOME_TARGET.clone());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fly only when reset is requested
  }, [resetKey]);

  useEffect(() => {
    const controls = controlsOf(get());
    if (!controls) return;
    const onStart = () => {
      interacting.current = true;
      flight.current = null; // the user takes over mid-flight
    };
    const onEnd = () => {
      interacting.current = false;
      lastInteraction.current = now.current;
    };
    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);
    return () => {
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
    };
  }, [get, hasControls]);

  useFrame((state, dt) => {
    now.current = state.clock.elapsedTime;
    const camera = state.camera as THREE.PerspectiveCamera;
    const { width, height } = state.size;
    const goalShift = selectedId ? Math.min(SHEET_SHIFT_PX, width * 0.2) : 0;
    viewShift.current += (goalShift - viewShift.current) * (reducedMotion ? 1 : 1 - Math.exp(-dt / 0.15));
    if (Math.abs(viewShift.current) > 0.5) camera.setViewOffset(width, height, viewShift.current, 0, width, height);
    else if (camera.view?.enabled) camera.clearViewOffset();

    const controls = controlsOf(state);
    if (!controls) return;
    const f = flight.current;
    if (f) {
      if (f.t0 === null) f.t0 = now.current;
      const k = Math.min(1, (now.current - f.t0) / FLY_DURATION);
      const e = easeInOutCubic(k);
      state.camera.position.lerpVectors(f.fromPos, f.toPos, e);
      controls.target.lerpVectors(f.fromTarget, f.toTarget, e);
      if (k >= 1) {
        flight.current = null;
        lastInteraction.current = now.current;
      }
    }
    // Orbit input is disabled while flying.
    controls.enabled = !flight.current;
    controls.autoRotate =
      !reducedMotion && !flight.current && !selectedId && !interacting.current && now.current - lastInteraction.current > IDLE_BEFORE_ROTATE;
  });

  return null;
}
