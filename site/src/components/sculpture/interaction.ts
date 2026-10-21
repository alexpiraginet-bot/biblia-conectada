// Camera transitions and pointer hit testing load with the engine, after the initial sculpture shell.
import { arcPoint, project, type Mat4, type Orbit, type View } from "./space";

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
