// Minimal reader for NumPy .npz archives (zip of .npy files), enough for estudos/biblia-referencias/data/xref.npz.
// Supports little-endian int16/int32/int64 C-order 1-D arrays, which is everything analyze.py writes.
import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";

export type NpyArray = { dtype: string; shape: number[]; data: number[] };

const DTYPES: Record<string, { bytes: number; read: (v: DataView, o: number) => number }> = {
  "<i2": { bytes: 2, read: (v, o) => v.getInt16(o, true) },
  "<i4": { bytes: 4, read: (v, o) => v.getInt32(o, true) },
  "<i8": {
    bytes: 8,
    read: (v, o) => {
      const n = v.getBigInt64(o, true);
      if (n > BigInt(Number.MAX_SAFE_INTEGER) || n < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error(`int64 out of range: ${n}`);
      return Number(n);
    },
  },
};

export function parseNpy(buf: Uint8Array): NpyArray {
  const magic = String.fromCharCode(...buf.subarray(1, 6));
  if (buf[0] !== 0x93 || magic !== "NUMPY") throw new Error("not a .npy file");
  const major = buf[6];
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const headerLen = major === 1 ? view.getUint16(8, true) : view.getUint32(8, true);
  const headerStart = major === 1 ? 10 : 12;
  const header = new TextDecoder("latin1").decode(buf.subarray(headerStart, headerStart + headerLen));
  const descr = /'descr':\s*'([^']+)'/.exec(header)?.[1];
  const fortran = /'fortran_order':\s*(True|False)/.exec(header)?.[1];
  const shapeStr = /'shape':\s*\(([^)]*)\)/.exec(header)?.[1];
  if (!descr || !fortran || shapeStr === undefined) throw new Error(`bad npy header: ${header}`);
  if (fortran !== "False") throw new Error("fortran order not supported");
  const shape = shapeStr.split(",").map((s) => s.trim()).filter(Boolean).map(Number);
  const dt = DTYPES[descr];
  if (!dt) throw new Error(`dtype not supported: ${descr}`);
  const count = shape.reduce((a, b) => a * b, 1);
  const start = headerStart + headerLen;
  if (buf.byteLength - start !== count * dt.bytes) throw new Error(`npy size mismatch for ${descr} ${shape}`);
  const data = new Array<number>(count);
  for (let i = 0; i < count; i++) data[i] = dt.read(view, start + i * dt.bytes);
  return { dtype: descr, shape, data };
}

export function readNpz(path: string): Record<string, NpyArray> {
  const files = unzipSync(readFileSync(path));
  const out: Record<string, NpyArray> = {};
  for (const [name, bytes] of Object.entries(files)) out[name.replace(/\.npy$/, "")] = parseNpy(bytes);
  return out;
}
