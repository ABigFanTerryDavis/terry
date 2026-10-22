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
| **Autopsy** | Line counts per directory, per file and per extension; code vs comment vs blank; commits per year plus all 49 release commits; a treemap of the whole tree. Real charts, real numbers, and the directory/file charts link into the Explorer. |
| **Listen** | Five of his compositions, including “Risen” (`TOSTheme.HC`), played through a port of `Play()` from `Adam/ASnd.HC`, at the pitch given by his own formula in `Kernel/KMisc.HC`. It also includes a GodSong panel: his hymn-generation tables with a browser PRNG standing in for compiled-only `GodBits`. Below them, the eight wordless game and demo themes, on the same voice. |
| **Glyphs** | His 8×8 bitmap font decoded from `sys_font_std[]` and rendered pixel by pixel, plus the VGA 16-colour palette. |
| **Oracle** (`oracle.html`) | The stopwatch oracle: his 7,569-word vocabulary plus the real `GodPick` latch mechanic. |
| **Compiler** (`compiler.html`) | One line of HolyC through his six real compiler stages, quoting his code. |
| **Changelog** (`changelog.html`) | 78 dated entries from `Doc/ChgLog.DD`, newest first. |
| **Gallery** (`gallery.html`) | Twenty demos described in his header comments; TicTacToe, Maze and RainDrops run live. |
| **Tour** (`tour.html`) | 63 guided-tour stops from `Misc/Tour`, verbatim. |
| **Manual** (`manual.html`) | All 110 DolDoc documents, rendered as a readable book with a table of contents. |
| **University** (`university.html`) | His 13 own lectures from `Demo/Lectures` — including a compiler written as a lesson. |
| **Desktop** (`desktop.html`) | His actual home screen, rebuilt from `PersonalMenu.DD` and `Doc/Welcome.DD`. |
| **Search** | One box on every page, across the site prose and all 659 source files. Press `/`. |
| **Downloads** (`downloads.html`) | Every ISO that exists â€” 57 files, 737 MB, from HOPPY to 5.03 â€” mirrored to our own release, with the published SHA-256 sums. |
| **Explorer** (`explorer.html`) | All **659 files**, browsable and searchable — by path, or by content with `text:`. DolDoc files get a reading mode; every file deep-links by line and copies with one click. Per-file line counts match the Autopsy charts exactly. |

## The source explorer

`explorer.html` is a full read-only browser for the TempleOS tree — every file,
no sampling.

```
659 files   3.42 MB readable   53 files trimmed
```

Files are fetched individually, so the 107 kB index loads first and each file
arrives only when you open it.

### The binary-tail problem

**53 files are not what they look like.** They are HolyC or DolDoc source with a
binary blob appended — an embedded sprite or sound sample. Left alone they are
unreadable:

| File | Original | Readable | What the rest was |
| --- | --- | --- | --- |
| `Demo/Snd/WaterFowl.HC` | 308,908 B | **2,379 B** | 12 lines of song code, then 306,529 bytes of audio |
| `Demo/Games/Stadium/StadiumBG.DD` | 302,127 B | **12 B** | almost entirely image data |
| `Apps/Titanium/Titanium.HC` | 106,011 B | **17,879 B** | embedded sprites |

`scripts/build-explorer.mjs` cuts each file at the first run of 32 consecutive
non-printable bytes, so **1.78 MB (34% of the tree) is never shown as garbage**.
The UI says so on any affected file rather than silently truncating.

Encoding is handled too: the extractor decodes as UTF-8 and falls back to
latin1, which is why no file renders as mojibake.

### Features

- Tree by real TempleOS paths, with folder counts and per-file LOC
- Deep-linkable URLs — `explorer.html#/Kernel/KMisc.HC:163` opens that line and
  scrolls to it
- Path filter (`/` to focus, `Esc` to clear), `j`/`k` to walk files
- Hand-rolled HolyC highlighting: line and block comments, strings, `$MACRO$`
  DolDoc markup, `#` directives, numbers, keywords, types, call sites
- Renders as plain text above 220 kB rather than locking up the tab
- Line classification reuses `scripts/analyze-source.mjs`, so an explorer's
  numbers can never drift from the Autopsy page

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
| `scripts/build-explorer.mjs` | Copies the trimmed tree to `public/templeos/` and writes `public/templeos-index.json` |

Override paths with `TEMPLEOS_SRC`, `TEMPLEOS_OUT`, `TEMPLEOS_ASSETS`.

`public/templeos/` and `public/templeos-index.json` are committed, so the site
builds without cloning anything. Re-run `npm run data` only if you want to
re-measure against a newer checkout.

### Two files are deliberately excluded

`Misc/Bible.TXT` (100,118 lines — the King James Version, bundled for scripture
search) and `Misc/PCIDevices.DD` (9,430 lines — a device list) are **data, not
code**. Counting them would have added 109,548 phantom lines and roughly doubled
the headline number. They are reported separately on the page instead.

## Development

```bash
npm install
npm run dev         # vite dev server
npm run typecheck   # tsc --noEmit
npm test            # music-parser assertions (16 checks)
npm run test:doldoc  # DolDoc reader assertions (8 checks)
npm run build       # typecheck + production build into dist/
npm run test:smoke    # render dist/index.html in jsdom and assert on the DOM
npm run test:explorer # same, for the explorer: tree, routing, highlighting
npm run test:all      # all of the above
```

No runtime dependencies. Charts are hand-rolled SVG; audio is Web Audio; the
font is drawn on a canvas; HolyC highlighting is ~100 lines of regex. The whole
production bundle is about 38 kB of JS and 19 kB of CSS, plus the 3.4 MB of
source the explorer serves on demand.

## Credits

- Terry A. Davis, for TempleOS, which is in the **public domain** — not merely
  open source. Nothing here is his code; it is a reading of it.
- [cia-foundation/TempleOS](https://github.com/cia-foundation/TempleOS) — the
  source tree every measurement comes from.
- His own `::/Doc/Credits.DD` and `::/Doc/FAQ.DD`, which are unusually honest
  about what was borrowed: a FreeDOS font table, a Cyrillic font taken without
  permission, an LZW compressor adapted from a magazine article, and a heap
  algorithm adapted from a VAX operating system. He listed all of it.

TempleOS was written by one person. This page exists because
that seemed worth measuring properly.
