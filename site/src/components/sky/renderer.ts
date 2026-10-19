// WebGL2 renderer of the sky of links. No library: instanced arcs, float accumulation, film.py's tone and bloom.
//
// Two layers, combined with "screen" so the page can do the same with CSS while the canvas has no sky of its own:
//   sky  = night ground + every loaded arc (receded) + chapter ticks. Baked into a texture once per size and arc set.
//   gold = the selection: its arcs in gold with two glows, a light point (with rays for the opening verse), its tick.
// Nothing runs while idle: a frame is drawn on a change, and frames follow each other only during the opening
// (at most 1.4 s) and the selection pulse (420 ms).
import { BAND, TICK_GAP, arcTone, arcWeight, HERO_VOTES, tickHeight, type ArcSet, type Geometry, type Highlight } from "./model";
import * as SH from "./shaders";

export type Layer = "both" | "sky" | "gold";
export type Mode = "overlay" | "opaque";

// 99.5th percentile of film.py's dome density (Dome._raster at 1600 px, blurred by 1 px), measured once with the same
// raster on the full arc file and on the 20,000 most voted arcs. Rendering constants, not figures shown on the page.
const P99 = { full: 161, head: 27 } as const;
const RECEDE = 0.45; // the unselected sky; design §7 floor is 0.2
const BAR_OP = 1.0;
const GROUND = [6 / 255, 13 / 255, 26 / 255] as const; // --sky #060D1A
const SEGS = [4, 8, 16, 32, 64, 128] as const;
const INTRO_MS = 1400;
const GROW_MS = 1100; // film.py: u = (t - start) / 1.1 s
const PULSE_MS = 420;

type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation> };
type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };
type Bucket = { seg: number; first: number; count: number };

const ss = (x: number) => {
  const t = Math.min(Math.max(x, 0), 1);
  return t * t * (3 - 2 * t);
};
const eo3 = (x: number) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);

/** Sort arc instances (4 floats each, xa/xb in the first two) into buckets by the segments their radius needs. */
function bucketize(src: Float32Array, n: number, width: number, out: Float32Array): Bucket[] {
  const which = new Uint8Array(n);
  const counts = new Uint32Array(SEGS.length);
  for (let k = 0; k < n; k++) {
    const r = Math.abs(src[k * 4 + 1] - src[k * 4]) * 0.5 * width;
    const need = Math.PI * Math.sqrt(r / 2); // chord error under 0.25 px
    let j = 0;
    while (j < SEGS.length - 1 && SEGS[j] < need) j++;
    which[k] = j;
    counts[j]++;
  }
  const first = new Uint32Array(SEGS.length);
  for (let j = 1; j < SEGS.length; j++) first[j] = first[j - 1] + counts[j - 1];
  const fill = first.slice();
  for (let k = 0; k < n; k++) {
    const d = fill[which[k]]++ * 4;
    out[d] = src[k * 4];
    out[d + 1] = src[k * 4 + 1];
    out[d + 2] = src[k * 4 + 2];
    out[d + 3] = src[k * 4 + 3];
  }
  return SEGS.map((seg, j) => ({ seg, first: first[j], count: counts[j] })).filter((b) => b.count > 0);
}

export class SkyRenderer {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private float = false;
  private progs!: Record<"dome" | "gold" | "down4" | "down" | "blur" | "sky" | "final", Prog>;
  private vao!: WebGLVertexArrayObject;
  private domeVao!: WebGLVertexArrayObject;
  private goldVao!: WebGLVertexArrayObject;
  private domeBuf!: WebGLBuffer;
  private goldBuf!: WebGLBuffer;
  private ticksTex: WebGLTexture | null = null;
  private t: Record<"acc" | "q1" | "q2" | "s1" | "s2" | "sky" | "h1" | "h1b" | "h2" | "h2b", Target> | null = null;
  private W = 0;
  private H = 0;
  private lost = false;
  private raf = 0;

  private geo: Geometry | null = null;
  private domeSrc: { data: Float32Array; n: number; kind: "head" | "full" } | null = null;
  private domeBuckets: Bucket[] = [];
  private domeLaidOutFor = 0;
  private skyReady = false;
  private skyDirty = false;
  private gold: Highlight | null = null;
  private goldBuckets: Bucket[] = [];
  private goldLaidOutFor = -1;

  private intro: "none" | "pending" | "running" | "done" = "none";
  private introStart = 0;
  private pulseState: "none" | "pending" | "running" = "none";
  private pulseStart = 0;
  private layer: Layer = "both";
  private mode: Mode | null = null;

