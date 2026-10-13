import './style.css';

import { byDir, commits, excludedDataFiles, topFiles, totals, sourceInfo } from './generated/metrics';
import { songs as songData, arcadeSongs } from './generated/songs';
import { palette } from './generated/palette';
import { treemapChart, barChart, columnChart, legend, stackBar, type Column } from './charts';
import { mountText } from './glyphs';
import { generateGodSong } from './god-song';
import { noteAt, parseSong, playSong, audioNow, type ParsedSong, type Playback as SongPlayback } from './music';

const $ = <T extends HTMLElement>(sel: string): T => {
  const node = document.querySelector<T>(sel);
  if (!node) throw new Error(`missing element: ${sel}`);
  return node;
};

const fmt = (n: number) => n.toLocaleString('en-US');
const ACCENTS = ['var(--accent-1)', 'var(--accent-2)', 'var(--accent-3)', 'var(--accent-4)', 'var(--accent-5)'];

const DIR_BLURB: Record<string, string> = {
  Adam: 'The user-facing system. Windows, graphics, DolDoc documents, the shell, the file manager, sound.',
  Kernel: 'The operating system proper. Memory, tasks, interrupts, block devices, drivers.',
  Compiler: 'HolyC. Lexer, parser, optimiser and code generator, plus the JIT.',
  Demo: 'Proof-of-concepts and toys. Flight simulators, a 3D engine demo, the Red Pill.',
  Apps: 'Finished applications he wrote: a music editor, a Spanish tutor, a budget tracker.',
  Doc: 'The documentation, written in DolDoc.',
  Misc: 'Installers, the test suite, his guided tour, and the bundled Bible.',
  Downloads: 'Ports and utilities.',
  Linux: 'Host-side tooling, including the .Z file compressor.',
};

/* ---------------------------------------------------------------- the record */

function buildHeroFacts(): void {
  const host = $('#hero-facts');
  const facts: [string, string][] = [
    ['Kernel', `${fmt(byDir.find((d) => d.dir === 'Kernel')?.code ?? 0)} lines`],
    ['Compiler', `${fmt(byDir.find((d) => d.dir === 'Compiler')?.code ?? 0)} lines`],
    ['Written by', 'one person'],
    ['Licence', 'public domain'],
    ['Resolution', '640×480×16'],
    ['Sound', 'one PC speaker'],
    ['Networking', 'none, on purpose'],
  ];
  host.replaceChildren(
    ...facts.map(([k, v]) => {
      const s = document.createElement('span');
      s.append(`${k} `);
      const b = document.createElement('b');
      b.textContent = v;
      s.appendChild(b);
      return s;
    }),
  );
}

function buildTiles(): void {
  const terryCommits = commits.byAuthor['Terry A. Davis'] ?? 0;
  const tiles: { value: string; label: string; note: string }[] = [
    { value: fmt(totals.code), label: 'Lines of code', note: 'Walked file by file from the source tree.' },
    { value: fmt(totals.sourceFiles), label: 'Source files', note: 'HolyC, assembly, and boot sources.' },
    { value: fmt(totals.lines), label: 'Lines in total', note: 'Including comments and blank lines.' },
    { value: fmt(terryCommits), label: 'Commits by him', note: 'Across eleven years, in one repository.' },
    { value: '13.9', label: 'Years, full time', note: 'His own words in ::/Doc/Credits.DD.' },
    { value: '0', label: 'Lines borrowed', note: 'Save the handful he credited — all of them listed.' },
  ];
  const host = $('#tiles');
  host.replaceChildren(
    ...tiles.map((t) => {
      const d = document.createElement('div');
      d.className = 'tile';
      const v = document.createElement('span');
      v.className = 'tile-value';
      v.textContent = t.value;
      const l = document.createElement('span');
      l.className = 'tile-label';
      l.textContent = t.label;
      const n = document.createElement('span');
      n.className = 'tile-note';
      n.textContent = t.note;
      d.append(v, l, n);
      return d;
    }),
  );
}

/* ------------------------------------------------------------------ autopsy */

