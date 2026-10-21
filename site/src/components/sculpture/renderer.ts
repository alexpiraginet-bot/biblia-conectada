// WebGL2 renderer of the light sculpture (/arcos). No library: instanced arcs widened in screen space, float
// accumulation, the sky of links' film look (density, hero strands, bloom) and a lit layer for the selection.
//
// Nothing runs on its own: the page asks for a frame when the camera, the selection or the size changes. A frame drawn
// while the camera moves uses fewer segments, a lower resolution and, on slower devices, only the most voted arcs; the
// frame after the motion settles draws everything.
import { STRENGTH_MIN } from "../sky/model";
import { FLAT, type Mat4, type Vec3 } from "./space";
import * as SH from "./shaders";

export type Theme = "noite" | "dia";
/** A spectrum along the canonical axis, testament colours, or the sky of links' distance palette. */
export type ColorMode = "livros" | "testamento" | "distancia";

/** Arc geometry: (xa, xb, theta, weight) per arc, x on the axis in [-1, 1]; colour: (r, g, b, hero) per arc; the votes
 *  of each arc (the files are sorted by them, most first). */
export type ArcBuffers = { geo: Float32Array; color: Float32Array; votes: Int16Array; n: number };

/**
 * The lit arcs: (xFrom, xTo, theta, 1) and (start, span, 0, focus) per arc, with the lit verse's place on the axis. An
 * arc grows from xFrom over its share [start, start + span] of the growth (0, 1 for all at once; a path's hops one
 * after the other), and the pulse of light runs along the same shares.
 */
export type Lit = { geo: Float32Array; flags: Float32Array; n: number; at: number | null };

/** The axis drawn over the frame: the line, the book boundaries (LINES) and the bands of the book groups under it
 *  (TRIANGLES), (x, y, z, alpha) per vertex. */
export type AxisLines = { axis: Float32Array; ticks: Float32Array; bands: Float32Array };

export type Quality = "settled" | "moving";

type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation> };
type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };
/** `heads`: arcs of the bucket among the most voted HEAD_LEVELS; `strong`: arcs with STRENGTH_MIN votes or more */
type Bucket = { first: number; count: number; rmax: number; heads: number[]; strong: number[] };

// radius boundaries (units of the axis half length) of the segment buckets; an arc's segments follow its size on screen
const RADII = [0.002, 0.004, 0.008, 0.016, 0.032, 0.064, 0.128, 0.256, 0.512, 1.01];
/** arcs drawn while the camera moves on slower devices: the most voted first (the files are sorted by votes) */
export const HEAD_LEVELS = [30000, 100000] as const;
// 99.5th percentile of the density over the opening view, measured on the full file at 1440 x 900 with the engine's
// measure() (the calibration notes are in design/README.md §15); rendering constants, not figures on the page. One per
// strength step: every arc, then the arcs with STRENGTH_MIN votes or more (fewer arcs pile up less; measured on the
// same view, 20/10: 162, 33 and 6.6 against 339 for every arc).
const P99_HOME = [340, 162, 33, 6.6] as const;
/** the same for the hero strands alone (the links with HERO_VOTES or more: the same strands at the first three steps;
 *  at 100 votes or more, measured 6.6 where the first steps measured 32.5, scaled to their 38) */
const H99_HOME = [38, 38, 38, 7.7] as const;
/** The neutral stage ground (tokens.json `sculpture-ground`), so canvas and poster never show a seam;
 *  tests/sculpture-poster.test.ts checks it */
export const GROUND: Record<Theme, Vec3> = { noite: [16 / 255, 16 / 255, 20 / 255], dia: [245 / 255, 245 / 255, 247 / 255] };
// The lit arcs and the arc in focus. In Dia light becomes ink (shaders.ts FINAL_FS: each channel absorbs as much as
// the light has of it), so Dia's values are the complements of the inks wanted: the dark bronze of tokens.json `lit`
// (#683c00) for the lit arcs, a sepia near black (#2a1400) for the one in focus.
const LIT: Record<Theme, Vec3> = { noite: [1.0, 0.8, 0.42], dia: [1 - 0x68 / 255, 1 - 0x3c / 255, 1.0] };
const FOCUS: Record<Theme, Vec3> = { noite: [1.0, 0.96, 0.88], dia: [1 - 0x2a / 255, 1 - 0x14 / 255, 1.0] };

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string): Prog {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "program");
  const u: Record<string, WebGLUniformLocation> = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i)!;
    u[info.name] = gl.getUniformLocation(p, info.name)!;
  }
  return { p, u };
}

