// Turns the raw measurements into the typed modules under src/generated.
//   node scripts/analyze-source.mjs && node scripts/extract-assets.mjs && node scripts/regen.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const CACHE = path.resolve(process.env.TEMPLEOS_CACHE ?? path.join(ROOT, '.cache'));
const DEST = path.join(ROOT, 'src', 'generated');
fs.mkdirSync(DEST, { recursive: true });

const d = JSON.parse(fs.readFileSync(path.join(CACHE, 'data.json'), 'utf8'));
const a = JSON.parse(fs.readFileSync(path.join(CACHE, 'assets.json'), 'utf8'));

const hdr = `// AUTO-GENERATED from the TempleOS source tree. Do not edit by hand.
// Source: https://github.com/cia-foundation/TempleOS
`;

// ---- metrics.ts
const metrics = `${hdr}
export interface DirRow { dir: string; code: number; comments: number; files: number; }
export interface FileRow { path: string; dir: string; code: number; comments: number; }

export const totals = ${JSON.stringify(d.totals)};

export const byDir: DirRow[] = ${JSON.stringify(
  d.byDir.filter((x) => x.code > 0).map((x) => ({ dir: x.dir, code: x.code, comments: x.comments, files: x.files }))
)};

export const topFiles: FileRow[] = ${JSON.stringify(
  d.topFiles.map((x) => ({ path: x.path, dir: x.dir, code: x.code, comments: x.comments }))
)};

export interface DataFile { path: string; lines: number; }

export const commits: {
  total: number;
  byAuthor: Record<string, number>;
  firstDate: string;
  lastDate: string;
  byYear: Record<string, number>;
} = {
  total: ${d.commits},
  byAuthor: ${JSON.stringify(d.gitAuthors)},
  firstDate: "${(d.firstCommit && d.firstCommit.date) || ''}",
  lastDate: "${d.lastCommit ? d.lastCommit.date : ''}",
  byYear: ${JSON.stringify(d.perYear)},
};

export const excludedDataFiles: DataFile[] = ${JSON.stringify(d.dataFiles)};
`;
fs.writeFileSync(path.join(DEST, 'metrics.ts'), metrics);

// ---- songs.ts  (clean the DolDoc colour macros out of Prosper's lyrics)
// Derived from ::/Adam/ASnd.HC Note2Ona() + ::/Kernel/KMisc.HC Ona2Freq().
// Note2Ona(note,oct) = oct*12 + note (for note>=3); Ona2Freq(ona) = 440/32 * 2^(ona/12).
// Anchors: A4 = ona 60 = 440Hz, mid C = note 3 oct 4 = ona 51 = 261.63Hz.
// Solving for each letter gives A=12 B=14 C=3 D=5 E=7 F=8 G=10.
// Verified: 'E' at octave 6 -> ona 79 -> 1318.51Hz (E6); 'D' -> ona 77 -> 1174.66Hz (D6).
const NOTE_MAP = { A: 12, B: 14, C: 3, D: 5, E: 7, F: 8, G: 10 };
function cleanWords(w) {
  return w
    .replace(/\n+/g, '\n')
    .replace(/^(CL|BG|FG|FD|IC|WH|LT|BK)[A-Z0-9,]{0,8}(?=[a-z ,'])/g, '')
    .replace(/\n\s{2,}\n/g, '\n')
    .replace(/^[A-Z]{2}[A-Z0-9,]{0,10}/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}
const songs = a.songs.map((s) => ({
  id: s.id,
  title: s.title,
  file: s.file,
  blurb: s.blurb,
  tempo: s.tempo,
  lines: s.calls.map((c) => ({ notes: c.notes, words: cleanWords(c.words) })),
}));

const songsTs = `${hdr}// Songs are the real Play() calls found in the TempleOS tree.
export interface SongLine { notes: string; words: string; }
export interface Song { id: string; title: string; file: string; blurb: string; tempo: number; lines: SongLine[]; }

export const songs: Song[] = ${JSON.stringify(songs, null, 2)};

// Musical grammar, taken verbatim from ::/Adam/ASnd.HC
// Play(): 'w'=4 'h'=2 'q'=1 'e'=0.5 's'=0.25 quarter-notes, 't'=*2/3, '.'=*1.5,
// '('=tie, 'R'=rest, digits 1-7 set octave (mid C is octave 4).
export const durationCodes: Record<string, number> = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };
export const noteMap = ${JSON.stringify(NOTE_MAP)} as Record<string, number>;
export const stacattoFactor = 0.9;
export const defaultTempo = 2.5;
// ::/Kernel/KMisc.HC  —  "Ona to freq. Ona=60 is 440.0Hz."
export const onaToFreq = (ona: number) => (ona === 0 ? 0 : (440 / 32) * Math.pow(2, ona / 12));
`;
fs.writeFileSync(path.join(DEST, 'songs.ts'), songsTs);

// ---- glyphs.ts + palette.ts
const glyphsTs = `${hdr}// sys_font_std[256] from ::/Kernel/FontStd.HC.
// Each glyph is 8 bytes; byte 0 is the BOTTOM row, MSB of each byte is the leftmost pixel.
export const fontGlyphs: number[][] = ${JSON.stringify(a.glyphs)};
`;
fs.writeFileSync(path.join(DEST, 'glyphs.ts'), glyphsTs);

const paletteTs = `${hdr}// TempleOS VGA 16-colour palette (Kernel colour defines).
export const palette: [string, string][] = ${JSON.stringify(a.palette)};
`;
fs.writeFileSync(path.join(DEST, 'palette.ts'), paletteTs);

console.log('wrote metrics.ts songs.ts glyphs.ts palette.ts ->', DEST);
console.log('songs:', songs.length, '| glyphs:', a.glyphs.length);
for (const s of songs) {
  console.log(`\n${s.title}  (tempo ${s.tempo})`);
  for (const l of s.lines) console.log(`   ${l.notes}\n     ${JSON.stringify(l.words)}`);
}
