#!/usr/bin/env python3
"""Real-relief 3D map renderer: AWS Terrain Tiles heights + Natural Earth water, drawn with OpenGL 3.3 (moderngl,
headless EGL / Mesa llvmpipe). World units are km: x east, y up, z south; origin = Belém (OpenBible.info coordinates).
  python3 mapgl.py --test   -> renders a few test frames into the scratchpad
"""
import json, math, sys, time
from pathlib import Path
import numpy as np, cv2, moderngl

ROOT = Path(__file__).resolve().parent
W, H = 1080, 1920
PL = json.load(open(ROOT / "data/places.json"))["_points"]
LAT0, LON0 = PL["Bethlehem"]
KY = (111132.92 - 559.82 * math.cos(2 * math.radians(LAT0)) + 1.175 * math.cos(4 * math.radians(LAT0))) / 1000
KX = (111412.84 * math.cos(math.radians(LAT0)) - 93.5 * math.cos(3 * math.radians(LAT0))) / 1000


def ll2xz(lon, lat):
    """lon/lat (deg) -> world x (east km), z (south km)"""
    return (np.asarray(lon) - LON0) * KX, -(np.asarray(lat) - LAT0) * KY


def xz2ll(x, z):
    return LON0 + np.asarray(x) / KX, LAT0 - np.asarray(z) / KY


PLACES = {k: ll2xz(v[1], v[0]) for k, v in PL.items()}  # name -> (x, z)

VS = """
#version 330
uniform mat4 u_vp;
uniform sampler2D u_tex;
uniform float u_exag;
uniform float u_drop;
in vec2 in_xz;
in vec2 in_uv;
out vec2 v_uv;
out vec3 v_wpos;
void main() {
    vec4 t = textureLod(u_tex, in_uv, 0.0);
    float hh = t.g > 0.5 ? t.r : 0.0;
    vec3 p = vec3(in_xz.x, hh * 0.001 * u_exag + u_drop, in_xz.y);
    v_uv = in_uv; v_wpos = p;
    gl_Position = u_vp * vec4(p, 1.0);
}
"""

