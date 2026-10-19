// GLSL ES 3.00 sources for the sky. The look is a port of video 1 (estudos/biblia-referencias/film.py):
//   dome: Dome._raster + Dome.image (density, mean stained-glass tone, crisper "hero" strands, two-scale bloom)
//   ticks: draw_bars (one cream tick per chapter, faint glow, baseline hairline)
//   gold: draw_arcs (thin gold arcs, glow at two scales) and star_point (soft point with 4 + 4 rays)
// Pixel space everywhere: device pixels, origin at the top left, y down.

const PALETTE = /* glsl */ `
const vec3 C0 = vec3(0.16, 0.50, 1.00);
const vec3 C1 = vec3(0.14, 0.26, 1.00);
const vec3 C2 = vec3(0.55, 0.20, 1.00);
const vec3 C3 = vec3(1.00, 0.16, 0.40);
const vec3 C4 = vec3(1.00, 0.50, 0.12);
const vec3 C5 = vec3(1.00, 0.82, 0.36);
// film.py PAL_T = [0, .22, .42, .62, .80, 1]
vec3 pal(float t) {
  t = clamp(t, 0.0, 1.0);
  if (t < 0.22) return mix(C0, C1, t / 0.22);
  if (t < 0.42) return mix(C1, C2, (t - 0.22) / 0.20);
  if (t < 0.62) return mix(C2, C3, (t - 0.42) / 0.20);
  if (t < 0.80) return mix(C3, C4, (t - 0.62) / 0.18);
  return mix(C4, C5, (t - 0.80) / 0.20);
}`;

// One arc instance = a triangle strip of 2 * (uSeg + 1) vertices along a semicircle over the baseline.
// aArc: dome = (xa, xb, weight (negative = hero strand), tone); gold = (xSel, xPartner, weight, 0)
const ARC_HEAD = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec4 aArc;
uniform vec2 uRes;
uniform float uBase;
uniform float uSeg;
uniform float uHalf;
vec2 arcPoint(float xa, float xb, out float th, out float side, out float d) {
  float i = float(gl_VertexID >> 1);
  side = float(gl_VertexID & 1) * 2.0 - 1.0;
  th = 3.14159265 * i / uSeg;
  float c = 0.5 * (xa + xb) * uRes.x;
  float r = 0.5 * (xb - xa) * uRes.x;
  vec2 n = vec2(-cos(th), -sin(th));
  float ext = uHalf + 1.0;
  d = side * ext;
  return vec2(c, uBase) + n * (r + d);
}
vec4 clip(vec2 p) { return vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0); }
`;

export const DOME_VS = /* glsl */ `${ARC_HEAD}
out float vD;
out float vW1;
out float vW2;
out float vT;
void main() {
  float th, side, d;
  vec2 p = arcPoint(aArc.x, aArc.y, th, side, d);
  float s = max(sin(th), 1e-4);
  float w = abs(aArc.z);
  vW1 = w * pow(s, 0.8);
  vW2 = aArc.z < 0.0 ? w * pow(s, 0.5) : 0.0;
  vT = aArc.w;
  vD = d;
  gl_Position = clip(p);
}`;

// Float target: film.py's density channels (d, d * tone, hero d, hero d * tone), summed by additive blending.
export const DOME_FS = /* glsl */ `#version 300 es
precision highp float;
in float vD;
in float vW1;
in float vW2;
in float vT;
uniform float uHalf;
uniform float uNorm;
out vec4 o;
void main() {
  float cov = clamp(uHalf + 0.5 - abs(vD), 0.0, 1.0);
  float d1 = vW1 * cov * uNorm;
  float d2 = vW2 * cov * uNorm;
  o = vec4(d1, d1 * vT, d2, d2 * vT);
}`;

// Gold arcs of the selection. uGrow: the opening, film.py's p = eo3(u * 1.4 - |dx| * 0.5) per arc, drawn from the
// partner toward the selection. uPulse: one light pulse travelling from the selection to the partner.
export const GOLD_VS = /* glsl */ `${ARC_HEAD}
out float vD;
out float vFromPartner;
out float vGrow;
out float vW;
uniform float uGrowU;
float eo3(float x) { x = clamp(x, 0.0, 1.0); return 1.0 - pow(1.0 - x, 3.0); }
void main() {
  float xa = min(aArc.x, aArc.y);
  float xb = max(aArc.x, aArc.y);
  float th, side, d;
  vec2 p = arcPoint(xa, xb, th, side, d);
  float f = th / 3.14159265;
  vFromPartner = aArc.y <= aArc.x ? f : 1.0 - f;
  vGrow = eo3(uGrowU * 1.4 - abs(aArc.y - aArc.x) * 0.5);
  vW = aArc.z;
  vD = d;
  gl_Position = clip(p);
}`;

export const GOLD_FS = /* glsl */ `#version 300 es
precision highp float;
in float vD;
in float vFromPartner;
in float vGrow;
in float vW;
uniform float uHalf;
uniform float uPulse;
out vec4 o;
void main() {
  if (vFromPartner > vGrow) discard;
  float cov = clamp(uHalf + 0.5 - abs(vD), 0.0, 1.0);
  float fs = 1.0 - vFromPartner;
  float q = (fs - uPulse) / 0.07;
  float boost = uPulse > -1.0 ? 1.0 + 2.6 * exp(-q * q) : 1.0;
  o = vec4(vW * cov * boost, 0.0, 0.0, 0.0);
}`;

// Full-screen triangle, no attributes.
export const FULL_VS = /* glsl */ `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const COMMON = /* glsl */ `
uniform vec2 uRes;      // size of the canvas in device pixels
uniform float uBase;    // baseline, device px from the top
// top-left corner of this fragment's pixel, in canvas device px (y down), when drawing into a target of that size
vec2 pixelTL(vec2 target) {
  vec2 f = gl_FragCoord.xy - 0.5;
  vec2 scale = uRes / target;
  return vec2(f.x, target.y - 1.0 - f.y) * scale;
}`;