function buildAutopsy(): void {
  // by directory
  const dirs = byDir.filter((d) => d.code > 0);
  $('#chart-dirs').replaceChildren(
    barChart(
      dirs.map((d, i) => ({
        label: d.dir,
        value: d.code,
        secondary: d.comments,
        color: ACCENTS[i % ACCENTS.length]!,
        note: `${DIR_BLURB[d.dir] ?? ''}\n${fmt(d.code)} code · ${fmt(d.comments)} comment · ${d.files} files`,
      })),
      { labelWidth: 150 },
    ),
  );
  const dirLegend = legend(
    dirs.slice(0, 5).map((d, i) => ({
      label: d.dir,
      color: ACCENTS[i % ACCENTS.length]!,
      value: fmt(d.code),
    })),
  );
  dirLegend.classList.add('dir-legend');
  $('#chart-dirs').after(dirLegend);

  // code / comment / blank
  $('#chart-mix').replaceChildren(
    stackBar([
      { label: 'Code', value: totals.code, color: ACCENTS[0]! },
      { label: 'Comments', value: totals.comments, color: ACCENTS[1]! },
      { label: 'Blank', value: totals.blank, color: '#2a3138' },
    ]),
  );
  $('#legend-mix').replaceChildren(
    legend([
      { label: 'Code', color: ACCENTS[0]!, value: `${fmt(totals.code)} (${((totals.code / totals.lines) * 100).toFixed(1)}%)` },
      { label: 'Comments', color: ACCENTS[1]!, value: `${fmt(totals.comments)} (${((totals.comments / totals.lines) * 100).toFixed(1)}%)` },
      { label: 'Blank', color: '#2a3138', value: `${fmt(totals.blank)} (${((totals.blank / totals.lines) * 100).toFixed(1)}%)` },
      {
        label: 'Excluded data',
        color: '#15191d',
        value: excludedDataFiles.map((f) => `${f.path.split('/').pop()} (${fmt(f.lines)})`).join(', '),
      },
    ]),
  );

  // full tree scaled by lines; exclude root-level single files recorded as dirs
  const treeData = byDir.filter((d) => d.dir && !d.dir.includes('.') && d.code > 0);
  $('#chart-treemap').replaceChildren(
    treemapChart(
      treeData.map((d, i) => ({
        label: d.dir,
        value: d.code,
        color: ACCENTS[i % ACCENTS.length]!,
        href: `./explorer.html#/${d.dir}`,
      })),
    ),
  );

  // commits by year
  const years = Object.keys(commits.byYear).sort();
  // Click links for charts -> open file in explorer
  const treemapSegs = $('#chart-treemap').querySelectorAll('.treemap-seg');
  treemapSegs.forEach((seg, i) => {
    (seg as SVGElement).addEventListener('click', () => {
      const dirName = treeData[i]?.dir;
      if (dirName) window.open(`./explorer.html#/${dirName}`, '_self');
    });
  });

  const dirBars = $('#chart-dirs').querySelectorAll('.bar-fill');
  dirBars.forEach((bar, i) => {
    const d = dirs[i];
    if (!d) return;
    (bar as SVGElement).style.cursor = 'pointer';
    (bar as SVGElement).addEventListener('click', () => {
      window.open(`./explorer.html#/${d.dir}`, '_self');
    });
  });

  const fileBars = $('#chart-files').querySelectorAll('.bar-fill');
  fileBars.forEach((bar, i) => {
    const f = top[i];
    if (!f) return;
    (bar as SVGElement).style.cursor = 'pointer';
    (bar as SVGElement).addEventListener('click', () => {
      window.open(`./explorer.html#/${f.path}`, '_self');
    });
  });

  const cols: Column[] = years.map((y, i) => ({
    label: y.slice(2),
    value: commits.byYear[y] ?? 0,
    color: ACCENTS[i % ACCENTS.length]!,
  }));
  $('#chart-commits').replaceChildren(columnChart(cols));

  // every release commit, newest first
  const ctable = $<HTMLTableElement>('#table-commits');
  const ccap = document.createElement('caption');
  ccap.textContent = `${commits.total} release commits, newest first`;
  const cthead = document.createElement('thead');
  const chr = document.createElement('tr');
  for (const h of ['Date', 'Subject', 'By']) {
    const th = document.createElement('th');
    th.textContent = h;
    chr.appendChild(th);
  }
  cthead.appendChild(chr);
  const ctbody = document.createElement('tbody');
  for (const c of [...commits.list].reverse()) {
    const tr = document.createElement('tr');
    const tdDate = document.createElement('td');
    tdDate.textContent = c.date;
    const tdSub = document.createElement('td');
    tdSub.className = 'path';
    tdSub.textContent = c.subject || '(no message)';
    tdSub.style.whiteSpace = 'normal';
    const tdBy = document.createElement('td');
    tdBy.textContent = c.author === 'Terry A. Davis' ? 'Terry' : c.author;
    tr.append(tdDate, tdSub, tdBy);
    ctbody.appendChild(tr);
  }
  ctable.replaceChildren(ccap, cthead, ctbody);

  const prov = $('#provenance');
  if (sourceInfo.headShort) {
    prov.textContent =
      `Measured against cia-foundation/TempleOS at ${sourceInfo.headShort}, ` +
      `generated ${sourceInfo.generated.slice(0, 10)}.`;
  }

  // top files
  const top = topFiles.slice(0, 20);
  $('#chart-files').replaceChildren(
    barChart(
      top.map((f, i) => ({
        label: f.path.length > 40 ? `…${f.path.slice(-38)}` : f.path,
        value: f.code,
        color: ACCENTS[i % ACCENTS.length]!,
        note: `${f.path}\n${fmt(f.code)} lines of code · ${fmt(f.comments)} comment`,
      })),
      { labelWidth: 330, rowHeight: 24 },
    ),
  );

  // file table
  const table = $<HTMLTableElement>('#table-files');
  const cap = document.createElement('caption');
  cap.textContent = `${fmt(topFiles.length)} source files, largest first`;
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  for (const h of ['File', 'Lines of code', 'Comment', 'Ratio']) {
    const th = document.createElement('th');
    th.textContent = h;
    if (h !== 'File') th.className = 'num';
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  const tbody = document.createElement('tbody');
  for (const f of topFiles.slice(0, 25)) {
    const tr = document.createElement('tr');
    const tdPath = document.createElement('td');
    tdPath.className = 'path';
    tdPath.textContent = f.path;
    const tdCode = document.createElement('td');
    tdCode.className = 'num';
    tdCode.textContent = fmt(f.code);
    const tdCom = document.createElement('td');
    tdCom.className = 'num';
    tdCom.textContent = fmt(f.comments);
    const tdRatio = document.createElement('td');
    tdRatio.className = 'num';
    tdRatio.textContent = f.comments === 0 ? '—' : `1 : ${(f.code / f.comments).toFixed(1)}`;
    tr.append(tdPath, tdCode, tdCom, tdRatio);
    tbody.appendChild(tr);
  }
  table.replaceChildren(cap, thead, tbody);
}

/* ------------------------------------------------------------------- listen */

interface SongView {
  parsed: ParsedSong;
  playback: SongPlayback | null;
  raf: number;
  roll: HTMLCanvasElement;
  nowPlaying: HTMLElement;
  /** song line index -> the element that displays it */
  lyricEls: Map<number, HTMLElement>;
  button: HTMLButtonElement;
}

const views = new Map<string, SongView>();

function drawRoll(view: SongView, t: number): void {
  const { parsed, roll } = view;
  const ctx = roll.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = roll.clientWidth;
  const h = 74;
  if (roll.width !== Math.round(w * dpr) || roll.height !== Math.round(h * dpr)) {
    roll.width = Math.round(w * dpr);
    roll.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // stave lines
  ctx.strokeStyle = '#161a1d';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = 18 + i * 9;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }

  const onas = parsed.events.filter((e) => e.ona > 0).map((e) => e.ona);
  if (!onas.length) return;
  const lo = Math.min(...onas);
  const hi = Math.max(...onas);
  const span = Math.max(hi - lo, 1);

  for (const e of parsed.events) {
    if (e.ona <= 0) continue;
    const x = (e.start / parsed.duration) * w;
    const bw = Math.max(2, (e.duration / parsed.duration) * w - 1);
    // map pitch into the visible band
    const norm = (e.ona - lo) / span;
    const y = 56 - norm * 42;
    const sounding = t >= e.start && t < e.start + e.duration;
    ctx.fillStyle = sounding ? '#55ff55' : '#2f6b3f';
    ctx.fillRect(x, y, bw, 5);
  }

  if (t >= 0 && t <= parsed.duration) {
    const x = (t / parsed.duration) * w;
    ctx.fillStyle = '#ff5555';
    ctx.fillRect(x, 0, 1.5, h);
  }
}

function tick(id: string): void {
  const view = views.get(id);
  if (!view || !view.playback) return;
  const elapsed = audioNow() - view.playback.startedAt;
  drawRoll(view, elapsed);
  const n = noteAt(view.parsed, elapsed);
  const ev = n >= 0 ? view.parsed.events[n] : undefined;
  for (const [lineIdx, li] of view.lyricEls) li.classList.toggle('sung', !!ev && lineIdx === ev.line);
  if (ev) {
    view.nowPlaying.innerHTML = `sounding <b>${ev.name}</b> &middot; ${ev.freq.toFixed(1)} Hz`;
  } else {
    view.nowPlaying.textContent = 'rest';
  }
  view.raf = requestAnimationFrame(() => tick(id));
}

function stopSong(id: string): void {
  const view = views.get(id);
  if (!view) return;
  cancelAnimationFrame(view.raf);
  view.playback?.stop();
  view.playback = null;
  view.button.textContent = 'Play';
  view.button.classList.remove('playing');
  view.nowPlaying.textContent = '';
  for (const li of view.lyricEls.values()) li.classList.remove('sung');
  drawRoll(view, -1);
}

function buildSongs(): void {
  const host = $('#songs');
  const volumeInput = $<HTMLInputElement>('#volume');
  const loopInput = $<HTMLInputElement>('#loop');
  let current: string | null = null;

  const nodes: HTMLElement[] = [];

  const groups: { heading: string | null; list: typeof songData }[] = [
    { heading: null, list: songData },
    { heading: 'Game and demo themes — no lyrics, same speaker', list: arcadeSongs },
  ];

  for (const { heading, list } of groups) {
    if (heading && list.length > 0) {
      const h = document.createElement('h3');
      h.className = 'song-group';
      h.textContent = heading;
      nodes.push(h);
    }
    for (const song of list) {
    const parsed = parseSong(song);
    const el = document.createElement('article');
    el.className = 'song';

    const left = document.createElement('div');
    const head = document.createElement('div');
    head.className = 'song-head';
    const h = document.createElement('h3');
    h.className = 'song-title';
    h.textContent = song.title;
    const meta = document.createElement('span');
    meta.className = 'song-meta';
    meta.textContent = `${parsed.duration.toFixed(1)}s · tempo ${song.tempo} q/s`;
    head.append(h, meta);

    const blurb = document.createElement('p');
    blurb.className = 'song-blurb';
    blurb.textContent = song.blurb;

    const file = document.createElement('div');
    file.className = 'song-file';
    file.textContent = `::/${song.file}`;

    const notation = document.createElement('pre');
    notation.className = 'notation';
    notation.textContent = song.lines.map((l) => l.notes).join('\n');

    // One row per Play() call, so lyric indices line up exactly with the
    // line index recorded on every parsed note.
    const lyricEls = new Map<number, HTMLElement>();
    const lyrics = document.createElement('ol');
    lyrics.className = 'lyrics';
    song.lines.forEach((line, idx) => {
      const text = line.words.replace(/\s+/g, ' ').trim();
      const li = document.createElement('li');
      li.textContent = text || '·  ·  ·';
      if (!text) li.classList.add('instrumental');
      lyrics.appendChild(li);
      // collapsed repeats point at the first row that showed them
      if (!lyricEls.has(idx)) lyricEls.set(idx, li);
    });

    left.append(head, blurb, file, notation, lyrics);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = 'Play';
    button.setAttribute('aria-label', `Play ${song.title}`);

    const roll = document.createElement('canvas');
    roll.className = 'roll';
    roll.setAttribute('role', 'img');
    roll.setAttribute('aria-label', `Piano roll for ${song.title}`);

    const nowPlaying = document.createElement('p');
    nowPlaying.className = 'nowplaying';

    el.append(left, button, roll, nowPlaying);
    nodes.push(el);

    views.set(song.id, { parsed, playback: null, raf: 0, roll, nowPlaying, lyricEls, button });

    button.addEventListener('click', () => {
      const view = views.get(song.id)!;
      if (view.playback) {
        stopSong(song.id);
        return;
      }
      if (current && current !== song.id) stopSong(current);
      current = song.id;
      view.playback = playSong(parsed, {
        loop: loopInput.checked,
        volume: Number(volumeInput.value) / 100,
        onEnd: () => stopSong(song.id),
      });
      button.textContent = 'Stop';
      button.classList.add('playing');
      view.raf = requestAnimationFrame(() => tick(song.id));
    });
    }
  }

  host.replaceChildren(...nodes);

  $('#stop-all').addEventListener('click', () => {
    for (const id of views.keys()) stopSong(id);
    current = null;
  });

  // draw the idle piano rolls once layout has settled
  requestAnimationFrame(() => {
    for (const view of views.values()) drawRoll(view, -1);
  });
  window.addEventListener('resize', () => {
    for (const view of views.values()) drawRoll(view, -1);
  });
}

/* ------------------------------------------------------------------- glyphs */

function buildGlyphs(): void {
  mountText($('#font-sample'), 'TERRY', { scale: 6, color: '#FF5555' });

  const credit = $('#font-credit');
  credit.textContent =
    'Rendered live in your browser from sys_font_std[] in Kernel/FontStd.HC — 256 glyphs, eight bytes each, drawn pixel by pixel. He credits the table as taken from FreeDOS; everything else in the system is his.';

  const host = $('#palette');
  host.replaceChildren(
    ...palette.map(([name, hex], i) => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.style.background = hex;
      // pick readable label ink against the swatch
      const lum =
        (parseInt(hex.slice(1, 3), 16) * 299 +
          parseInt(hex.slice(3, 5), 16) * 587 +
          parseInt(hex.slice(5, 7), 16) * 114) /
        1000;
      chip.style.color = lum > 140 ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.62)';
      chip.textContent = `${i} ${name}`;
      return chip;
    }),
  );
}