FS = """
#version 330
uniform sampler2D u_tex;
uniform vec2 u_texel;
uniform vec2 u_km;
uniform float u_exag;
uniform vec3 u_moon_dir;
uniform vec3 u_moon_col;
uniform vec3 u_amb;
uniform vec3 u_cam;
uniform vec3 u_fog_col;
uniform float u_fog_den;
uniform vec4 u_head;
uniform float u_head_r;
uniform vec3 u_head_col;
uniform float u_time;
uniform float u_relief;
uniform vec4 u_hole;
uniform float u_micro;
uniform sampler2D u_ao;
in vec2 v_uv;
in vec3 v_wpos;
out vec4 f_color;
float hgt(vec2 uv) { return max(texture(u_tex, uv).r, -5.0) * 0.001 * u_exag; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.07; a *= 0.5; } return s; }
void main() {
    if (v_wpos.x > u_hole.x && v_wpos.x < u_hole.z && v_wpos.z > u_hole.y && v_wpos.z < u_hole.w) discard;
    vec4 t = texture(u_tex, v_uv);
    vec2 e = u_texel;
    float hl = hgt(v_uv - vec2(e.x, 0.0)), hr = hgt(v_uv + vec2(e.x, 0.0));
    float hu = hgt(v_uv - vec2(0.0, e.y)), hd = hgt(v_uv + vec2(0.0, e.y));
    vec3 n = normalize(vec3(-(hr - hl) / (2.0 * u_km.x) * u_relief, 1.0, -(hd - hu) / (2.0 * u_km.y) * u_relief));
    float dcam = length(u_cam - v_wpos);
    float md = u_micro * (1.0 - smoothstep(2.0, 18.0, dcam));
    if (md > 0.001) {
        vec2 q = v_wpos.xz * 9.0;
        float e0 = fbm(q), ex = fbm(q + vec2(0.35, 0.0)), ez = fbm(q + vec2(0.0, 0.35));
        n = normalize(n + vec3(-(ex - e0), 0.0, -(ez - e0)) * md * 1.2);
    }
    float land = t.g, lake = t.b, river = t.a;
    float water = clamp(max(1.0 - land, max(lake, river * 0.9)), 0.0, 1.0);
    float elev = t.r;
    float north = smoothstep(-20.0, -100.0, v_wpos.z);            // Galilee greener than Judea / Sinai
    float delta = smoothstep(-120.0, -260.0, v_wpos.x) * smoothstep(60.0, 120.0, v_wpos.z); // Nile delta fields
    vec3 sand = vec3(0.46, 0.40, 0.31);
    vec3 lime = vec3(0.52, 0.49, 0.43);
    vec3 olive = vec3(0.24, 0.28, 0.19);
    vec3 alb = mix(sand, lime, smoothstep(250.0, 950.0, elev));
    alb = mix(alb, olive, north * 0.6 * (1.0 - smoothstep(700.0, 1200.0, elev)));
    alb = mix(alb, vec3(0.30, 0.36, 0.24), delta * (1.0 - smoothstep(10.0, 40.0, elev)) * 0.8);
    float slope = 1.0 - n.y;
    alb *= mix(1.0, 0.62, smoothstep(0.05, 0.40, slope));
    float nz = fbm(v_wpos.xz * 1.7) * 0.6 + fbm(v_wpos.xz * 9.0) * 0.4;
    alb *= 0.80 + 0.36 * nz;
    float ao = texture(u_ao, v_uv).r;
    alb *= ao;
    float diff = max(dot(n, u_moon_dir), 0.0);
    float wrap = max(dot(n, u_moon_dir) * 0.5 + 0.5, 0.0);
    vec3 col = alb * (u_moon_col * (diff * 0.85 + wrap * 0.15) + u_amb * (0.6 + 0.4 * n.y));
    vec3 L = u_head.xyz - v_wpos;
    float d = max(length(L), 1e-3);
    float att = u_head.w / (1.0 + (d * d) / (u_head_r * u_head_r));
    col += alb * u_head_col * att * (0.25 + 0.75 * max(dot(n, L / d), 0.0));
    vec3 V = normalize(u_cam - v_wpos);
    if (water > 0.001) {
        vec3 nw = normalize(vec3(sin(v_wpos.x * 2.3 + v_wpos.z * 0.7 + u_time * 1.3) * 0.02, 1.0,
                                 cos(v_wpos.z * 2.9 - v_wpos.x * 0.4 + u_time * 1.1) * 0.02));
        float spec = pow(max(dot(reflect(-u_moon_dir, nw), V), 0.0), 60.0);
        float fres = pow(1.0 - max(V.y, 0.0), 4.0);
        float deep = smoothstep(0.0, 900.0, -t.r);
        vec3 wcol = mix(vec3(0.010, 0.022, 0.044), vec3(0.003, 0.008, 0.020), deep)
                    + u_moon_col * (spec * 0.8 + fres * 0.06) + u_amb * 0.25;
        wcol += u_head_col * att * 0.30;
        col = mix(col, wcol, water);
    }
    float dist = length(u_cam - v_wpos);
    float fog = 1.0 - exp(-dist * u_fog_den);
    col = mix(col, u_fog_col, fog);
    f_color = vec4(col, 1.0);
}
"""

STAR_VS = """
#version 330
uniform mat4 u_vp;
uniform vec3 u_cam;
uniform float u_dist;
uniform float u_scale;
in vec3 in_dir;
in float in_mag;
out float v_mag;
void main() {
    v_mag = in_mag;
    gl_Position = u_vp * vec4(u_cam + in_dir * u_dist, 1.0);
    gl_PointSize = (1.0 + 2.2 * in_mag) * u_scale;
}
"""
STAR_FS = """
#version 330
uniform float u_bright;
in float v_mag;
out vec4 f_color;
void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float a = exp(-dot(c, c) * 3.0);
    f_color = vec4(vec3(0.80, 0.86, 1.0) * a * u_bright * (0.25 + 1.6 * v_mag * v_mag), 1.0);
}
"""

SKY_VS = """
#version 330
in vec2 in_pos;
out vec2 v_ndc;
void main() { v_ndc = in_pos; gl_Position = vec4(in_pos, 0.9999, 1.0); }
"""
SKY_FS = """
#version 330
uniform mat4 u_inv_vp;
uniform vec3 u_cam;
uniform vec3 u_horizon;
uniform vec3 u_zenith;
uniform vec3 u_glow_dir;
uniform vec3 u_glow_col;
in vec2 v_ndc;
out vec4 f_color;
void main() {
    vec4 a = u_inv_vp * vec4(v_ndc, 1.0, 1.0);
    vec3 dir = normalize(a.xyz / a.w - u_cam);
    float el = clamp(dir.y, -0.2, 1.0);
    float k = pow(clamp(el, 0.0, 1.0), 0.45);
    vec3 col = mix(u_horizon, u_zenith, k);
    col += u_glow_col * pow(max(dot(dir, u_glow_dir), 0.0), 6.0);
    f_color = vec4(col, 1.0);
}
"""


