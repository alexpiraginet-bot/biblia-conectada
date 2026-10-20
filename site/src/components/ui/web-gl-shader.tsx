"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./web-gl-shader.module.css";

const VERTEX = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uSize;
uniform float uTime;
out vec4 color;
void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  // Keep the complete wave in view, including a narrow mobile stage.
  float x = (uv.x - 0.5) * 3.0;
  float t = uTime * 0.16;
  float y = uv.y - 0.48;
  vec3 distance = abs(vec3(
    y + sin(x * 1.15 + t) * 0.14,
    y + sin(x * 1.15 + t + 0.38) * 0.16 + 0.06,
    y + sin(x * 1.15 + t - 0.22) * 0.12 - 0.06));
  vec3 waves = vec3(0.005) / (distance + 0.006)
             + vec3(0.003) / (distance + 0.06);
  vec3 light = waves.x * vec3(1.0, 0.72, 0.32)
             + waves.y * vec3(0.60, 0.27, 0.37)
             + waves.z * vec3(0.49, 0.29, 0.53);
  float edge = smoothstep(0.0, 0.09, uv.x) * smoothstep(0.0, 0.09, 1.0 - uv.x);
  vec3 sky = mix(vec3(0.098, 0.051, 0.090), vec3(0.173, 0.078, 0.125), 1.0 - uv.y);
  color = vec4(sky + light * edge * 0.85, 1.0);
}`;

type WaveState = "fallback" | "running" | "paused" | "reduced";
type WaveControl = { togglePause(): void; destroy(): void };

/** One triangle; no geometry, textures, data requests or React updates per frame. */
export function createHeroWaves(canvas: HTMLCanvasElement, onState: (state: WaveState) => void): WaveControl | null {
  let gl: WebGL2RenderingContext | null;
  try {
    gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: "low-power", failIfMajorPerformanceCaveat: true });
  } catch { return null; }
  if (!gl) return null;
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  // Same CPU-renderer rule as sky/renderer.ts, kept local so this small island
  // does not pull the sky's unrelated shader sources into the first page load.
  if (/swiftshader|llvmpipe|softpipe|basic render|software rasterizer/i.test(renderer)) return null;
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  const dispose = () => {
    if (vao) gl.deleteVertexArray(vao);
    if (program) gl.deleteProgram(program);
    shaders.forEach((shader) => gl.deleteShader(shader));
  };
  try {
    for (const [kind, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
      const shader = gl.createShader(kind);
      if (!shader) throw new Error("Shader unavailable");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Shader unavailable");
    }
    program = gl.createProgram();
    if (!program) throw new Error("Program unavailable");
    shaders.forEach((shader) => gl.attachShader(program!, shader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Program unavailable");
    vao = gl.createVertexArray();
    if (!vao) throw new Error("Canvas unavailable");
  } catch { dispose(); return null; }
  const size = gl.getUniformLocation(program, "uSize"), time = gl.getUniformLocation(program, "uTime");
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = false, lost = false, destroyed = false, dirty = true;
  let inView = false, raf = 0, timer = 0, elapsed = 0, last = 0;
  const visible = () => !destroyed && !lost && inView && !document.hidden && canvas.width > 0 && canvas.height > 0;
  const moving = () => !paused && !media.matches;
  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    if (timer) window.clearTimeout(timer);
    raf = timer = last = 0;
  };
  const frame = (now: number) => {
    raf = 0;
    if (!visible()) { stop(); return; }
    if (moving() && last) elapsed += Math.min(now - last, 100) / 1000;
    last = moving() ? now : 0;
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(size, canvas.width, canvas.height);
    gl.uniform1f(time, elapsed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    dirty = false;
    canvas.dataset.ready = "true";
    if (moving()) timer = window.setTimeout(() => {
      timer = 0;
      if (visible() && moving()) raf = requestAnimationFrame(frame);
    }, 1000 / 30);
  };
  const sync = () => {
    stop();
    if (visible() && (dirty || moving())) raf = requestAnimationFrame(frame);
  };
  const preference = () => {
    if (lost || destroyed) return;
    onState(media.matches ? "reduced" : paused ? "paused" : "running");
    dirty = true;
    sync();
  };
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) { inView = false; sync(); return; }
    const scale = Math.min(window.devicePixelRatio || 1, 1.5, 1440 / rect.width, 900 / rect.height);
    const width = Math.max(1, Math.floor(rect.width * scale)), height = Math.max(1, Math.floor(rect.height * scale));
    if (width !== canvas.width || height !== canvas.height) {
      canvas.width = width; canvas.height = height; dirty = true;
    }
    sync();
  };
  const onLost = () => {
    lost = true;
    stop();
    delete canvas.dataset.ready;
    onState("fallback");
  };
  const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); });
  const resizer = new ResizeObserver(resize);
  observer.observe(canvas);
  resizer.observe(canvas);
  media.addEventListener("change", preference);
  document.addEventListener("visibilitychange", sync);
  canvas.addEventListener("webglcontextlost", onLost);
  resize();
  preference();
  return {
    togglePause() { paused = !paused; preference(); },
    destroy() {
      destroyed = true;
      stop();
      observer.disconnect(); resizer.disconnect();
      media.removeEventListener("change", preference);
      document.removeEventListener("visibilitychange", sync);
      canvas.removeEventListener("webglcontextlost", onLost);
      if (!lost) dispose();
      delete canvas.dataset.ready;
    },
  };
}

export function WebGLShader() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const waves = useRef<WaveControl | null>(null);
  const [state, setState] = useState<WaveState>("fallback");
  useEffect(() => {
    if (!canvas.current) return;
    waves.current = createHeroWaves(canvas.current, setState);
    return () => { waves.current?.destroy(); waves.current = null; };
  }, []);
  return <div className={styles.root}>
    <div className={styles.still} aria-hidden="true">
      <svg viewBox="0 0 800 480" preserveAspectRatio="none" focusable="false">
        <path d="M-40 185C175 140 370 380 840 282" />
        <path d="M-40 210C170 148 380 342 840 254" />
        <path d="M-40 166C190 144 370 401 840 300" />
      </svg>
    </div>
    <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
    {state !== "fallback" && <button type="button" className={styles.control}
      aria-pressed={state === "paused"} disabled={state === "reduced"}
      onClick={() => waves.current?.togglePause()}>
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
        {state === "paused" ? <path d="m7 4 9 6-9 6Z" fill="currentColor" /> : <path d="M7 4v12m6-12v12" stroke="currentColor" strokeWidth="2" />}
      </svg>
      {state === "reduced" ? "Movimento reduzido" : state === "paused" ? "Retomar ondas" : "Pausar ondas"}
    </button>}
  </div>;
}
