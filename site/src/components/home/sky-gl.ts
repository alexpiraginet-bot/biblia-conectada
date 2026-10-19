// Live night sky for the home cover, on WebGL2 (Alex: "com muito Motion vivo"). All motion runs on the GPU; each
// frame the main thread only sets a few uniforms and issues three draws, so phones are not blocked
// (the first Canvas 2D version that redrew everything per frame cost 6.7 s of blocking time in Lighthouse mobile).
//
// Passes, back to front:
//   1. sky: gradient, twinkling stars, the breathing glow of the verse of light, horizon haze, a rare shooting star;
//   2. arcs, additive: the verse's gold arcs with pulses of light travelling from the star (video 1's last scene),
//      over a faint "sky of links" (the most voted pairs, stained-glass palette of film.py) loaded after first paint;
//   3. front: the star, drifting hills with pointer and scroll parallax, moving mist, film grain.
// The caller falls back to the still Canvas 2D scene (sky-canvas.ts) when WebGL2 is missing, runs in software (a
// known software renderer such as SwiftShader, which Lighthouse uses and where each frame blocked the page for 0.2–1 s),
// the context is lost, or frames keep coming slower than ~8 per second.

export type GlSkyData = {
  /** baseline position of the verse of light, 0–1 */
  x0: number;
  /** pairs of [baseline position 0–1, strength 0–1] of the verses linked to it */
  arcs: number[];
};

export type GlSky = {
  /** progress of the cover's opening window, 0–1 */
  setOpen(k: number): void;
  /** faint background arcs: [xa, xb, strength] triples, 0–1 */
  setBackground(triples: Float32Array): void;
  destroy(): void;
};

const HORIZON = 0.5;
const ARC_TOP = 0.07;
const SEG_GOLD = 64;
const SEG_FAINT = 24;
const INTRO_DELAY = 0.5;
const INTRO = 2.6;

// film.py palette: stops over t = span^0.55
const PAL_T = [0, 0.22, 0.42, 0.62, 0.8, 1];
const PAL_C = [0.16, 0.5, 1, 0.14, 0.26, 1, 0.55, 0.2, 1, 1, 0.16, 0.4, 1, 0.5, 0.12, 1, 0.82, 0.36];

// hills from back to front: base height and amplitude (share of height), drift speed, top and bottom colours
const LAYERS = [
  [0.575, 0.07, 5, 0x232c4c, 0x19203d],
  [0.64, 0.095, 9, 0x1c2343, 0x141a33],
  [0.715, 0.11, 14, 0x151b31, 0x0f1428],
  [0.805, 0.13, 21, 0x10152a, 0x0a0e1f],
  [0.91, 0.15, 30, 0x0a0d1b, 0x05070f],
] as const;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rgb = (hex: number) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