def despike(Hm):
    med = cv2.medianBlur(Hm.astype(np.float32), 5)
    bad = np.abs(Hm - med) > 250
    Hm = Hm.copy(); Hm[bad] = med[bad]
    return Hm


class Terrain:
    """One height grid (Web-Mercator pixels at zoom z) as a GPU mesh + RGBA32F texture (height m, land, lake, river)."""

    def __init__(self, ctx, prog, name, step=3):
        d = np.load(ROOT / f"data/terrain/{name}.npz")
        Hm = despike(d["h"].astype(np.float32)); self.z = z = int(d["z"]); px0, py0 = int(d["px0"]), int(d["py0"])
        m = np.load(ROOT / f"data/terrain/{name}_mask.npz")["m"].astype(np.float32) / 255
        land, lake, river = m[..., 0], m[..., 1], m[..., 2]
        Hm = np.where(land < 0.5, np.minimum(Hm, 0.0), Hm).astype(np.float32)    # sea: bathymetry (surface drawn at 0)
        nl, lab = cv2.connectedComponents((lake > 0.5).astype(np.uint8))
        for k in range(1, nl):                                                        # flat lake surfaces
            sel = lab == k
            Hm[sel] = np.median(Hm[sel])
        self.h_m = Hm
        h, w = Hm.shape
        self.n = n = 256 * 2 ** z
        self.px0, self.py0, self.w, self.h = px0, py0, w, h
        cols = np.arange(0, w, step); rows = np.arange(0, h, step)
        if cols[-1] != w - 1: cols = np.append(cols, w - 1)
        if rows[-1] != h - 1: rows = np.append(rows, h - 1)
        lon = (px0 + cols + 0.5) / n * 360 - 180
        lat = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * (py0 + rows + 0.5) / n))))
        X, _ = ll2xz(lon, LAT0); _, Z = ll2xz(LON0, lat)
        gx, gz = np.meshgrid(X, Z)
        gu, gv = np.meshgrid((cols + 0.5) / w, (rows + 0.5) / h)
        verts = np.stack([gx, gz, gu, gv], -1).astype(np.float32).reshape(-1, 4)
        R, C = len(rows), len(cols)
        i = np.arange(R - 1)[:, None] * C + np.arange(C - 1)[None, :]
        tri = np.stack([i, i + C, i + 1, i + 1, i + C, i + C + 1], -1).astype(np.int32).reshape(-1)
        self.vbo = ctx.buffer(verts.tobytes()); self.ibo = ctx.buffer(tri.tobytes())
        self.vao = ctx.vertex_array(prog, [(self.vbo, "2f 2f", "in_xz", "in_uv")], self.ibo)
        # cavity / ambient-occlusion proxy: valleys below their 1.5 km neighbourhood get darker
        lat_c0 = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (py0 + h / 2) / n))))
        kmpx = 40075.016686 * math.cos(math.radians(lat_c0)) / n
        sig = max(1.0, 1.5 / kmpx)
        rel = np.maximum(Hm, 0) - cv2.GaussianBlur(np.maximum(Hm, 0), (0, 0), sig)
        ao = np.clip(1.0 + rel / 160.0, 0.50, 1.12).astype(np.float32)
        self.ao = ctx.texture((w, h), 1, ao.tobytes(), dtype="f4"); self.ao.filter = (moderngl.LINEAR, moderngl.LINEAR)
        tex = np.dstack([Hm, land, lake, river]).astype(np.float32)
        self.tex = ctx.texture((w, h), 4, tex.tobytes(), dtype="f4")
        self.tex.filter = (moderngl.LINEAR, moderngl.LINEAR)
        self.tex.repeat_x = self.tex.repeat_y = False
        lat_c = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (py0 + h / 2) / n))))
        self.km_px = 40075.016686 * math.cos(math.radians(lat_c)) / n          # ground km per texel
        self.ntri = len(tri) // 3
        x0, z1 = ll2xz(px0 / n * 360 - 180, math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (py0 + h) / n)))))
        x1, z0 = ll2xz((px0 + w) / n * 360 - 180, math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * py0 / n)))))
        self.bounds = (float(x0), float(z0), float(x1), float(z1))

    def height(self, x, z):
        """terrain height in metres at world x, z (bilinear; sea = 0)"""
        lon, lat = xz2ll(x, z)
        px = (np.asarray(lon) + 180) / 360 * self.n - self.px0 - 0.5
        s = np.sin(np.radians(lat))
        py = (0.5 - np.log((1 + s) / (1 - s)) / (4 * np.pi)) * self.n - self.py0 - 0.5
        px = np.clip(px, 0, self.w - 1.001); py = np.clip(py, 0, self.h - 1.001)
        x0 = np.floor(px).astype(int); y0 = np.floor(py).astype(int); fx = px - x0; fy = py - y0
        Hm = np.maximum(self.h_m, 0.0)
        return (Hm[y0, x0] * (1 - fx) * (1 - fy) + Hm[y0, x0 + 1] * fx * (1 - fy) + Hm[y0 + 1, x0] * (1 - fx) * fy
                + Hm[y0 + 1, x0 + 1] * fx * fy)


