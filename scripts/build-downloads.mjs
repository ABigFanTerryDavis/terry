// Builds the download catalogue for every TempleOS ISO that exists.
//
// Source of truth: the Internet Archive item "TempleOS_ISO_Archive", which is
// public domain and holds TempleOS 3.11 -> 5.03+, plus SparrowOS, J-OS,
// LoseThos and HOPPY, and nineteen dated 5.03 snapshots.
//
//   node scripts/build-downloads.mjs
//
// Reads scripts/data/archive-files.txt and the three sha256sum files, and
// writes src/generated/downloads.ts. The listing and the checksums are
// committed so the build never depends on the network.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DATA = path.join(ROOT, 'scripts/data');
const DEST = path.join(ROOT, 'src/generated');

const ARCHIVE_BASE = 'https://archive.org/download/TempleOS_ISO_Archive/';
const RELEASE_TAG = 'templeos-isos';
const RELEASE_BASE = `https://github.com/ABigFanTerryDavis/terry/releases/download/${RELEASE_TAG}/`;

/* ------------------------------------------------------------- the listing */

const listing = fs
  .readFileSync(path.join(DATA, 'archive-files.txt'), 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => {
    const [name, size] = l.split('|');
    return { name: name.trim(), size: Number(size) || 0 };
  });

/* ------------------------------------------------------------- the sums */

const sumFiles = ['sha256sum.txt', 'sha256sum_historic.txt', 'sha256sum_v503.txt'];
const sums = new Map();
for (const f of sumFiles) {
  const p = path.join(DATA, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = /^([0-9a-f]{64})\s+\*?(.+)$/.exec(line.trim());
    if (!m) continue;
    sums.set(m[2].trim(), m[1]);
  }
}

/* ------------------------------------------------- what we have mirrored */

// Which files are already on our own release? The public GitHub API serves
// this without auth for a public repo. If the release does not exist yet, or
// the network is down, we mark nothing as mirrored and the page falls back to
// the archive for those files.
const REPO = 'ABigFanTerryDavis/terry';
let mirroredNames = new Set();
try {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/${RELEASE_TAG}`, {
    headers: { 'User-Agent': 'terry-tribute' },
  });
  if (res.ok) {
    const rel = await res.json();
    mirroredNames = new Set((rel.assets || []).map((a) => a.name));
    console.log(`release ${RELEASE_TAG}: ${mirroredNames.size} assets mirrored`);
  } else {
    console.log(`release ${RELEASE_TAG}: not found (${res.status}); falling back to the archive`);
  }
} catch (e) {
  console.log(`release lookup failed (${e.message}); falling back to the archive`);
}

/* --------------------------------------------------------- the catalogue */

/** The sums spell names differently to the archive: case, and _ vs space. */
function normKey(s) {
  return s
    .toLowerCase()
    .replace(/\.(iso|zip|png|jpg)$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function shaFor(name) {
  const direct = sums.get(name);
  if (direct) return direct;
  const base = name.split('/').pop() ?? name;
  const want = normKey(base);
  for (const [k, v] of sums) {
    if (normKey(k) === want) return v;
  }
  return '';
}

function eraOf(name) {
  if (name.startsWith('Historic/')) return 'historic';
  if (name.startsWith('TempleOS_V5.03/')) return 'snapshots';
  if (name.startsWith('Tools/')) return 'tools';
  return 'releases';
}

/** The OS family a file belongs to, from its name. */
function familyOf(name) {
  const base = name.split('/').pop() ?? name;
  if (/^HOPPY/i.test(base)) return 'HOPPY';
  if (/^JCD/i.test(base)) return 'J-OS';
  if (/^LTCD/i.test(base)) return 'LoseThos';
  if (/^SparrowOS/i.test(base)) return 'SparrowOS';
  return 'TempleOS';
}

/** A release date, where the filename carries one. */
function dateOf(name) {
  const base = name.split('/').pop() ?? name;
  // 2017.11.20_19-52
  let m = /(\d{4})\.(\d{2})\.(\d{2})[_\-](\d{2})-(\d{2})/.exec(base);
  if (m) return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`;
  // 140715 -> 2014-07-15
  m = /(\d{2})(\d{2})(\d{2})/.exec(base);
  if (m) return `20${m[1]}-${m[2]}-${m[3]}`;
  // 051231 -> 2005-12-31
  m = /^(\d{2})(\d{2})(\d{2})/.exec(base);
  if (m) return `20${m[1]}-${m[2]}-${m[3]}`;
  return '';
}

