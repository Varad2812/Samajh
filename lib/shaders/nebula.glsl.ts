import { NOISE_GLSL } from "./noise.glsl";

/** Billboarded additive nebula plane with slowly drifting fbm noise (DESIGN.md §4.1). */
export const NEBULA_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const NEBULA_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uOpacity;
uniform float uSeed;
varying vec2 vUv;
${NOISE_GLSL}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float n = fbm2(p * 1.5 + vec2(uTime * 0.018, -uTime * 0.012) + uSeed);
  float n2 = fbm2(p * 3.4 - vec2(uTime * 0.025, uTime * 0.01) + uSeed * 1.7);
  float wisps = smoothstep(0.35, 0.85, n) * (0.55 + 0.45 * n2);
  float a = smoothstep(1.0, 0.05, r) * (0.25 + wisps) * uOpacity;
  gl_FragColor = vec4(uColor * a, a);
}
`;
