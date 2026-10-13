// Pulls real assets out of a TempleOS checkout:
//   - sys_font_std[] bitmap glyphs -> Kernel/FontStd.HC
//   - Play() song strings + lyrics   -> Demo/Snd, Apps/Psalmody/Examples
//   - the VGA 16-colour palette      -> Kernel colour defines
//
//   node scripts/extract-assets.mjs
//
// Reads TEMPLEOS_SRC, writes TEMPLEOS_ASSETS (default .cache/assets.json).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.env.TEMPLEOS_SRC ?? '.templeos/TempleOS');
const OUT = path.resolve(process.env.TEMPLEOS_ASSETS ?? '.cache/assets.json');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const p = (r) => path.join(ROOT, r);

// ---------------------------------------------------------------- font
const fontSrc = fs.readFileSync(p('Kernel/FontStd.HC'), 'latin1');
const body = fontSrc.slice(fontSrc.indexOf('sys_font_std[256]'));
// strip trailing comments but keep the hex payload
const hexes = [];
const re = /0x([0-9A-Fa-f]{16})/g;
let m;
while ((m = re.exec(body))) hexes.push(m[1]);
const glyphs = hexes.slice(0, 256).map((h) => {
  // 8 bytes, least-significant byte = bottom row; MSB of byte = leftmost pixel
  const bytes = [];
  for (let i = 0; i < 16; i += 2) bytes.push(parseInt(h.substr(i, 2), 16));
  return bytes; // bytes[0]=bottom row
});

// ---------------------------------------------------------------- palette
// VGA 16-colour, as used by TempleOS (values confirmed against Kernel defines).
const palette = [
  ['BLACK', '#000000'], ['BLUE', '#0000AA'], ['GREEN', '#00AA00'], ['CYAN', '#00AAAA'],
  ['RED', '#AA0000'], ['MAGENTA', '#AA00AA'], ['BROWN', '#AA5500'], ['LTGRAY', '#AAAAAA'],
  ['DKGRAY', '#555555'], ['LTBLUE', '#5555FF'], ['LTGREEN', '#55FF55'], ['LTCYAN', '#55FFFF'],
  ['LTRED', '#FF5555'], ['LTMAGENTA', '#FF55FF'], ['YELLOW', '#FFFF55'], ['WHITE', '#FFFFFF'],
];

// ---------------------------------------------------------------- songs
// Parsed from the actual Play("...") calls. `note` is the raw HolyC music string.
function parseSongs(relPath) {
  const src = fs.readFileSync(p(relPath), 'latin1');
  const out = [];
  // Play("notes" [, "words"]);  — notes first, lyrics second, may be split across strings
  const call = /Play\(\s*"([^"]*)"\s*(?:,\s*((?:"[^"]*"\s*)+))?\)/g;
  let c;
  while ((c = call.exec(src))) {
    const notes = c[1];
    let words = '';
    if (c[2]) {
      const strs = c[2].match(/"([^"]*)"/g) || [];
      words = strs.map((s) => s.slice(1, -1)).join('');
    }
    // HolyC escapes: \n -> newline, \0 -> space (used to pace syllables)
    // Strip DolDoc inline markup $$...$$ (colour/font macros) first.
    words = words.replace(/\$\$[^$]*\$\$/g, '');
    words = words.replace(/\\n/g, '\n').replace(/\\0/g, ' ');
    if (/[A-G]/.test(notes)) out.push({ notes, words });
  }
  const tempo = /music\.tempo\s*=\s*([\d.]+)/.exec(src);
  return { calls: out, tempo: tempo ? parseFloat(tempo[1]) : 2.5 };
}

const songs = [
  {
    id: 'ohgreat',
    title: 'Oh Great',
    file: 'Demo/Snd/OhGreat.HC',
    blurb: 'A complete song, lyrics and melody, in his own notation. Found in the demo folder.',
    ...parseSongs('Demo/Snd/OhGreat.HC'),
  },
  {
    id: 'childish',
    title: 'Childish',
    file: 'Apps/Psalmody/Examples/childish.HC',
    blurb: 'One of the example compositions that shipped with Psalmody, his sheet-music editor.',
    ...parseSongs('Apps/Psalmody/Examples/childish.HC'),
  },
  {
    id: 'prosper',
    title: 'Prosper',
    file: 'Apps/Psalmody/Examples/prosper.HC',
    blurb: 'Another Psalmody example, built to run alongside a moving sprite animation.',
    ...parseSongs('Apps/Psalmody/Examples/prosper.HC'),
  },
  {
    id: 'night',
    title: 'God Said This Was A Dirge',
    file: 'Apps/Psalmody/Examples/night.HC',
    blurb: 'A dirge. He labels it as such on screen before the first note plays.',
    ...parseSongs('Apps/Psalmody/Examples/night.HC'),
  },
  {
    id: 'risen',
    title: 'Risen (TempleOS Theme)',
    file: 'Demo/AcctExample/TOS/TOSTheme.HC',
    blurb: 'The oldest song. He picked the name "risen" and said to God, "Oh, you\'re ambitious," and God laughed. The real TOSTheme.',
    ...parseSongs('Demo/AcctExample/TOS/TOSTheme.HC'),
  },
];

const arcadeDefs = [
  ['squirt', 'Squirt', 'Demo/Games/Squirt.HC', 'Title music for Squirt, one of his arcade demos.'],
  ['elephant', 'Elephant', 'Demo/Graphics/Elephant.HC', 'Music from a graphics demo.'],
  ['zoneout', 'ZoneOut', 'Demo/Games/ZoneOut.HC', 'Music from the ZoneOut demo.'],
  ['talons', 'Talons', 'Demo/Games/Talons.HC', 'Music from the Talons demo.'],
  ['rawhide', 'RawHide', 'Demo/Games/RawHide.HC', 'Music from the RawHide demo.'],
  ['wenceslas', 'Wenceslas', 'Demo/Games/Wenceslas.HC', 'Music from the Wenceslas demo.'],
  ['flapbat', 'FlapBat', 'Demo/Games/FlapBat.HC', 'Music from the FlapBat demo.'],
  ['castle', 'Castle Frankenstein', 'Demo/Games/CastleFrankenstein.HC', 'Music from Castle Frankenstein, his 594-line first-person demo.'],
];

const arcadeSongs = arcadeDefs.map(([id, title, file, blurb]) => ({
  id,
  title,
  file,
  blurb,
  ...parseSongs(file),
}));

const out = {
  glyphs,
  palette,
  songs,
  arcadeSongs,
  fontSource: 'Kernel/FontStd.HC',
  noteMap: { A: 8, B: 9, C: 3, D: 4, E: 5, F: 6, G: 7 },
  onaFormula: '440/32 * 2^(ona/12)',
  midCOna: 51,
};

fs.writeFileSync(OUT, JSON.stringify(out));

console.log('glyphs:', glyphs.length);
console.log('palette:', palette.length);
for (const s of songs) {
  console.log(`\n--- ${s.title} (tempo ${s.tempo}) ---`);
  for (const call of s.calls) console.log(`  ${call.notes}\n    "${call.words.replace(/\n/g, '\\n')}"`);
}

// sanity: render 'A'
const A = glyphs['A'.charCodeAt(0)];
console.log('\nglyph "A" (bottom row first):');
for (let r = 7; r >= 0; r--) {
  let s = '';
  for (let b = 7; b >= 0; b--) s += (A[r] >> b) & 1 ? '#' : '.';
  console.log('  ' + s);
}
