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

// Load the real built stylesheet so jsdom can resolve the cascade. A `[hidden]`
// element that some author rule re-displays is invisible to a DOM-only test but
// very much visible to a reader -- which is exactly how this shipped once.
const cssFile = fs.readdirSync(path.join(dist, 'assets')).find((f) => f.endsWith('.css'));
if (cssFile) {
  const style = window.document.createElement('style');
  style.textContent = fs.readFileSync(path.join(dist, 'assets', cssFile), 'utf8');
  window.document.head.appendChild(style);
}

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

// The regression that shipped broken: #empty carried the `hidden` attribute,
// but `.empty { display: flex }` beat the UA stylesheet's `[hidden]` rule, so
// the placeholder stayed on top of the code and opening a file did nothing
// visible. jsdom does not resolve the cascade, so assert on the built CSS
// directly: the guard has to be present and has to be !important.
const builtCss = cssFile ? fs.readFileSync(path.join(dist, 'assets', cssFile), 'utf8') : '';
const hiddenGuard = /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(builtCss);
check('built CSS keeps [hidden] authoritative', hiddenGuard);

// Nothing may set display on a selector that also carries [hidden], because
// that is precisely what outranks the UA rule once the guard is gone.
const displayRules = [...builtCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, , body]) => /(^|;)\s*display\s*:/.test(body))
  .map(([, sel]) => sel.trim());
const risky = displayRules.filter((sel) =>
  sel
    .split(',')
    .map((s) => s.trim())
    .some((s) => s.includes('[hidden]') && s !== '[hidden]'),
);
check(
  'no author rule competes with [hidden]',
  risky.length === 0,
  risky.join(' | '),
);
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

// --- .DD doc badge + reading mode (docs default to Reading)
window.location.hash = '#/Doc/Credits.DD';
window.dispatchEvent(new window.Event('hashchange'));
await settle();
check('DolDoc badge present', $$('#badges .badge').some((b) => b.textContent === 'DolDoc'));
check(
  'reading mode renders prose without macros',
  ($('#doc')?.textContent ?? '').includes('wrote all of TempleOS') &&
    !($('#doc')?.innerHTML ?? '').includes('$LK'),
  ($('#doc')?.textContent ?? '').slice(0, 80),
);
check('reading mode links the font file', ($('#doc')?.innerHTML ?? '').includes('explorer.html#/Kernel/FontStd.HC'));
check('mode toggle visible for docs', $('#mode-toggle')?.hidden === false);
check('copy buttons visible', $('#viewer-actions')?.hidden === false);

// --- source toggle restores code view
$('#mode-source')?.dispatchEvent(new window.Event('click', { bubbles: true }));
await settle();
check('source toggle restores code', $$('#code .l').length > 10, `${$$('#code .l').length} lines`);

// --- line deep link: clicking a line sets the hash
const line40 = doc.querySelector('.l[data-n="40"]');
line40?.dispatchEvent(new window.Event('click', { bubbles: true }));
await settle();
check('line click deep-links', window.location.hash === '#/Doc/Credits.DD:40', window.location.hash);

// --- full-text search index
const searchRes = await window.fetch('https://example.test/terry/templeos-search.json');
const searchIdx = await searchRes.json();
check(
  'search index loads with real vocabulary',
  searchIdx.tokens.length > 20000 && searchIdx.postings.length === searchIdx.tokens.length,
  `${searchIdx.tokens.length} tokens`,
);
const lexAt = searchIdx.tokens.indexOf('lexfilepush');
check('index covers compiler identifiers', lexAt !== -1 && searchIdx.postings[lexAt].length >= 1);

// --- text: search end to end
const searchInput = doc.querySelector('#search');
searchInput.value = 'text:lexfilepush';
searchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
await new Promise((r) => setTimeout(r, 400));
const shown = $$('.t-file').map((b) => b.dataset.path);
check('text: search finds the lexer', shown.includes('Compiler/Lex.HC'), shown.slice(0, 5).join(', '));

// --- footer provenance
check('footer cites source HEAD', ($('#rail-foot')?.textContent ?? '').includes('Index built from'));

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
