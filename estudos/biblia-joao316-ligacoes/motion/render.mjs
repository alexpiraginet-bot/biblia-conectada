// Render "João 3:16, por dentro" with the Remotion Node API (no Studio).
//   node render.mjs                 -> ../renders/.film/video.mp4 (silent master; audio is mixed by score.py/finalize.py)
//   node render.mjs --still 0,12.5  -> ../renders/.stills/still-<t>.png
//   node render.mjs --cover         -> ../renders/.stills/cover.png (frame 0: the hook)
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bundle} from "@remotion/bundler";
import {renderMedia, renderStill, selectComposition} from "@remotion/renderer";

const here = path.dirname(fileURLToPath(import.meta.url));
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const serveUrl = await bundle({entryPoint: path.join(here, "src/index.ts")});
const composition = await selectComposition({serveUrl, id: "Main", browserExecutable});
const arg = process.argv.indexOf("--still");
if (process.argv.includes("--cover")) {
  const output = path.join(here, "../renders/.stills/cover.png");
  await renderStill({composition, serveUrl, output, frame: 0, browserExecutable});
  console.log("cover", output);
} else if (arg > 0) {
  const times = (process.argv[arg + 1] || "0").split(",").map(Number);
  for (const t of times) {
    const output = path.join(here, `../renders/.stills/still-${t.toFixed(2)}.png`);
    await renderStill({composition, serveUrl, output, frame: Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps)), browserExecutable});
    console.log("still", output);
  }
} else {
  const output = path.join(here, "../renders/.film/video.mp4");
  let last = -1;
  await renderMedia({
    composition, serveUrl, codec: "h264", crf: 15, muted: true, outputLocation: output, browserExecutable,
    concurrency: 2, imageFormat: "jpeg", jpegQuality: 92,
    onProgress: ({progress}) => {
      const p = Math.floor(progress * 20);
      if (p !== last) { last = p; console.log(`render ${Math.round(progress * 100)}%`); }
    },
  });
  console.log("video", output);
}
