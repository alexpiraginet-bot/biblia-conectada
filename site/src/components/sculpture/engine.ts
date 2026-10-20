// The sculpture's stage in the browser: the WebGL renderer, the camera and the pointer. React (Sculpture.tsx) owns what
// is selected and the panel; this owns frames. A frame is drawn only when something changes: a drag, a flight, a lit
// selection growing, a resize. While idle nothing runs.
import { SculptureRenderer, type ArcBuffers, type Lit, type Theme } from "./renderer";
import {
  arcPoint,
  arcUnderPointer,
  axisUnderPointer,
  clampOrbit,
  DIST_RANGE,
  easeInOut,
  exposureZoom,
  HOME,
  mixView,
  pixelsPerUnit,
  project,
  viewMatrix,
  type Box,
  type Mat4,
  type Orbit,
  type Vec3,
  type View,
} from "./space";

export type EngineEvents = {
  /** the pointer over the axis (axis x, screen point) or off it (null) */
  hover: (x: number | null, at: { x: number; y: number } | null) => void;
  /** the pointer over a lit arc (its index in the lit set, the screen point) or off every lit arc (-1) */
  hoverArc: (i: number, at: { x: number; y: number } | null) => void;
  /** a tap or click on a lit arc */
  pickArc: (i: number) => void;
  /** a tap or click on the axis, at axis x */
  pick: (x: number) => void;
  /** a tap or click away from the axis (not a drag) */
  miss: () => void;
  /** every drawn frame: the view-projection, the canvas size in CSS px and the picture's box (the labels follow it) */
  frame: (m: Mat4, width: number, height: number, box: Box) => void;
  /** the WebGL context went away (the page shows its poster) or came back */
  lost: (lost: boolean) => void;
};

const DRAG_TURN = 0.0055; // radians per CSS px
const TAP_SLOP = 6; // CSS px a tap may move
const HOVER_PX = 18; // how near the axis the pointer must be to point at it
const ARC_PX = 9; // how near a lit arc (the arcs are thin: the axis wins when both are this close)
const FLIGHT_MS = 1150;
const PULSE_MS = 1300;
const GROW_MS = 1100;

type Flight = { from: View; to: View; start: number; ms: number };

export class SculptureEngine {
  readonly canvas: HTMLCanvasElement;
  readonly software: boolean;
  private r: SculptureRenderer;
  private ev: EngineEvents;
  private orbit: Orbit = { ...HOME };
  /** the part of the stage the picture fills (CSS px); the whole stage until the page sets one */
  private box: Box | null = null;
  private flight: Flight | null = null;
  private spin = { yaw: 0, pitch: 0 }; // inertia, radians per frame
  private growStart = -1;
  private pulseStart = -1;
  private raf = 0;
  private settleTimer = 0;
  private cssW = 1;
  private cssH = 1;
  private pointers = new Map<number, { x: number; y: number; x0: number; y0: number; t0: number }>();
  private pinch: { d: number; dist: number } | null = null;
  private dragged = false;
  private lit: Lit | null = null;
  /** a chapter shown while the pointer rests on the axis; the selection's light comes back when it leaves */
  private preview: Lit | null = null;
  private litRecede = 1;
  /** chapters on the axis, so the mark snaps to a chapter's middle (no frame per pixel of pointer travel) */
  private nch = 1189;
  private hoveredArc = -1;
  /** the page was told the pointer is on the axis (the keyboard's mark is separate: it lives in the renderer) */
  private hovering = false;
  /** where a mouse rests over the canvas (null: off it, pressed, or a finger): what it points at is checked again
   *  while the camera moves under it, so the tip never names a chapter the pointer has left */
  private rest: { x: number; y: number } | null = null;
  private reduce = false;
  private ro: ResizeObserver;
  private destroyed = false;

