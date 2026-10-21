// Loads the main page bundle in a real DOM and checks that it renders.
//   npm run test:smoke   (bundles src/main.ts with esbuild first)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = path.join(root, 'dist');
const bundle = path.join(root, '.cache/main.bundle.cjs');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'https://example.test/terry/index.html',
});
const { window } = dom;

window.addEventListener('error', (e) => errors.push(String(e.error ?? e.message)));

// Minimal canvas: jsdom has no 2d context.
const ctxCalls = { fillRect: 0, stroke: 0, fillText: 0 };
window.HTMLCanvasElement.prototype.getContext = function () {
  const noop = () => {};
  return {
    set fillStyle(_) {},
    set strokeStyle(_) {},
    set lineWidth(_) {},
    clearRect: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    stroke() {
      ctxCalls.stroke++;
    },
    fillRect() {
      ctxCalls.fillRect++;
    },
    fillText: noop,
    setTransform: noop,
    scale: noop,
    translate: noop,
    save: noop,
    restore: noop,
  };
};
// No AudioContext until the user clicks; the page must not need it on load.
window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(Date.now()), 0);

// The bundle touches document/window at import time.
globalThis.window = window;
globalThis.document = window.document;
globalThis.location = window.location;
globalThis.history = window.history;
globalThis.requestAnimationFrame = window.requestAnimationFrame;

delete require.cache[bundle];
try {
  require(bundle);
} catch (e) {
  errors.push(`boot: ${e && e.stack ? e.stack : e}`);
}

await new Promise((r) => setTimeout(r, 120));

const doc = window.document;
const count = (sel) => doc.querySelectorAll(sel).length;

const checks = [
  ['tiles rendered', count('#tiles .tile') === 6],
  ['dir chart bars', count('#chart-dirs rect.bar-fill') >= 5],
  ['mix stack segments', count('#chart-mix rect.stack-seg') === 3],
  ['commit columns', count('#chart-commits rect.col-fill') >= 5],
  ['file chart bars', count('#chart-files rect.bar-fill') === 20],
  ['file table rows', count('#table-files tbody tr') === 25],
  ['song cards', count('#songs article.song') === 13],
  ['song group heading', count('#songs .song-group') === 1],
  ['play buttons', count('#songs button.btn') === 13],
  ['piano rolls', count('#songs canvas.roll') === 13],
  ['lyric rows', count('#songs .lyrics li') > 20],
  ['commit table rows', count('#table-commits tbody tr') === 49],
  ['provenance filled', (doc.querySelector('#provenance')?.textContent ?? '').includes('cia-foundation')],
  ['treemap segments', count('#chart-treemap rect.treemap-seg') >= 9],
  ['godsong panel renders', count('#god-song-panel form.god-form') === 1],
  ['godsong generated notation', (doc.querySelector('#god-notation')?.textContent ?? '').length > 20],
  ['palette chips', count('#palette .chip') === 16],
  ['timeline entries', count('#timeline li') === 12],
  ['font canvas drawn', count('#font-sample canvas') === 1],
  ['glyph pixels drawn', ctxCalls.fillRect > 100],
  ['piano roll drawn', ctxCalls.stroke >= 13 * 5],
  ['global search mounted', count('.global-search input') === 1],
  ['no runtime errors', errors.length === 0],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
}
if (errors.length) {
  console.log('\nerrors:');
  for (const e of errors) console.log('  ' + e.split('\n').slice(0, 4).join('\n  '));
}

// show the measured headline numbers as rendered
const tileValues = [...doc.querySelectorAll('#tiles .tile-value')].map((n) => n.textContent);
console.log('\nheadline tiles:', tileValues.join(' | '));
const firstNotes = [...doc.querySelectorAll('#songs .notation')][0]?.textContent?.split('\n')[0];
console.log('first notation line:', firstNotes);

console.log(failed === 0 ? '\nSmoke test passed.' : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
