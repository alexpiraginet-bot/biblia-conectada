// The light sculpture at /arcos: where every arc stands in 3D, and the camera that looks at it. Pure functions, no
// DOM, shared by the WebGL renderer, the page and the tests.
//
// The axis is the Bible in reading order, x in [-1, 1] from Gênesis 1:1 to Apocalipse 22:21 (sky/model.ts gives each
// verse its place in [0, 1]; here it is doubled and shifted). Every verse pair is a half ellipse over the axis, as in
// the sky of links, turned around the axis by an angle that says what kind of link it is:
//   bridges between the Testaments rise above the axis;
//   links inside the Old Testament hang below it, toward the viewer;
//   links inside the New Testament hang below it, away from the viewer;
// and every plane turns a little with where the arc stands on the axis, so the whole reads as a shell, not as fans.

export type Vec3 = [number, number, number];
/** column-major 4 x 4 */
export type Mat4 = Float32Array;

/** height of an arc over its radius */
export const FLAT = 0.62;
/** how far the planes turn from Gênesis to Apocalipse, in radians per unit of x */
export const TWIST = 0.55;

/** 0 inside the Old Testament, 1 inside the New, 2 a bridge between them */
export type Rel = 0 | 1 | 2;

export function relation(aIsNT: boolean, bIsNT: boolean): Rel {
  if (aIsNT !== bIsNT) return 2;
  return aIsNT ? 1 : 0;
}