  private constructor(canvas: HTMLCanvasElement, r: SculptureRenderer, software: boolean, ev: EngineEvents) {
    this.canvas = canvas;
    this.r = r;
    this.software = software;
    this.ev = ev;
    this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onUp);
    canvas.addEventListener("pointerleave", this.onLeave);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("webglcontextlost", this.onLost);
  }

  static create(canvas: HTMLCanvasElement, ev: EngineEvents): SculptureEngine | null {
    const made = SculptureRenderer.create(canvas);
    if (!made) return null;
    return new SculptureEngine(canvas, made.r, made.software, ev);
  }

  // ------------------------------------------------------------------ inputs from the page

  setArcs(arcs: ArcBuffers) {
    this.r.setArcs(arcs);
    this.request(false);
  }

  setColors(color: Float32Array) {
    this.r.setColors(color);
    this.request(false);
  }

  setLines(axis: Float32Array, ticks: Float32Array) {
    this.r.setLines(axis, ticks);
  }

  setTheme(theme: Theme) {
    this.r.theme = theme;
    this.request(false);
  }

  /** A slower device draws only the most voted arcs while the camera moves. */
  setMovingCap(n: number) {
    this.r.movingCap = n;
  }

  /** Light a selection (or nothing). The lit arcs grow from the lit verse unless motion is reduced. */
  setLit(lit: Lit | null, grow = true) {
    this.lit = lit;
    this.litRecede = lit ? 0.42 : 1;
    if (this.preview) return;
    this.r.setLit(lit);
    this.r.recede = this.litRecede;
    this.pulseStart = -1;
    this.r.pulse = -1;
    if (lit && grow && !this.reduce) {
      this.r.grow = 0;
      this.growStart = performance.now() + (this.flight ? FLIGHT_MS * 0.35 : 0);
    } else {
      this.r.grow = 1;
      this.growStart = -1;
    }
    this.request(true);
  }

  setFocus(flags: Float32Array) {
    if (this.lit && flags.length === this.lit.n * 4) this.lit.flags = flags;
    if (!this.preview) this.r.setFocus(flags);
    this.request(false);
  }

  /** Show a chapter's links while the pointer rests on it (null: back to the selection's light). */
  setPreview(lit: Lit | null) {
    this.preview = lit;
    if (lit) {
      this.r.setLit(lit);
      this.r.recede = 0.3;
      this.r.grow = 1;
    } else {
      this.r.setLit(this.lit);
      this.r.recede = this.litRecede;
    }
    this.request(false);
  }

  setChapters(nch: number) {
    this.nch = nch;
  }

  setMark(x: number | null) {
    this.r.mark = x;
    this.request(false);
  }

  /** Fly to a view (or jump there when motion is reduced). */
  flyTo(to: View) {
    const target: View = { orbit: clampOrbit(to.orbit), box: { ...to.box } };
    this.spin = { yaw: 0, pitch: 0 };
    if (this.reduce) {
      this.jumpTo(target);
      return;
    }
    this.flight = { from: this.view, to: target, start: performance.now(), ms: FLIGHT_MS };
    this.request(true);
  }

  /** Stand at a view at once (the opening view, a new size while nothing is lit). */
  jumpTo(to: View) {
    this.flight = null;
    this.spin = { yaw: 0, pitch: 0 };
    this.orbit = clampOrbit(to.orbit);
    this.box = { ...to.box };
    this.request(false);
  }

  /** no flight, no inertia and no frame waiting (the interaction tests wait for this before they aim the pointer) */
  get still() {
    return !this.flight && this.raf === 0 && Math.abs(this.spin.yaw) + Math.abs(this.spin.pitch) <= 1e-4;
  }

  /** true once the person has turned or zoomed the camera by hand (the page then stops reframing on resize) */
  get touched() {
    return this.handled;
  }

  private handled = false;

  /** Turn and zoom from the keyboard. */
  nudge(dyaw: number, dpitch: number, zoom: number) {
    this.flight = null;
    this.orbit = clampOrbit({ ...this.orbit, yaw: this.orbit.yaw + dyaw, pitch: this.orbit.pitch + dpitch, dist: this.orbit.dist * zoom });
    this.request(true);
  }

  get view(): View {
    return { orbit: { ...this.orbit }, box: { ...this.currentBox() } };
  }

  private currentBox(): Box {
    return this.box ?? { x: 0, y: 0, w: this.cssW, h: this.cssH };
  }

  get size() {
    return { width: this.cssW, height: this.cssH };
  }

  /** The current view-projection (CSS px space via `project`). */
  matrix(): Mat4 {
    return viewMatrix({ orbit: this.orbit, box: this.currentBox() }, this.cssW, this.cssH);
  }

  /** Where a world point is on screen now. */
  screenOf(p: Vec3) {
    return project(this.matrix(), p, this.cssW, this.cssH);
  }

  // ------------------------------------------------------------------ frames

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.cssW = Math.max(1, rect.width);
    this.cssH = Math.max(1, rect.height);
    // phones draw at most 2 device px per CSS px; a 4K screen at 1.5 keeps the frame time sane
    const dpr = Math.min(window.devicePixelRatio || 1, this.cssW * this.cssH > 1.6e6 ? 1.5 : 2);
    this.r.resize(this.cssW, this.cssH, dpr);
    this.request(false);
  }


  /** Ask for a frame. `moving`: the camera or the light will keep changing, so draw light and settle afterwards. */
  request(moving: boolean) {
    if (this.destroyed) return;
    if (moving) this.movingUntil = performance.now() + 120;
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  private movingUntil = 0;

  private tick = (now: number) => {
    this.raf = 0;
    if (this.destroyed || this.r.contextLost) return;
    let animating = false;
    let turned = false;
    if (this.flight) {
      const f = this.flight;
      const t = Math.min((now - f.start) / f.ms, 1);
      const v = mixView(f.from, f.to, easeInOut(t));
      this.orbit = v.orbit;
      this.box = v.box;
      turned = true;
      if (t >= 1) this.flight = null;
      else animating = true;
    }
    if (Math.abs(this.spin.yaw) + Math.abs(this.spin.pitch) > 1e-4 && this.pointers.size === 0) {
      this.orbit = clampOrbit({ ...this.orbit, yaw: this.orbit.yaw + this.spin.yaw, pitch: this.orbit.pitch + this.spin.pitch });
      this.spin = { yaw: this.spin.yaw * 0.92, pitch: this.spin.pitch * 0.92 };
      turned = true;
      animating = true;
    }
    // the camera moved under a resting pointer: what it points at may have changed
    if (turned && this.rest && this.pointers.size === 0) this.hoverAt(this.rest.x, this.rest.y, true);
    if (this.growStart >= 0) {
      const g = Math.min(Math.max((now - this.growStart) / GROW_MS, 0), 1);
      this.r.grow = 1 - Math.pow(1 - g, 3);
      if (g >= 1) {
        this.growStart = -1;
        // once grown, one pulse of light runs from the lit verse to every partner
        this.pulseStart = now;
      }
      animating = true;
    }
    if (this.pulseStart >= 0) {
      const u = (now - this.pulseStart) / PULSE_MS;
      if (u >= 1) {
        this.pulseStart = -1;
        this.r.pulse = -1;
      } else {
        this.r.pulse = u * 1.15 - 0.05;
        animating = true;
      }
    }
    const moving = animating || this.pointers.size > 0 || now < this.movingUntil;
    this.drawNow(moving ? "moving" : "settled");
    if (animating) this.raf = requestAnimationFrame(this.tick);
    else if (moving) {
      // one full frame once the motion stops
      window.clearTimeout(this.settleTimer);
      this.settleTimer = window.setTimeout(() => this.request(false), 140);
    }
  };

  private drawNow(quality: "moving" | "settled") {
    const m = this.matrix();
    let star: { x: number; y: number } | null = null;
    if (this.lit && this.lit.at !== null) {
      const s = project(m, [this.lit.at, 0, 0], this.cssW, this.cssH);
      if (s.front) star = { x: s.x, y: s.y };
    }
    const boxH = this.currentBox().h;
    const dpr = this.canvas.width / this.cssW;
    this.r.draw(m, pixelsPerUnit(boxH, this.orbit.dist, dpr), exposureZoom(boxH, this.orbit.dist), this.orbit.dist, quality, star);
    this.ev.frame(m, this.cssW, this.cssH, this.currentBox());
  }

  // ------------------------------------------------------------------ pointer

  private local(e: PointerEvent | WheelEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const p = this.local(e);
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: p.x, y: p.y, x0: p.x, y0: p.y, t0: performance.now() });
    this.rest = null;
    this.flight = null;
    this.spin = { yaw: 0, pitch: 0 };
    this.dragged = false;
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: this.orbit.dist };
    }
  };

  private onMove = (e: PointerEvent) => {
    const p = this.local(e);
    const ptr = this.pointers.get(e.pointerId);
    if (!ptr) {
      // hover (mouse and pen only: a finger has no hover)
      if (e.pointerType !== "touch") {
        this.rest = p;
        this.hoverAt(p.x, p.y);
      }
      return;
    }
    const dx = p.x - ptr.x, dy = p.y - ptr.y;
    ptr.x = p.x;
    ptr.y = p.y;
    if (Math.hypot(p.x - ptr.x0, p.y - ptr.y0) > TAP_SLOP) this.dragged = true;
    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      this.orbit = clampOrbit({ ...this.orbit, dist: (this.pinch.dist * this.pinch.d) / Math.max(d, 1) });
      this.dragged = true;
      this.handled = true;
      this.request(true);
      return;
    }
    if (!this.dragged) return;
    this.handled = true;
    const yaw = -dx * DRAG_TURN;
    const pitch = dy * DRAG_TURN;
    this.orbit = clampOrbit({ ...this.orbit, yaw: this.orbit.yaw + yaw, pitch: this.orbit.pitch + pitch });
    this.spin = { yaw, pitch };
    this.hovering = false;
    this.ev.hover(null, null);
    this.r.mark = null;
    this.request(true);
  };

  private onUp = (e: PointerEvent) => {
    const ptr = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (!ptr) return;
    const p = this.local(e);
    const tap = !this.dragged && performance.now() - ptr.t0 < 600 && e.type === "pointerup";
    if (tap) {
      this.spin = { yaw: 0, pitch: 0 };
      const m = this.matrix();
      const hit = axisUnderPointer(m, this.cssW, this.cssH, p.x, p.y);
      // a finger is wider than a mouse: it may land a little farther from the line
      const touch = e.pointerType === "touch";
      const reach = touch ? HOVER_PX * 1.6 : HOVER_PX;
      const arc = this.litArcAt(m, p.x, p.y, touch ? ARC_PX * 2 : ARC_PX);
      if (arc.i >= 0 && arc.dist < hit.dist) this.ev.pickArc(arc.i);
      else if (hit.dist <= reach) this.ev.pick(hit.x);
      else this.ev.miss();
    } else if (this.reduce) {
      this.spin = { yaw: 0, pitch: 0 };
    }
    this.request(this.pointers.size > 0 || Math.abs(this.spin.yaw) + Math.abs(this.spin.pitch) > 1e-4);
  };

  private onLeave = (e: PointerEvent) => {
    if (e.pointerType === "touch" || this.pointers.size > 0) return;
    this.rest = null;
    this.r.mark = null;
    this.hovering = false;
    this.ev.hover(null, null);
    if (this.hoveredArc >= 0) {
      this.hoveredArc = -1;
      this.ev.hoverArc(-1, null);
    }
    this.request(false);
  };

  /** The lit arc under the pointer, when a selection is fully lit (not a chapter preview). */
  private litArcAt(m: Mat4, x: number, y: number, reach: number) {
    if (!this.lit || this.preview || this.r.grow < 1) return { i: -1, dist: Infinity };
    return arcUnderPointer(m, this.cssW, this.cssH, this.lit.geo, this.lit.n, x, y, reach);
  }

  /** What the pointer at (x, y) is on. `again`: the pointer rests and the camera moved (from a frame): tell the page
   *  only what changed, and leave the drawing to the frame under way. */
  private hoverAt(x: number, y: number, again = false) {
    const m = this.matrix();
    const hit = axisUnderPointer(m, this.cssW, this.cssH, x, y);
    const arc = this.litArcAt(m, x, y, ARC_PX);
    const onArc = arc.i >= 0 && arc.dist < hit.dist;
    if (onArc !== (this.hoveredArc >= 0) || (onArc && arc.i !== this.hoveredArc)) {
      this.hoveredArc = onArc ? arc.i : -1;
      this.ev.hoverArc(this.hoveredArc, onArc ? { x, y } : null);
    } else if (onArc && !again) this.ev.hoverArc(arc.i, { x, y });
    let mark: number | null = null;
    if (!onArc && hit.dist <= HOVER_PX) {
      // the mark stands at the middle of the chapter under the pointer
      const ci = Math.min(this.nch - 1, Math.max(0, Math.floor(((hit.x + 1) / 2) * this.nch)));
      mark = ((ci + 0.5) / this.nch) * 2 - 1;
      if (!again || !this.hovering || mark !== this.r.mark) {
        this.hovering = true;
        this.ev.hover(mark, { x, y });
      }
    } else if (this.hovering) {
      this.hovering = false;
      this.ev.hover(null, null);
    }
    this.canvas.style.cursor = onArc || mark !== null ? "pointer" : "grab";
    if (mark !== this.r.mark) {
      this.r.mark = mark;
      if (!again) this.request(false);
    }
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const k = Math.exp((e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * 0.0012);
    this.flight = null;
    this.handled = true;
    this.orbit = clampOrbit({ ...this.orbit, dist: Math.min(Math.max(this.orbit.dist * k, DIST_RANGE[0]), DIST_RANGE[1]) });
    // the axis moved under the pointer (a wheel is a mouse or a trackpad: the pointer is there). The last pointer move
    // places it to the fraction of a pixel, the wheel event only to the pixel, and from afar a pixel can hold two
    // chapters: the tip must name the one a click there opens.
    const p = this.rest ?? this.local(e);
    this.rest = p;
    this.hoverAt(p.x, p.y, true);
    this.request(true);
  };

  private onLost = (e: Event) => {
    e.preventDefault();
    this.r.markLost();
    this.ev.lost(true);
  };

  /** Where lit arc `i` passes at share `t` of its way, on screen now (the interaction tests aim the pointer with it). */
  litPoint(i: number, t: number) {
    const g = this.lit?.geo;
    if (!g || i < 0 || i >= (this.lit?.n ?? 0)) return null;
    return project(this.matrix(), arcPoint(g[i * 4], g[i * 4 + 1], g[i * 4 + 2], t), this.cssW, this.cssH);
  }

  /** Draw a full frame now and measure its density (the calibration script reads it through the test flag). */
  measure(p = 0.995, layer: "all" | "hero" = "all") {
    this.drawNow("settled");
    return this.r.densityQuantile(p, layer);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.settleTimer);
    this.ro.disconnect();
    const c = this.canvas;
    c.removeEventListener("pointerdown", this.onDown);
    c.removeEventListener("pointermove", this.onMove);
    c.removeEventListener("pointerup", this.onUp);
    c.removeEventListener("pointercancel", this.onUp);
    c.removeEventListener("pointerleave", this.onLeave);
    c.removeEventListener("wheel", this.onWheel);
    c.removeEventListener("webglcontextlost", this.onLost);
    this.r.destroy();
  }
}
