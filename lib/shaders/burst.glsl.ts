/** GPU particle burst: positions computed from age in the vertex shader (no per-frame CPU work). */
export const BURST_VERTEX = /* glsl */ `
attribute vec3 aStart;
attribute vec3 aDir;
attribute float aSeed;
uniform float uAge;
uniform float uLife;
uniform float uSpeed;
uniform float uSize;
uniform float uPixelRatio;
varying float vAlpha;
varying float vSeed;
void main() {
  float k = clamp(uAge / uLife, 0.0, 1.0);
  float travel = 1.0 - pow(1.0 - k, 3.0);
  vec3 p = aStart + aDir * uSpeed * travel * (0.6 + 0.4 * aSeed);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixelRatio * (1.0 - k * 0.7) * (30.0 / max(-mv.z, 0.5));
  vAlpha = pow(1.0 - k, 1.6) * step(0.0, uAge);
  vSeed = aSeed;
}
`;

export const BURST_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uColor2;
varying float vAlpha;
varying float vSeed;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  if (a < 0.01) discard;
  vec3 c = mix(uColor, uColor2, step(0.7, vSeed));
  gl_FragColor = vec4(c * a * 2.0, a);
}
`;
