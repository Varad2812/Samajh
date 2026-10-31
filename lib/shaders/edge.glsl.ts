/**
 * Curved prerequisite edges: dashes flow prereq → dependent, brightness = prereq mastery ("knowledge flows").
 * During Ignition each edge is drawn progressively with a bright pulse head (DESIGN.md §4.1, §4.2-1).
 */
export const EDGE_VERTEX = /* glsl */ `
attribute float aU;
attribute float aLen;
attribute float aEdge;
attribute float aBright;
attribute float aActive;
attribute vec2 aIgnite;
attribute vec3 aColor;
varying float vU;
varying float vLen;
varying float vEdge;
varying float vBright;
varying float vActive;
varying vec2 vIgnite;
varying vec3 vColor;
void main() {
  vU = aU; vLen = aLen; vEdge = aEdge; vBright = aBright; vActive = aActive; vIgnite = aIgnite; vColor = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const EDGE_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uIgnite;
uniform vec3 uAccent;
varying float vU;
varying float vLen;
varying float vEdge;
varying float vBright;
varying float vActive;
varying vec2 vIgnite;
varying vec3 vColor;
void main() {
  float reveal = clamp((uIgnite - vIgnite.x) / max(vIgnite.y - vIgnite.x, 0.05), 0.0, 1.0);
  if (vU > reveal) discard;
  float head = (1.0 - step(0.999, reveal)) * smoothstep(0.18, 0.0, reveal - vU);
  float dash = smoothstep(0.55, 1.0, fract(vU * vLen * 1.6 - uTime * 0.9 + vEdge * 0.37));
  float a = 0.12 + dash * (0.25 + 0.55 * vBright) + vActive * 0.45 + head;
  vec3 col = mix(vColor, uAccent, vActive * 0.6) * (0.6 + vBright + head * 3.0);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
}
`;
