// usage: node render.js <shot> <outdir> [start] [end] [w] [h]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const [shot, outdir, s0, s1, w = 1080, h = 1920] = process.argv.slice(2);
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg' };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  p.on('pageerror', e => console.error('[pageerror]', e.message));
  await p.route('http://app/**', async (r) => {
    const u = new URL(r.request().url()); const f = path.join(ROOT, decodeURIComponent(u.pathname));
    if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: 'nf' });
    r.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' } });
  });
  await p.goto(`http://app/engine/index.html?shot=${shot}&w=${w}&h=${h}`);
  await p.waitForFunction('window.ready === true', null, { timeout: 300000 });
  const info = await p.evaluate('window.shotInfo');
  const a = s0 !== undefined ? +s0 : 0, e = s1 !== undefined && s1 !== '-' ? Math.min(+s1, info.frames) : info.frames;
  fs.mkdirSync(outdir, { recursive: true });
  const t0 = Date.now();
  for (let i = a; i < e; i++) {
    const url = await p.evaluate(i => window.renderFrame(i), i);
    fs.writeFileSync(path.join(outdir, String(i).padStart(5, '0') + '.jpg'), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log(`${shot} frames ${a}-${e} of ${info.frames} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await b.close();
})();
