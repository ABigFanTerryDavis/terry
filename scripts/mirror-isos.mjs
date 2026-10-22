// Mirrors every ISO to a GitHub release on the tribute repo, so the download
// page links at our own copy rather than a third party.
//
//   node scripts/mirror-isos.mjs            # download + upload everything
//   node scripts/mirror-isos.mjs --only-lite # just the small ones
//
// The ISOs are public domain. They are NOT committed to git; they live in the
// release assets, which is what releases are for.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DATA = path.join(ROOT, 'scripts/data');
const WORK = path.join(ROOT, '.isos');
const TAG = 'templeos-isos';
const REPO = 'ABigFanTerryDavis/terry';
const BASE = 'https://archive.org/download/TempleOS_ISO_Archive/';

const listing = fs
  .readFileSync(path.join(DATA, 'archive-files.txt'), 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => {
    const [name, size] = l.split('|');
    return { name: name.trim(), size: Number(size) || 0 };
  });

const liteOnly = process.argv.includes('--only-lite');
const items = listing.filter((f) => {
  if (liteOnly) return /tos_lite/i.test(f.name);
  return /\.(iso|zip)$/i.test(f.name);
});

fs.mkdirSync(WORK, { recursive: true });

function sh(cmd, args) {
  return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
}

const gh = (args, quiet = true) =>
  execFileSync('gh', args, {
    stdio: ['ignore', quiet ? 'pipe' : 'inherit', quiet ? 'pipe' : 'inherit'],
    encoding: 'utf8',
  });

// Create the release if it is not there yet.
try {
  gh(['release', 'view', TAG, '--repo', REPO]);
  console.log(`release ${TAG} exists`);
} catch {
  gh([
    'release', 'create', TAG, '--repo', REPO,
    '--title', 'TempleOS ISOs — every version, 2004 to 2017',
    '--notes',
    'Every TempleOS release, plus HOPPY, J-OS, LoseThos, SparrowOS, the dated ' +
      '5.03 snapshots, the supplemental discs and his tools.\n\n' +
      'All public domain. Mirrored from the Internet Archive item ' +
      '"TempleOS_ISO_Archive", byte for byte, with the published SHA-256 sums.\n\n' +
      'TempleOS is 64-bit. Use QEMU or VMware, and give it at least 512 MB of RAM.',
  ]);
  console.log(`release ${TAG} created`);
}

let done = 0;
let bytes = 0;
for (const f of items) {
  const asset = f.name.split('/').pop();
  const local = path.join(WORK, asset);
  done++;
  bytes += f.size;

  if (!fs.existsSync(local) || fs.statSync(local).size !== f.size) {
    const url = BASE + f.name.split('/').map(encodeURIComponent).join('/');
    process.stdout.write(`[${done}/${items.length}] downloading ${asset} (${(f.size / 1048576).toFixed(1)}MB) ... `);
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`FAILED ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(local, buf);
    console.log('ok');
  } else {
    process.stdout.write(`[${done}/${items.length}] ${asset} (have it)\n`);
  }

  // Upload it if the release does not already carry it.
  let has = false;
  try {
    const out = gh(['release', 'view', TAG, '--repo', REPO, '--json', 'assets']);
    const assets = JSON.parse(out).assets || [];
    has = assets.some((a) => a.name === asset);
  } catch {
    has = false;
  }
  if (has) {
    console.log('    already uploaded');
    continue;
  }
  process.stdout.write('    uploading ... ');
  try {
    gh(['release', 'upload', TAG, local, '--repo', REPO, '--clobber']);
    console.log('ok');
  } catch (e) {
    console.log(`FAILED: ${String(e.message).slice(0, 120)}`);
  }
}

console.log(`\ndone: ${items.length} assets, ${(bytes / 1048576).toFixed(1)} MB`);