/* ----------------------------------------------------------------- timeline */

const TIMELINE: [string, string][] = [
  ['1969', 'Born <strong>December 15</strong> in West Allis, Wisconsin — the seventh of eight children.'],
  ['1970s', 'Meets an <strong>Apple II</strong> at school, and learns assembly on a Commodore 64 as a teenager.'],
  ['1990', 'Joins <strong>Ticketmaster</strong> to work on their VAX operating system.'],
  ['1992', 'B.Sc. in computer engineering from <strong>Arizona State</strong>.'],
  ['1994', 'M.Sc. in electrical engineering, same university. By now the operating system has begun.'],
  ['1990s', 'It is called the <strong>J Operating System</strong>, then <strong>LoseThos</strong>, then <strong>SparrowOS</strong>.'],
  ['1996', 'Starts working on it full time, and does not substantially stop for over a decade.'],
  ['2005', 'Public release. <strong>LoseThos</strong> is already an operating system with a compiler in it.'],
  ['2013', 'Renamed <strong>TempleOS</strong>. God is a compiler, he says, and this is the third temple.'],
  ['2016', 'Hires an artist, Cody Rigby, for $3,000 of pixel art. He lists the credit in his own files.'],
  ['2017', 'Final release, <strong>5.03</strong>, on November 20. The source is public domain.'],
  ['2018', 'Dies on <strong>August 11</strong>, at 48, in The Dalles, Oregon — struck by a train while walking beside the tracks.'],
];