/** Is this WebGL context drawn by the CPU (SwiftShader, llvmpipe, Microsoft Basic Render)? */
export function isSoftware(gl: WebGL2RenderingContext): boolean {
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase();
  return /swiftshader|llvmpipe|softpipe|basic render|software/.test(name);
}

export class SculptureRenderer {
  private gl: WebGL2RenderingContext;
  private progs: Record<"arc" | "lit" | "flow" | "down4" | "down" | "blur" | "final" | "line", Prog>;
  private arcVao: WebGLVertexArrayObject;
  private litVao: WebGLVertexArrayObject;
  private lineVao: WebGLVertexArrayObject;
  private geoBuf: WebGLBuffer;
  private colorBuf: WebGLBuffer;
  private litGeoBuf: WebGLBuffer;
  private litFlagBuf: WebGLBuffer;
  private lineBuf: WebGLBuffer;
  private markBuf: WebGLBuffer;
  private markVao: WebGLVertexArrayObject;
  private t: Record<"all" | "hero" | "q1" | "q2" | "s1" | "s2" | "lit" | "l1" | "l2" | "flow", Target> | null = null;
  private dbo: WebGLFramebuffer | null = null;
  private W = 0;
  private H = 0;
  private dpr = 1;
  private n = 0;
  private buckets: Bucket[] = [];
  /** arcs at each strength step: every arc, then those with STRENGTH_MIN votes or more */
  private strongTotal: number[] = [0, 0, 0, 0];
  private lit: Lit | null = null;
  private lineCount = { axis: 0, ticks: 0, bands: 0, mark: 0 };
  /** vertices of the marks on the axis (two per verse: a word's verses), drawn into the lit layer */
  private marks = 0;
  private lost = false;
  // the sculpture's own layers (density and bloom) are reused while the view stays the same
  private baseKey = "";
  private baseDirty = true;
  private litKey = "";
  private litDirty = true;
  private focusIndex = -1;
  private uploadedMark = NaN;
  theme: Theme = "noite";
  /** brightness of the sculpture while something is lit (1 = none lit) */
  recede = 1;
  /** 0..1, how far the lit arcs have grown from the lit verse */
  grow = 1;
  /** where a pulse of light runs along the lit arcs (0 at the lit verse, 1 at the partners), -1 for none */
  pulse = -1;
  /** Seconds of visible, unpaused motion; -1 disables the pulse overlay altogether. */
  flowTime = -1;
  /** the axis place of the mark under the pointer, or null */
  mark: number | null = null;
  /** arcs the device can draw while moving (all, or one of HEAD_LEVELS) */
  movingCap = Infinity;
  /** 0: every arc; 1..3: only the arcs with STRENGTH_MIN[strength - 1] votes or more */
  strength = 0;
  /** arcs the last frame drew (the interaction tests read it) */
  drawn = 0;