const DOME_IMG = /* glsl */ `
${PALETTE}
uniform float uP99;
// film.py Dome.image before the bloom: density normalised by its 99.5th percentile, mean tone, hero strands
vec3 domeImg(vec4 a) {
  float d = max(a.r, 0.0);
  vec3 base = pal(a.g / max(d, 1e-6)) * 0.30 * pow(clamp(d / uP99, 0.0, 1.3), 0.9);
  float hd = max(a.b, 0.0);
  return base + pal(a.a / max(hd, 1e-6)) * (1.0 - exp(-hd * 0.3));
}`;

const BARS = /* glsl */ `
uniform highp sampler2D uTicks; // NCH x 1, tick height in units of the band width
uniform int uNch;
uniform float uGap;            // tick top below the baseline, device px
uniform float uTickMax;        // tallest tick, device px
// coverage of the chapter ticks in the pixel whose top-left corner is p (device px)
float bars(vec2 p) {
  float y0 = uBase + uGap;
  if (p.y + 1.0 < y0 || p.y > y0 + uTickMax) return 0.0;
  float W = uRes.x;
  float sp = W / float(uNch);
  // a tick is 0.55 of the chapter spacing (film.py draw_bars), thinner than a pixel on small screens: its coverage
  // then shades the pixel instead of filling it, so the comb never melts into one bar
  float hw = 0.5 * max(sp * 0.55, 0.3);
  int c0 = int(floor((p.x - hw) / sp - 0.5));
  int c1 = int(ceil((p.x + 1.0 + hw) / sp - 0.5));
  float cov = 0.0;
  for (int k = 0; k < 24; k++) {
    int c = c0 + k;
    if (c > c1) break;
    if (c < 0 || c >= uNch) continue;
    float cx = (float(c) + 0.5) * sp;
    float ho = max(0.0, min(p.x + 1.0, cx + hw) - max(p.x, cx - hw));
    float h = texelFetch(uTicks, ivec2(c, 0), 0).r * W;
    float vo = max(0.0, min(p.y + 1.0, y0 + h) - max(p.y, y0));
    cov += ho * vo;
  }
  return min(cov, 1.0);
}`;

