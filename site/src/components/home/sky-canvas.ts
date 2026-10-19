// Night landscape for the home cover, adapted from the "Aurelia" hero Alex picked as reference: deterministic stars,
// layered hills, mist and film grain, drawn with Canvas 2D and no dependencies. The light on the horizon is the most
// linked verse; its arcs rise behind the hills in gold, as in the last scene of video 1
// (estudos/biblia-referencias/film.py: gold arcs, a star point, additive light).
//
// Everything is drawn once per size, on three stacked canvases: the sky and stars behind, the arcs in the middle
// (CSS mix-blend-mode screen for additive light, a CSS mask that fades their feet, a CSS clip that grows them from the
// star), and the star, hills, mist and grain in front. There is no animation loop: the only motion is the CSS reveal,
// so phones are not kept busy (a per-frame version cost 6.7 s of blocking time in Lighthouse mobile).

const TAU = Math.PI * 2;

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

// hills from back to front: base height and amplitude as a share of the canvas height
const LAYERS = [
  { base: 0.575, amp: 0.07, drift: 5, top: "#232c4c", bottom: "#19203d" },
  { base: 0.64, amp: 0.095, drift: 9, top: "#1c2343", bottom: "#141a33" },
  { base: 0.715, amp: 0.11, drift: 14, top: "#151b31", bottom: "#0f1428" },
  { base: 0.805, amp: 0.13, drift: 21, top: "#10152a", bottom: "#0a0e1f" },
  { base: 0.91, amp: 0.15, drift: 30, top: "#0a0d1b", bottom: "#05070f" },
];

/** where the arcs stand, as a share of the canvas height; the first hill never rises above it */
const HORIZON = 0.5;
const ARC_TOP = 0.07;

export type SkyData = {
  /** baseline position of the verse of light, 0–1 */
  x0: number;
  /** pairs of [baseline position 0–1, strength 0–1] of the verses linked to it */
  arcs: number[];
};

export type SkyLayers = { back: HTMLCanvasElement; mid: HTMLCanvasElement; front: HTMLCanvasElement };