  private constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.progs = {
      arc: program(gl, SH.ARC_VS, SH.ARC_FS),
      lit: program(gl, SH.LIT_VS, SH.LIT_FS),
      flow: program(gl, SH.FLOW_VS, SH.FLOW_FS),
      down4: program(gl, SH.FULL_VS, SH.DOWN4_FS),
      down: program(gl, SH.FULL_VS, SH.DOWN_FS),
      blur: program(gl, SH.FULL_VS, SH.BLUR_FS),
      final: program(gl, SH.FULL_VS, SH.FINAL_FS),
      line: program(gl, SH.LINE_VS, SH.LINE_FS),
    };
    this.geoBuf = gl.createBuffer()!;
    this.colorBuf = gl.createBuffer()!;
    this.litGeoBuf = gl.createBuffer()!;
    this.litFlagBuf = gl.createBuffer()!;
    this.lineBuf = gl.createBuffer()!;
    this.markBuf = gl.createBuffer()!;
    this.arcVao = gl.createVertexArray()!;
    this.litVao = gl.createVertexArray()!;
    this.lineVao = gl.createVertexArray()!;
    this.markVao = gl.createVertexArray()!;
    for (const [vao, buf] of [
      [this.lineVao, this.lineBuf],
      [this.markVao, this.markBuf],
    ] as const) {
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);
  }

  /** null when the device has no WebGL2 or cannot render to float targets (the page then keeps its poster). */
  static create(canvas: HTMLCanvasElement): { r: SculptureRenderer; software: boolean } | null {
    const opts: WebGLContextAttributes = { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "high-performance" };
    const gl = canvas.getContext("webgl2", opts);
    if (!gl) return null;
    if (!gl.getExtension("EXT_color_buffer_float")) return null;
    try {
      return { r: new SculptureRenderer(gl), software: isSoftware(gl) };
    } catch {
      return null;
    }
  }

  get contextLost() {
    return this.lost || this.gl.isContextLost();
  }

  markLost() {
    this.lost = true;
  }

  // ------------------------------------------------------------------ data

  /** Upload the arcs (already in the order of the file: most votes first) and sort them into segment buckets. */
  setArcs(arcs: ArcBuffers) {
    const gl = this.gl;
    const n = arcs.n;
    // stable bucket sort by radius, so inside each bucket the most voted arcs still come first
    const which = new Uint8Array(n);
    const counts = new Uint32Array(RADII.length);
    for (let k = 0; k < n; k++) {
      const r = Math.abs(arcs.geo[k * 4 + 1] - arcs.geo[k * 4]) / 2;
      let j = 0;
      while (j < RADII.length - 1 && r > RADII[j]) j++;
      which[k] = j;
      counts[j]++;
    }
    const first = new Uint32Array(RADII.length);
    for (let j = 1; j < RADII.length; j++) first[j] = first[j - 1] + counts[j - 1];
    const fill = first.slice();
    const geo = new Float32Array(n * 4);
    const color = new Float32Array(n * 4);
    const heads = RADII.map(() => HEAD_LEVELS.map(() => 0));
    // the file is sorted by votes, most first, and the bucket sort is stable: inside each bucket the arcs with enough
    // votes for a strength step are its first ones, as are the most voted for a moving frame
    const strong = RADII.map(() => STRENGTH_MIN.map(() => 0));
    for (let k = 0; k < n; k++) {
      const j = which[k];
      const d = fill[j]++ * 4;
      geo.set(arcs.geo.subarray(k * 4, k * 4 + 4), d);
      color.set(arcs.color.subarray(k * 4, k * 4 + 4), d);
      HEAD_LEVELS.forEach((lvl, i) => {
        if (k < lvl) heads[j][i]++;
      });
      STRENGTH_MIN.forEach((min, i) => {
        if (arcs.votes[k] >= min) strong[j][i]++;
      });
    }
    this.buckets = RADII.map((rmax, j) => ({ first: first[j], count: counts[j], rmax, heads: heads[j], strong: strong[j] })).filter((b) => b.count > 0);
    this.strongTotal = [n, ...STRENGTH_MIN.map((_, i) => this.buckets.reduce((sum, b) => sum + b.strong[i], 0))];
    this.n = n;
    this.baseDirty = true;
    gl.bindVertexArray(this.arcVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.geoBuf);
    gl.bufferData(gl.ARRAY_BUFFER, geo, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribDivisor(0, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, color, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);
    this.sortedColorOrder = which;
  }

  // the bucket of every arc in file order, kept so a new colour set lands in the same order as the geometry
  private sortedColorOrder: Uint8Array | null = null;

  /** New colours for the same arcs (a theme or colour mode change), given in file order. */
  setColors(color: Float32Array) {
    const which = this.sortedColorOrder;
    if (!which || color.length !== this.n * 4) return;
    const firsts = new Uint32Array(RADII.length);
    const counts = new Uint32Array(RADII.length);
    for (let k = 0; k < this.n; k++) counts[which[k]]++;
    for (let j = 1; j < RADII.length; j++) firsts[j] = firsts[j - 1] + counts[j - 1];
    const out = new Float32Array(this.n * 4);
    for (let k = 0; k < this.n; k++) out.set(color.subarray(k * 4, k * 4 + 4), firsts[which[k]]++ * 4);
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, out, gl.STATIC_DRAW);
    this.baseDirty = true;
  }

  setLit(lit: Lit | null) {
    this.lit = lit;
    this.litDirty = true;
    this.focusIndex = lit ? lit.flags.findIndex((v, i) => i % 4 === 3 && v > 0) : -1;
    this.focusIndex = Math.floor(this.focusIndex / 4);
    if (!lit || lit.n === 0) return;
    const gl = this.gl;
    gl.bindVertexArray(this.litVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.litGeoBuf);
    gl.bufferData(gl.ARRAY_BUFFER, lit.geo, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.litFlagBuf);
    gl.bufferData(gl.ARRAY_BUFFER, lit.flags, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);
  }

  /** Only the focus flags change (a linked verse hovered or chosen in the list). */
  setFocus(flags: Float32Array) {
    if (!this.lit || flags.length !== this.lit.n * 4) return;
    this.lit.flags = flags;
    this.litDirty = true;
    this.focusIndex = Math.floor(flags.findIndex((v, i) => i % 4 === 3 && v > 0) / 4);
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.litFlagBuf);
    gl.bufferData(gl.ARRAY_BUFFER, flags, gl.DYNAMIC_DRAW);
  }

  /** The axis, the book boundaries and the bands of the book groups (arcs.ts axisLines). */
  setLines({ axis, ticks, bands }: AxisLines) {
    this.uploadedMark = NaN;
    const all = new Float32Array(axis.length + ticks.length + bands.length + 8);
    all.set(axis, 0);
    all.set(ticks, axis.length);
    all.set(bands, axis.length + ticks.length);
    this.lineCount = { axis: axis.length / 4, ticks: ticks.length / 4, bands: bands.length / 4, mark: 2 };
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, all, gl.DYNAMIC_DRAW);
  }

  /** verses marked on the axis now (two vertices each) */
  get markCount() {
    return this.marks / 2;
  }

  /** Marks on the axis that glow with the lit arcs (a word's verses): (x, y, z, 1) per vertex, LINES; null for none. */
  setMarks(lines: Float32Array | null) {
    this.marks = lines ? lines.length / 4 : 0;
    this.litDirty = true;
    if (!lines) return;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.markBuf);
    gl.bufferData(gl.ARRAY_BUFFER, lines, gl.DYNAMIC_DRAW);
  }

  // ------------------------------------------------------------------ size

  resize(cssW: number, cssH: number, dpr: number) {
    const W = Math.max(1, Math.round(cssW * dpr));
    const H = Math.max(1, Math.round(cssH * dpr));
    if (W === this.W && H === this.H && this.t) return;
    this.W = W;
    this.H = H;
    this.dpr = dpr;
    const canvas = this.gl.canvas as HTMLCanvasElement;
    canvas.width = W;
    canvas.height = H;
    this.freeTargets();
    this.baseDirty = true;
    this.litDirty = true;
    const gl = this.gl;
    const target = (w: number, h: number, linear = true): Target => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      const f = linear ? gl.LINEAR : gl.NEAREST;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { tex, fbo, w, h };
    };
    const q = (v: number) => Math.max(1, v >> 2);
    const s = (v: number) => Math.max(1, v >> 4);
    this.t = {
      all: target(W, H),
      hero: target(W, H),
      q1: target(q(W), q(H)),
      q2: target(q(W), q(H)),
      s1: target(s(W), s(H)),
      s2: target(s(W), s(H)),
      lit: target(W, H),
      l1: target(q(W), q(H)),
      l2: target(q(W), q(H)),
      flow: target(Math.max(1, W >> 1), Math.max(1, H >> 1)),
    };
    // the density pass writes both targets at once
    this.dbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.dbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.t.all.tex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.t.hero.tex, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private freeTargets() {
    const gl = this.gl;
    if (this.t) {
      for (const k of Object.keys(this.t) as (keyof NonNullable<typeof this.t>)[]) {
        gl.deleteTexture(this.t[k].tex);
        gl.deleteFramebuffer(this.t[k].fbo);
      }
    }
    if (this.dbo) gl.deleteFramebuffer(this.dbo);
    this.t = null;
    this.dbo = null;
  }

  // ------------------------------------------------------------------ drawing

  /**
   * One frame for this view-projection. `pxPerUnit`: device px per unit of the axis at the camera's target (the arcs'
   * segment counts follow it); `zoom`: space.ts exposureZoom for the view; `depthRef` the camera's distance to its
   * target (arcs nearer than that come forward a little, farther ones recede).
   */
  draw(m: Mat4, pxPerUnit: number, zoom: number, depthRef: number, quality: Quality, star: { x: number; y: number } | null) {
    const gl = this.gl;
    const t = this.t;
    if (!t || this.contextLost || !this.dbo) return;
    const { W, H } = this;
    const moving = quality === "moving";

    const quad = () => {
      gl.bindVertexArray(null);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const pass = (pr: Prog, dst: Target | null, setup: (u: Record<string, WebGLUniformLocation>) => void) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fbo : null);
      gl.viewport(0, 0, dst ? dst.w : W, dst ? dst.h : H);
      gl.useProgram(pr.p);
      setup(pr.u);
      quad();
    };
    const tex = (unit: number, x: WebGLTexture) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, x);
    };
    const blur = (src: Target, tmp: Target, sigma: number) => {
      pass(this.progs.blur, tmp, (u) => {
        tex(0, src.tex);
        gl.uniform1i(u.uSrc, 0);
        gl.uniform2f(u.uDir, 1, 0);
        gl.uniform1f(u.uSigma, sigma);
      });
      pass(this.progs.blur, src, (u) => {
        tex(0, tmp.tex);
        gl.uniform1i(u.uSrc, 0);
        gl.uniform2f(u.uDir, 0, 1);
        gl.uniform1f(u.uSigma, sigma);
      });
    };
    // exposure: as the camera comes closer the arcs spread over more pixels, so the same density means more
    const strength = Math.min(Math.max(this.strength, 0), STRENGTH_MIN.length);
    const p99 = P99_HOME[strength] * zoom;
    const h99 = H99_HOME[strength] * zoom;

    // ---- the sculpture itself (density and its bloom): kept from the last frame when the camera has not moved, so a
    // light growing, a hover or a mark costs only the lit layer
    const key = `${quality}|${strength}|${zoom.toFixed(5)}|${depthRef.toFixed(5)}|${Array.prototype.map.call(m, (v: number) => v.toFixed(6)).join(",")}`;
    if (this.baseDirty || key !== this.baseKey) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.dbo);
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      if (this.n > 0) {
        const arc = this.progs.arc;
        gl.useProgram(arc.p);
        gl.uniformMatrix4fv(arc.u.uMVP, false, m);
        gl.uniform2f(arc.u.uRes, W, H);
        gl.uniform1f(arc.u.uHalf, 0.5 * this.dpr);
        gl.uniform1f(arc.u.uFlat, FLAT);
        gl.uniform1f(arc.u.uDepthRef, depthRef);
        // the strength step keeps the first arcs of each bucket (the most voted); fewer arcs while moving: their
        // density is scaled up so the frame keeps its brightness
        const level = moving && this.movingCap < this.n ? HEAD_LEVELS.findIndex((l) => l >= this.movingCap) : -1;
        const countOf = (b: Bucket) => {
          const base = strength > 0 ? b.strong[strength - 1] : b.count;
          return level >= 0 ? Math.min(base, b.heads[level]) : base;
        };
        const drawn = this.buckets.reduce((sum, b) => sum + countOf(b), 0);
        this.drawn = drawn;
        gl.uniform1f(arc.u.uNorm, Math.pow(this.strongTotal[strength] / Math.max(drawn, 1), 0.7));
        gl.bindVertexArray(this.arcVao);
        for (const b of this.buckets) {
          const count = countOf(b);
          if (count === 0) continue;
          const rpx = b.rmax * pxPerUnit;
          let seg = Math.ceil(Math.PI * Math.sqrt(Math.max(rpx, 1) / 2));
          if (moving) seg = Math.ceil(seg * 0.6);
          seg = Math.min(Math.max(seg, 3), 96);
          gl.uniform1f(arc.u.uSeg, seg);
          gl.bindBuffer(gl.ARRAY_BUFFER, this.geoBuf);
          gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, b.first * 16);
          gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuf);
          gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 16, b.first * 16);
          gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 2 * (seg + 1), count);
        }
      }
      gl.disable(gl.BLEND);
      pass(this.progs.down4, t.q1, (u) => {
        tex(0, t.all.tex);
        tex(1, t.hero.tex);
        gl.uniform1i(u.uAll, 0);
        gl.uniform1i(u.uHero, 1);
        gl.uniform1f(u.uP99, p99);
        gl.uniform1f(u.uH99, h99);
      });
      blur(t.q1, t.q2, 2.5 * this.dpr);
      pass(this.progs.down, t.s1, (u) => {
        tex(0, t.q1.tex);
        gl.uniform1i(u.uSrc, 0);
      });
      blur(t.s1, t.s2, 3.0 * this.dpr);
      this.baseKey = key;
      this.baseDirty = false;
    }

    // ---- static selected arcs and their glow. Time is deliberately absent from this cache key.
    const lit = this.lit;
    const bindLit = (first = 0) => {
      gl.bindVertexArray(this.litVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.litGeoBuf);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, first * 16);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.litFlagBuf);
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 16, first * 16);
    };
    const litKey = `${key}|${this.grow}`;
    if (this.litDirty || this.litKey !== litKey) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.lit.fbo);
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      if (lit && lit.n > 0) {
        const p = this.progs.lit;
        gl.useProgram(p.p);
        gl.uniformMatrix4fv(p.u.uMVP, false, m);
        gl.uniform2f(p.u.uRes, W, H);
        gl.uniform1f(p.u.uHalf, 0.8 * this.dpr);
        gl.uniform1f(p.u.uFlat, FLAT);
        gl.uniform1f(p.u.uGrow, this.grow);
        gl.uniform1f(p.u.uSeg, moving ? 48 : 128);
        bindLit();
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 2 * ((moving ? 48 : 128) + 1), lit.n);
      }
      // A word's marks belong to the cached selection, too.
      if (this.marks > 0) {
        const line = this.progs.line;
        gl.useProgram(line.p);
        gl.uniformMatrix4fv(line.u.uMVP, false, m);
        gl.uniform4f(line.u.uC, 1, 0, 0, 1);
        gl.bindVertexArray(this.markVao);
        gl.drawArrays(gl.LINES, 0, this.marks);
      }
      gl.disable(gl.BLEND);
      pass(this.progs.down, t.l1, (u) => {
        tex(0, t.lit.tex);
        gl.uniform1i(u.uSrc, 0);
      });
      blur(t.l1, t.l2, 2.0 * this.dpr);
      this.litKey = litKey;
      this.litDirty = false;
    }

    // ---- bounded moving light. Reuses real geometry; no new graph, uploads or blur passes per pulse frame.
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.flow.fbo);
    gl.viewport(0, 0, t.flow.w, t.flow.h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.flowTime >= 0) {
      const p = this.progs.flow;
      gl.useProgram(p.p);
      gl.uniformMatrix4fv(p.u.uMVP, false, m);
      gl.uniform2f(p.u.uRes, t.flow.w, t.flow.h);
      gl.uniform1f(p.u.uHalf, 3.6 * this.dpr * t.flow.w / W);
      gl.uniform1f(p.u.uFlat, FLAT);
      gl.uniform1f(p.u.uTime, this.flowTime);
      gl.uniform1f(p.u.uPulse, this.pulse);
      gl.uniform1f(p.u.uSeg, 128);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      if (lit && lit.n > 0) {
        if (this.grow >= 1 && this.pulse >= -0.5) {
          gl.uniform1i(p.u.uSelected, 1);
          bindLit();
          gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 258, Math.min(lit.n, 64));
          // A focused connection beyond the bounded set still gets its own pulse.
          if (this.focusIndex >= 64) {
            bindLit(this.focusIndex);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 258, 1);
          }
        }
      } else if (!lit) {
        gl.uniform1i(p.u.uSelected, 0);
        gl.bindVertexArray(this.arcVao);
        for (const b of this.buckets) {
          const count = Math.min(4, strength > 0 ? b.strong[strength - 1] : b.count);
          if (!count) continue;
          gl.bindBuffer(gl.ARRAY_BUFFER, this.geoBuf);
          gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, b.first * 16);
          gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuf);
          gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 16, b.first * 16);
          gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 258, count);
        }
      }
      gl.disable(gl.BLEND);
    }

    // ---- the frame
    const theme = this.theme;
    pass(this.progs.final, null, (u) => {
      tex(0, t.all.tex);
      tex(1, t.hero.tex);
      tex(2, t.q1.tex);
      tex(3, t.s1.tex);
      tex(4, t.lit.tex);
      tex(5, t.l1.tex);
      tex(6, t.flow.tex);
      gl.uniform1i(u.uAll, 0);
      gl.uniform1i(u.uHero, 1);
      gl.uniform1i(u.uQ, 2);
      gl.uniform1i(u.uS, 3);
      gl.uniform1i(u.uLit, 4);
      gl.uniform1i(u.uLitQ, 5);
      gl.uniform1i(u.uFlow, 6);
      gl.uniform2f(u.uRes, W, H);
      gl.uniform1f(u.uDpr, this.dpr);
      // The view-projection's w row keeps the camera direction even when the lens shifts or the image is exported.
      gl.uniform2f(u.uSkyDrift, m[3] * 24, m[7] * 18);
      gl.uniform1f(u.uP99, p99);
      gl.uniform1f(u.uH99, h99);
      gl.uniform3f(u.uGround, ...GROUND[theme]);
      gl.uniform1f(u.uRecede, this.recede);
      gl.uniform1i(u.uDia, theme === "dia" ? 1 : 0);
      gl.uniform3f(u.uLitColor, ...LIT[theme]);
      gl.uniform3f(u.uFocusColor, ...FOCUS[theme]);
      if (star && this.lit) gl.uniform4f(u.uStar, star.x * this.dpr, H - star.y * this.dpr, 3.2 * this.dpr, 1.15 * Math.min(this.grow * 1.6, 1));
      else gl.uniform4f(u.uStar, 0, 0, 0, 0);
    });

    // ---- the axis, the book boundaries and the mark under the pointer, over the frame
    const line = this.progs.line;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(line.p);
    gl.uniformMatrix4fv(line.u.uMVP, false, m);
    gl.bindVertexArray(this.lineVao);
    const ink = theme === "dia" ? [0.24, 0.18, 0.1] : [0.95, 0.88, 0.74];
    const axisFade = this.lit ? 0.22 : 1;
    gl.uniform4f(line.u.uC, ink[0], ink[1], ink[2], (theme === "dia" ? 0.55 : 0.5) * axisFade);
    if (this.lineCount.axis) gl.drawArrays(gl.LINES, 0, this.lineCount.axis);
    gl.uniform4f(line.u.uC, ink[0], ink[1], ink[2], (theme === "dia" ? 0.45 : 0.4) * axisFade);
    if (this.lineCount.ticks) gl.drawArrays(gl.LINES, this.lineCount.axis, this.lineCount.ticks);
    // the bands of the book groups, a scale under the axis (each vertex carries its band's alpha)
    gl.uniform4f(line.u.uC, ink[0], ink[1], ink[2], (theme === "dia" ? 0.5 : 0.42) * axisFade);
    if (this.lineCount.bands) gl.drawArrays(gl.TRIANGLES, this.lineCount.axis + this.lineCount.ticks, this.lineCount.bands);
    if (this.mark !== null) {
      const x = this.mark;
      const at = this.lineCount.axis + this.lineCount.ticks + this.lineCount.bands;
      const h = 0.03;
      if (x !== this.uploadedMark) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, at * 16, new Float32Array([x, -h, 0, 1, x, h, 0, 1]));
        this.uploadedMark = x;
      }
      const c = LIT[theme];
      gl.uniform4f(line.u.uC, c[0], c[1], c[2], 1);
      gl.drawArrays(gl.LINES, at, 2);
    }
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }

  /** The p-th quantile of the density over the covered pixels of the last frame (calibration of P99_HOME only). */
  densityQuantile(p: number, layer: "all" | "hero" = "all"): number {
    const gl = this.gl;
    const t = this.t;
    if (!t) return 0;
    gl.bindFramebuffer(gl.FRAMEBUFFER, t[layer].fbo);
    const px = new Float32Array(this.W * this.H * 4);
    gl.readPixels(0, 0, this.W, this.H, gl.RGBA, gl.FLOAT, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const a: number[] = [];
    for (let i = 3; i < px.length; i += 4) if (px[i] > 1e-4) a.push(px[i]);
    a.sort((x, y) => x - y);
    return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0;
  }

  destroy() {
    this.freeTargets();
    const gl = this.gl;
    gl.deleteBuffer(this.geoBuf);
    gl.deleteBuffer(this.colorBuf);
    gl.deleteBuffer(this.litGeoBuf);
    gl.deleteBuffer(this.litFlagBuf);
    gl.deleteBuffer(this.lineBuf);
    gl.deleteBuffer(this.markBuf);
    for (const p of Object.values(this.progs)) gl.deleteProgram(p.p);
    gl.deleteVertexArray(this.arcVao);
    gl.deleteVertexArray(this.litVao);
    gl.deleteVertexArray(this.lineVao);
    gl.deleteVertexArray(this.markVao);
    // the context itself stays: a canvas gives the same context back, and a lost one would refuse the next renderer
    // (React mounts effects twice in development)
  }
}
