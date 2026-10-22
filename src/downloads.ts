import './style.css';
import { downloads, downloadTotals, ARCHIVE_ITEM, type Download } from './generated/downloads';
import { mountSearch } from './search-ui';

const $ = <T extends HTMLElement>(sel: string): T => {
  const node = document.querySelector<T>(sel);
  if (!node) throw new Error(`missing element: ${sel}`);
  return node;
};

const mb = (n: number) => (n / 1048576).toFixed(1);

const GROUPS: { era: Download['era']; title: string; blurb: string }[] = [
  {
    era: 'releases',
    title: 'The releases',
    blurb:
      'TempleOS 3.11 through 5.03, in order, each one the CD he burned that day. ' +
      '5.03 is the final build.',
  },
  {
    era: 'snapshots',
    title: 'The 5.03 snapshots',
    blurb:
      'After he stopped bumping the version number, every build was date-stamped instead. ' +
      'The "distro" discs are the full system; the "lite" discs are the kernel alone.',
  },
  {
    era: 'historic',
    title: 'Before TempleOS',
    blurb:
      'HOPPY, the J Operating System, LoseThos, SparrowOS, and the early TempleOS discs. ' +
      'Same man, smaller machines, earlier syntax.',
  },
  {
    era: 'tools',
    title: 'Tools he wrote',
    blurb: 'Utilities that came with the system.',
  },
];

function matches(d: Download, q: string): boolean {
  if (!q) return true;
  return (
    d.name.toLowerCase().includes(q) ||
    d.family.toLowerCase().includes(q) ||
    d.version.toLowerCase().includes(q) ||
    d.date.includes(q)
  );
}

function render(): void {
  const filter = $<HTMLInputElement>('#dl-filter').value.trim().toLowerCase();
  const verifiedOnly = $<HTMLInputElement>('#dl-verified').checked;
  const host = $('#dl-groups');
  host.replaceChildren();

  let shown = 0;
  for (const g of GROUPS) {
    const items = downloads.filter(
      (d) => d.era === g.era && matches(d, filter) && (!verifiedOnly || d.sha256),
    );
    if (!items.length) continue;
    shown += items.length;

    const section = document.createElement('section');
    section.className = 'dl-group';

    const head = document.createElement('div');
    head.className = 'dl-group-head';
    const h = document.createElement('h3');
    h.textContent = g.title;
    const count = document.createElement('span');
    count.className = 'song-meta';
    const bytes = items.reduce((n, d) => n + d.bytes, 0);
    count.textContent = `${items.length} file${items.length === 1 ? '' : 's'} · ${mb(bytes)} MB`;
    head.append(h, count);
    const blurb = document.createElement('p');
    blurb.className = 'dl-group-blurb';
    blurb.textContent = g.blurb;

    const table = document.createElement('div');
    table.className = 'table-wrap';
    const t = document.createElement('table');
    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    for (const label of ['File', 'Version', 'Date', 'Size', 'SHA-256', '']) {
      const th = document.createElement('th');
      th.textContent = label;
      hr.appendChild(th);
    }
    thead.appendChild(hr);
    const tbody = document.createElement('tbody');

    for (const d of items) {
      const tr = document.createElement('tr');
      const tdName = document.createElement('td');
      tdName.className = 'path';
      tdName.textContent = d.name;
      const tdVer = document.createElement('td');
      tdVer.textContent = d.version || d.family;
      const tdDate = document.createElement('td');
      tdDate.textContent = d.date || '—';
      const tdSize = document.createElement('td');
      tdSize.className = 'num';
      tdSize.textContent = `${mb(d.bytes)} MB`;
      const tdSha = document.createElement('td');
      tdSha.className = 'sha';
      if (d.sha256) {
        const code = document.createElement('code');
        code.textContent = d.sha256.slice(0, 12);
        code.title = d.sha256;
        tdSha.appendChild(code);
      } else {
        tdSha.textContent = '—';
      }
      const tdGet = document.createElement('td');
      tdGet.className = 'num';
      const a = document.createElement('a');
      a.className = 'dl-btn';
      // Prefer our own mirror once the file is actually on the release;
      // until then, point the download straight at the archive.
      a.href = d.mirrored ? d.mirror : d.archive;
      a.textContent = 'download';
      a.setAttribute('download', d.asset);
      a.title = d.mirrored ? 'From our own mirror' : 'From the Internet Archive';
      const ar = document.createElement('a');
      ar.className = 'dl-alt';
      ar.href = d.mirrored ? d.archive : d.mirror;
      ar.textContent = d.mirrored ? 'archive.org' : 'our mirror';
      ar.target = '_blank';
      ar.rel = 'noopener';
      tdGet.append(a, ar);

      tr.append(tdName, tdVer, tdDate, tdSize, tdSha, tdGet);
      tbody.appendChild(tr);
    }
    t.append(thead, tbody);
    table.appendChild(t);
    section.append(head, blurb, table);
    host.appendChild(section);
  }

  if (!shown) {
    const p = document.createElement('p');
    p.className = 'search-empty';
    p.textContent = 'Nothing matches that.';
    host.appendChild(p);
  }
}

function boot(): void {
  const t = downloadTotals;
  $('#dl-lede').textContent =
    `Every release he ever shipped, from HOPPY in 2004 to the last TempleOS build in 2017 — ` +
    `plus the 5.03 snapshots, the supplemental discs, and the tools. ${t.files} files, ` +
    `${mb(t.bytes)} MB, all of it public domain and none of it held back.`;

  $('#dl-note').textContent =
    `The catalogue covers ${t.families.join(', ')} — ${t.files} files in all. ` +
    `Checksums are published for ${t.withSum} of them. The canonical copy of every file lives at ` +
    `the Internet Archive; ${t.mirrored} of these are also mirrored on our own release, and the ` +
    `rest download from the archive until they are.`;

  $('#dl-filter').addEventListener('input', render);
  $('#dl-verified').addEventListener('change', render);
  render();

  const archive = document.createElement('a');
  archive.href = ARCHIVE_ITEM;
  archive.textContent = 'The Internet Archive item this is mirrored from';
  archive.className = 'fineprint';
  $('#dl-note').after(archive);

  mountSearch({
    quickLinks: [
      { label: 'The record', href: './index.html' },
      { label: 'Source explorer', href: './explorer.html' },
      { label: 'The Demands', href: './demands.html' },
      { label: 'The Manual', href: './manual.html' },
    ],
  });
}

boot();
