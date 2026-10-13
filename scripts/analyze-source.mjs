// Walks a checkout of https://github.com/cia-foundation/TempleOS and emits
// data.json: line counts per directory, per file, and per extension.
//
//   git clone https://github.com/cia-foundation/TempleOS .templeos/TempleOS
//   node scripts/analyze-source.mjs
//
// Override the checkout with TEMPLEOS_SRC, the output with TEMPLEOS_OUT.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(process.env.TEMPLEOS_SRC ?? '.templeos/TempleOS');
const OUT = path.resolve(process.env.TEMPLEOS_OUT ?? '.cache/data.json');
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const CODE_EXT = new Set(['.HC', '.HH', '.C', '.CPP', '.IN']);
const DOC_EXT = new Set(['.DD', '.TXT']);
// Bundled data, not authored logic. Excluded from LOC totals, reported separately.
const DATA_FILES = new Set(['Misc/Bible.TXT', 'Misc/PCIDevices.DD']);

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === '.github') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = walk(ROOT);
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

// ---------- core LOC pass ----------
let total = 0, blank = 0, comment = 0, code = 0;
const byDir = {};
const byExt = {};
const bySub = {};
const fileRows = [];
const dataFiles = [];

function countLines(raw) {
  const lines = raw.split(/\r?\n/);
  let c = 0, cm = 0, bl = 0;
  let inBlock = false;
  for (const line of lines) {
    if (line.trim() === '') { bl++; continue; }
    let body = '';
    let i = 0;
    while (i < line.length) {
      if (inBlock) {
        const end = line.indexOf('*/', i);
        if (end === -1) { i = line.length; break; }
        inBlock = false;
        i = end + 2;
        continue;
      }
      const bs = line.indexOf('/*', i);
      const ss = line.indexOf('//', i);
      if (ss !== -1 && (bs === -1 || ss < bs)) {
        body += line.slice(i, ss);
        i = line.length;
        break;
      }
      if (bs !== -1) {
        body += line.slice(i, bs);
        inBlock = true;
        i = bs + 2;
        continue;
      }
      body += line.slice(i);
      i = line.length;
    }
    if (body.trim() === '') cm++;
    else c++;
  }
  return { c, cm, bl, lines: lines.length };
}

for (const f of files) {
  const r = rel(f);
  const ext = path.extname(r).toUpperCase() || 'NONE';
  const isData = DATA_FILES.has(r);
  let raw;
  try { raw = fs.readFileSync(f, 'latin1'); } catch { continue; }

  // skip binary-ish
  let hasNull = false;
  for (let i = 0; i < raw.length; i++) if (raw.charCodeAt(i) === 0) { hasNull = true; break; }
  if (hasNull) continue;

  const { c, cm, bl, lines } = countLines(raw);

  const top = r.split('/')[0];
  const isCode = CODE_EXT.has(ext) && !isData;

  if (isData) { dataFiles.push({ path: r, lines }); continue; }

  const d = byDir[top] || (byDir[top] = { dir: top, code: 0, comments: 0, blank: 0, total: 0, files: 0, codeFiles: 0 });
  d.code += c; d.comments += cm; d.blank += bl; d.total += lines; d.files++;
  if (isCode) d.codeFiles++;

  const e = byExt[ext] || (byExt[ext] = { ext, code: 0, comments: 0, files: 0, isCode });
  e.code += c; e.comments += cm; e.files++;

  // 2-level breakdown for the major subsystems (Adam/*, Kernel/*, ...)
  const seg = r.split('/');
  const sub = seg.length > 2 ? `${seg[0]}/${seg[1]}` : seg[0];
  const s = bySub[sub] || (bySub[sub] = { sub, code: 0, comments: 0, files: 0 });
  s.code += c; s.comments += cm; s.files++;

  code += c; comment += cm; blank += bl; total += lines;
  if (isCode && c > 0) fileRows.push({ path: r, dir: top, code: c, comments: cm, lines });
}

