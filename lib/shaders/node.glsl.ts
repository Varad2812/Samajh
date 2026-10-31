import { NOISE_GLSL } from "./noise.glsl";

/** Concept node: white-hot core + animated plasma surface + fresnel rim glow in the mastery colour (DESIGN.md §4.1). */
export const NODE_VERTEX = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vPos;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  vPos = normalize(position);
  gl_Position = projectionMatrix * mv;
}
`;

export const NODE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;
uniform float uPlasma;
uniform float uRim;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vPos;
${NOISE_GLSL}
void main() {
  float facing = max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
  float fres = pow(1.0 - facing, 2.4);
  float n = fbm3(vPos * 2.6 + vec3(0.0, uTime * 0.35, uTime * 0.2));
  float plasma = mix(1.0, 0.45 + 1.1 * n, uPlasma);
  vec3 core = uColor * plasma * uIntensity * (0.45 + 0.55 * facing);
  vec3 hot = mix(uColor, vec3(1.0), 0.6) * pow(facing, 6.0) * 0.22 * uIntensity;
  vec3 rim = uColor * fres * uRim;
  gl_FragColor = vec4(core + hot + rim, 1.0);
}
`;