/** A stable number in [0, 1) for a verse pair, so an arc keeps its plane between visits and builds. */
export function pairJitter(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be59b, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Angle of an arc's plane around the axis: 0 points at the viewer (+z), pi / 2 straight up (+y). */
export function arcAngle(rel: Rel, xa: number, xb: number, jitter: number): number {
  const twist = ((xa + xb) / 2) * TWIST;
  if (rel === 2) return Math.PI / 2 + twist * 0.6 + (jitter - 0.5) * 0.9;
  if (rel === 0) return -Math.PI * (0.3 + 0.22 * jitter) + twist;
  return -Math.PI * (0.7 - 0.22 * jitter) + twist;
}

/** Point at t in [0, 1] along the arc from xa (t = 0) to xb (t = 1), both on the axis, in the plane at angle theta. */
export function arcPoint(xa: number, xb: number, theta: number, t: number, flat = FLAT): Vec3 {
  const c = (xa + xb) / 2;
  const r = Math.abs(xb - xa) / 2;
  const a = Math.PI * t;
  const h = r * Math.sin(a) * flat;
  // from xa (t = 0) to xb (t = 1), in either order along the axis
  const x = xa <= xb ? c - r * Math.cos(a) : c + r * Math.cos(a);
  return [x, h * Math.sin(theta), h * Math.cos(theta)];
}

/** Axis coordinate of a verse whose place on the baseline is u in [0, 1] (sky/model.ts xOfGv). */
export const axisX = (u: number) => u * 2 - 1;

// ---------------------------------------------------------------- matrices

export function perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function normalize(a: Vec3): Vec3 {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

export function lookAt(eye: Vec3, target: Vec3, up: Vec3 = [0, 1, 0]): Mat4 {
  const z = normalize(sub(eye, target));
  const x = normalize(cross(up, z));
  const y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

// ---------------------------------------------------------------- the camera

/** An orbit around a target: yaw turns around the vertical, pitch lifts the eye, dist is how far it stands. */
export type Orbit = { yaw: number; pitch: number; dist: number; target: Vec3 };

export const FOV = 0.72;
export const PITCH_LIMIT = 1.25;
export const DIST_RANGE = [0.18, 6] as const;

/** The whole Bible, seen from the front left and a little above, as the page opens. */
export const HOME: Orbit = { yaw: -0.62, pitch: 0.22, dist: 2.35, target: [0, 0.12, 0] };

export function clampOrbit(o: Orbit): Orbit {
  return {
    yaw: o.yaw,
    pitch: Math.min(Math.max(o.pitch, -PITCH_LIMIT), PITCH_LIMIT),
    dist: Math.min(Math.max(o.dist, DIST_RANGE[0]), DIST_RANGE[1]),
    target: o.target,
  };
}

export function eyeOf(o: Orbit): Vec3 {
  const cp = Math.cos(o.pitch);
  return [o.target[0] + o.dist * Math.sin(o.yaw) * cp, o.target[1] + o.dist * Math.sin(o.pitch), o.target[2] + o.dist * Math.cos(o.yaw) * cp];
}

/** The rectangle of the stage (CSS px) that the camera's picture fills. The projection is centred on it, so the
 *  sculpture looks the same wherever the box sits: opening the panel moves the box, not the perspective. */
export type Box = { x: number; y: number; w: number; h: number };

/** Where the camera stands, and which part of the stage its picture fills. */
export type View = { orbit: Orbit; box: Box };

/** The box's own centred projection, for a picture of that aspect (the poster is rendered with this). */
export function boxProjection(o: Orbit, aspect: number): Mat4 {
  return multiply(perspective(FOV, aspect, 0.02, 40), lookAt(eyeOf(o), o.target));
}

/** View-projection for a stage of this size: the box's projection, scaled and moved into the box (a lens shift). */
export function viewMatrix(v: View, width: number, height: number): Mat4 {
  const { box } = v;
  const sx = box.w / width;
  const sy = box.h / height;
  const tx = (2 * (box.x + box.w / 2)) / width - 1;
  const ty = 1 - (2 * (box.y + box.h / 2)) / height;
  // clip space: x' = sx x + tx w, y' = sy y + ty w (column-major)
  const shift = new Float32Array([sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1]);
  return multiply(shift, boxProjection(v.orbit, box.w / box.h));
}

/** Screen position (CSS px, origin top left) of a world point, and whether it is in front of the camera. */
export function project(m: Mat4, p: Vec3, width: number, height: number): { x: number; y: number; w: number; front: boolean } {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  const front = w > 1e-4;
  const iw = 1 / (front ? w : 1e-4);
  return { x: (x * iw * 0.5 + 0.5) * width, y: (0.5 - y * iw * 0.5) * height, w, front };
}

/** Shortest turn from angle a to angle b, so a flight never spins the long way round. */
export function angleTo(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d;
}

export function mixOrbit(a: Orbit, b: Orbit, t: number): Orbit {
  const yb = angleTo(a.yaw, b.yaw);
  const m = (p: number, q: number) => p + (q - p) * t;
  // the distance moves in log space, so a zoom feels even all the way in
  const dist = Math.exp(m(Math.log(a.dist), Math.log(b.dist)));
  return { yaw: m(a.yaw, yb), pitch: m(a.pitch, b.pitch), dist, target: [m(a.target[0], b.target[0]), m(a.target[1], b.target[1]), m(a.target[2], b.target[2])] };
}

export function mixView(a: View, b: View, t: number): View {
  const m = (p: number, q: number) => p + (q - p) * t;
  return { orbit: mixOrbit(a.orbit, b.orbit, t), box: { x: m(a.box.x, b.box.x), y: m(a.box.y, b.box.y), w: m(a.box.w, b.box.w), h: m(a.box.h, b.box.h) } };
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * The orbit, at the given yaw and pitch, that shows every point inside a picture of this aspect with a margin (a share
 * of the half width and height on each side): the target puts the middle of the points' picture at the picture's
 * middle, and the distance is the smallest that fits (a bisection, 24 steps).
 */
export function fitOrbit(points: readonly Vec3[], base: Orbit, aspect: number, margin = 0.06): Orbit {
  if (points.length === 0) return base;
  const lo: Vec3 = [Infinity, Infinity, Infinity];
  const hi: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], p[i]);
      hi[i] = Math.max(hi[i], p[i]);
    }
  }
  const limit = 1 - 2 * margin;
  // the points' picture in the box's clip space: its bounds, or null when a point is behind the camera
  const picture = (o: Orbit) => {
    const m = boxProjection(o, aspect);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of points) {
      const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
      if (w <= 1e-4) return null;
      const x = (m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) / w;
      const y = (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) / w;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    return { x0, x1, y0, y1 };
  };
  const fits = (o: Orbit) => {
    const b = picture(o);
    return !!b && -b.x0 <= limit && b.x1 <= limit && -b.y0 <= limit && b.y1 <= limit;
  };
  // the nearest distance that keeps every point inside the margin, looking at `target`
  const fit = (target: Vec3): Orbit => {
    const at = (dist: number): Orbit => ({ ...base, dist, target });
    let a: number = DIST_RANGE[0];
    let b: number = DIST_RANGE[1];
    if (!fits(at(b))) return at(b);
    for (let i = 0; i < 24; i++) {
      const mid = Math.sqrt(a * b);
      if (fits(at(mid))) b = mid;
      else a = mid;
    }
    return at(b);
  };
  let o = fit([(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2]);
  // The middle of the 3D bounding box is not the middle of its picture (perspective, and a turned view): move the
  // target across the view by the picture's offset and fit again, so the picture is centred and as large as it can be.
  for (let k = 0; k < 4; k++) {
    const b = picture(o);
    if (!b) break;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    if (Math.abs(cx) < 2e-3 && Math.abs(cy) < 2e-3) break;
    const back = normalize(sub(eyeOf(o), o.target));
    const right = normalize(cross([0, 1, 0], back));
    const up = cross(back, right);
    const hh = o.dist * Math.tan(FOV / 2), hw = hh * aspect;
    const t = o.target;
    o = fit([0, 1, 2].map((i) => t[i] + right[i] * cx * hw + up[i] * cy * hh) as Vec3);
  }
  return o;
}

/** The largest box of this aspect inside a free area of the stage, centred in it. */
export function boxIn(area: Box, aspect: number): Box {
  const w = Math.min(area.w, area.h * aspect);
  const h = w / aspect;
  return { x: area.x + (area.w - w) / 2, y: area.y + (area.h - h) / 2, w, h };
}

/** The aspect of the whole sculpture's picture when the page opens (the poster images are rendered at it). */
export const HOME_ASPECT = 1.4;

// The view the exposure constants were measured on (renderer.ts P99_HOME): the whole sculpture at camera distance 2.41
// in a picture 836 CSS px tall (a 1440 x 900 window).
const EXPOSURE_REF = { dist: 2.41, height: 836 };

/**
 * How much denser the arcs are per pixel than on the measured view: a picture `boxHeight` CSS px tall at camera
 * distance `dist`. The renderer scales its exposure by it, so the light stays the same as the camera moves.
 */
export function exposureZoom(boxHeight: number, dist: number): number {
  return Math.min(Math.max(EXPOSURE_REF.height / EXPOSURE_REF.dist / (boxHeight / dist), 0.08), 2.5);
}

/** Device px per unit of the axis at the camera's target (the arcs' segment counts follow it). */
export function pixelsPerUnit(boxHeight: number, dist: number, dpr: number): number {
  return (boxHeight * dpr) / (2 * dist * Math.tan(FOV / 2));
}

/**
 * The outline of the whole sculpture: the widest arc of each kind at both ends of its range of planes (`ntStart` is
 * where the New Testament begins on the axis, in [-1, 1]). Framing these frames everything.
 */
export function sculptureOutline(ntStart: number): Vec3[] {
  const pts: Vec3[] = [
    [-1, 0, 0],
    [1, 0, 0],
  ];
  for (const j of [0, 1]) {
    for (const [rel, xa, xb] of [
      [2, -1, 1],
      [0, -1, ntStart],
      [1, ntStart, 1],
    ] as [Rel, number, number][]) {
      pts.push(...arcSamples(xa, xb, arcAngle(rel, xa, xb, j), 6));
    }
  }
  return pts;
}

/** Points along an arc, for framing (a few per arc are enough). */
export function arcSamples(xa: number, xb: number, theta: number, n = 5): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i <= n; i++) out.push(arcPoint(xa, xb, theta, i / n));
  return out;
}

