# Terry A. Davis — the record

A source-level tribute to Terry A. Davis and TempleOS, built as a static site.

Everything quantitative on the page was **measured from the TempleOS source tree**
rather than copied from a second-hand article, and the music is **his own**,
replayed from the `Play()` notation strings in his code.

```
116,129 lines of code   ·   492 source files   ·   1 author   ·   public domain
```

## What's here

| Section | What it does |
| --- | --- |
| **Autopsy** | Line counts per directory, per file and per extension; code vs comment vs blank; commits per year. Real charts, real numbers. |
| **Listen** | Four of his compositions, played through a port of `Play()` from `Adam/ASnd.HC`, at the pitch given by his own formula in `Kernel/KMisc.HC`. |
| **Glyphs** | His 8×8 bitmap font decoded from `sys_font_std[]` and rendered pixel by pixel, plus the VGA 16-colour palette. |

## The music is a real port, not an impression

TempleOS had no sound card — it drove the PC speaker through strings like
`6hEqDC5B6CDhE`. `src/music.ts` implements the grammar documented above the
original `Play()`:

- `w h q e s` — whole, half, quarter, eighth, sixteenth
- `t` — two-thirds of the current duration · `.` — one and a half times
- `(` — tie, placed before the note to be extended
- `1`–`7` — set octave; middle C is octave 4; **persists until changed**
- `M3/4` — set the meter · `A`–`G` — play a note, optionally `#` or `b`
- `R` — rest

Durations and octaves persist, which is why one string can open `6h` and stay in
half notes for the whole phrase. Pitch comes from his formula:

```c
F64 Ona2Freq(I8 ona) {   // ::/Kernel/KMisc.HC — "Ona=60 is 440.0Hz"
  if (!ona) return 0;
  else return 440.0/32*2.0`(ona/12.0);
}
```

`noteMap` (`A=12 B=14 C=3 D=5 E=7 F=8 G=10`) was solved from that formula against
the anchors in his source — A4 = `ona 60` = 440 Hz, mid C = `ona 51` = 261.63 Hz.
Verified against E6 = 1318.51 Hz and D6 = 1174.66 Hz.

`npm test` asserts all of that: 16 checks covering pitch, duration, staccato
factor, ties, rests, meters and octave persistence.

## Reproducing the data

The generated modules in `src/generated/` are checked in, so the site builds
without cloning anything. To regenerate them from source:

```bash
git clone https://github.com/cia-foundation/TempleOS .templeos/TempleOS
npm run data
```

That runs three scripts in order:

| Script | Does |
| --- | --- |
| `scripts/analyze-source.mjs` | Walks the checkout, classifies every line as code / comment / blank, reads `git log` |
| `scripts/extract-assets.mjs` | Pulls `sys_font_std[]`, the `Play()` song strings and lyrics, and the palette |
| `scripts/regen.mjs` | Writes the typed modules in `src/generated/` |

Override paths with `TEMPLEOS_SRC`, `TEMPLEOS_OUT`, `TEMPLEOS_ASSETS`.

### Two files are deliberately excluded

`Misc/Bible.TXT` (100,118 lines — the King James Version, bundled for scripture
search) and `Misc/PCIDevices.DD` (9,430 lines — a device list) are **data, not
code**. Counting them would have added 109,548 phantom lines and roughly doubled
the headline number. They are reported separately on the page instead.

## Development

```bash
npm install
npm run dev        # vite dev server
npm run typecheck  # tsc --noEmit
npm test           # music-parser assertions
npm run build      # typecheck + production build into dist/
npm run test:smoke # build, then render dist/ in jsdom and assert on the DOM
```

No runtime dependencies. Charts are hand-rolled SVG; audio is Web Audio; the
font is drawn on a canvas. The whole production bundle is about 30 kB of JS and
12 kB of CSS.

## Credits

- Terry A. Davis, for TempleOS, which is in the **public domain** — not merely
  open source. Nothing here is his code; it is a reading of it.
- [cia-foundation/TempleOS](https://github.com/cia-foundation/TempleOS) — the
  source tree every measurement comes from.
- His own `::/Doc/Credits.DD` and `::/Doc/FAQ.DD`, which are unusually honest
  about what was borrowed: a FreeDOS font table, a Cyrillic font taken without
  permission, an LZW compressor adapted from a magazine article, and a heap
  algorithm adapted from a VAX operating system. He listed all of it.

TempleOS was written by one person over nineteen years. This page exists because
that seemed worth measuring properly.
