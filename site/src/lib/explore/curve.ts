// Edge shape of the Explorar graph, shared by the server (all edges) and the client (the selected one).

/** Gentle curve between two points (px), always bending the same way: the arc motif of the site. */
export function curve(ax: number, ay: number, bx: number, by: number, bend = 0.12): string {
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  // control point to the left of the direction of travel, after putting the endpoints in a fixed order
  const [sx, sy, ex, ey] = ax < bx || (ax === bx && ay < by) ? [ax, ay, bx, by] : [bx, by, ax, ay];
  const dx = ex - sx, dy = ey - sy;
  const f = (v: number) => Math.round(v * 10) / 10;
  return `M${f(ax)} ${f(ay)}Q${f(mx + dy * bend)} ${f(my - dx * bend)} ${f(bx)} ${f(by)}`;
}