// ---------------------------------------------------------------- what is under the pointer

/**
 * The lit arc nearest the pointer (CSS px): its index among `arcs` ((xa, xb, theta, w) per arc, `count` arcs) and its
 * distance, or -1 when none comes within `reach`. Each arc is cut into `n` straight pieces on screen.
 */
export function arcUnderPointer(
  m: Mat4,
  width: number,
  height: number,
  arcs: Float32Array,
  count: number,
  px: number,
  py: number,
  reach: number,
  n = 24,
): { i: number; dist: number } {
  let best = { i: -1, dist: reach };
  for (let k = 0; k < count; k++) {
    const xa = arcs[k * 4], xb = arcs[k * 4 + 1], th = arcs[k * 4 + 2];
    let prev = project(m, arcPoint(xa, xb, th, 0), width, height);
    for (let j = 1; j <= n; j++) {
      const cur = project(m, arcPoint(xa, xb, th, j / n), width, height);
      if (prev.front && cur.front) {
        const ex = cur.x - prev.x, ey = cur.y - prev.y;
        const len2 = ex * ex + ey * ey || 1;
        const t = Math.min(Math.max(((px - prev.x) * ex + (py - prev.y) * ey) / len2, 0), 1);
        const d = Math.hypot(px - (prev.x + ex * t), py - (prev.y + ey * t));
        if (d < best.dist) best = { i: k, dist: d };
      }
      prev = cur;
    }
  }
  return best;
}

// ---------------------------------------------------------------- the axis under the pointer

/**
 * Where the pointer falls on the axis: the axis coordinate of the closest point of the projected axis, and its distance
 * from the pointer in CSS px. The axis is cut into segments so the perspective division stays exact.
 */
export function axisUnderPointer(m: Mat4, width: number, height: number, px: number, py: number, segments = 64): { x: number; dist: number } {
  let best = { x: 0, dist: Infinity };
  let prev = project(m, [-1, 0, 0], width, height);
  for (let i = 1; i <= segments; i++) {
    const x1 = -1 + (2 * i) / segments;
    const cur = project(m, [x1, 0, 0], width, height);
    if (prev.front && cur.front) {
      const ex = cur.x - prev.x, ey = cur.y - prev.y;
      const len2 = ex * ex + ey * ey || 1;
      const t = Math.min(Math.max(((px - prev.x) * ex + (py - prev.y) * ey) / len2, 0), 1);
      const qx = prev.x + ex * t, qy = prev.y + ey * t;
      const d = Math.hypot(px - qx, py - qy);
      if (d < best.dist) best = { x: -1 + (2 * (i - 1 + t)) / segments, dist: d };
    }
    prev = cur;
  }
  return best;
}