// ---------- kernel feature list (real, from source doc) ----------
function readIfExists(p) {
  const fp = path.join(ROOT, p);
  return fs.existsSync(fp) ? fs.readFileSync(fp, 'latin1') : null;
}

// ---------- function-ish call sites ----------
const kernelText = files
  .filter((f) => rel(f).startsWith('Kernel/'))
  .map((f) => { try { return fs.readFileSync(f, 'latin1'); } catch { return ''; } })
  .join('\n');

// ---------- git history: real growth over time ----------
let commits = [];
let sourceHead = null;
try {
  const raw = execSync(
    `git -C "${ROOT}" log --format="%H%x1f%h%x1f%ad%x1f%an%x1f%s" --date=short`,
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  commits = raw.trim().split('\n').filter(Boolean).map((l) => {
    const [hash, short, date, author, ...rest] = l.split('\x1f');
    return { hash, short, date, author: author || '', subject: rest.join('\x1f') };
  }).sort((a, b) => a.date.localeCompare(b.date));
  sourceHead = execSync(`git -C "${ROOT}" rev-parse HEAD`, { encoding: 'utf8' }).trim();
} catch (e) {
  console.error('git log failed', e.message);
}

// per-commit tree size (LOC of tracked source) -> growth curve
const gitAuthors = {};
for (const c of commits) gitAuthors[c.author] = (gitAuthors[c.author] || 0) + 1;

// ---------- per-year LOC from final tree, grouped ----------
const perYear = {};
for (const c of commits) {
  const y = c.date.slice(0, 4);
  perYear[y] = (perYear[y] || 0) + 1;
}

// ---------- keyboard/Dev / docs ----------
const docFiles = files.filter((f) => rel(f).startsWith('Doc/')).map(rel);

const data = {
  generated: new Date().toISOString(),
  totals: { code, comments: comment, blank, lines: total, sourceFiles: fileRows.length, dataFiles },
  dataFiles,
  byDir: Object.values(byDir).sort((a, b) => b.code - a.code),
  byExt: Object.values(byExt).sort((a, b) => b.code - a.code),
  topFiles: fileRows.sort((a, b) => b.code - a.code).slice(0, 30),
  biggestDirFiles: Object.entries(
    fileRows.reduce((m, r) => { (m[r.dir] || (m[r.dir] = [])).push(r); return m; }, {})
  ).map(([dir, rs]) => ({ dir, files: rs.length, code: rs.reduce((s, r) => s + r.code, 0) }))
    .sort((a, b) => b.code - a.code),
  bySub: Object.values(bySub).sort((a, b) => b.code - a.code),
  commits: commits.length,
  gitAuthors,
  perYear,
  firstCommit: commits[0] || null,
  lastCommit: commits[commits.length - 1] || null,
  commitList: commits.map((c) => ({ short: c.short, date: c.date, author: c.author, subject: c.subject })),
  source: {
    repo: 'https://github.com/cia-foundation/TempleOS',
    head: sourceHead,
    headShort: sourceHead ? sourceHead.slice(0, 7) : null,
  },
  docFileCount: docFiles.length,
};

fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
console.log(JSON.stringify({
  code: data.totals.code,
  comments: data.totals.comments,
  blank: data.totals.blank,
  lines: data.totals.lines,
  sourceFiles: data.totals.sourceFiles,
  commits: data.commits,
  first: data.firstCommit && data.firstCommit.date,
  last: data.lastCommit && data.lastCommit.date,
  authors: gitAuthors,
}, null, 2));
console.log('\ntop dirs:');
for (const d of data.byDir.slice(0, 12)) console.log(`  ${d.dir.padEnd(12)} code=${String(d.code).padStart(7)} comments=${String(d.comments).padStart(6)} files=${d.files}`);
console.log('\ntop files:');
for (const f of data.topFiles.slice(0, 12)) console.log(`  ${String(f.code).padStart(6)}  ${f.path}`);
