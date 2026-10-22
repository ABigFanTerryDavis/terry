// Renders each tribute page's bundle in jsdom and asserts its key content.
// Bundles are built with esbuild (CJS) first so shared chunks resolve:
//   npm run test:pages
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = path.join(root, 'dist');
const bundleFor = (entry) => path.join(root, '.cache', `${entry}.bundle.cjs`);

const PAGES = [
  {
    html: 'oracle.html',
    entry: 'oracle',
    checks: [
      ['oracle timer present', (d) => d.querySelectorAll('#oracle-timer').length === 1],
      ['oracle buttons present', (d) => d.querySelectorAll('#oracle-okay,#oracle-ten').length === 2],
      ['mechanic quotes rendered', (d) => (d.querySelector('#oracle-word-src')?.textContent ?? '').includes('GodBits')],
    ],
  },
  {
    html: 'compiler.html',
    entry: 'compiler',
    checks: [
      ['six stage cards', (d) => d.querySelectorAll('.stage').length === 6],
      ['excerpts mention real functions', (d) => (d.querySelector('#stages')?.textContent ?? '').includes('CmpCtrlDel')],
    ],
  },
  {
    html: 'changelog.html',
    entry: 'changelog',
    checks: [
      ['78 changelog rows', (d) => d.querySelectorAll('#changes li').length === 78],
      ['release note text present', (d) => (d.querySelector('#changes')?.textContent ?? '').includes('AutoSave')],
    ],
  },
  {
    html: 'gallery.html',
    entry: 'gallery',
    checks: [
      ['twenty demo tiles', (d) => d.querySelectorAll('#demo-shelf .tile').length === 20],
      ['three live canvases', (d) => d.querySelectorAll('canvas.demo-canvas').length === 3],
    ],
  },
  {
    html: 'tour.html',
    entry: 'tour',
    checks: [
      ['tour files rendered', (d) => d.querySelectorAll('.tour-file').length >= 10],
      ['his words present', (d) => (d.querySelector('#tour-stops')?.textContent ?? '').includes('help index')],
    ],
  },
  {
    html: 'manual.html',
    entry: 'manual',
    checks: [
      ['manual documents listed', (d) => d.querySelectorAll('.toc-item').length >= 90],
      ['manual grouped by directory', (d) => d.querySelectorAll('.toc-group').length >= 3],
      ['filter box present', (d) => !!d.querySelector('.toc-filter')],
    ],
  },
  {
    html: 'university.html',
    entry: 'university',
    checks: [
      ['thirteen lectures', (d) => d.querySelectorAll('.uni-card').length === 13],
      ['lecture titles present', (d) => (d.querySelector('#uni-grid')?.textContent ?? '').includes('Mini Compiler')],
    ],
  },
  {
    html: 'desktop.html',
    entry: 'desktop',
    checks: [
      ['welcome text rendered', (d) => (d.querySelector('#desktop-welcome')?.textContent ?? '').includes('TempleOS')],
      ['menu entries rendered', (d) => d.querySelectorAll('.desktop-item').length >= 8],
      ['directory shortcuts rendered', (d) => d.querySelectorAll('#desktop-dirs .tile').length >= 10],
    ],
  },
  {
    html: 'demands.html',
    entry: 'demands',
    checks: [
      ['demands listed', (d) => d.querySelectorAll('.demand').length >= 18],
      ['scorecard rows', (d) => d.querySelectorAll('.score-row').length >= 10],
      ['verdicts rendered', (d) => d.querySelectorAll('.verdict').length >= 10],
      ['secureboot demand present', (d) => (d.querySelector('#demands')?.textContent ?? '').includes('SecureBoot')],
      ['line counts shown', (d) => d.querySelectorAll('.demand-counts li').length >= 3],
    ],
  },
  {
    html: 'language.html',
    entry: 'language',
    checks: [
      ['twelve types', (d) => d.querySelectorAll('.type-cell').length === 12],
      ['directives listed', (d) => d.querySelectorAll('.directive-row').length >= 8],
      ['quirks quoted', (d) => d.querySelectorAll('.quirk').length >= 5],
      ['doc index rendered', (d) => d.querySelectorAll('#lang-docs .tile').length >= 10],
    ],
  },
];

let failed = 0;

for (const page of PAGES) {
  const errors = [];
  const html = fs.readFileSync(path.join(dist, page.html), 'utf8');

  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: `https://example.test/terry/${page.html}`,
  });
  const { window } = dom;
  window.addEventListener('error', (e) => errors.push(String(e.error ?? e.message)));
  window.HTMLCanvasElement.prototype.getContext = () => null;
  window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(Date.now()), 0);

  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.location = window.location;
  globalThis.history = window.history;
  globalThis.requestAnimationFrame = window.requestAnimationFrame;
  globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id);

  try {
    delete require.cache[bundleFor(page.entry)];
    require(bundleFor(page.entry));
  } catch (e) {
    errors.push(`boot: ${e && e.stack ? e.stack : e}`);
  }
  await new Promise((r) => setTimeout(r, 150));
  const doc = window.document;
  for (const [label, fn] of page.checks) {
    let ok = false;
    try {
      ok = fn(doc);
    } catch {
      ok = false;
    }
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${page.html}: ${label}`);
  }
  if (errors.length) {
    failed++;
    console.log(`FAIL  ${page.html}: runtime errors`);
    for (const e of errors) console.log('  ' + e.split('\n').slice(0, 4).join('\n  '));
  } else {
    console.log(`PASS  ${page.html}: no runtime errors`);
  }
}

console.log(failed === 0 ? '\nPages tests passed.' : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
