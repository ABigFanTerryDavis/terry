// Extracts chapter data for the five tribute pages from a TempleOS checkout:
//   - Oracle:    Vocab.DD word list (GodWordStr picks words[GodBits()%num])
//   - Changelog: Doc/ChgLog.DD dated entries (raw DolDoc, rendered at runtime)
//   - Tour:      Misc/Tour TourPut("...") strings (his tutorial voice)
//   - Gallery:   curated Demo/ entries: header comment + LOC from the index
//   - Compiler:  first public function per stage file + preceding comments
//
//   node scripts/extract-chapters.mjs
// Reads TEMPLEOS_SRC (default .templeos/TempleOS), writes .cache/chapters.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SRC = path.resolve(process.env.TEMPLEOS_SRC ?? path.join(ROOT, '.templeos/TempleOS'));
const CACHE = path.resolve(process.env.TEMPLEOS_CACHE ?? path.join(ROOT, '.cache'));
const OUT = path.join(CACHE, 'chapters.json');
fs.mkdirSync(CACHE, { recursive: true });

const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'latin1');
const exists = (rel) => fs.existsSync(path.join(SRC, rel));

// ------------------------------------------------------------------ Oracle
// Adam/God/Vocab.DD: one word per line, no blanks.
const vocab = read('Adam/God/Vocab.DD')
  .split(/\r?\n/)
  .map((w) => w.trim())
  .filter(Boolean);

// HSNotes.DD (his Holy Spirit instruction file) is deliberately not quoted;
// the Oracle page links to it in the explorer instead.

// ---------------------------------------------------------------- Changelog
// Entries open with $IV,1$----DATE----$IV,0$; body runs to the next header.
function parseChangelog(raw) {
  const parts = raw.split(/\$IV,1\$----(.*?)----\$IV,0\$/gs);
  const intro = (parts[0] ?? '').trim();
  const entries = [];
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const date = (parts[i] ?? '').trim();
    const body = (parts[i + 1] ?? '').trim();
    if (date && body) entries.push({ date, body });
  }
  return { intro, entries };
}
const changelog = parseChangelog(read('Doc/ChgLog.DD'));

// -------------------------------------------------------------------- Tour
// Misc/Tour files speak through TourPut("..." "...") concatenated literals.
function unescapeHC(s) {
  // Single pass: \\ must win over \n so a literal backslash never eats a letter.
  return s.replace(/\\\\|\\n|\\t|\\"/g, (m) =>
    m === '\\\\' ? '\\' : m === '\\n' ? '\n' : m === '\\t' ? '\t' : '"',
  );
}
function extractTourSteps(raw) {
  // Inner double-quotes occur only inside $...$ DolDoc macros
  // ($LK+PU,"Demo Index",A=...), which break strict string grammar. So mask
  // every macro span first, parse the now quote-clean literals strictly,
  // then restore the macros verbatim.
  const kept = [];
  const keep = (s) => {
    kept.push(s);
    return '\uE000' + String(kept.length - 1) + '\uE001';
  };
  // Color shorthands ($$GREEN$$) are formatting: drop them outright.
  let masked = raw.replace(/\$\$([A-Za-z][A-Za-z0-9+]*)\$\$/g, '');
  // Remaining $$ (before digits/punctuation) is a literal dollar.
  masked = masked.replace(/\$\$/g, '\uE002');
  // Any other $...$ span is a macro: stash it whole.
  masked = masked.replace(/\$[^$]*\$/g, (m) => keep(m));
  const steps = [];
  const used = [];
  const take = (start, end, lits) => {
    if (used.some(([a, b]) => start < b && end > a)) return;
    used.push([start, end]);
    const text = lits
      .map((l) =>
        unescapeHC(l.slice(1, -1))
          .replace(/\uE002/g, '$')
          .replace(/\uE000(\d+)\uE001/g, (_, i) => kept[Number(i)] ?? ''),
      )
      .join('')
      .trim();
    if (text) steps.push({ at: start, text });
  };
  let m;
  const multi = /TourPut\(\s*((?:"(?:[^"\\]|\\.)*"\s*)+)\)/gs;
  while ((m = multi.exec(masked)) !== null) {
    const lits = m[1].match(/"(?:[^"\\]|\\.)*"/g) || [];
    take(m.index, m.index + m[0].length, lits);
  }
  steps.sort((a, b) => a.at - b.at);
  return steps.map((s) => s.text);
}
const tourOrder = ['Misc/Tour/Tour.IN', 'Misc/Tour/Tour1.IN', 'Misc/Tour/Tour2.IN', 'Misc/Tour/Tour3.IN', 'Misc/Tour/Tour4.IN', 'Misc/Tour/Tour5.IN', 'Misc/Tour/Tour6.IN', 'Misc/Tour/Tour7.IN', 'Misc/Tour/Tour8.IN', 'Misc/Tour/Tour9.IN', 'Misc/Tour/TourA.IN', 'Misc/Tour/TourB.IN', 'Misc/Tour/TourC.IN'];
const tour = tourOrder
  .filter(exists)
  .map((f) => ({ file: f, steps: extractTourSteps(read(f)) }))
  .filter((t) => t.steps.length > 0);

