// Paints every element of renders/.film/plan.json with p5.brush (headless Chromium, SwiftShader) into renders/.film/paint/.
//   node paint/render.cjs [id ...]      (no ids = everything that is not painted yet; --force repaints)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const root = path.resolve(__dirname, '..'); const out = path.join(root, 'renders/.film/paint'); fs.mkdirSync(out, { recursive: true });
  const plan = JSON.parse(fs.readFileSync(path.join(root, 'renders/.film/plan.json'), 'utf8'));
  const args = process.argv.slice(2); const force = args.includes('--force'); const ids = args.filter(a => !a.startsWith('--'));
  const idx = fs.existsSync(path.join(out, 'index.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'index.json'), 'utf8')) : {};
  const key = e => JSON.stringify([e.type, e.rect, e.pts, e.color, e.opacity, e.brush, e.weight]);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('console', m => { if (m.type() === 'error') console.log('[page]', m.text()); }); p.on('pageerror', e => console.log('[err]', e.message));
  await p.goto('file://' + path.join(__dirname, 'render.html')); await p.evaluate(() => window.init());
  for (const e of plan.elements) {
    if (e.same_as) continue;
    if (ids.length && !ids.includes(e.id)) continue;
    const f = path.join(out, e.id + '.png');
    if (!force && !ids.length && fs.existsSync(f) && idx[e.id] && idx[e.id].key === key(e)) continue;
    const t0 = Date.now(); const r = await p.evaluate(el => window.paintEl(el), e);
    fs.writeFileSync(f, Buffer.from(r.url.split(',')[1], 'base64'));
    idx[e.id] = { x: r.x, y: r.y, w: r.w, h: r.h, key: key(e) };
    console.log(e.id, e.type, `${r.w}x${r.h}`, (Date.now() - t0) + ' ms');
    fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(idx, null, 1));
  }
  await b.close();
})();
