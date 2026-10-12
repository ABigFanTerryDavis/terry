// Copies the TempleOS source tree into public/templeos/ for the file explorer,
// trimming the binary tails that 53 files carry (embedded sprites and sound),
// and emits public/templeos-index.json.
//
//   git clone https://github.com/cia-foundation/TempleOS .templeos/TempleOS
//   npm run data
//
// Line classification is deliberately identical to scripts/analyze-source.mjs so
// the explorer's per-file numbers always agree with the Autopsy page.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SRC = path.resolve(process.env.TEMPLEOS_SRC ?? path.join(ROOT, '.templeos/TempleOS'));
const OUT_DIR = path.join(ROOT, 'public/templeos');
const INDEX = path.join(ROOT, 'public/templeos-index.json');

const CODE_EXT = new Set(['.HC', '.HH', '.C', '.CPP', '.IN']);
const DOC_EXT = new Set(['.DD']);
// Data, not source. Already reported separately on the main page.
const SKIP = new Set(['Misc/Bible.TXT', 'Misc/PCIDevices.DD']);

if (!fs.existsSync(SRC)) {
  console.error(`No TempleOS checkout at ${SRC}`);
  console.error('  git clone https://github.com/cia-foundation/TempleOS .templeos/TempleOS');
  process.exit(1);
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === '.github') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

/**
 * Some TempleOS files are HolyC source with an embedded binary blob appended
 * (sprites, sound samples). Find where the text ends: the first run of 32
 * consecutive bytes that are neither printable ASCII nor tab/newline/CR.
 */
function splitTail(buf) {
  for (let i = 0; i + 32 <= buf.length; i++) {
    let bad = true;
    for (let j = 0; j < 32; j++) {
      const c = buf[i + j];
      if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127)) {
        bad = false;
        break;
      }
    }
    if (bad) return { text: buf.subarray(0, i), trimmed: buf.length - i };
  }
  return { text: buf, trimmed: 0 };
}

/** HolyC comments are line comments and C-style block comments; rest is code. */
function classify(raw) {
  let code = 0;
  let comments = 0;
  let blank = 0;
  let inBlock = false;
  for (const line of raw.split(/\r?\n/)) {
    if (line.trim() === '') {
      blank++;
      continue;
    }
    let body = '';
    let i = 0;
    while (i < line.length) {
      if (inBlock) {
        const end = line.indexOf('*/', i);
        if (end === -1) {
          i = line.length;
          break;
        }
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
    if (body.trim() === '') comments++;
    else code++;
  }
  return { code, comments, blank };
}

/** Decode as UTF-8 when the bytes are valid UTF-8, otherwise as latin1. */
function decode(buf) {
  try {
    const s = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return s;
  } catch {
    return buf.toString('latin1');
  }
}

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const files = [];
let totalBytes = 0;
let readableBytes = 0;
let trimmedFiles = 0;
let trimmedBytes = 0;

for (const abs of walk(SRC)) {
  const rel = path.relative(SRC, abs).replace(/\\/g, '/');
  const ext = path.extname(rel).toUpperCase();
  if (!CODE_EXT.has(ext) && !DOC_EXT.has(ext)) continue;
  if (SKIP.has(rel)) continue;

  const buf = fs.readFileSync(abs);
  const { text: textBuf, trimmed } = splitTail(buf);
  const raw = decode(textBuf);

  const dest = path.join(OUT_DIR, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, raw, 'utf8');

  const { code, comments, blank } = classify(raw);
  const bytes = Buffer.byteLength(raw, 'utf8');
  totalBytes += buf.length;
  readableBytes += bytes;
  if (trimmed > 0) {
    trimmedFiles++;
    trimmedBytes += trimmed;
  }

  files.push({
    path: rel,
    dir: rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '',
    name: path.basename(rel),
    ext: ext.slice(1),
    kind: CODE_EXT.has(ext) ? 'code' : 'doc',
    bytes,
    trimmed,
    code,
    comments,
    blank,
    lines: code + comments + blank,
  });
}

files.sort((a, b) => a.path.localeCompare(b.path, 'en'));

const index = {
  generated: new Date().toISOString(),
  source: 'https://github.com/cia-foundation/TempleOS',
  totals: {
    files: files.length,
    sourceBytes: totalBytes,
    readableBytes,
    trimmedFiles,
    trimmedBytes,
  },
  files,
};

fs.writeFileSync(INDEX, JSON.stringify(index), 'utf8');

const pct = ((trimmedBytes / totalBytes) * 100).toFixed(1);
console.log(`copied ${files.length} files -> public/templeos`);
console.log(`  source bytes      ${totalBytes.toLocaleString()} (${(totalBytes / 1048576).toFixed(2)} MB)`);
console.log(`  readable bytes    ${readableBytes.toLocaleString()} (${(readableBytes / 1048576).toFixed(2)} MB)`);
console.log(`  trimmed ${trimmedFiles} files, ${trimmedBytes.toLocaleString()} bytes (${pct}%)`);
console.log(`  index             ${INDEX} (${(fs.statSync(INDEX).size / 1024).toFixed(1)} kB)`);
