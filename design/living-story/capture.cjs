/** Render the supplied, unchanged HTML with its own deterministic renderFluidAt().
 * No frontend dependency, package install, remote asset or hardware GPU is used.
 * Usage: node capture.cjs SOURCE_DIRECTORY OUTPUT_DIRECTORY [samples|frames]
 * PLAYWRIGHT_PATH and CHROME_PATH may point to existing local installations.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/R2/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source = path.resolve(process.argv[2] || '');
const output = path.resolve(process.argv[3] || '');
const mode = process.argv[4] || 'samples';
if (!process.argv[2] || !process.argv[3] || !['samples', 'frames'].includes(mode)) throw new Error('Expected source, output and samples|frames.');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.wav': 'audio/wav' };
const samples = [0, 1.2, 2.2, 4.6, 6.6, 9, 11.4, 11.966666666666667];
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
fs.mkdirSync(output, { recursive: true });
const report = { started: new Date().toISOString(), mode, sourceIndexSha256: sha(fs.readFileSync(path.join(source, 'index.html'))), fps: 30, duration: 12, browser: null, renderer: null, samples: [], errors: [], failedRequests: [], filesServed: {} };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const filename = path.resolve(source, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!filename.startsWith(source + path.sep)) { response.writeHead(403); response.end(); return; }
  try {
    const data = fs.readFileSync(filename);
    report.filesServed[path.relative(source, filename).replaceAll('\\', '/')] = { bytes: data.length, sha256: sha(data) };
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(data);
  } catch { response.writeHead(404); response.end(); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-vulkan', '--disable-background-timer-throttling'] });
  try {
    report.browser = browser.version();
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    await page.route('**/*', route => route.request().url().startsWith(origin + '/') || route.request().url().startsWith('data:') ? route.continue() : route.abort());
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('requestfailed', request => report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
    await page.goto(origin + '/', { waitUntil: 'load' });
    await page.evaluate(async () => { await window.__hf.buildReady.fluid; document.querySelector('audio').muted = true; });
    report.renderer = await page.evaluate(() => {
      const gl = document.querySelector('canvas').getContext('webgl2');
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return { name: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), version: gl.getParameter(gl.VERSION), contextLost: gl.isContextLost() };
    });
    if (!/swiftshader/i.test(report.renderer.name)) throw new Error(`Software rendering required, got ${report.renderer.name}`);
    const times = mode === 'frames' ? Array.from({ length: 360 }, (_, i) => i / 30) : samples;
    for (let i = 0; i < times.length; i++) {
      const time = times[i];
      const proof = await page.evaluate(t => { window.renderFluidAt(t); return window.__fluidProof; }, time);
      const filename = mode === 'frames' ? `frame-${String(i).padStart(4, '0')}.png` : `sample-${time.toFixed(3)}.png`;
      const buffer = await page.screenshot({ path: path.join(output, filename), type: 'png' });
      if (mode === 'samples' || [0, 36, 66, 138, 198, 270, 342, 359].includes(i)) report.samples.push({ frame: i, time, file: filename, sha256: sha(buffer), proof });
      if (i % 30 === 0 || i === times.length - 1) console.log(JSON.stringify({ completed: i + 1, total: times.length, time }));
    }
    if (report.errors.length || report.failedRequests.length) throw new Error('Capture reported browser/network errors; inspect capture-report.json');
    report.ok = true;
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { report.ok = false; report.error = error.stack; process.exitCode = 1; }).finally(() => {
  report.finished = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'capture-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, output, renderer: report.renderer, error: report.error }));
});
