// Extracts the Demands and the HolyC language reference from the tree.
//   node scripts/extract-chapters.mjs
// Everything here is measured or copied from the source; the 2026 scorecard
// is hand-curated and every claim in it is checkable.
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.env.TEMPLEOS_SRC;
if (!SRC) throw new Error('TEMPLEOS_SRC not set');

const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'latin1');
const exists = (rel) => fs.existsSync(path.join(SRC, rel));

/* ------------------------------------------------------------------ Demands */

// Doc/Demands.DD is a list of bullet demands. Each is a block starting
// with "* " and running to the next one.
function parseDemands(raw) {
  const items = [];
  let cur = null;
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (t.startsWith('* ')) {
      if (cur) items.push(cur);
      cur = { raw: [], text: '' };
      cur.raw.push(t.slice(2));
      continue;
    }
    if (cur && t) cur.raw.push(t);
  }
  if (cur) items.push(cur);

  return items.map((it) => {
    const body = it.raw.join(' ');
    // links: $LK,"label",A="FI:::path"$ or $LK,"label"$
    const links = [];
    const lkRe = /\$LK,\s*"((?:[^"\\]|\\.)*)"\s*(?:,\s*A="([^"]*)")?/g;
    let m;
    while ((m = lkRe.exec(body)) !== null) {
      const label = m[1].replace(/\\(.)/g, '$1');
      const a = m[2] ?? '';
      const file = a.startsWith('FI:::') ? a.slice(5).replace(/^:+/, '').replace(/^\//, '') : '';
      links.push({ label, file });
    }
    // line counts: $LK,"::/path"$	:123 lines for X
    const counts = [];
    const cRe = /\$LK,"([^"]+)"\$\s*:?\s*(\d+)\s+([^\n$]*)/g;
    while ((m = cRe.exec(body)) !== null) {
      counts.push({ file: m[1].replace(/^:+/, ''), lines: Number(m[2]), note: (m[3] || '').trim() });
    }
    const text = body
      // keep the label of a link, drop the machinery around it
      .replace(/\$LK,\s*"((?:[^"\\]|\\.)*)"[^$]*\$/g, '$1')
      .replace(/\$TX,\s*"((?:[^"\\]|\\.)*)"[^$]*\$/g, '$1')
      .replace(/\$\$[^$]*\$\$/g, '')
      .replace(/\$[^$]*\$/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { text, links, counts, raw: it.raw };
  });
}

const demandsRaw = exists('Doc/Demands.DD') ? read('Doc/Demands.DD') : '';
const demands = parseDemands(demandsRaw);

// The scorecard: what the industry actually did, per demand. Keyed by a
// distinctive phrase so it stays attached if the text shifts slightly.
const SCORECARD = [
  {
    key: 'must support RedSea',
    verdict: 'no',
    answer:
      'The industry kept FAT32, NTFS, ext4 and APFS. RedSea is still unique to TempleOS — ' +
      'the 974 lines of FAT32 code he wanted gone are still there, in every OS.',
    note: 'His complaint about one driver per device type is still a good complaint.',
  },
  {
    key: 'cancel SecureBoot',
    verdict: 'no',
    answer:
      'SecureBoot is now mandatory on new Windows hardware. Dual-booting got harder, not easier.',
  },
  {
    key: 'ATAPI CD/DVD',
    verdict: 'no',
    answer:
      'Optical media is gone. VMware moved to virtual optical drives, and the physical drive ' +
      'he wanted to keep alive did not survive.',
  },
  {
    key: 'list TempleOS as an official',
    verdict: 'no',
    answer:
      'VMware still ships TempleOS only as a community-provided virtual machine file, not as a ' +
      'first-class supported guest.',
  },
  {
    key: 'more than 16 cores',
    verdict: 'yes',
    answer:
      'Modern vSphere and Hyper-V hand out far more than 16 vCPUs. The limit he hit is gone; ' +
      'the reason it was there is too.',
  },
  {
    key: 'hard disk should be placed at IDE',
    verdict: 'no',
    answer:
      'USB won completely. IDE is a legacy interface on a collector’s shelf, and the ' +
      'transition off PS/2 he asked for went the other way.',
  },
  {
    key: 'transition the industry off of USB',
    verdict: 'no',
    answer:
      'USB and HID are more universal than ever. He called HID "insanity" and asked for ' +
      'PS/2 with simple flow control. The industry shipped more endpoints, not fewer.',
  },
  {
    key: 'no-paging long mode',
    verdict: 'no',
    answer:
      'x86-64 requires paging; there is no no-paging mode. His own kernel needed the 135-line ' +
      'identity-map shim he wanted the industry to delete — and the industry would not.',
    note:
      'This is the one demand that makes the whole letter land: he wanted paging out of the ' +
      'hardware, and the hardware said no, so he paid for it in 135 lines of his own code.',
  },
  {
    key: 'fast software interrupts',
    verdict: 'no',
    answer:
      'Intel did not add a fast-software-interrupt mode. His idea of a new IDT entry type is ' +
      'still just an idea, filed in a public-domain filesystem nobody mounted.',
  },
  {
    key: 'reset switch and a fast reboot',
    verdict: 'partly',
    answer:
      'Fast boot is the industry norm now — he called for a reset switch, and UEFI fast boot is ' +
      'the same need met a different way. TempleOS in factory ROM: never happened.',
  },
  {
    key: 'just an English version',
    verdict: 'no',
    answer:
      'The industry localised everything, aggressively. The 16-colour screen, the 640x480 ' +
      'screen, the single voice: all of that stayed exactly as he fixed them.',
  },
  {
    key: 'replace Windows with Wine',
    verdict: 'no',
    answer: 'Windows is still Windows.',
  },
];