// Accumulation (full res) -> quarter res: film.py's image computed per source pixel, then a 4x4 box average.
// Alpha carries the tick coverage, so the ticks get their faint glow from the same blur.
export const DOWN4_FS = /* glsl */ `#version 300 es
precision highp float;
${COMMON}
${DOME_IMG}
${BARS}
uniform sampler2D uAcc;
out vec4 o;
void main() {
  ivec2 size = textureSize(uAcc, 0);
  ivec2 t = ivec2(gl_FragCoord.xy) * 4;
  vec4 sum = vec4(0.0);
  for (int j = 0; j < 4; j++) {
    for (int i = 0; i < 4; i++) {
      ivec2 s = min(t + ivec2(i, j), size - 1);
      vec2 p = vec2(float(s.x), float(size.y - 1 - s.y));
      sum += vec4(domeImg(texelFetch(uAcc, s, 0)), bars(p));
    }
  }
  o = sum / 16.0;
}`;

// Box downsample by 2 or 4 with bilinear taps.
export const DOWN_FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform float uFactor;
out vec4 o;
void main() {
  vec2 src = vec2(textureSize(uSrc, 0));
  vec2 c = gl_FragCoord.xy * uFactor;
  if (uFactor < 3.0) { o = texture(uSrc, c / src); return; }
  o = 0.25 * (texture(uSrc, (c + vec2(-1.0, -1.0)) / src) + texture(uSrc, (c + vec2(1.0, -1.0)) / src) +
              texture(uSrc, (c + vec2(-1.0, 1.0)) / src) + texture(uSrc, (c + vec2(1.0, 1.0)) / src));
}`;

// Separable gaussian (sigma in texels of the source), radius 3 sigma, at most 40 taps per side.
export const BLUR_FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uDir;
uniform float uSigma;
out vec4 o;
void main() {
  vec2 size = vec2(textureSize(uSrc, 0));
  vec2 uv = gl_FragCoord.xy / size;
  vec2 step = uDir / size;
  float s = max(uSigma, 0.3);
  int r = min(int(ceil(3.0 * s)), 40);
  float k = -0.5 / (s * s);
  vec4 sum = texture(uSrc, uv);
  float wsum = 1.0;
  for (int i = 1; i <= 40; i++) {
    if (i > r) break;
    float w = exp(float(i * i) * k);
    sum += w * (texture(uSrc, uv + step * float(i)) + texture(uSrc, uv - step * float(i)));
    wsum += 2.0 * w;
  }
  o = sum / wsum;
}`;

// The sky layer, baked once per size and arc set: night ground + receded dome with its bloom + chapter ticks.
export const SKY_FS = /* glsl */ `#version 300 es
precision highp float;
${COMMON}
${DOME_IMG}
${BARS}
uniform sampler2D uAcc;
uniform sampler2D uQ;   // quarter res: bloom 1 (rgb) + tick glow (a)
uniform sampler2D uS;   // 1/16 res: bloom 2
uniform vec3 uGround;
uniform float uRecede;
uniform float uBarOp;
uniform vec2 uHair;     // hairline top (px), thickness (px)
out vec4 o;
void main() {
  vec2 p = pixelTL(uRes);
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 img = domeImg(texelFetch(uAcc, ivec2(gl_FragCoord.xy), 0));
  vec4 q = texture(uQ, uv);
  img += 0.35 * q.rgb + 0.25 * texture(uS, uv).rgb;
  img = img / (1.0 + 0.25 * img);
  const vec3 CREAM = vec3(0.95, 0.88, 0.74);
  float hair = max(0.0, min(p.y + 1.0, uHair.x + uHair.y) - max(p.y, uHair.x));
  vec3 light = uRecede * img + CREAM * uBarOp * (0.55 * bars(p) + 0.25 * q.a + 0.18 * hair);
  light = pow(clamp(light, 0.0, 1.0), vec3(1.0 / 1.06));
  o = vec4(min(uGround + light, 1.0), 1.0);
}`;