export function drawSky({ back, mid, front }: SkyLayers, data: SkyData): () => void {
  const ctx = mid.getContext("2d");
  if (!ctx) return () => {};
  const rand = mulberry32(0xb1b11a);

  const stars = Array.from({ length: 170 }, () => ({
    x: rand(),
    y: rand() * 0.5,
    r: 0.4 + rand() * 1,
    p: rand() * TAU,
    s: 0.15 + rand() * 0.5,
    b: 0.25 + rand() * 0.75,
  }));
  const layers = LAYERS.map((d) => ({
    ...d,
    comps: [
      { f: 0.7 + rand() * 0.5, a: 0.55, p: rand() * TAU, m: 1 },
      { f: 1.6 + rand() * 0.9, a: 0.3, p: rand() * TAU, m: 1.8 },
      { f: 3.2 + rand() * 1.8, a: 0.15, p: rand() * TAU, m: 2.9 },
    ],
  }));
  const mists = Array.from({ length: 8 }, () => ({
    layer: 1 + Math.floor(rand() * 3),
    y: 0.58 + rand() * 0.28,
    rx: 0.16 + rand() * 0.22,
    ry: 0.018 + rand() * 0.028,
    sp: 6 + rand() * 12,
    off: rand() * 4000,
    a: 0.03 + rand() * 0.03,
  }));
  // weakest arcs first, so the most voted are drawn on top
  const arcs: { x: number; s: number }[] = [];
  for (let i = 0; i + 1 < data.arcs.length; i += 2) arcs.push({ x: data.arcs[i], s: data.arcs[i + 1] });
  arcs.sort((a, b) => a.s - b.s);

  const noise = document.createElement("canvas");
  noise.width = noise.height = 140;
  const nctx = noise.getContext("2d");
  if (nctx) {
    const img = nctx.createImageData(140, 140);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 108 + rand() * 72;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    nctx.putImageData(img, 0, 0);
  }

  let w = 0;
  let h = 0;
  let dpr = 1;

  const ridge = (L: (typeof layers)[number], xn: number) => {
    let n = 0;
    for (const c of L.comps) n += c.a * Math.sin(xn * c.f * TAU + c.p + 18 * L.drift * 0.004 * c.m);
    return L.base + n * L.amp;
  };

  // the sky behind: gradient, glow, haze and stars
  const drawBack = () => {
    const b = back.getContext("2d");
    if (!b || w < 2 || h < 2) return;
    b.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = data.x0 * w;
    const sy = HORIZON * h;

    const sky = b.createLinearGradient(0, 0, 0, h * 0.72);
    sky.addColorStop(0, "#03050b");
    sky.addColorStop(0.5, "#08101f");
    sky.addColorStop(0.85, "#111832");
    sky.addColorStop(1, "#191d39");
    b.fillStyle = sky;
    b.fillRect(0, 0, w, h);
    // a warm glow kept small, so the sky stays navy as in the reference
    const g = b.createRadialGradient(sx, sy, 0, sx, sy, Math.max(w, h) * 0.45);
    g.addColorStop(0, "rgba(255,196,120,0.12)");
    g.addColorStop(0.4, "rgba(232,160,90,0.04)");
    g.addColorStop(1, "rgba(232,160,90,0)");
    b.fillStyle = g;
    b.fillRect(0, 0, w, h);
    const haze = b.createLinearGradient(0, h * 0.38, 0, h * 0.64);
    haze.addColorStop(0, "rgba(255,160,90,0)");
    haze.addColorStop(0.55, "rgba(255,170,100,0.05)");
    haze.addColorStop(1, "rgba(255,160,90,0)");
    b.fillStyle = haze;
    b.fillRect(0, h * 0.38, w, h * 0.26);
    b.fillStyle = "#ece6d6";
    for (const st of stars) {
      b.globalAlpha = st.b * (0.5 + 0.5 * Math.sin(18 * st.s + st.p)) * 0.85;
      b.fillRect(st.x * w, st.y * h, st.r, st.r);
    }
    b.globalAlpha = 1;
  };

  // in front: the star, the hills, mist and grain
  const drawFront = () => {
    const f = front.getContext("2d");
    if (!f || w < 2 || h < 2) return;
    f.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = data.x0 * w;
    const sy = HORIZON * h;
    f.clearRect(0, 0, w, h);
    // the star of the verse, on the horizon, in front of the arcs that leave it
    const r = Math.min(w, h) * 0.16;
    const g = f.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, "rgba(255,222,160,0.55)");
    g.addColorStop(1, "rgba(255,222,160,0)");
    f.fillStyle = g;
    f.fillRect(sx - r, sy - r, 2 * r, 2 * r);
    f.beginPath();
    f.arc(sx, sy, Math.max(3, Math.min(w, h) * 0.012), 0, TAU);
    f.fillStyle = "rgba(255,236,196,0.95)";
    f.fill();

    const step = Math.max(4, w / 160);
    layers.forEach((L, li) => {
      f.beginPath();
      f.moveTo(-4, h);
      for (let x = -4; x <= w + step; x += step) f.lineTo(x, ridge(L, x / w) * h);
      f.lineTo(w + 4, h);
      f.closePath();
      const lg = f.createLinearGradient(0, (L.base - L.amp) * h, 0, h);
      lg.addColorStop(0, L.top);
      lg.addColorStop(1, L.bottom);
      f.fillStyle = lg;
      f.fill();
      if (li < 2) {
        f.strokeStyle = `rgba(255,190,120,${0.06 - li * 0.02})`;
        f.lineWidth = 1;
        f.stroke();
      }
      for (const m of mists) {
        if (m.layer !== li) continue;
        const rxx = m.rx * w;
        const cx = ((m.off + 18 * m.sp) % (w + rxx * 2)) - rxx;
        const cy = m.y * h;
        const mg = f.createRadialGradient(cx, cy, 0, cx, cy, rxx);
        mg.addColorStop(0, `rgba(216,206,192,${m.a})`);
        mg.addColorStop(1, "rgba(216,206,192,0)");
        f.save();
        f.translate(cx, cy);
        f.scale(1, (m.ry * h) / rxx);
        f.translate(-cx, -cy);
        f.fillStyle = mg;
        f.beginPath();
        f.arc(cx, cy, rxx, 0, TAU);
        f.fill();
        f.restore();
      }
    });
    const grain = nctx ? f.createPattern(noise, "repeat") : null;
    if (grain) {
      f.save();
      f.globalAlpha = 0.05;
      f.globalCompositeOperation = "overlay";
      f.fillStyle = grain;
      f.fillRect(0, 0, w, h);
      f.restore();
    }
  };

  // the middle layer: the verse's arcs, half ellipses over the horizon (the CSS clip grows them from the star)
  const drawArcs = () => {
    if (w < 2 || h < 2) return;
    ctx.clearRect(0, 0, w, h);
    const sx = data.x0 * w;
    const sy = HORIZON * h;
    const flatten = Math.min(1, ((HORIZON - ARC_TOP) * h) / (w / 2));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgb(255,204,107)";
    ctx.lineCap = "round";
    for (const a of arcs) {
      const x1 = a.x * w;
      const rx = Math.abs(x1 - sx) / 2;
      if (rx < 0.5) continue;
      ctx.globalAlpha = 0.07 + 0.33 * a.s;
      ctx.lineWidth = 0.6 + 1.1 * a.s;
      ctx.beginPath();
      ctx.ellipse((x1 + sx) / 2, sy, rx, rx * flatten, 0, Math.PI, TAU);
      ctx.stroke();
    }
    ctx.restore();
  };

  const resize = () => {
    const rect = mid.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, rect.width < 700 ? 1.5 : 2);
    w = rect.width;
    h = rect.height;
    for (const c of [back, mid, front]) {
      c.width = Math.max(1, Math.round(w * dpr));
      c.height = Math.max(1, Math.round(h * dpr));
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // one layer per frame, so the one-time drawing never becomes a single long task on a slow phone
    cancelAnimationFrame(job);
    const steps = [drawBack, drawFront, drawArcs];
    const run = () => {
      steps.shift()?.();
      if (steps.length) job = requestAnimationFrame(run);
    };
    job = requestAnimationFrame(run);
  };

  // the observer also delivers the first size, so the scene is drawn once at mount
  let job = 0;
  const ro = new ResizeObserver(resize);
  ro.observe(mid);
  return () => {
    cancelAnimationFrame(job);
    ro.disconnect();
  };
}
