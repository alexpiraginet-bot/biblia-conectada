// Render "A outra marca" (video 8) with the Remotion Node API (no Studio).
//   node render.mjs                 -> ../renders/.film/video.mp4 (silent master; audio is mixed by score.py/finalize.py)
//   node render.mjs --still 0,12.5  -> ../renders/.stills/still-<t>.png
//   node render.mjs --cover         -> ../renders/.stills/cover.png (end of line 14: "É qual nome está na sua testa?")
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bundle} from "@remotion/bundler";
import {renderMedia, renderStill, selectComposition} from "@remotion/renderer";

const here = path.dirname(fileURLToPath(import.meta.url));
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const serveUrl = await bundle({entryPoint: path.join(here, "src/index.ts")});
const chromiumOptions = {};
const composition = await selectComposition({serveUrl, id: "Main", browserExecutable, chromiumOptions});
const arg = process.argv.indexOf("--still");
if (process.argv.includes("--cover")) {
  const output = path.join(here, `../renders/.stills/cover${process.env.CUT === "curto" ? "-curto" : ""}.png`);
  await renderStill({composition, serveUrl, output, frame: Math.round((JSON.parse(fs.readFileSync(path.join(here, "src/data.json"), "utf8")).lines.find((l) => l.i === 14).t1 - 0.05) * composition.fps), browserExecutable, chromiumOptions});
  console.log("cover", output);
} else if (arg > 0) {
  const times = (process.argv[arg + 1] || "0").split(",").map(Number);
  for (const t of times) {
    const output = path.join(here, `../renders/.stills/still-${t.toFixed(2)}.png`);
    await renderStill({composition, serveUrl, output, frame: Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps)), browserExecutable, chromiumOptions});
    console.log("still", output);
  }
} else {
  const suffix = process.env.CUT === "curto" ? "-curto" : "";
  const output = path.join(here, `../renders/.film/video${suffix}.mp4`);
  let last = -1;
  await renderMedia({
    composition, serveUrl, codec: "h264", crf: 15, muted: true, outputLocation: output, browserExecutable, chromiumOptions,
    concurrency: 2, imageFormat: "jpeg", jpegQuality: 92,
    onProgress: ({progress}) => {
      const p = Math.floor(progress * 20);
      if (p !== last) { last = p; console.log(`render ${Math.round(progress * 100)}%`); }
    },
  });
  console.log("video", output);
}
