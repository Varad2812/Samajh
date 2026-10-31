"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export type Side = "said" | "real";

/**
 * Shared camera for the two halves of the lab. Whichever side the user last grabbed drives; the other copies
 * it every frame. `reset()` sends both back to the sim's home view.
 */
export class CameraSync {
  private pos = new THREE.Vector3();
  private target = new THREE.Vector3();
  private driver: Side | "reset" | null = null;

  constructor(home: [number, number, number], target: [number, number, number] = [0, 0, 0]) {
    this.reset(home, target);
  }
  drive(side: Side) {
    this.driver = side;
  }
  reset(home: [number, number, number], target: [number, number, number] = [0, 0, 0]) {
    this.pos.set(...home);
    this.target.set(...target);
    this.driver = "reset";
  }
  /** Called each frame by each side. */
  sync(side: Side, camera: THREE.Camera, controls: OrbitControlsImpl) {
    if (this.driver === side) {
      this.pos.copy(camera.position);
      this.target.copy(controls.target);
      return;
    }
    if (this.driver === null) return;
    camera.position.lerp(this.pos, this.driver === "reset" ? 0.18 : 1);
    controls.target.lerp(this.target, this.driver === "reset" ? 0.18 : 1);
    controls.update();
  }
}

export function SyncedControls({ sync, side }: { sync: CameraSync; side: Side }) {
  const controls = useRef<OrbitControlsImpl>(null);
  useFrame(({ camera }) => {
    if (controls.current) sync.sync(side, camera, controls.current);
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      enablePan={false}
      minDistance={3}
      maxDistance={16}
      onStart={() => sync.drive(side)}
    />
  );
}
