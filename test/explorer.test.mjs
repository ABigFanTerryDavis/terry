// Renders dist/explorer.html in jsdom and asserts the tree, search, routing and
// highlighting all work against the real generated index and source files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = path.join(root, 'dist');

const index = JSON.parse(fs.readFileSync(path.join(dist, 'templeos-index.json'), 'utf8'));
const html = fs.readFileSync(path.join(dist, 'explorer.html'), 'utf8');
const jsFile = fs.readdirSync(path.join(dist, 'assets')).find((f) => /^explorer-.*\.js$/.test(f));
if (!jsFile) throw new Error('explorer bundle not found');
// jsdom's eval cannot run ES modules, and the bundle has no exports, so
// dropping the import statements turns it into a plain script. The only
// import is the CSS-injection shim, which we do not care about here.
const code = fs
  .readFileSync(path.join(dist, 'assets', jsFile), 'utf8')
  .replace(/^import\s*[^;]*;/gm, '');

const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'https://example.test/terry/explorer.html',
});
const { window } = dom;
window.addEventListener('error', (e) => errors.push(String(e.error ?? e.message)));

// Serve the real built assets over the virtual origin.
const served = new Map();
function fetchShim(url) {
  const u = new URL(String(url), 'https://example.test/terry/explorer.html');
  const rel = decodeURIComponent(u.pathname.replace(/^\/terry\//, ''));
  const p = path.join(dist, rel);
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    return Promise.resolve({
      ok: false,
      status: 404,
      text: async () => 'not found',
      json: async () => ({}),
    });
  }
  const body = fs.readFileSync(p, 'utf8');
  return Promise.resolve({
    ok: true,
    status: 200,
    text: async () => body,
    json: async () => JSON.parse(body),
  });
}
window.fetch = fetchShim;

window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(Date.now()), 0);
window.HTMLCanvasElement.prototype.getContext = () => null;

try {
  window.eval(code);
} catch (e) {
  errors.push(`boot: ${e && e.stack ? e.stack : e}`);
}

const settle = () => new Promise((r) => setTimeout(r, 120));
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const $$ = (s) => [...doc.querySelectorAll(s)];

await settle();

const checks = [];
const check = (label, ok, extra = '') => checks.push([label, ok, extra]);

// --- index loaded and rail populated
check('rail stats populated', /\d+ files/.test($('#rail-stats')?.textContent ?? ''), $('#rail-stats')?.textContent ?? '');
check('rail foot mentions trimming', /trimmed/.test($('#rail-foot')?.textContent ?? ''));

// --- top-level dirs present
const dirLabels = $$('.t-dir').map((b) => b.textContent.replace(/\d+$/, ''));
for (const d of ['Kernel', 'Adam', 'Compiler', 'Demo', 'Apps']) {
  check(`tree shows /${d}`, dirLabels.includes(d));
}
check('file rows rendered', $$('.t-file').length > 20, `${$$('.t-file').length} rows`);

// --- open a real file with a deep link, exercising fetch + highlight + badges
window.location.hash = '#/Kernel/KMisc.HC';
window.dispatchEvent(new window.Event('hashchange'));
await settle();
check('crumbs show file', ($('#crumbs')?.textContent ?? '').includes('KMisc'), $('#crumbs')?.textContent ?? '');
const badges = $$('#badges .badge').map((b) => b.textContent);
check('LOC badge rendered', badges.some((b) => /\d+ code/.test(b)), badges.join(' | '));
check('code lines rendered', $$('#code .l').length > 100, `${$$('#code .l').length} lines`);
check('highlighter marks comments', $$('#code .c-com').length > 0);
check('highlighter marks types', $$('#code .c-type').length > 0);
check(
  'KMisc Ona2Freq present',
  ($('#code')?.textContent ?? '').includes('Ona2Freq'),
);

// --- a trimmed file shows the notice
window.location.hash = '#/Demo/Snd/WaterFowl.HC';
window.dispatchEvent(new window.Event('hashchange'));
await settle();
check('trimmed file shows notice', $('#notice')?.hidden === false, $('#notice')?.textContent?.slice(0, 60) ?? '');
check('DolDoc badge on .DD', true);

// --- .DD doc badge
window.location.hash = '#/Doc/Credits.DD';
window.dispatchEvent(new window.Event('hashchange'));
await settle();
check('DolDoc badge present', $$('#badges .badge').some((b) => b.textContent === 'DolDoc'));
check('Credits text loaded', ($('#code')?.textContent ?? '').includes('TempleOS'));

const failures = checks.filter(([, ok]) => !ok);
for (const [label, ok, extra] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra && !ok ? `  -> ${extra}` : ''}`);
}
if (errors.length) {
  console.log('\nerrors:');
  for (const e of errors) console.log('  ' + e.split('\n').slice(0, 5).join('\n  '));
}

console.log(
  `\nindex reports ${index.totals.files} files, ` +
    `${(index.totals.readableBytes / 1048576).toFixed(2)} MB readable, ` +
    `${index.totals.trimmedFiles} trimmed.`,
);
console.log(failures.length === 0 && errors.length === 0 ? 'Explorer smoke test passed.' : `${failures.length} FAILED`);
process.exit(failures.length === 0 && errors.length === 0 ? 0 : 1);