def height_any(terrains, x, z):
    """height (m) from the finest grid that contains each point (terrains ordered fine -> coarse)"""
    x = np.asarray(x, float); z = np.asarray(z, float)
    out = np.full(x.shape, np.nan)
    for t in terrains:
        x0, z0, x1, z1 = t.bounds
        m = np.isnan(out) & (x > x0 + 0.2) & (x < x1 - 0.2) & (z > z0 + 0.2) & (z < z1 - 0.2)
        if m.any(): out[m] = t.height(x[m], z[m])
    return np.nan_to_num(out, nan=0.0)


def look_at(eye, target, up=(0, 1, 0), roll=0.0):
    eye, target = np.asarray(eye, float), np.asarray(target, float)
    f = target - eye; f /= np.linalg.norm(f)
    r = np.cross(f, up); r /= np.linalg.norm(r)
    u = np.cross(r, f)
    if roll:
        c, s = math.cos(math.radians(roll)), math.sin(math.radians(roll))
        r, u = r * c + u * s, -r * s + u * c
    M = np.eye(4)
    M[0, :3], M[1, :3], M[2, :3] = r, u, -f
    M[:3, 3] = -M[:3, :3] @ eye
    return M


def perspective(fovy, aspect, near, far):
    f = 1 / math.tan(math.radians(fovy) / 2)
    M = np.zeros((4, 4))
    M[0, 0] = f / aspect; M[1, 1] = f
    M[2, 2] = (far + near) / (near - far); M[2, 3] = 2 * far * near / (near - far); M[3, 2] = -1
    return M


class Cam:
    def __init__(self, eye, target, fovy=42.0, roll=0.0):
        self.eye = np.asarray(eye, float); self.target = np.asarray(target, float); self.fovy = fovy; self.roll = roll
        alt = max(self.eye[1], 0.05)
        self.near = max(0.02, alt * 0.03); self.far = max(400.0, alt * 6 + 600)
        self.V = look_at(self.eye, self.target, roll=roll)
        self.P = perspective(fovy, W / H, self.near, self.far)
        self.VP = self.P @ self.V

    def project(self, pts):
        """pts (N,3) world -> (N,2) screen px, (N,) view depth (km, >0 in front)"""
        p = np.c_[np.asarray(pts, float), np.ones(len(pts))]
        c = (self.VP @ p.T).T
        wv = c[:, 3]
        ok = wv > 1e-6
        nd = np.where(ok[:, None], c[:, :3] / np.where(ok, wv, 1)[:, None], 0)
        sx = (nd[:, 0] + 1) * 0.5 * W; sy = (1 - nd[:, 1]) * 0.5 * H
        return np.stack([sx, sy], 1), np.where(ok, wv, -1.0)


