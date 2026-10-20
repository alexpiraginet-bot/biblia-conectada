// GLSL ES 3.00 sources of the light sculpture (/arcos). The look carries the sky of links' film (sky/shaders.ts:
// density, crisper "hero" strands, bloom at two scales, gold for what is lit) onto arcs that stand in 3D.
//
// One arc instance = a triangle strip of 2 * (uSeg + 1) vertices along a half ellipse over the axis, widened in screen
// space so every arc keeps the same thickness in pixels wherever the camera stands.
// aA = (xa, xb, theta, weight), aB = (r, g, b, hero) with the arc's colour already chosen on the CPU.

const ARC_HEAD = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec4 aA;
layout(location = 1) in vec4 aB;
uniform mat4 uMVP;
uniform vec2 uRes;      // target size in device px
uniform float uSeg;
uniform float uHalf;    // half width in device px
uniform float uFlat;
vec3 arcPoint(float t) {
  float c = 0.5 * (aA.x + aA.y);
  float r = 0.5 * abs(aA.y - aA.x);
  float a = 3.14159265 * t;
  float h = r * sin(a) * uFlat;
  float x = aA.x <= aA.y ? c - r * cos(a) : c + r * cos(a);
  return vec3(x, h * sin(aA.z), h * cos(aA.z));
}
// clip position of this vertex, widened along the screen normal; d = signed distance from the centre line (px)
vec4 strip(out float d, out float t, out float depth) {
  float i = float(gl_VertexID >> 1);
  float side = float(gl_VertexID & 1) * 2.0 - 1.0;
  t = i / uSeg;
  float e = 0.5 / uSeg;
  vec4 c0 = uMVP * vec4(arcPoint(t), 1.0);
  vec4 c1 = uMVP * vec4(arcPoint(min(t + e, 1.0)), 1.0);
  vec4 cm = uMVP * vec4(arcPoint(max(t - e, 0.0)), 1.0);
  // behind the eye: collapse the vertex (the strip degenerates there)
  if (c0.w < 1e-3) { d = 0.0; depth = 0.0; return vec4(0.0, 0.0, 2.0, 1.0); }
  vec2 s1 = c1.xy / max(c1.w, 1e-3) * uRes;
  vec2 sm = cm.xy / max(cm.w, 1e-3) * uRes;
  vec2 dir = s1 - sm;
  dir = length(dir) > 1e-5 ? normalize(dir) : vec2(1.0, 0.0);
  vec2 n = vec2(-dir.y, dir.x);
  d = side * (uHalf + 1.0);
  depth = c0.w;
  // d px on screen = 2 d / uRes in normalised device coordinates, times w in clip space
  return vec4(c0.xy + n * (2.0 * d / uRes) * c0.w, c0.z, c0.w);
}
`;

// Density pass, two targets summed by additive blending:
//   0 = (colour * d, d) for every arc, 1 = (colour * d, d) for the hero strands only (the most voted links)
export const ARC_VS = /* glsl */ `${ARC_HEAD}
uniform float uDepthRef; // the camera distance at which an arc has its plain weight
out float vD;
out float vW;
out vec3 vC;
out float vHero;
void main() {
  float d, t, depth;
  gl_Position = strip(d, t, depth);
  vD = d;
  float s = max(sin(3.14159265 * t), 1e-3);
  // the far side of the sculpture recedes a little, the near side comes forward: depth without fog
  float near = clamp(uDepthRef / max(depth, 1e-3), 0.7, 1.25);
  vW = aA.w * pow(s, 0.6) * near;
  vC = aB.rgb;
  vHero = aB.a;
}`;

export const ARC_FS = /* glsl */ `#version 300 es
precision highp float;
in float vD;
in float vW;
in vec3 vC;
in float vHero;
uniform float uHalf;
uniform float uNorm;
layout(location = 0) out vec4 oAll;
layout(location = 1) out vec4 oHero;
void main() {
  float cov = clamp(uHalf + 0.5 - abs(vD), 0.0, 1.0);
  float d = vW * cov * uNorm;
  oAll = vec4(vC * d, d);
  oHero = vec4(vC * d * vHero, d * vHero);
}`;

// The lit arcs: one channel each for the selection (r) and the arc in focus (g). aB = (start, span, 0, focus): the arc
// takes the share [start, start + span] of the growth and of the pulse's run (0, 1 for every arc of a verse at once; a
// path's hops one after the other, so the light walks the chain).
export const LIT_VS = /* glsl */ `${ARC_HEAD}
uniform float uGrow;    // 0..1: the arcs grow from the lit verse to their partners as a selection opens
out float vD;
out float vS;
out float vFocus;
void main() {
  float d, t, depth;
  gl_Position = strip(d, t, depth);
  vD = d;
  // aA.x is always where the arc starts (the lit verse, or a path's step) and it runs to aA.y: t is the share of its
  // way, and vS the share of the whole selection's growth this point is at
  vS = aB.x + t * (aB.y > 0.0 ? aB.y : 1.0);
  vFocus = aB.a;
}`;

export const LIT_FS = /* glsl */ `#version 300 es
precision highp float;
in float vD;
in float vS;
in float vFocus;
uniform float uHalf;
uniform float uGrow;
uniform float uPulse;   // where a pulse of light runs along the arcs, from the lit verse (0) to the partner (1); -1 none
out vec4 o;
void main() {
  if (vS > uGrow) discard;
  float cov = clamp(uHalf + 0.5 - abs(vD), 0.0, 1.0);
  float q = (vS - uPulse) / 0.06;
  float boost = uPulse > -0.5 ? 1.0 + 2.2 * exp(-q * q) : 1.0;
  o = vec4(cov * (1.0 - vFocus) * boost, cov * vFocus * boost, 0.0, 0.0);
}`;

// Full-screen triangle, no attributes.
export const FULL_VS = /* glsl */ `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// After film.py's Dome.image, per pixel: the mean colour of the arcs that cross the pixel, at a brightness that grows
// with their density, and the hero strands (the most voted links) on top. In 3D the arcs overlap far more than on the
// flat sky, so both follow a log curve normalised by their own 99.5th percentile: one strand alone still shows, and
// where thousands cross the light stays a colour instead of clipping to white.
const IMAGE = /* glsl */ `
uniform float uP99;
uniform float uH99;
vec3 image(vec4 all, vec4 hero) {
  float d = max(all.a, 0.0);
  vec3 mean = all.rgb / max(d, 1e-6);
  vec3 base = mean * 0.34 * min(log(1.0 + 20.0 * d / uP99) / log(21.0), 1.25);
  float hd = max(hero.a, 0.0);
  return base + (hero.rgb / max(hd, 1e-6)) * 0.6 * min(log(1.0 + hd) / log(1.0 + uH99), 1.25);
}`;

