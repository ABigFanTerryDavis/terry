// Checks the global search: it must find site pages and TempleOS source files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = path.join(root, 'dist');
const bundle = path.join(root, '.cache/search.bundle.cjs');

const errors = [];
const checks = [];
const check = (label, ok, extra = '') => checks.push([label, ok, extra]);

const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'https://example.test/terry/index.html',
});
const { window } = dom;
window.addEventListener('error', (e) => errors.push(String(e.error ?? e.message)));

// Serve the real built assets.
window.fetch = (url) => {
  const u = new URL(String(url), 'https://example.test/terry/index.html');
  const rel = decodeURIComponent(u.pathname.replace(/^\/terry\//, ''));
  const p = path.join(dist, rel);
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    return Promise.resolve({ ok: false, status: 404, text: async () => '', json: async () => ({}) });
  }
  const body = fs.readFileSync(p, 'utf8');
  return Promise.resolve({
    ok: true,
    status: 200,
    text: async () => body,
    json: async () => JSON.parse(body),
  });
};
window.HTMLCanvasElement.prototype.getContext = () => null;
window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(Date.now()), 0);

globalThis.window = window;
globalThis.document = window.document;
globalThis.location = window.location;
globalThis.history = window.history;
globalThis.fetch = window.fetch;
globalThis.requestAnimationFrame = window.requestAnimationFrame;

delete require.cache[bundle];
const { mountSearch } = require(bundle);

const settle = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const doc = window.document;
const $ = (s) => doc.querySelector(s);

await settle(150);

// Mount the search the way every page does.
mountSearch({ quickLinks: [{ label: 'The Manual', href: './manual.html' }] });
await settle(150);

// The search box must exist in the tribute nav row.
check('search input mounted', !!$('.global-search input'));
check(
  'search sits in the nav row, not over it',
  $('.global-search')?.parentElement?.classList.contains('topbar-sub') === true,
);

// Searching for a page term must surface that page.
const input = $('.global-search input');
input.value = 'oracle';
input.dispatchEvent(new window.Event('input', { bubbles: true }));
await settle(700);
const pageHits = [...doc.querySelectorAll('.search-results a .search-title')].map((n) => n.textContent);
check('finds the Oracle page', pageHits.some((t) => /Oracle/i.test(t ?? '')), pageHits.join(' | '));

// Searching for a source identifier must surface a tree file.
input.value = 'lexfilepush';
input.dispatchEvent(new window.Event('input', { bubbles: true }));
await settle(900);
const fileHits = [...doc.querySelectorAll('.search-results a .search-title')].map((n) => n.textContent);
check(
  'finds a source file by content',
  fileHits.some((t) => (t ?? '').includes('Compiler/Lex.HC')),
  fileHits.slice(0, 4).join(' | '),
);

// A nonsense term must return nothing rather than everything.
input.value = 'zzzqqqxyzzy';
input.dispatchEvent(new window.Event('input', { bubbles: true }));
await settle(700);
const none = doc.querySelectorAll('.search-results .search-empty').length;
check('nonsense term returns nothing', none > 0);

const failures = checks.filter(([, ok]) => !ok);
for (const [label, ok, extra] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra && !ok ? `  -> ${extra}` : ''}`);
}
if (errors.length) {
  console.log('\nerrors:');
  for (const e of errors) console.log('  ' + e.split('\n').slice(0, 4).join('\n  '));
}
console.log(failures.length === 0 && errors.length === 0 ? '\nSearch test passed.' : `\n${failures.length} FAILED`);
process.exit(failures.length === 0 && errors.length === 0 ? 0 : 1);
