/** Spiral-arm dust points: size attenuation, twinkle, and the Ignition "form" expansion (DESIGN.md §4.1, §4.2-1). */
export const DUST_VERTEX = /* glsl */ `
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;
uniform float uTime;
uniform float uForm;
uniform float uPixelRatio;
uniform float uSizeScale;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float f = 1.0 - pow(1.0 - clamp(uForm, 0.0, 1.0), 3.0);
  // Swirl in from the core while forming.
  float ang = (1.0 - f) * 2.6;
  float c = cos(ang), s = sin(ang);
  vec3 p = position * (0.02 + 0.98 * f);
  p.xz = mat2(c, -s, s, c) * p.xz;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float twinkle = 0.6 + 0.4 * sin(uTime * (1.2 + aSeed * 2.4) + aSeed * 6.2831);
  gl_PointSize = min(aSize * uPixelRatio * uSizeScale * (80.0 / max(-mv.z, 0.5)), 7.0 * uPixelRatio);
  vColor = aColor * 1.5;
  vAlpha = twinkle * step(0.001, uForm);
}
`;

export const DUST_FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * a, a);
}
`;