  /** called after a frame reaches the canvas, with what the canvas now shows */
  onPresent: ((mode: Mode) => void) | null = null;
  onLost: (() => void) | null = null;
  onRestored: (() => void) | null = null;

  static create(canvas: HTMLCanvasElement): SkyRenderer | null {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    if (!gl) return null;
    try {
      return new SkyRenderer(canvas, gl);
    } catch {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return null;
    }
  }

  private constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.canvas = canvas;
    this.gl = gl;
    canvas.addEventListener("webglcontextlost", this.handleLost);
    canvas.addEventListener("webglcontextrestored", this.handleRestored);
    this.init();
  }

  /** true when the canvas can draw the sky itself (float render targets); otherwise it draws the gold layer only */
  get canDrawSky() {
    return this.float;
  }

  private handleLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.t = null;
    this.ticksTex = null;
    this.mode = null;
    this.onLost?.();
  };

  private handleRestored = () => {
    this.lost = false;
    this.init();
    if (this.geo) this.setGeometry(this.geo);
    this.domeLaidOutFor = 0;
    this.goldLaidOutFor = -1;
    this.skyReady = false;
    this.skyDirty = !!this.domeSrc;
    if (this.W) this.allocTargets();
    this.onRestored?.();
    this.invalidate();
  };

  private init() {
    const gl = this.gl;
    this.float = !!(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"));
    this.progs = {
      dome: this.program(SH.DOME_VS, SH.DOME_FS),
      gold: this.program(SH.GOLD_VS, SH.GOLD_FS),
      down4: this.program(SH.FULL_VS, SH.DOWN4_FS),
      down: this.program(SH.FULL_VS, SH.DOWN_FS),
      blur: this.program(SH.FULL_VS, SH.BLUR_FS),
      sky: this.program(SH.FULL_VS, SH.SKY_FS),
      final: this.program(SH.FULL_VS, SH.FINAL_FS),
    };
    this.vao = gl.createVertexArray()!;
    this.domeBuf = gl.createBuffer()!;
    this.goldBuf = gl.createBuffer()!;
    this.domeVao = this.instanceVao(this.domeBuf);
    this.goldVao = this.instanceVao(this.goldBuf);
    gl.disable(gl.DEPTH_TEST);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  }

  private program(vs: string, fs: string): Prog {
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(p) ?? "link");
    const u: Record<string, WebGLUniformLocation> = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      if (info) u[info.name] = gl.getUniformLocation(p, info.name)!;
    }
    return { p, u };
  }

  private instanceVao(buf: WebGLBuffer) {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
    gl.vertexAttribDivisor(0, 1);
    gl.bindVertexArray(null);
    return vao;
  }

  private target(w: number, h: number, float: boolean): Target {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (float) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (float && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(fbo);
      gl.deleteTexture(tex);
      this.float = false;
      return this.target(w, h, false);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo, w, h };
  }

  private freeTargets() {
    if (!this.t) return;
    for (const x of Object.values(this.t)) {
      this.gl.deleteFramebuffer(x.fbo);
      this.gl.deleteTexture(x.tex);
    }
    this.t = null;
  }

  private allocTargets() {
    this.freeTargets();
    const { W, H } = this;
    const c = (d: number) => [Math.max(1, Math.ceil(W / d)), Math.max(1, Math.ceil(H / d))] as const;
    const acc = this.target(W, H, this.float);
    const f = this.float;
    this.t = {
      acc,
      q1: this.target(...c(4), f),
      q2: this.target(...c(4), f),
      s1: this.target(...c(16), f),
      s2: this.target(...c(16), f),
      sky: this.target(W, H, false),
      h1: this.target(...c(2), f),
      h1b: this.target(...c(2), f),
      h2: this.target(...c(8), f),
      h2b: this.target(...c(8), f),
    };
  }

  // ---------------------------------------------------------------- inputs

  setGeometry(geo: Geometry) {
    this.geo = geo;
    const gl = this.gl;
    if (this.ticksTex) gl.deleteTexture(this.ticksTex);
    const h = new Float32Array(geo.nch);
    for (let c = 0; c < geo.nch; c++) h[c] = tickHeight(geo.chapterVerses[c]);
    this.ticksTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.ticksTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, geo.nch, 1, 0, gl.RED, gl.FLOAT, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.skyDirty = !!this.domeSrc;
    this.invalidate();
  }

  /** The arcs the canvas draws as its own sky (all of them, receded). */
  setDome(set: ArcSet) {
    const geo = this.geo;
    if (!geo || !this.float) return;
    const n = set.n;
    const data = new Float32Array(n * 4);
    for (let k = 0; k < n; k++) {
      const xa = geo.xOfGv[set.a[k]], xb = geo.xOfGv[set.b[k]];
      const w = arcWeight(set.votes[k]);
      data[k * 4] = xa;
      data[k * 4 + 1] = xb;
      data[k * 4 + 2] = set.votes[k] >= HERO_VOTES ? -w : w;
      data[k * 4 + 3] = arcTone(xb - xa);
    }
    this.domeSrc = { data, n, kind: set.full ? "full" : "head" };
    this.domeLaidOutFor = 0;
    this.skyDirty = true;
    this.invalidate();
  }

  setHighlight(h: Highlight | null) {
    this.gold = h;
    this.goldLaidOutFor = -1;
    this.invalidate();
  }

  /** Canvas size in CSS px and the pixel ratio to use (already capped). */
  resize(cssW: number, cssH: number, dpr: number) {
    const W = Math.max(1, Math.round(cssW * dpr));
    const H = Math.max(1, Math.round(cssH * dpr));
    if (W === this.W && H === this.H) return;
    this.W = W;
    this.H = H;
    this.canvas.width = W;
    this.canvas.height = H;
    if (this.lost) return;
    this.allocTargets();
    this.skyReady = false;
    this.skyDirty = !!this.domeSrc;
    this.goldLaidOutFor = -1;
    this.mode = null;
    this.invalidate();
  }

  startIntro() {
    if (this.intro === "none") this.intro = "pending";
    this.invalidate();
  }

  finishIntro() {
    if (this.intro === "pending" || this.intro === "running") {
      this.intro = "done";
      this.invalidate();
    }
  }

  get introRunning() {
    return this.intro === "pending" || this.intro === "running";
  }

  /** asked for, but no frame has reached the canvas yet */
  get introPending() {
    return this.intro === "pending";
  }

  pulse() {
    if (this.introRunning) return;
    this.pulseState = "pending";
    this.invalidate();
  }

  /** Poster rendering: draw one layer only, the opening already finished. */
  setLayer(layer: Layer) {
    this.layer = layer;
    if (this.intro !== "none") this.intro = "done";
    this.invalidate();
  }

  invalidate() {
    if (this.lost || this.raf) return;
    this.raf = requestAnimationFrame(this.frame);
  }

  /** Draws synchronously (poster script). */
  drawNow(now = performance.now()) {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.frame(now);
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.canvas.removeEventListener("webglcontextlost", this.handleLost);
    this.canvas.removeEventListener("webglcontextrestored", this.handleRestored);
    const gl = this.gl;
    if (!gl.isContextLost()) {
      this.freeTargets();
      for (const p of Object.values(this.progs)) gl.deleteProgram(p.p);
      gl.deleteBuffer(this.domeBuf);
      gl.deleteBuffer(this.goldBuf);
      gl.deleteVertexArray(this.vao);
      gl.deleteVertexArray(this.domeVao);
      gl.deleteVertexArray(this.goldVao);
      if (this.ticksTex) gl.deleteTexture(this.ticksTex);
    }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    this.onPresent = this.onLost = this.onRestored = null;
  }

  // ---------------------------------------------------------------- frame

  private frame = (now: number) => {
    this.raf = 0;
    if (this.lost || !this.t || !this.geo || !this.ticksTex) return;
    if (this.intro === "pending") {
      this.intro = "running";
      this.introStart = now;
    }
    if (this.intro === "running" && now - this.introStart >= INTRO_MS) this.intro = "done";
    if (this.pulseState === "pending") {
      this.pulseState = "running";
      this.pulseStart = now;
    }
    if (this.pulseState === "running" && now - this.pulseStart >= PULSE_MS) this.pulseState = "none";

    // the heavy bake waits for the opening to finish, so it never drops its frames
    const bakeDue = this.skyDirty && !!this.domeSrc && this.float && this.layer !== "gold";
    if (bakeDue && this.intro !== "running") {
      this.bakeSky();
      this.skyDirty = false;
      this.skyReady = true;
    }
    this.drawGold(now);
    this.drawFinal(now);

    const mode: Mode = this.skyReady && this.layer !== "gold" ? "opaque" : "overlay";
    if (mode !== this.mode) {
      this.mode = mode;
      this.onPresent?.(mode);
    }
    if (this.intro === "running" || this.pulseState === "running" || (bakeDue && this.skyDirty)) this.invalidate();
  };

  private bind(t: Target | null) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fbo : null);
    gl.viewport(0, 0, t ? t.w : this.W, t ? t.h : this.H);
  }

  private tex(unit: number, t: WebGLTexture, loc: WebGLUniformLocation | undefined) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    if (loc) gl.uniform1i(loc, unit);
  }

  private fullscreen() {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** px per diagram pixel of film.py's 1600 px dome, and of its 1283 px final frame (gold, star, ticks) */
  private get s() {
    return this.W / 1600;
  }
  private get sg() {
    return this.W / 1283;
  }

  private common(pr: Prog) {
    const gl = this.gl;
    if (pr.u.uRes) gl.uniform2f(pr.u.uRes, this.W, this.H);
    if (pr.u.uBase) gl.uniform1f(pr.u.uBase, BAND.base * this.W);
  }

  private barsUniforms(pr: Prog, unit: number) {
    const gl = this.gl;
    this.tex(unit, this.ticksTex!, pr.u.uTicks);
    gl.uniform1i(pr.u.uNch, this.geo!.nch);
    gl.uniform1f(pr.u.uGap, TICK_GAP * this.W);
    let max = 0;
    for (let c = 0; c < this.geo!.nch; c++) max = Math.max(max, tickHeight(this.geo!.chapterVerses[c]));
    gl.uniform1f(pr.u.uTickMax, max * this.W + 1);
  }

  private blur(a: Target, b: Target, sigma: number) {
    const gl = this.gl;
    const pr = this.progs.blur;
    gl.useProgram(pr.p);
    gl.uniform1f(pr.u.uSigma, sigma);
    this.bind(b);
    this.tex(0, a.tex, pr.u.uSrc);
    gl.uniform2f(pr.u.uDir, 1, 0);
    this.fullscreen();
    this.bind(a);
    this.tex(0, b.tex, pr.u.uSrc);
    gl.uniform2f(pr.u.uDir, 0, 1);
    this.fullscreen();
  }

  private down(src: Target, dst: Target, factor: number) {
    const gl = this.gl;
    const pr = this.progs.down;
    gl.useProgram(pr.p);
    this.bind(dst);
    this.tex(0, src.tex, pr.u.uSrc);
    gl.uniform1f(pr.u.uFactor, factor);
    this.fullscreen();
  }

  private drawArcs(vao: WebGLVertexArrayObject, buf: WebGLBuffer, buckets: Bucket[], pr: Prog) {
    const gl = this.gl;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    for (const b of buckets) {
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, b.first * 16);
      gl.uniform1f(pr.u.uSeg, b.seg);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 2 * (b.seg + 1), b.count);
    }
    gl.bindVertexArray(null);
  }

  private bakeSky() {
    const gl = this.gl;
    const t = this.t!;
    const src = this.domeSrc!;
    if (this.domeLaidOutFor !== this.W) {
      const sorted = new Float32Array(src.n * 4);
      this.domeBuckets = bucketize(src.data, src.n, this.W, sorted);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.domeBuf);
      gl.bufferData(gl.ARRAY_BUFFER, sorted, gl.STATIC_DRAW);
      this.domeLaidOutFor = this.W;
    }
    const s = this.s;
    const lw = Math.max(1, s);

    // 1. density channels, additive
    this.bind(t.acc);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    const pd = this.progs.dome;
    gl.useProgram(pd.p);
    this.common(pd);
    gl.uniform1f(pd.u.uHalf, lw / 2);
    gl.uniform1f(pd.u.uNorm, s / (1.1 * lw));
    this.drawArcs(this.domeVao, this.domeBuf, this.domeBuckets, pd);
    gl.disable(gl.BLEND);

    // 2. image at quarter res (+ tick coverage), then 1/16; blur both (film.py: sigma 8 and 36 dome px)
    const p99 = P99[src.kind];
    const p4 = this.progs.down4;
    gl.useProgram(p4.p);
    this.bind(t.q1);
    this.common(p4);
    this.tex(0, t.acc.tex, p4.u.uAcc);
    this.barsUniforms(p4, 1);
    gl.uniform1f(p4.u.uP99, p99);
    this.fullscreen();
    this.down(t.q1, t.s1, 4);
    this.blur(t.q1, t.q2, (8 * s) / 4);
    this.blur(t.s1, t.s2, (36 * s) / 16);

    // 3. the sky layer
    const pk = this.progs.sky;
    gl.useProgram(pk.p);
    this.bind(t.sky);
    this.common(pk);
    this.tex(0, t.acc.tex, pk.u.uAcc);
    this.tex(1, t.q1.tex, pk.u.uQ);
    this.tex(2, t.s1.tex, pk.u.uS);
    this.barsUniforms(pk, 3);
    gl.uniform1f(pk.u.uP99, p99);
    gl.uniform3f(pk.u.uGround, GROUND[0], GROUND[1], GROUND[2]);
    gl.uniform1f(pk.u.uRecede, RECEDE);
    gl.uniform1f(pk.u.uBarOp, BAR_OP);
    gl.uniform2f(pk.u.uHair, BAND.base * this.W + 3 * this.sg, Math.max(1, this.sg));
    this.fullscreen();
  }

  private drawGold(now: number) {
    const gl = this.gl;
    const t = this.t!;
    const h = this.layer === "sky" ? null : this.gold;
    this.bind(t.acc);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (h && h.n > 0) {
      if (this.goldLaidOutFor !== this.W) {
        const sorted = new Float32Array(h.n * 4);
        this.goldBuckets = bucketize(h.arcs, h.n, this.W, sorted);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.goldBuf);
        gl.bufferData(gl.ARRAY_BUFFER, sorted, gl.DYNAMIC_DRAW);
        this.goldLaidOutFor = this.W;
      }
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      const pg = this.progs.gold;
      gl.useProgram(pg.p);
      this.common(pg);
      gl.uniform1f(pg.u.uHalf, Math.max(1, this.sg) / 2);
      const grow = this.intro === "running" ? (now - this.introStart) / GROW_MS : 10;
      gl.uniform1f(pg.u.uGrowU, this.intro === "pending" ? 0 : grow);
      const pulse = this.pulseState === "running" ? eo3((now - this.pulseStart) / PULSE_MS) * 1.15 : -10;
      gl.uniform1f(pg.u.uPulse, pulse);
      this.drawArcs(this.goldVao, this.goldBuf, this.goldBuckets, pg);
      gl.disable(gl.BLEND);
    }
    // glows (film.py draw_arcs: sigma 5 px, and sigma 6 px at quarter res = 24 px, of its 1283 px dome)
    this.down(t.acc, t.h1, 2);
    this.down(t.h1, t.h2, 4);
    if (h && h.n > 0) {
      this.blur(t.h1, t.h1b, (5 * this.sg) / 2);
      this.blur(t.h2, t.h2b, (24 * this.sg) / 8);
    }
  }

  private drawFinal(now: number) {
    const gl = this.gl;
    const t = this.t!;
    const geo = this.geo!;
    const pf = this.progs.final;
    gl.useProgram(pf.p);
    this.bind(null);
    this.common(pf);
    this.tex(0, t.sky.tex, pf.u.uSkyTex);
    this.tex(1, t.acc.tex, pf.u.uHi);
    this.tex(2, t.h1.tex, pf.u.uG1);
    this.tex(3, t.h2.tex, pf.u.uG2);
    gl.uniform1i(pf.u.uSky, this.skyReady && this.layer !== "gold" ? 1 : 0);
    const h = this.layer === "sky" ? null : this.gold;
    const sg = this.sg;
    // many lit arcs (a chapter) would burn into one gold blob: scale them down past ~220, the opening verse's count.
    // Lines never get thinner than 1 px, so below film.py's scale their light is scaled instead.
    const gain = h ? (h.verse ? 1 : Math.min(1, Math.sqrt(220 / Math.max(h.n, 1)))) * Math.min(1, sg) : 0;
    gl.uniform1f(pf.u.uGoldGain, gain);
    if (h) {
      const e = this.intro === "running" ? now - this.introStart : this.intro === "pending" ? 0 : INTRO_MS;
      const x = h.x * this.W, y = BAND.base * this.W;
      if (h.verse) {
        const lightUp = ss(e / 700);
        const ray = ss((e - 500) / 800);
        gl.uniform4f(pf.u.uStar, x, y, Math.max((6 + 2 * ray) * sg, 4), (0.45 + 0.8 * ray) * lightUp);
        gl.uniform3f(pf.u.uRays, ray, 0.2 * this.W, Math.max(1, 0.9 * sg));
      } else {
        gl.uniform4f(pf.u.uStar, x, y, Math.max(4 * sg, 3), 0.7);
        gl.uniform3f(pf.u.uRays, 0, 1, 1);
      }
      if (h.tick >= 0) {
        const sp = this.W / geo.nch;
        const hw = Math.max(1, sp * 0.5);
        const cx = (h.tick + 0.5) * sp;
        const top = y + TICK_GAP * this.W;
        gl.uniform4f(pf.u.uTick, cx - hw, cx + hw, top, top + tickHeight(geo.chapterVerses[h.tick]) * this.W + 2);
      } else gl.uniform4f(pf.u.uTick, 1, 0, 0, 0);
    } else {
      gl.uniform4f(pf.u.uStar, 0, 0, 1, 0);
      gl.uniform3f(pf.u.uRays, 0, 1, 1);
      gl.uniform4f(pf.u.uTick, 1, 0, 0, 0);
    }
    this.fullscreen();
  }
}
