// Render a .dc.html artboard locally and screenshot it with Playwright.
// Usage: node design/tools/shot.mjs <File.dc.html> [width] [--state '{"k":v}']
// Writes design/.shots/<File>-<width>.png and prints an audit report.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(here, '../canvas/project');
const shotsDir = path.resolve(here, '../.shots');
fs.mkdirSync(shotsDir, { recursive: true });

const args = process.argv.slice(2);
const file = args[0];
if (!file) { console.error('usage: shot.mjs <File.dc.html> [width] [--state json] [--suffix name]'); process.exit(1); }
const html = fs.readFileSync(path.join(projectDir, file), 'utf8');
const preview = /"\$preview"\s*:\s*\{\s*"width"\s*:\s*(\d+)\s*,\s*"height"\s*:\s*(\d+)/.exec(html);
const width = Number(args[1] && !args[1].startsWith('--') ? args[1] : preview ? preview[1] : 1440);
const stateIdx = args.indexOf('--state');
const statePatch = stateIdx > -1 ? JSON.parse(args[stateIdx + 1]) : null;
const sufIdx = args.indexOf('--suffix');
const suffix = sufIdx > -1 ? '-' + args[sufIdx + 1] : '';

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const p = url.endsWith('/support.js') ? path.join(here, 'support.js') : path.join(projectDir, url);
  if (!p.startsWith(projectDir) && !p.startsWith(here)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' });
    res.end(buf);
  });
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('{{')) consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(e.message));
await page.goto(`http://localhost:${port}/${file}`);
await page.waitForSelector('html[data-dc-ready]', { timeout: 10000 }).catch(() => consoleErrors.push('runtime never became ready'));
await page.evaluate(() => document.fonts.ready);
if (statePatch) {
  await page.evaluate((s) => window.__dcInstance && window.__dcInstance.setState(s), statePatch);
}
await page.waitForTimeout(400);

const audit = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const out = { pageHeight: document.documentElement.scrollHeight, pageWidth: document.documentElement.scrollWidth, overflowX: [], clipped: [] };
  const desc = (el) => {
    const t = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50);
    return `<${el.localName}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}> "${t}"`;
  };
  for (const el of document.querySelectorAll('x-dc *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    let scrollAncestor = false;
    for (let a = el.parentElement; a; a = a.parentElement) {
      const o = getComputedStyle(a).overflowX;
      if (o === 'auto' || o === 'scroll') { scrollAncestor = true; break; }
    }
    if (!scrollAncestor && r.right > vw + 1 && out.overflowX.length < 15) out.overflowX.push(desc(el) + ` right=${Math.round(r.right)}`);
    const cs = getComputedStyle(el);
    if (el.children.length === 0 && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2)
        && (cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis') && out.clipped.length < 15) {
      out.clipped.push(desc(el) + ` ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight}`);
    }
  }
  out.dcErrors = window.__dcErrors || [];
  return out;
});

const name = file.replace(/\.dc\.html$/, '');
const shot = path.join(shotsDir, `${name}-${width}${suffix}.png`);
await page.screenshot({ path: shot, fullPage: true });
await browser.close();
server.close();

console.log(JSON.stringify({
  screenshot: shot,
  width,
  declaredPreview: preview ? { width: Number(preview[1]), height: Number(preview[2]) } : null,
  renderedHeight: audit.pageHeight,
  horizontalOverflow: audit.pageWidth > width ? `page is ${audit.pageWidth}px wide at ${width}` : null,
  elementsPastRightEdge: audit.overflowX,
  clippedText: audit.clipped,
  runtimeErrors: [...new Set(audit.dcErrors)].slice(0, 20),
  consoleErrors: consoleErrors.slice(0, 10),
}, null, 2));