// Full res -> quarter res: the image per source pixel, then a 4 x 4 box average (the first bloom scale's source).
export const DOWN4_FS = /* glsl */ `#version 300 es
precision highp float;
${IMAGE}
uniform sampler2D uAll;
uniform sampler2D uHero;
out vec4 o;
void main() {
  ivec2 size = textureSize(uAll, 0);
  ivec2 t = ivec2(gl_FragCoord.xy) * 4;
  vec3 sum = vec3(0.0);
  for (int j = 0; j < 4; j++) {
    for (int i = 0; i < 4; i++) {
      ivec2 s = min(t + ivec2(i, j), size - 1);
      sum += image(texelFetch(uAll, s, 0), texelFetch(uHero, s, 0));
    }
  }
  o = vec4(sum / 16.0, 1.0);
}`;

// Box downsample by 4 with bilinear taps (any channels).
export const DOWN_FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uSrc;
out vec4 o;
void main() {
  vec2 src = vec2(textureSize(uSrc, 0));
  vec2 c = gl_FragCoord.xy * 4.0;
  o = 0.25 * (texture(uSrc, (c + vec2(-1.0, -1.0)) / src) + texture(uSrc, (c + vec2(1.0, -1.0)) / src) +
              texture(uSrc, (c + vec2(-1.0, 1.0)) / src) + texture(uSrc, (c + vec2(1.0, 1.0)) / src));
}`;

// Separable gaussian (sigma in texels of the source), radius 3 sigma, at most 32 taps per side.
export const BLUR_FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uDir;
uniform float uSigma;
out vec4 o;
void main() {
  vec2 size = vec2(textureSize(uSrc, 0));
  vec2 uv = gl_FragCoord.xy / size;
  vec2 st = uDir / size;
  float s = max(uSigma, 0.3);
  int r = min(int(ceil(3.0 * s)), 32);
  float k = -0.5 / (s * s);
  vec4 sum = texture(uSrc, uv);
  float ws = 1.0;
  for (int i = 1; i <= 32; i++) {
    if (i > r) break;
    float w = exp(float(i * i) * k);
    sum += w * (texture(uSrc, uv + st * float(i)) + texture(uSrc, uv - st * float(i)));
    ws += 2.0 * w;
  }
  o = sum / ws;
}`;