function versionOf(name) {
  const base = name.split('/').pop() ?? name;
  let m = /TempleOSCDV(\d+\.\d+)/.exec(base);
  if (m) return m[1];
  m = /TempleOS(?:CD|TS)_(\d{6})/.exec(base);
  if (m) return m[1];
  m = /^([A-Z]+)_(\d{6})/.exec(base);
  if (m) return m[2];
  return '';
}

const entries = listing.map((f) => {
  const base = f.name.split('/').pop() ?? f.name;
  const assetName = base;
  return {
    path: f.name,
    name: base,
    asset: assetName,
    bytes: f.size,
    era: eraOf(f.name),
    family: familyOf(f.name),
    version: versionOf(f.name),
    date: dateOf(f.name),
    sha256: shaFor(f.name),
    // Ours, once mirrored to the release; and the canonical archive copy.
    mirror: RELEASE_BASE + encodeURIComponent(assetName),
    archive: ARCHIVE_BASE + f.name.split('/').map(encodeURIComponent).join('/'),
    mirrored: mirroredNames.has(assetName),
  };
});

// Releases first (3.11 -> 5.03), then the dated snapshots, then the
// pre-TempleOS history, then the tools.
const order = { releases: 0, snapshots: 1, historic: 2, tools: 3 };
entries.sort((a, b) => {
  const ea = order[a.era] - order[b.era];
  if (ea !== 0) return ea;
  const va = parseFloat(a.version || '0') - parseFloat(b.version || '0');
  if (va !== 0) return va;
  return (a.date || '').localeCompare(b.date || '');
});

const totals = {
  files: entries.length,
  bytes: entries.reduce((n, e) => n + e.bytes, 0),
  withSum: entries.filter((e) => e.sha256).length,
  mirrored: entries.filter((e) => e.mirrored).length,
  families: [...new Set(entries.map((e) => e.family))].sort(),
};

const ts = `// AUTO-GENERATED by scripts/build-downloads.mjs. Do not edit by hand.
//
// Every TempleOS ISO that exists, from the Internet Archive's public-domain
// "TempleOS_ISO_Archive" item, plus our own release mirror.
export interface Download {
  path: string;
  name: string;
  asset: string;
  bytes: number;
  era: 'releases' | 'snapshots' | 'historic' | 'tools';
  family: string;
  version: string;
  date: string;
  sha256: string;
  mirror: string;
  archive: string;
  /** true when the file is already on our own release */
  mirrored: boolean;
}

export const downloads: Download[] = ${JSON.stringify(entries, null, 2)};

export const downloadTotals = ${JSON.stringify(totals)};

export const ARCHIVE_ITEM = 'https://archive.org/details/TempleOS_ISO_Archive';
export const RELEASE_TAG = ${JSON.stringify(RELEASE_TAG)};
`;
fs.mkdirSync(DEST, { recursive: true });
fs.writeFileSync(path.join(DEST, 'downloads.ts'), ts);

console.log(
  `downloads: ${totals.files} files, ${(totals.bytes / 1048576).toFixed(1)} MB, ` +
    `${totals.withSum} with checksums, families: ${totals.families.join(', ')}`,
);
for (const era of ['releases', 'snapshots', 'historic', 'tools']) {
  const n = entries.filter((e) => e.era === era).length;
  console.log(`  ${era}: ${n}`);
}