// Final frame: screen(sky, gold). Without its own sky yet (uSky == 0) the canvas outputs the gold layer on black and
// the page blends it over the poster with mix-blend-mode: screen, which is the same formula.
export const FINAL_FS = /* glsl */ `#version 300 es
precision highp float;
${COMMON}
uniform sampler2D uSkyTex;
uniform sampler2D uHi;
uniform sampler2D uG1;
uniform sampler2D uG2;
uniform int uSky;
uniform float uGoldGain;
uniform vec4 uStar;     // x, y (px), radius (px), intensity
uniform vec3 uRays;     // amount (0 = none), length (px), thickness scale
uniform vec4 uTick;     // x0, x1, top, bottom (px) of the selected chapter's tick; x1 < x0 = none
out vec4 o;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 p = pixelTL(uRes) + 0.5;
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 sky = uSky == 1 ? texture(uSkyTex, uv).rgb : vec3(0.0);
  const vec3 GOLD = vec3(1.0, 0.80, 0.42);
  float hi = (texture(uHi, uv).r + 0.7 * texture(uG1, uv).r + 0.9 * texture(uG2, uv).r) * uGoldGain;
  // soft shoulder, so where many lit arcs meet the light stays gold instead of clipping to white
  hi = 2.5 * (1.0 - exp(-hi / 2.5));
  vec3 gold = GOLD * 0.75 * hi;
  // star_point (film.py)
  if (uStar.w > 0.0) {
    vec2 d = p - uStar.xy;
    float r2 = dot(d, d);
    float rad = uStar.z;
    float g = exp(-r2 / (2.0 * rad * rad)) + 0.35 * exp(-r2 / (18.0 * rad * rad));
    if (uRays.x > 0.0) {
      float L = uRays.y;
      float q2 = uRays.z * uRays.z;
      // rays fade out before the canvas edges instead of being cut by them
      float edge = smoothstep(0.0, 0.1 * uRes.y, min(p.y, uRes.y - p.y)) * smoothstep(0.0, 0.05 * uRes.x, min(p.x, uRes.x - p.x));
      float down = (d.y > 0.0 ? 0.3 : 1.0) * edge;
      g += (0.9 * exp(-(d.y * d.y) / (3.5 * q2)) * exp(-abs(d.x) / L) +
            0.9 * exp(-(d.x * d.x) / (3.5 * q2)) * exp(-abs(d.y) / L)) * down * uRays.x;
      vec2 e = vec2(d.x + d.y, d.y - d.x) * 0.70710678;
      g += (0.45 * exp(-(e.y * e.y) / (2.0 * q2)) * exp(-abs(e.x) / (0.45 * L)) +
            0.45 * exp(-(e.x * e.x) / (2.0 * q2)) * exp(-abs(e.y) / (0.45 * L))) * down * uRays.x;
    }
    gold += vec3(1.0, 0.93, 0.78) * uStar.w * g;
  }
  // the selected chapter's tick, in gold
  if (uTick.y > uTick.x) {
    vec2 tl = p - 0.5;
    float ho = max(0.0, min(tl.x + 1.0, uTick.y) - max(tl.x, uTick.x));
    float vo = max(0.0, min(tl.y + 1.0, uTick.w) - max(tl.y, uTick.z));
    gold += GOLD * min(ho * vo, 1.0) * 0.9;
  }
  vec3 c = 1.0 - (1.0 - sky) * (1.0 - clamp(gold, 0.0, 1.0));
  // static dither against banding in the glows (never on pure black, so the overlay adds nothing there)
  c += (hash(gl_FragCoord.xy) - 0.5) / 255.0 * step(1e-3, max(c.r, max(c.g, c.b)));
  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;
