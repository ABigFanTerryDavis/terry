import './style.css';
import { lectures } from './generated/chapters';
import { highlightHolyC } from './highlight';
import { mountSearch } from './search-ui';

const $ = <T extends HTMLElement>(sel: string): T => {
  const node = document.querySelector<T>(sel);
  if (!node) throw new Error(`missing element: ${sel}`);
  return node;
};

const SOURCE_BASE = new URL('templeos/', document.baseURI).href;

function boot(): void {
  const grid = $('#uni-grid');
  grid.replaceChildren(
    ...lectures.map((l) => {
      const card = document.createElement('article');
      card.className = 'uni-card';

      const head = document.createElement('div');
      head.className = 'song-head';
      const h = document.createElement('h3');
      h.className = 'song-title';
      h.textContent = l.title;
      const meta = document.createElement('span');
      meta.className = 'song-meta';
      meta.textContent = `${l.lines} lines · ${l.ext}`;
      head.append(h, meta);

      const blurb = document.createElement('p');
      blurb.className = 'song-blurb';
      blurb.textContent = l.blurb || 'No header comment — the code speaks.';

      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'btn';
      open.textContent = 'Read';
      open.addEventListener('click', () => void openLecture(l.path));

      card.append(head, blurb, open);
      return card;
    }),
  );

  $('#uni-lede').textContent =
    `He wrote tutorials. ${lectures.length} of them, in the source tree, teaching the things he ` +
    `knew: fixed point, optimization, interrupts, ring 3, screen memory — and a compiler, ` +
    `written as a lesson.`;

  mountSearch({
    quickLinks: [
      { label: 'The record', href: './index.html' },
      { label: 'The Manual', href: './manual.html' },
      { label: 'Source explorer', href: './explorer.html' },
      { label: 'The Desktop', href: './desktop.html' },
    ],
  });
}

async function openLecture(path: string): Promise<void> {
  const doc = $('#uni-doc');
  doc.replaceChildren();
  const loading = document.createElement('p');
  loading.className = 'empty-body';
  loading.textContent = 'Opening…';
  doc.appendChild(loading);

  let text = '';
  try {
    const res = await fetch(SOURCE_BASE + path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (err) {
    const p = document.createElement('p');
    p.className = 'empty-body';
    p.textContent = `Could not load ${path}: ${String(err)}`;
    doc.replaceChildren(p);
    return;
  }

  const entry = lectures.find((l) => l.path === path);
  doc.replaceChildren();

  const head = document.createElement('div');
  head.className = 'manual-head';
  const h = document.createElement('h3');
  h.textContent = entry?.title ?? path;
  const meta = document.createElement('p');
  meta.className = 'song-meta';
  meta.textContent = `${path} · ${entry?.lines ?? 0} lines`;
  const link = document.createElement('a');
  link.href = `./explorer.html#/${path}`;
  link.textContent = 'view in explorer';
  link.className = 'manual-source';
  head.append(h, meta, link);
  doc.appendChild(head);

  const pre = document.createElement('pre');
  pre.className = 'code code-static lecture-code';
  pre.innerHTML = highlightHolyC(text);
  pre.setAttribute('aria-label', `Source of ${path}`);
  doc.appendChild(pre);

  history.replaceState(null, '', `#/${path}`);
  $('#uni-doc-heading').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const hash = location.hash.replace(/^#\/?/, '');
if (hash) {
  const p = decodeURIComponent(hash);
  if (lectures.some((l) => l.path === p)) {
    // wait for boot to attach listeners
    setTimeout(() => void openLecture(p), 0);
  }
}

boot();
