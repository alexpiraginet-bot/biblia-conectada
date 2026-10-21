// Lossless, reproducible raster sizes from the product's vector mark. No remote assets.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(path.join(root, "src/app/icon.svg"));
const destination = path.join(root, "public/icons");
await mkdir(destination, { recursive: true });
for (const size of [192, 512]) {
  await sharp(source).resize(size, size).png().toFile(path.join(destination, `app-${size}-v1.png`));
}
// The mark (including its endpoints) fits inside the centred 80% safe circle.
await sharp(source).resize(512, 512).png().toFile(path.join(destination, "app-maskable-512-v1.png"));
await sharp(source).resize(180, 180).png().toFile(path.join(root, "src/app/apple-icon.png"));

// ICO containers with PNG entries are supported by modern browsers; include both tab sizes.
const sizes = [32, 48];
const entries = await Promise.all(sizes.map((size) => sharp(source).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * entries.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(entries.length, 4);
let offset = header.length;
entries.forEach((entry, index) => {
  const at = 6 + 16 * index;
  header[at] = sizes[index];
  header[at + 1] = sizes[index];
  header.writeUInt16LE(1, at + 4);
  header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(entry.length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += entry.length;
});
await writeFile(path.join(root, "src/app/favicon.ico"), Buffer.concat([header, ...entries]));
console.log("Generated 192/512/maskable PNG, Apple 180 PNG and 32/48 ICO from icon.svg.");