class Renderer:
    def __init__(self, samples=4):
        self.ctx = moderngl.create_standalone_context(backend="egl")
        self.prog = self.ctx.program(vertex_shader=VS, fragment_shader=FS)
        self.sky = self.ctx.program(vertex_shader=SKY_VS, fragment_shader=SKY_FS)
        tri = np.array([-1, -1, 3, -1, -1, 3], np.float32)
        self.sky_vao = self.ctx.vertex_array(self.sky, [(self.ctx.buffer(tri.tobytes()), "2f", "in_pos")])
        self.star = self.ctx.program(vertex_shader=STAR_VS, fragment_shader=STAR_FS)
        rs = np.random.default_rng(1225)
        d = rs.normal(size=(2600, 3)); d[:, 1] = np.abs(d[:, 1]) * 0.9 + 0.02; d /= np.linalg.norm(d, axis=1, keepdims=True)
        mag = (rs.random(2600) ** 6).astype(np.float32)
        sv = np.c_[d, mag].astype(np.float32)
        self.star_vao = self.ctx.vertex_array(self.star, [(self.ctx.buffer(sv.tobytes()), "3f 1f", "in_dir", "in_mag")])
        self.samples = samples
        self.ms = self.ctx.framebuffer(color_attachments=[self.ctx.renderbuffer((W, H), 4, samples=samples, dtype="f4")],
                                       depth_attachment=self.ctx.depth_renderbuffer((W, H), samples=samples))
        self.res = self.ctx.framebuffer(color_attachments=[self.ctx.renderbuffer((W, H), 4, dtype="f4")])
        self.terrains = {}

    def terrain(self, name, step=3):
        if name not in self.terrains:
            self.terrains[name] = Terrain(self.ctx, self.prog, name, step)
        return self.terrains[name]

    def render(self, cam, ter, exag=2.5, t=0.0, light=None, bg=None, bg2=None):
        L = dict(moon_dir=(-0.88, 0.30, 0.36), moon_col=(0.24, 0.31, 0.52), amb=(0.006, 0.009, 0.020),
                 fog_col=(0.012, 0.019, 0.040), fog_den=0.0030, head=(0, 0, 0, 0), head_r=6.0, head_col=(1.0, 0.62, 0.26),
                 horizon=(0.011, 0.017, 0.036), zenith=(0.0010, 0.0022, 0.0070), glow_dir=(-0.95, 0.05, 0.25),
                 glow_col=(0.010, 0.009, 0.016), relief=1.7)
        if light: L.update(light)
        ctx = self.ctx
        self.ms.use(); ctx.clear(0, 0, 0, 1.0); ctx.enable(moderngl.DEPTH_TEST)
        sk = self.sky
        sk["u_inv_vp"].write(np.linalg.inv(cam.VP).T.astype("f4").tobytes())
        sk["u_cam"].value = tuple(cam.eye)
        md = np.asarray(L["moon_dir"], float); md /= np.linalg.norm(md)
        gd = np.asarray(L["glow_dir"], float); gd /= np.linalg.norm(gd)
        sk["u_horizon"].value = tuple(L["horizon"]); sk["u_zenith"].value = tuple(L["zenith"])
        sk["u_glow_dir"].value = tuple(gd); sk["u_glow_col"].value = tuple(L["glow_col"])
        ctx.depth_func = "<="
        self.sky_vao.render(moderngl.TRIANGLES)
        if L.get("stars", 0) > 0:     # star field: points at a fixed far distance, hidden by the terrain via the depth test
            ctx.enable(moderngl.PROGRAM_POINT_SIZE | moderngl.BLEND)
            ctx.blend_func = moderngl.ONE, moderngl.ONE
            st = self.star
            st["u_vp"].write(cam.VP.T.astype("f4").tobytes()); st["u_cam"].value = tuple(cam.eye)
            st["u_dist"].value = cam.far * 0.8; st["u_bright"].value = float(L["stars"]); st["u_scale"].value = 1.0
            ctx.depth_mask = False
            self.star_vao.render(moderngl.POINTS)
            ctx.depth_mask = True
            ctx.disable(moderngl.BLEND)
        ctx.depth_func = "<"
        pr = self.prog
        pr["u_vp"].write(cam.VP.T.astype("f4").tobytes())
        pr["u_exag"].value = exag
        pr["u_texel"].value = (1 / ter.w, 1 / ter.h)
        pr["u_km"].value = (ter.km_px, ter.km_px)
        pr["u_moon_dir"].value = tuple(md); pr["u_moon_col"].value = tuple(L["moon_col"]); pr["u_amb"].value = tuple(L["amb"])
        pr["u_cam"].value = tuple(cam.eye); pr["u_fog_col"].value = tuple(L["fog_col"]); pr["u_fog_den"].value = L["fog_den"]
        pr["u_head"].value = tuple(L["head"]); pr["u_head_r"].value = L["head_r"]; pr["u_head_col"].value = tuple(L["head_col"])
        pr["u_time"].value = t; pr["u_relief"].value = L["relief"]; pr["u_micro"].value = L.get("micro", 0.0)
        pr["u_tex"].value = 0; pr["u_ao"].value = 1
        chain = [ter] + [g for g in (bg, bg2) if g is not None]
        for lev in range(len(chain) - 1, 0, -1):   # coarse grids around the detailed one: holed where they overlap, a hair lower
            g, finer = chain[lev], chain[lev - 1]
            pr["u_texel"].value = (1 / g.w, 1 / g.h); pr["u_km"].value = (g.km_px, g.km_px)
            b = finer.bounds; m_ = 0.6 * (g.km_px / 0.1) ** 0.5
            pr["u_hole"].value = (b[0] + m_, b[1] + m_, b[2] - m_, b[3] - m_); pr["u_drop"].value = -0.004 * lev
            g.tex.use(0); g.ao.use(1); g.vao.render(moderngl.TRIANGLES)
        pr["u_texel"].value = (1 / ter.w, 1 / ter.h); pr["u_km"].value = (ter.km_px, ter.km_px)
        pr["u_hole"].value = (1e9, 1e9, -1e9, -1e9); pr["u_drop"].value = 0.0
        ter.tex.use(0); ter.ao.use(1)
        ter.vao.render(moderngl.TRIANGLES)
        ctx.copy_framebuffer(self.res, self.ms)
        img = np.frombuffer(self.res.read(components=3, dtype="f4"), np.float32).reshape(H, W, 3)
        return np.ascontiguousarray(img[::-1])


