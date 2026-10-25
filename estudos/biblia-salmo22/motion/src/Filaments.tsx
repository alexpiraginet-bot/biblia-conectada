import React, {useEffect, useLayoutEffect, useRef} from "react";
import {continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import * as THREE from "three";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer.js";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass.js";
import {UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {OutputPass} from "three/examples/jsm/postprocessing/OutputPass.js";

// The light of the film: an open book at the bottom (texture cut from Alex's approved art, source/art/arte-livro.png)
// and filaments of light rising from it, real Three.js geometry whose vertices move every frame. Four shapes, blended
// by time: loose rising fibres (the hook), one arched bundle between two verses (each pair), a column (the psalm
// scrolls) and the open network (Está consumado). The camera never moves. Direction: the "Formas fluidas V2" package
// Alex sent on 25/10 (filaments as 3D curves, book as the only raster, gold -> magenta -> violet).
export type Keys = {
  pairs: {t0: number; t1: number; yPx: number}[];   // when each arched bundle lives, and its screen height
  column: [number, number];                          // the psalm scroll
  burst: number;                                     // "Está consumado"
  end: number;
};

const W = 1080, H = 1920, K = 120, N = 70, COPIES = 2;
const PPU = 243.6;                                   // px per world unit at z=0 (fov 43, camera z=10)
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smoother = (x: number) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const toWorldY = (py: number) => (960 - py) / PPU;

type Rig = {renderAt: (t: number) => void};

function build(canvas: HTMLCanvasElement, keys: Keys, bookImg: HTMLImageElement): Rig {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: true});
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(new THREE.Color(0.0008, 0.0014, 0.0026));   // ~#04070C after the sRGB output
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene(), bookScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(43, W / H, 0.1, 50); camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.42, 0.25, 0.62));
  composer.addPass(new OutputPass());

  // one curve per filament; rank spreads them deterministically
  const golden = 0.61803398875;
  const fil = Array.from({length: K}, (_, i) => {
    const r = (i * golden) % 1, r2 = ((i + 7) * golden * 1.37) % 1;
    const hue = 0.11 - 0.37 * r;                      // gold (0.11) -> magenta -> violet (-0.26 == 0.74)
    const col = new THREE.Color().setHSL(((hue % 1) + 1) % 1, 0.9, 0.62).convertSRGBToLinear();
    return {r, r2, col, x0: (r - 0.5) * 2.6, node: i % 6};
  });
  const P = K * COPIES, vertCount = P * (N - 1) * 2;
  const pos = new Float32Array(vertCount * 3), colors = new Float32Array(vertCount * 3);
  const cur = new Float32Array(P * N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  for (let k = 0; k < P; k++) {
    const f = fil[Math.floor(k / COPIES)]; const c = f.col.clone().multiplyScalar(k % COPIES === 0 ? 1.25 : 0.4);
    for (let j = 0; j < (N - 1) * 2; j++) { const b = (k * (N - 1) * 2 + j) * 3; colors[b] = c.r; colors[b + 1] = c.g; colors[b + 2] = c.b; }
  }
  const mat = new THREE.LineBasicMaterial({vertexColors: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false});
  const mesh = new THREE.LineSegments(geo, mat); mesh.frustumCulled = false; scene.add(mesh);
  // sparks riding the filaments
  const pPos = new Float32Array(P * 3), pCol = new Float32Array(P * 3);
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
  pg.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  for (let k = 0; k < P; k++) { const c = fil[Math.floor(k / COPIES)].col.clone().lerp(new THREE.Color("#fff3d4").convertSRGBToLinear(), 0.65).multiplyScalar(3); pCol.set([c.r, c.g, c.b], k * 3); }
  const pm = new THREE.ShaderMaterial({transparent: true, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending, uniforms: {uAlpha: {value: 0.55}},
    vertexShader: `varying vec3 vColor;void main(){vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=30./(-mv.z);}`,
    fragmentShader: `uniform float uAlpha;varying vec3 vColor;void main(){float d=length(gl_PointCoord-0.5)*2.;float a=exp(-d*d*5.);gl_FragColor=vec4(vColor,a*uAlpha);}`});
  const particles = new THREE.Points(pg, pm); particles.frustumCulled = false; scene.add(particles);
  // the book: the art's book, cut out of the dark with an alpha from brightness
  const c = document.createElement("canvas"); c.width = bookImg.width; c.height = bookImg.height;
  const cx = c.getContext("2d")!; cx.drawImage(bookImg, 0, 0);
  const px = cx.getImageData(0, 0, c.width, c.height);
  for (let j = 0; j < px.data.length; j += 4) {
    const x = (j / 4) % c.width, y = Math.floor(j / 4 / c.width), mx = Math.max(px.data[j], px.data[j + 1], px.data[j + 2]);
    let a = clamp((mx - 15) / 35); a *= clamp(x / 15) * clamp((c.width - x) / 15) * clamp(y / 20) * clamp((c.height - y) / 20);
    px.data[j + 3] *= a;
  }
  cx.putImageData(px, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const bookMat = new THREE.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false, toneMapped: false});
  const book = new THREE.Mesh(new THREE.PlaneGeometry(3.84, 1.14), bookMat); book.position.set(0, -2.22, 0.15); bookScene.add(book);
  const BOOK_TOP = -1.95;
  const nodes = [[-1.48, 1.35, -0.3], [1.45, 1.55, -0.5], [-1.6, -0.3, 0.15], [1.52, -0.2, 0.1], [0.62, 0.7, -1.0], [-0.35, 1.8, -1.3]];
  const nodeAt = (i: number, t: number) => { const a = nodes[i % 6]; return [a[0] + 0.1 * Math.sin(t * 1.35 + i), a[1] + 0.1 * Math.cos(t * 1.15 + i * 0.8), a[2] + 0.18 * Math.sin(t * 0.9 + i)]; };

  const renderAt = (t: number) => {
    const flow = t;
    // which pair is alive, and how much (a bundle rises in 0.5 s and leaves in 0.4 s)
    let pairA = 0, pairY = 0, pairIn = 0;
    for (const p of keys.pairs) {
      const a = Math.min(smoother((t - p.t0) / 0.5), smoother((p.t1 - t) / 0.4));
      if (a > pairA) { pairA = a; pairY = toWorldY(p.yPx); pairIn = smoother((t - p.t0) / 0.9); }
    }
    const colA = Math.min(smoother((t - keys.column[0]) / 0.8), smoother((keys.column[1] - t) / 0.5));
    const burstA = smoother((t - keys.burst) / 1.2);
    const settle = smoother((t - keys.burst - 1.2) / 3);
    let out = 0;
    for (let k = 0; k < P; k++) {
      const f = fil[Math.floor(k / COPIES)], copy = k % COPIES, idx = Math.floor(k / COPIES);
      const inBundle = f.r2 < 0.3;                      // 30% of the filaments join each arched bundle
      const end = nodeAt(f.node, flow), start = idx % 4 === 0 ? nodeAt((idx + 3) % 6, flow) : [0, BOOK_TOP, 0.3];
      for (let j = 0; j < N; j++) {
        const u = j / (N - 1);
        // A. loose fibres rising from the book, ridge-like waves
        const ax = f.x0 * (0.2 + 1.0 * u) + 0.22 * Math.sin(u * 6 + f.r * 6.28 - flow * 1.4) + 0.08 * Math.sin(u * 13 + flow * 2.2 + f.r2 * 4) + copy * 0.013;
        const ay = BOOK_TOP + u * (2.6 + 1.3 * f.r2) + 0.06 * Math.sin(u * 9 - flow * 1.6 + f.r * 3);
        const az = 0.5 * Math.sin(u * 4 + f.r * 6.28 - flow * 1.1) + (copy - 0.5) * 0.1 + (f.r2 - 0.5) * 1.2;
        // B. the arched bundle between the two verses of a pair (from the book up to the left verse, across, down... no:
        //    left verse -> right verse, as an arc; the other fibres fall back and dim)
        const bx = lerp(-1.6 + (f.r - 0.5) * 0.6, 1.6 + (f.r2 * 3.3 % 1 - 0.5) * 0.6, u) + 0.04 * Math.sin(u * 12 + f.r * 6.28 + flow * 2.5);
        const by = pairY + (f.r - 0.5) * 0.3 * (1 - u) + (f.r2 * 3.3 % 1 - 0.5) * 0.3 * u + Math.sin(Math.PI * u) * (0.45 + 0.6 * f.r) + 0.03 * Math.sin(u * 10 - flow * 2);
        const bz = (f.r - 0.5) * 0.9 + 0.2 * Math.sin(Math.PI * u + f.r2 * 3) + copy * 0.03;
        // C. a column rising straight from the book (the psalm scrolls)
        const cxx = 1.25 + f.x0 * 0.32 * (1 - 0.6 * u) + 0.06 * Math.sin(u * 14 - flow * 3 + f.r * 6.28) + copy * 0.013;
        const cy = BOOK_TOP + u * (5.2 + 0.8 * f.r2);
        const cz = (f.r2 - 0.5) * 0.8 + 0.1 * Math.sin(u * 7 + flow);
        // D. the open network: book -> six drifting nodes (the arched flower of the reference)
        const v = 1 - u;
        const dx = v * start[0] + u * end[0] + Math.sin(Math.PI * u) * (0.25 * Math.sin(idx * 0.71) + 0.1 * Math.sin(flow * 1.7 + u * 4));
        const dy = v * start[1] + u * end[1] + Math.sin(Math.PI * u) * (0.45 + 0.28 * f.r) + 0.055 * Math.sin(u * 8 - flow * 2.1) * Math.sin(Math.PI * u);
        const dz = v * start[2] + u * end[2] + Math.sin(Math.PI * u) * (0.55 * Math.sin(idx * 0.37) + 0.18 * Math.sin(flow * 1.1 + u * 5)) + copy * 0.045;
        // blend: A is the base; bundle fibres go to B while a pair is alive; everything goes to C in the column, D in the burst
        const wB = pairA * (inBundle ? 1 : 0), wA = 1 - wB;
        let x = ax * wA + bx * wB, y = ay * wA + by * wB, z = az * wA + bz * wB;
        // fibres outside the bundle sink and tighten while a pair is shown
        if (!inBundle) { const s = pairA * 0.55; x = lerp(x, f.x0 * 0.3, s); y = lerp(y, BOOK_TOP + u * 1.1, s); }
        x = lerp(x, cxx, colA); y = lerp(y, cy, colA); z = lerp(z, cz, colA);
        x = lerp(x, dx, burstA); y = lerp(y, dy, burstA); z = lerp(z, dz, burstA);
        const bi = (k * N + j) * 3; cur[bi] = x; cur[bi + 1] = y; cur[bi + 2] = z;
      }
      for (let j = 0; j < N - 1; j++) { const a = (k * N + j) * 3, b = a + 3; pos[out++] = cur[a]; pos[out++] = cur[a + 1]; pos[out++] = cur[a + 2]; pos[out++] = cur[b]; pos[out++] = cur[b + 1]; pos[out++] = cur[b + 2]; }
      const pu = (flow * (0.11 + f.r * 0.075) + f.r) % 1, pi = Math.min(N - 2, Math.floor(pu * (N - 1))), fr = pu * (N - 1) - pi, off = (k * N + pi) * 3;
      pPos[k * 3] = lerp(cur[off], cur[off + 3], fr); pPos[k * 3 + 1] = lerp(cur[off + 1], cur[off + 4], fr); pPos[k * 3 + 2] = lerp(cur[off + 2], cur[off + 5], fr);
    }
    geo.attributes.position.needsUpdate = true; pg.attributes.position.needsUpdate = true;
    // intensity: dim behind the pairs' text, full in the burst, settling to the end
    mat.opacity = 0.5 * (1 + 0.5 * burstA) * (1 - 0.25 * settle);
    (pm.uniforms.uAlpha as {value: number}).value = 0.55 * (1 - 0.3 * settle);
    composer.render();
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(bookScene, camera); renderer.autoClear = true;
  };
  return {renderAt};
}

export const Filaments: React.FC<{keys: Keys; opacity?: number}> = ({keys, opacity = 1}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const rig = useRef<Rig | null>(null);
  const handle = useRef<number | null>(null);
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (handle.current === null) handle.current = delayRender("three");
  useEffect(() => {
    const img = new Image();
    img.src = staticFile("img/book.png");
    img.decode().then(() => {
      rig.current = build(ref.current!, keys, img);
      rig.current.renderAt(frame / fps);
      if (handle.current !== null) { continueRender(handle.current); handle.current = null; }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => { rig.current?.renderAt(frame / fps); }, [frame, fps]);
  return <canvas ref={ref} width={W} height={H} style={{position: "absolute", left: 0, top: 0, width: W, height: H, opacity}} />;
};
