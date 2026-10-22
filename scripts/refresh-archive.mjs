// One-time: refresh scripts/data/archive-files.txt from the archive's metadata
// API, and the three sha256sum files. Run: node scripts/refresh-archive.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DATA = path.join(ROOT, 'scripts/data');
fs.mkdirSync(DATA, { recursive: true });

const ITEM = 'TempleOS_ISO_Archive';
const BASE = `https://archive.org/download/${ITEM}/`;

const meta = await (await fetch(`https://archive.org/metadata/${ITEM}`)).json();

const wanted = meta.files.filter(
  (f) => /\.(iso|zip|png|jpg)$/i.test(f.name) || /\.iso\.c/i.test(f.name),
);
const lines = wanted.map((f) => `${f.name}|${f.size || 0}`);
fs.writeFileSync(path.join(DATA, 'archive-files.txt'), lines.join('\n') + '\n', 'utf8');
console.log(`listing: ${lines.length} files`);

for (const f of ['sha256sum.txt', 'Historic/sha256sum_historic.txt', 'TempleOS_V5.03/sha256sum_v503.txt']) {
  const res = await fetch(BASE + f);
  if (!res.ok) {
    console.log(`  FAILED ${f}: ${res.status}`);
    continue;
  }
  const text = await res.text();
  const dest = path.join(DATA, path.basename(f));
  fs.writeFileSync(dest, text, 'utf8');
  console.log(`  sums: ${path.basename(f)} (${text.split('\n').filter(Boolean).length} entries)`);
}