// The frame. Noite: light on the night ground, screen-blended with the lit layer. Dia: the same densities as ink on
// parchment (each colour absorbs what it is not), the lit arcs in the theme's deep bronze.
export const FINAL_FS = /* glsl */ `#version 300 es
precision highp float;
${IMAGE}
uniform sampler2D uAll;
uniform sampler2D uHero;
uniform sampler2D uQ;     // quarter res bloom
uniform sampler2D uS;     // 1/16 res bloom
uniform sampler2D uLit;   // full res lit arcs (r selection, g focus)
uniform sampler2D uLitQ;  // quarter res glow of the lit arcs
uniform vec2 uRes;
uniform vec3 uGround;
uniform float uRecede;    // how bright the sculpture stays while something is lit
uniform int uDia;
uniform vec3 uLitColor;
uniform vec3 uFocusColor;
uniform vec4 uStar;       // x, y (device px, origin bottom left), radius (px), intensity
out vec4 o;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec4 all = texture(uAll, uv);
  vec4 hero = texture(uHero, uv);
  vec3 img = image(all, hero);
  img += 0.28 * texture(uQ, uv).rgb + 0.18 * texture(uS, uv).rgb;
  img = img / (1.0 + 0.25 * img);
  vec3 light = uRecede * img;
  vec4 lit = texture(uLit, uv);
  vec4 litQ = texture(uLitQ, uv);
  float g = lit.r + 0.8 * litQ.r;
  float f = lit.g + 0.9 * litQ.g;
  g = 2.5 * (1.0 - exp(-g / 2.5));
  f = 2.5 * (1.0 - exp(-f / 2.5));
  vec3 gold = uLitColor * 0.85 * g + uFocusColor * 0.95 * f;
  if (uStar.w > 0.0) {
    vec2 d = gl_FragCoord.xy - uStar.xy;
    float r2 = dot(d, d);
    float rad = uStar.z;
    float s = exp(-r2 / (2.0 * rad * rad)) + 0.35 * exp(-r2 / (18.0 * rad * rad));
    gold += mix(uLitColor, vec3(1.0), 0.55) * uStar.w * s;
  }
  vec3 c;
  if (uDia == 1) {
    // light becomes optical depth: dense places go dark in the arcs' own ink, as on an engraving
    vec3 absorb = -log(clamp(vec3(1.0) - 0.82 * clamp(light, 0.0, 1.0), 0.02, 1.0));
    vec3 inkLit = -log(clamp(vec3(1.0) - 0.9 * clamp(gold, 0.0, 1.0), 0.02, 1.0));
    c = uGround * exp(-absorb * 1.15) * exp(-inkLit);
  } else {
    vec3 base = min(uGround + light, 1.0);
    c = 1.0 - (1.0 - base) * (1.0 - clamp(gold, 0.0, 1.0));
  }
  // static dither against banding in the glows
  c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

// The axis and the marks on it (book boundaries, the verse under the pointer): plain lines in one colour each.
export const LINE_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec4 aP; // x, y, z, alpha
uniform mat4 uMVP;
out float vA;
void main() {
  gl_Position = uMVP * vec4(aP.xyz, 1.0);
  vA = aP.w;
}`;

export const LINE_FS = /* glsl */ `#version 300 es
precision highp float;
in float vA;
uniform vec4 uC;
out vec4 o;
void main() { o = vec4(uC.rgb, uC.a * vA); }`;