const demandsWithScore = demands.map((d) => {
  const hay = d.text + ' ' + d.raw.join(' ');
  // A demand can carry more than one answer (the "English only" line sits
  // inside the factory-ROM demand, for instance).
  const scores = SCORECARD.filter((s) => hay.includes(s.key)).map((s) => ({
    verdict: s.verdict,
    answer: s.answer,
    note: s.note ?? '',
  }));
  // The tail of the file is a trademark notice, not a demand.
  const isNotice = /trademark owned by/i.test(d.text);
  return { ...d, scores, kind: isNotice ? 'notice' : 'demand' };
});

/* ----------------------------------------------------------------- Language */

// Directive descriptions, parsed from his own PreProcessor.DD and
// Directives.DD: lines of the form  $FG,2$#include ""$FG$ <TAB> description
function parseDirectives() {
  const out = new Map();
  const files = ['Doc/PreProcessor.DD', 'Doc/Directives.DD'];
  for (const f of files) {
    if (!exists(f)) continue;
    const raw = read(f);
    for (const line of raw.split(/\r?\n/)) {
      const m = /\$FG,\d+\$(#[a-z_]+)(\s*[^$]*)?\$FG\$\s*\t?\s*(.+)$/.exec(line.trim());
      if (!m?.[1]) continue;
      const name = m[1].replace(/^#/, '');
      const desc = (m[3] ?? '').replace(/\$\$[^$]*\$\$/g, '').replace(/\$[^$]*\$/g, '').trim();
      if (!desc) continue;
      if (!out.has(name)) out.set(name, { name, desc, doc: f });
      else if (out.get(name).desc.length < desc.length) out.set(name, { name, desc, doc: f });
    }
  }
  return [...out.values()];
}

// Count every directive actually used in the tree, so the list is measured.
function countDirectives() {
  const counts = new Map();
  const exts = new Set(['.HC', '.HH', '.DD', '.IN', '.C', '.CPP']);
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === '.git') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (exts.has(path.extname(e.name).toUpperCase())) {
        let txt = '';
        try {
          txt = fs.readFileSync(p, 'latin1');
        } catch {
          continue;
        }
        for (const m of txt.matchAll(/^\s*#([a-z_]+)/gm)) {
          const n = m[1].toLowerCase();
          counts.set(n, (counts.get(n) ?? 0) + 1);
        }
      }
    }
  };
  walk(SRC);
  return counts;
}

// The type system, measured: which of his types actually appear as a return
// type in a function definition across the whole tree.
function countTypes() {
  const counts = new Map();
  const types = ['U0', 'U8', 'U16', 'U32', 'U64', 'I0', 'I8', 'I16', 'I32', 'I64', 'F64', 'Bool'];
  const exts = new Set(['.HC', '.HH', '.IN', '.C', '.CPP']);
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === '.git') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (exts.has(path.extname(e.name).toUpperCase())) {
        let txt = '';
        try {
          txt = fs.readFileSync(p, 'latin1');
        } catch {
          continue;
        }
        for (const line of txt.split(/\r?\n/)) {
          const m = /^\s*(?:public\s+)?(U0|U8|U16|U32|U64|I0|I8|I16|I32|I64|F64|Bool)\s+\*?\w+\s*\(/.exec(line);
          if (m?.[1]) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
        }
      }
    }
  };
  walk(SRC);
  return types.map((t) => ({ type: t, count: counts.get(t) ?? 0 }));
}

const directiveCounts = countDirectives();
const parsedDirectives = parseDirectives();
const directives = parsedDirectives
  .map((d) => ({ ...d, count: directiveCounts.get(d.name.toLowerCase()) ?? 0 }))
  .sort((a, b) => b.count - a.count);
// Directives he used in the tree but did not describe in these two files.
for (const [name, count] of directiveCounts) {
  if (!directives.some((d) => d.name.toLowerCase() === name) && count > 0) {
    directives.push({ name, desc: '', doc: '', count });
  }
}
directives.sort((a, b) => b.count - a.count);

const types = countTypes();

// His own language documentation, as a linked index.
const LANGUAGE_DOCS = [
  ['CompilerOverview.DD', 'Compiler Index', 'The entry point to his own documentation of his compiler.'],
  ['HelloWorld.DD', 'Hello World', 'The smallest complete program, in his own words.'],
  ['PreProcessor.DD', 'PreProcessor', 'There is no separate preprocessor pass. The lexer has it built in.'],
  ['Directives.DD', 'Directives', 'The built-in #define macros: __DATE__, __TIME__, __LINE__, __FILE__.'],
  ['ScopingLinkage.DD', 'Scoping and Linkage', 'How names resolve across compilation units.'],
  ['Asm.DD', 'Assembly', 'The inline assembly dialect.'],
  ['Options.DD', 'Compiler Options', 'The knobs on the compiler.'],
  ['MemOverview.DD', 'Memory Overview', 'How the heap and the code heap work.'],
  ['RedSea.DD', 'RedSea', 'The filesystem he wrote, and why.'],
  ['Comm.HC', 'Comm', 'Serial and parallel ports, the way he wanted them.'],
  ['DolDoc.DD', 'DolDoc', 'The markup system his documents are written in.'],
  ['Define.DD', 'Define', 'String indirection and #define lists.'],
  ['AboutTempleOS.DD', 'About TempleOS', 'In his own words, briefly.'],
  ['Reliability.DD', 'Reliability', 'What he thought about failure.'],
].filter(([f]) => exists('Doc/' + f));

export { demandsWithScore, directives, types, LANGUAGE_DOCS };