const FULLSCREEN_VS = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const COMMON = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uDpr, uOpen;
uniform vec2 uStar;
uniform vec2 uPar;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float breathe() { return 0.9 + 0.1 * sin(uTime * 0.55); }
`;

// helpers that read gl_FragCoord, so fragment shaders only
const FRAG = `
vec2 topUv() { return vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y); }
vec2 starPx() { return vec2(uStar.x * uRes.x, (1.0 - uStar.y) * uRes.y); }
`;

const SKY_FS = `#version 300 es
${COMMON}
${FRAG}
out vec4 o;
void main() {
  vec2 uv = topUv();
  float t = clamp(uv.y / 0.72, 0.0, 1.0);
  vec3 c = mix(vec3(0.012, 0.02, 0.043), vec3(0.031, 0.063, 0.122), smoothstep(0.0, 0.5, t));
  c = mix(c, vec3(0.067, 0.094, 0.196), smoothstep(0.5, 0.85, t));
  c = mix(c, vec3(0.098, 0.114, 0.224), smoothstep(0.85, 1.0, t));

  // stars on a jittered grid, each with its own twinkle; they drift a little with the pointer
  float cell = 21.0 * uDpr;
  vec2 sp = gl_FragCoord.xy + uPar * vec2(9.0, 4.0) * uDpr;
  vec2 id = floor(sp / cell);
  vec2 f = fract(sp / cell);
  float h = hash(id);
  if (h > 0.84) {
    vec2 pos = vec2(hash(id + 3.1), hash(id + 7.7)) * 0.6 + 0.2;
    float d = length(f - pos) * cell;
    float tw = 0.5 + 0.5 * sin(uTime * (0.5 + 2.2 * hash(id + 1.3)) + h * 40.0);
    float b = 0.25 + 0.75 * hash(id + 9.1);
    float size = (0.6 + 1.1 * hash(id + 5.5)) * uDpr;
    c += vec3(0.93, 0.9, 0.84) * b * tw * (1.0 - smoothstep(0.0, size, d)) * (1.0 - smoothstep(0.38, 0.5, uv.y));
  }

  // the glow of the verse of light, breathing
  vec2 s = starPx();
  float r = length(gl_FragCoord.xy - s) / max(uRes.x, uRes.y);
  c += vec3(1.0, 0.77, 0.47) * 0.13 * breathe() * exp(-r * r / 0.025);
  c += vec3(1.0, 0.67, 0.39) * 0.05 * exp(-pow((uv.y - 0.523) / 0.06, 2.0));

  // a shooting star about every eleven seconds, somewhere in the upper sky
  float period = 11.0;
  float k = floor(uTime / period);
  float ph = fract(uTime / period) * period;
  if (ph < 1.1) {
    vec2 a = vec2(0.1 + 0.8 * hash(vec2(k, 1.7)), 0.06 + 0.22 * hash(vec2(k, 4.1))) * uRes * vec2(1.0, 1.0);
    a.y = uRes.y - a.y;
    vec2 dir = normalize(vec2(hash(vec2(k, 2.9)) > 0.5 ? 1.0 : -1.0, -0.42));
    float len = 0.16 * uRes.x;
    float head = ph / 1.1;
    vec2 p0 = a + dir * len * head;
    vec2 q = gl_FragCoord.xy - p0;
    float along = dot(q, -dir);
    float across = abs(dot(q, vec2(-dir.y, dir.x)));
    float trail = 0.0;
    if (along > 0.0 && along < len * 0.5) trail = (1.0 - along / (len * 0.5)) * (1.0 - smoothstep(0.0, 1.4 * uDpr, across));
    c += vec3(1.0, 0.95, 0.85) * trail * sin(head * 3.14159) * 0.9;
  }
  o = vec4(c, 1.0);
}`;

const ARC_VS = `#version 300 es
${COMMON}
layout(location = 0) in vec2 aVert;   // u along the arc (0 at the first end), side (-1, 1)
layout(location = 1) in vec4 aArc;    // first end x, second end x (0–1), strength 0–1, phase 0–1
uniform float uFlatten, uKind;
out float vU, vSide, vS, vPhase, vLen, vSpan, vW, vY;
void main() {
  float hy = uStar.y * uRes.y;
  float xa = aArc.x * uRes.x, xb = aArc.y * uRes.x;
  float cx = 0.5 * (xa + xb), rx = max(0.5 * abs(xb - xa), 0.5), ry = rx * uFlatten;
  float u = aVert.x;
  float th = xb > xa ? 3.14159265 * (1.0 - u) : 3.14159265 * u;
  float dth = xb > xa ? -3.14159265 : 3.14159265;
  vec2 P = vec2(cx + rx * cos(th), hy - ry * sin(th));
  vec2 T = vec2(-rx * sin(th), -ry * cos(th)) * dth;
  vec2 N = normalize(vec2(-T.y, T.x) + vec2(1e-5));
  float core = (uKind < 0.5 ? 0.6 + 1.1 * aArc.z : 0.5 + 0.6 * aArc.z) * uDpr;
  float w = core + 1.5 * uDpr;
  vec2 pos = P + N * aVert.y * 0.5 * w;
  gl_Position = vec4(pos.x / uRes.x * 2.0 - 1.0, 1.0 - pos.y / uRes.y * 2.0, 0.0, 1.0);
  vU = u; vSide = aVert.y; vS = aArc.z; vPhase = aArc.w;
  vLen = 3.14159265 * sqrt(0.5 * (rx * rx + ry * ry));
  vSpan = abs(xb - xa) / uRes.x; vW = core / w; vY = P.y;
}`;

const ARC_FS = `#version 300 es
${COMMON}
${FRAG}
uniform float uKind, uReveal, uFade;
uniform float uPalT[6];
uniform vec3 uPal[6];
in float vU, vSide, vS, vPhase, vLen, vSpan, vW, vY;
out vec4 o;
vec3 palette(float t) {
  for (int i = 0; i < 5; i++) {
    if (t <= uPalT[i + 1]) return mix(uPal[i], uPal[i + 1], (t - uPalT[i]) / (uPalT[i + 1] - uPalT[i]));
  }
  return uPal[5];
}
void main() {
  if (vU > uReveal) discard;
  float edge = 1.0 - smoothstep(vW, 1.0, abs(vSide));
  float feet = smoothstep(0.0, 0.07 * uRes.y, uStar.y * uRes.y - vY);
  vec3 col;
  float a;
  if (uKind < 0.5) {
    col = vec3(1.0, 0.8, 0.42);
    a = 0.07 + 0.33 * vS;
    // pulses of light leave the star and run the length of each arc at the same speed in pixels
    float head = fract(uTime * (150.0 * uDpr) / vLen * 0.5 + vPhase);
    float d = (vU - head) * vLen;
    float tail = d < 0.0 ? 38.0 : 10.0;
    float pulse = exp(-d * d / (2.0 * pow(tail * uDpr, 2.0)));
    a += pulse * (0.3 + 0.7 * vS);
    a *= 0.85 + 0.35 * uOpen;
  } else {
    col = palette(pow(clamp(vSpan, 0.0, 1.0), 0.55));
    // a veil, not a second subject: thousands of these add up, so each one is very faint
    a = (0.006 + 0.03 * vS) * (0.65 + 0.35 * sin(uTime * 0.8 + vPhase * 6.2831)) * uFade;
  }
  a *= edge * feet;
  o = vec4(col * a, a);
}`;

const FRONT_FS = `#version 300 es
${COMMON}
${FRAG}
uniform vec4 uLayer[5];   // base, amp, drift, 0
uniform vec3 uTop[5];
uniform vec3 uBot[5];
uniform vec4 uComp[15];   // per layer three components: freq, amp, phase, speed multiplier
out vec4 o;
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
void main() {
  vec2 uv = topUv();
  vec3 col = vec3(0.0);
  float al = 0.0;

  // the star sits in front of its arcs, behind the hills
  vec2 s = starPx();
  float minDim = min(uRes.x, uRes.y);
  float d = length(gl_FragCoord.xy - s);
  float glow = exp(-pow(d / (0.075 * minDim), 2.0)) * 0.55 * breathe();
  float dot_ = 1.0 - smoothstep(max(3.0 * uDpr, 0.012 * minDim) - 1.0, max(3.0 * uDpr, 0.012 * minDim) + 1.0, d);
  vec3 sc = vec3(1.0, 0.87, 0.63) * glow + vec3(1.0, 0.93, 0.77) * dot_;
  float sa = clamp(max(glow, dot_), 0.0, 1.0);
  col = sc; al = sa;

  for (int i = 0; i < 5; i++) {
    float depth = float(i + 1) / 5.0;
    float xn = uv.x + uPar.x * 0.012 * depth;
    float n = 0.0;
    for (int j = 0; j < 3; j++) {
      vec4 c = uComp[i * 3 + j];
      n += c.y * sin(xn * c.x * 6.2831853 + c.z + uTime * uLayer[i].z * 0.004 * c.w);
    }
    float ridge = uLayer[i].x + n * uLayer[i].y + uOpen * 0.025 * depth + uPar.y * 0.006 * depth;
    float inside = smoothstep(ridge - 0.6 / uRes.y, ridge + 0.6 / uRes.y, uv.y);
    if (inside > 0.0) {
      float g = clamp((uv.y - (uLayer[i].x - uLayer[i].y)) / (1.0 - (uLayer[i].x - uLayer[i].y)), 0.0, 1.0);
      vec3 lc = mix(uTop[i], uBot[i], g);
      // warm rim on the two farthest ridges, catching the light
      if (i < 2) lc += vec3(1.0, 0.75, 0.47) * (0.06 - float(i) * 0.02) * (1.0 - smoothstep(0.0, 2.5 / uRes.y, uv.y - ridge));
      // mist drifting through the middle hills
      if (i > 0 && i < 4) {
        float m = fbm(vec2(uv.x * 3.0 + uTime * 0.012 * float(i), uv.y * 14.0));
        lc += vec3(0.85, 0.81, 0.75) * 0.06 * smoothstep(0.45, 0.85, m) * (1.0 - g);
      }
      col = mix(col, lc, inside);
      al = mix(al, 1.0, inside);
    }
  }
  // film grain, a little alive
  float gr = hash(gl_FragCoord.xy + floor(uTime * 24.0) * 17.0) - 0.5;
  col += gr * 0.035 * al;
  o = vec4(col * 1.0, al);
}`;

/** the shader sources, exported for the compile check in scripts (no runtime use) */
export const SHADERS = { FULLSCREEN_VS, SKY_FS, ARC_VS, ARC_FS, FRONT_FS };

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const p = gl.createProgram()!;
  const v = make(gl.VERTEX_SHADER, vs);
  const f = make(gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getShaderInfoLog(v) || gl.getShaderInfoLog(f) || gl.getProgramInfoLog(p);
    throw new Error(`sky shader: ${log}`);
  }
  gl.deleteShader(v);
  gl.deleteShader(f);
  return p;
}

/**
 * Starts the live sky, or returns null when WebGL2 is not available or would be software-rendered. `onFail` runs if
 * the context is lost later or frames turn out to block the main thread.
 */
export function startGlSky(canvas: HTMLCanvasElement, data: GlSkyData, onFail: () => void): GlSky | null {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    premultipliedAlpha: true,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: true,
  });
  if (!gl) return null;
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  // localStorage "ceu-vivo" = "1" keeps the live sky on a software renderer (to check it without a GPU)
  let force = false;
  try {
    force = localStorage.getItem("ceu-vivo") === "1";
  } catch {
    /* storage blocked: no override */
  }
  if (!force && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let sky: WebGLProgram, arcP: WebGLProgram, front: WebGLProgram;
  try {
    sky = compile(gl, FULLSCREEN_VS, SKY_FS);
    arcP = compile(gl, ARC_VS, ARC_FS);
    front = compile(gl, FULLSCREEN_VS, FRONT_FS);
  } catch {
    return null;
  }

  const rand = mulberry32(0xb1b11a);
  const comps: number[] = [];
  for (let i = 0; i < 5; i++) {
    comps.push(0.7 + rand() * 0.5, 0.55, rand() * Math.PI * 2, 1);
    comps.push(1.6 + rand() * 0.9, 0.3, rand() * Math.PI * 2, 1.8);
    comps.push(3.2 + rand() * 1.8, 0.15, rand() * Math.PI * 2, 2.9);
  }

  // uniform locations, looked up once per program and name
  const locs = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  const loc = (p: WebGLProgram, n: string) => {
    let m = locs.get(p);
    if (!m) locs.set(p, (m = new Map()));
    if (!m.has(n)) m.set(n, gl.getUniformLocation(p, n));
    return m.get(n)!;
  };
  const emptyVao = gl.createVertexArray();

  // one strip per arc: (u, side) pairs, instanced with the arc's own data
  const strip = (seg: number) => {
    const v = new Float32Array((seg + 1) * 4);
    for (let i = 0; i <= seg; i++) v.set([i / seg, -1, i / seg, 1], i * 4);
    return v;
  };
  const makeSet = (seg: number) => {
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, strip(seg), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ib);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);
    return { vao, ib, count: 0, verts: (seg + 1) * 2 };
  };
  const gold = makeSet(SEG_GOLD);
  const faint = makeSet(SEG_FAINT);

  const goldData = new Float32Array((data.arcs.length / 2) * 4);
  for (let i = 0, k = 0; i + 1 < data.arcs.length; i += 2, k++) goldData.set([data.x0, data.arcs[i], data.arcs[i + 1], rand()], k * 4);
  gl.bindBuffer(gl.ARRAY_BUFFER, gold.ib);
  gl.bufferData(gl.ARRAY_BUFFER, goldData, gl.STATIC_DRAW);
  gold.count = goldData.length / 4;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let scale = 1; // lowered when frames run slow
  let open = 0;
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  let faintFrom = -1;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, rect.width < 700 ? 1.25 : 1.5) * scale;
    w = Math.max(1, Math.round(rect.width * dpr));
    h = Math.max(1, Math.round(rect.height * dpr));
    canvas.width = w;
    canvas.height = h;
  };

  const common = (p: WebGLProgram, t: number) => {
    gl.uniform2f(loc(p, "uRes"), w, h);
    gl.uniform1f(loc(p, "uTime"), t);
    gl.uniform1f(loc(p, "uDpr"), dpr);
    gl.uniform1f(loc(p, "uOpen"), open);
    gl.uniform2f(loc(p, "uStar"), data.x0, HORIZON);
    gl.uniform2f(loc(p, "uPar"), par.x, par.y);
  };

  const t0 = performance.now();
  const render = (now: number) => {
    const t = reduced ? 30 : 18 + (now - t0) / 1000;
    const secs = (now - t0) / 1000;
    const reveal = reduced ? 1 : Math.min(1, Math.max(0, (secs - INTRO_DELAY) / INTRO));
    const eased = 1 - Math.pow(1 - reveal, 3);
    gl.viewport(0, 0, w, h);

    gl.disable(gl.BLEND);
    gl.useProgram(sky);
    common(sky, t);
    gl.bindVertexArray(emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(arcP);
    common(arcP, t);
    gl.uniform1f(loc(arcP, "uFlatten"), Math.min(1, ((HORIZON - ARC_TOP) * h) / (w / 2)));
    gl.uniform1fv(loc(arcP, "uPalT"), PAL_T);
    gl.uniform3fv(loc(arcP, "uPal"), PAL_C);
    if (faint.count > 0) {
      gl.uniform1f(loc(arcP, "uKind"), 1);
      gl.uniform1f(loc(arcP, "uReveal"), 1);
      gl.uniform1f(loc(arcP, "uFade"), reduced ? 1 : Math.min(1, (now - faintFrom) / 1500));
      gl.bindVertexArray(faint.vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, faint.verts, faint.count);
    }
    gl.uniform1f(loc(arcP, "uKind"), 0);
    gl.uniform1f(loc(arcP, "uReveal"), eased);
    gl.uniform1f(loc(arcP, "uFade"), 1);
    gl.bindVertexArray(gold.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, gold.verts, gold.count);

    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(front);
    common(front, t);
    gl.uniform4fv(loc(front, "uLayer"), LAYERS.flatMap((L) => [L[0], L[1], L[2], 0]));
    gl.uniform3fv(loc(front, "uTop"), LAYERS.flatMap((L) => rgb(L[3])));
    gl.uniform3fv(loc(front, "uBot"), LAYERS.flatMap((L) => rgb(L[4])));
    gl.uniform4fv(loc(front, "uComp"), comps);
    gl.bindVertexArray(emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  };

  // the loop runs while the sky is on screen and the tab is visible; reduced motion draws one still frame
  let raf = 0;
  let visible = true;
  let last = performance.now();
  let slow = 0;
  let strikes = 0;
  let failed = false;
  const frame = (now: number) => {
    raf = 0;
    const dt = now - last;
    last = now;
    // dynamic resolution: when frames keep running slower than ~30 fps, draw fewer pixels (down to half)
    if (dt > 34) slow += dt > 100 ? 4 : 1;
    else slow = Math.max(0, slow - 1);
    if (slow > 40 && scale > 0.55) {
      scale *= 0.8;
      slow = 0;
      resize();
    }
    par.x += (par.tx - par.x) * 0.06;
    par.y += (par.ty - par.y) * 0.06;
    render(now);
    // the work of a frame lands after this callback, so the interval between frames is what tells: five in a row
    // slower than ~8 per second, even after the resolution drops, and the still scene is the better choice
    strikes = !force && dt > 120 && dt < 2000 ? strikes + 1 : 0;
    if (strikes >= 5) {
      failed = true;
      onFail();
      return;
    }
    if (!reduced && visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  const kick = () => {
    if (!raf && !failed && !reduced && visible && !document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  const ro = new ResizeObserver(() => {
    if (failed) return;
    resize();
    if (reduced || !raf) render(performance.now());
  });
  ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    kick();
  });
  io.observe(canvas);
  const onVisibility = () => kick();
  document.addEventListener("visibilitychange", onVisibility);
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    par.tx = (e.clientX / window.innerWidth) * 2 - 1;
    par.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  const onLostCtx = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
    failed = true;
    onFail();
  };
  canvas.addEventListener("webglcontextlost", onLostCtx);

  resize();
  render(performance.now());
  kick();

  return {
    setOpen(k) {
      open = k;
      if (reduced) render(performance.now());
    },
    setBackground(triples) {
      const n = Math.floor(triples.length / 3);
      const buf = new Float32Array(n * 4);
      const r = mulberry32(0x5eed);
      for (let i = 0; i < n; i++) buf.set([triples[i * 3], triples[i * 3 + 1], triples[i * 3 + 2], r()], i * 4);
      gl.bindBuffer(gl.ARRAY_BUFFER, faint.ib);
      gl.bufferData(gl.ARRAY_BUFFER, buf, gl.STATIC_DRAW);
      faint.count = n;
      faintFrom = performance.now();
      if (reduced) render(performance.now());
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("webglcontextlost", onLostCtx);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