def aces(x):
    return np.clip((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0, 1)


def grade(img, exposure=1.0):
    """ACES tone map + blue-hour grade (navy shadows, warm highlights), sRGB-ish gamma"""
    x = aces(img * exposure)
    lum = x.mean(-1, keepdims=True)
    x = x + (1 - lum) ** 4 * np.array([-0.004, 0.002, 0.012]) + lum ** 2 * np.array([0.02, 0.008, -0.015])
    return np.clip(np.clip(x, 0, 1) ** (1 / 2.2), 0, 1)


def test():
    S = Path(__file__).resolve().parent / "renders/.stills"; S.mkdir(parents=True, exist_ok=True)
    R = Renderer()
    cor = R.terrain("corridor", 2); wide = R.terrain("wide", 3); jud = R.terrain("judea12", 2)
    naz = PLACES["Nazareth"]; bel = PLACES["Bethlehem"]; jer = PLACES["Jerusalem"]
    hb = jud.height(np.array([bel[0]]), np.array([bel[1]]))[0] / 1000
    shots = [
        ("cor-naz", cor, wide, 2.6, Cam((naz[0] + 6, 9.0, naz[1] - 22), (naz[0], 0.4, naz[1] + 4), 46), (naz[0], 1.2, naz[1], 1.6)),
        ("cor-south", cor, wide, 2.6, Cam((naz[0] + 2, 22.0, naz[1] - 18), (bel[0], 0.0, bel[1]), 44), (naz[0], 1.2, naz[1], 1.6)),
        ("wide-high", wide, None, 3.0, Cam((-120, 420, 160), (-110, 0, -20), 40), (bel[0], 2, bel[1], 1.0)),
        ("jud-low", jud, cor, 2.0, Cam((jer[0] + 1.5, 2.6, jer[1] - 3.0), (bel[0], hb * 2, bel[1]), 48), (bel[0], hb * 2 + 0.25, bel[1], 2.2)),
    ]
    for name, ter, bg, ex, cam, head in shots:
        t0 = time.time()
        img = R.render(cam, ter, exag=ex, light=dict(head=head, head_r=3.0 if ter is jud else 9.0), bg=bg)
        dt = time.time() - t0
        out = grade(img, 3.2)
        cv2.imwrite(str(S / f"gl-{name}.jpg"), cv2.cvtColor((out * 255).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 88])
        print(name, f"{dt:.2f}s", "mean", img.mean().round(4))
    ims = [cv2.resize(cv2.imread(str(S / f"gl-{n}.jpg")), (405, 720), interpolation=cv2.INTER_AREA) for n, *_ in shots]
    cv2.imwrite(str(S / "gl-sheet.jpg"), np.hstack(ims), [cv2.IMWRITE_JPEG_QUALITY, 88])


if __name__ == "__main__":
    if "--test" in sys.argv: test()