// ------------------------------------------------------------------ Gallery
// Curated demos: header comment + LOC from the built explorer index.
const explorerIndex = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/templeos-index.json'), 'utf8'));
const locByPath = new Map(explorerIndex.files.map((f) => [f.path, f]));
function headerComment(rel) {
  const lines = read(rel).split(/\r?\n/);
  const out = [];
  for (const l of lines) {
    if (/^\s*\/\//.test(l)) out.push(l.replace(/^\s*\/\/\s?/, ''));
    else if (l.trim() === '') {
      if (out.length) break;
    } else break;
    if (out.length >= 8) break;
  }
  return out.join('\n').trim();
}
const demoFiles = [
  'Demo/Games/TicTacToe.HC', 'Demo/Games/Maze.HC', 'Demo/Games/RainDrops.HC',
  'Demo/Games/CastleFrankenstein.HC', 'Demo/Games/BlackDiamond.HC',
  'Demo/Games/Rocket.HC', 'Demo/Games/RocketScience.HC', 'Demo/Games/Squirt.HC',
  'Demo/Games/Talons.HC', 'Demo/Games/ZoneOut.HC', 'Demo/Games/RawHide.HC',
  'Demo/Games/Wenceslas.HC', 'Demo/Games/FlapBat.HC', 'Demo/Games/ElephantWalk.HC',
  'Demo/Games/BomberGolf.HC', 'Demo/Games/Varoom.HC', 'Demo/Games/DunGen.HC',
  'Demo/Games/TreeCheckers.HC', 'Demo/Games/CircleTrace.HC', 'Demo/Games/TheDead.HC',
];
const living = new Set(['Demo/Games/TicTacToe.HC', 'Demo/Games/Maze.HC', 'Demo/Games/RainDrops.HC']);
const demos = demoFiles
  .filter(exists)
  .map((f) => {
    const e = locByPath.get(f) || { code: 0, bytes: 0, trimmed: 0 };
    return {
      file: f,
      title: path.basename(f, '.HC').replace(/([a-z])([A-Z])/g, '$1 $2'),
      header: headerComment(f),
      code: e.code,
      bytes: e.bytes,
      trimmed: e.trimmed,
      living: living.has(f),
    };
  });

// ---------------------------------------------------------------- Compiler
// One real function per pipeline stage, with its comment block.
const stages = [
  ['Lex.HC', 'Compiler/Lex.HC', 'Lexing — characters become tokens'],
  ['PrsExp.HC', 'Compiler/PrsExp.HC', 'Parsing expressions — tokens become trees'],
  ['PrsStmt.HC', 'Compiler/PrsStmt.HC', 'Parsing statements — trees gain control flow'],
  ['OptPass012.HC', 'Compiler/OptPass012.HC', 'Optimization — trees become simpler trees'],
  ['BackC.HC', 'Compiler/BackC.HC', 'Code generation — trees become machine code'],
  ['Asm.HC', 'Compiler/Asm.HC', 'Assembly — the backend that emits bytes'],
];
function firstFunction(raw) {
  const lines = raw.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    // Type [*]Name( at column zero, e.g. `CIntermediateCode *OptPass012(`.
    // His code usually omits `public`, so match the shape, not the keyword.
    if (/^(?:public\s+)?[A-Z]\w*(?:\s*\*+\s*|\s+)\w+\s*\(/.test(lines[i] ?? '')) {
      start = i;
      break;
    }
  }
  if (start === -1) return null;
  let top = start;
  while (top - 1 >= 0 && /^\s*(\/\/|$)/.test(lines[top - 1] ?? '')) top--;
  // include a /* */ block comment sitting directly above, if any
  if (top - 1 >= 0 && /^\s*\*\//.test(lines[top - 1] ?? '')) {
    let b = top - 1;
    let guard = 0;
    while (b - 1 >= 0 && !/\/\*/.test(lines[b - 1] ?? '') && guard < 16) {
      b--;
      guard++;
    }
    if (/\/\*/.test(lines[b - 1] ?? '')) b--;
    top = b;
  }
  return lines.slice(top, start + 34).join('\n');
}
const compiler = stages
  .filter(([, f]) => exists(f))
  .map(([stage, file, note]) => {
    const raw = read(file);
    const e = locByPath.get(file) || { code: 0 };
    return { stage, file, note, code: e.code, excerpt: firstFunction(raw) ?? '' };
  })
  .filter((c) => c.excerpt);

const chapters = { vocab, changelog, tour, demos, compiler };
fs.writeFileSync(OUT, JSON.stringify(chapters));
console.log(
  `vocab ${vocab.length} words | changelog ${changelog.entries.length} entries | ` +
    `tour ${tour.reduce((s, t) => s + t.steps.length, 0)} steps in ${tour.length} files | ` +
    `demos ${demos.length} | compiler stages ${compiler.length}`,
);