function buildTimeline(): void {
  const host = $('#timeline');
  host.replaceChildren(
    ...TIMELINE.map(([year, body]) => {
      const li = document.createElement('li');
      const y = document.createElement('span');
      y.className = 'tl-year';
      y.textContent = year;
      const b = document.createElement('span');
      b.className = 'tl-body';
      b.innerHTML = body;
      li.append(y, b);
      return li;
    }),
  );
}

/* ----------------------------------------------------------------- GodSong */

function buildGodSongPanel(): void {
  const panel = $('#god-song-panel');
  if (!panel) return;
  // Settings form
  const form = document.createElement('form');
  form.className = 'god-form';
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    generateHymn();
  });

  const createRow = (labelText: string, inputEl: HTMLElement, extra?: HTMLElement) => {
    const r = document.createElement('div');
    r.className = 'god-row';
    const l = document.createElement('label');
    l.textContent = labelText;
    r.appendChild(l);
    r.appendChild(inputEl);
    if (extra) r.appendChild(extra);
    return r;
  };

  const complexity = document.createElement('select');
  complexity.innerHTML = '<option value="0">Simple</option><option value="1" selected>Normal</option><option value="2">Complex</option>';
  complexity.id = 'god-complex';
  form.appendChild(createRow('Complexity', complexity));

  const octave = document.createElement('input');
  octave.type = 'range'; octave.id = 'god-octave'; octave.min = '1'; octave.max = '7'; octave.value = '4';
  const octaveVal = document.createElement('span'); octaveVal.textContent = '4'; octaveVal.className = 'god-val';
  octave.addEventListener('input', () => (octaveVal.textContent = octave.value));
  form.appendChild(createRow('Octave', octave, octaveVal));

  const rests = document.createElement('input'); rests.type = 'checkbox'; rests.id = 'god-rests';
  form.appendChild(createRow('Rests', rests));

  const six = document.createElement('input'); six.type = 'checkbox'; six.id = 'god-six';
  form.appendChild(createRow('6/8 meter', six));

  const generateBtn = document.createElement('button');
  generateBtn.type = 'button';
  generateBtn.className = 'btn';
  generateBtn.textContent = 'Generate hymn';
  generateBtn.setAttribute('aria-label', 'Generate a procedural hymn');

  const resultArea = document.createElement('div'); resultArea.className = 'god-result';
  const resultText = document.createElement('pre'); resultText.className = 'notation'; resultText.id = 'god-notation'; resultText.textContent = 'Press Generate to hear God compose.';
  const resultPlay = document.createElement('button'); resultPlay.type = 'button'; resultPlay.className = 'btn'; resultPlay.textContent = 'Play'; resultPlay.hidden = true;
  const nowPlaying = document.createElement('p'); nowPlaying.className = 'nowplaying'; nowPlaying.id = 'god-nowplaying';

  resultArea.appendChild(resultText);
  resultArea.appendChild(resultPlay);
  resultArea.appendChild(nowPlaying);

  form.appendChild(generateBtn);
  form.appendChild(document.createElement('hr'));
  form.appendChild(resultArea);

  panel.appendChild(form);

  let currentGodPlayback: SongPlayback | null = null;

  function generateHymn(): void {
    if (currentGodPlayback) {
      currentGodPlayback.stop();
      currentGodPlayback = null;
      resultPlay.textContent = 'Play';
    }
    const notes = generateGodSong({
      complexity: Number((complexity as HTMLSelectElement).value) as 0 | 1 | 2,
      octave: Number((octave as HTMLInputElement).value),
      rests: (rests as HTMLInputElement).checked,
      sixEight: (six as HTMLInputElement).checked,
    });
    resultText.textContent = notes.notation;
    resultText.title = notes.titleLabel;

    resultPlay.hidden = false;
    resultPlay.textContent = 'Play';
    resultPlay.onclick = () => {
      if (currentGodPlayback) {
        currentGodPlayback.stop();
        currentGodPlayback = null;
        resultPlay.textContent = 'Play';
        return;
      }
      const parsed = parseSong({ id: 'god', title: 'GodSong', file: 'Adam/God/GodSong.HC', blurb: 'Procedural hymn generator.', tempo: 2.5, lines: [{ notes: notes.notation, words: '' }] });
      currentGodPlayback = playSong(parsed, {
        loop: false,
        volume: 0.35,
        onEnd: () => {
          currentGodPlayback = null;
          resultPlay.textContent = 'Play';
        },
      });
      resultPlay.textContent = 'Stop';
    };
  }

  generateBtn.addEventListener('click', () => {
    generateHymn();
  });

  // Initial generation so the user sees a result immediately.
  generateHymn();
}

/* --------------------------------------------------------------------- boot */

buildHeroFacts();
buildTiles();
buildAutopsy();
buildSongs();
buildGlyphs();
buildTimeline();
buildGodSongPanel();
