import './style.css';
import { manual } from './generated/chapters';
import { renderDolDoc } from './doldoc';
import { mountSearch } from './search-ui';

const $ = <T extends HTMLElement>(sel: string): T => {
  const node = document.querySelector<T>(sel);
  if (!node) throw new Error(`missing element: ${sel}`);
  return node;
};

const SOURCE_BASE = new URL('templeos/', document.baseURI).href;

interface Group {
  name: string;
  docs: typeof manual;
}

function groupDocs(): Group[] {
  const map = new Map<string, typeof manual>();
  for (const d of manual) {
    const list = map.get(d.group) ?? [];
    list.push(d);
    map.set(d.group, list);
  }
  const order = ['Doc', 'Demo', 'Adam', 'Apps', 'Compiler', 'Misc', 'root'];
  const groups: Group[] = [];
  for (const g of order) {
    const docs = map.get(g);
    if (docs?.length) groups.push({ name: g, docs });
    map.delete(g);
  }
  for (const [name, docs] of map) groups.push({ name, docs });
  return groups;
}

let filter = '';

function renderToc(): void {
  const host = $('#manual-toc');
  host.replaceChildren();
  const groups = groupDocs();
  for (const g of groups) {
    const docs = g.docs.filter(
      (d) => !filter || d.title.toLowerCase().includes(filter) || d.path.toLowerCase().includes(filter),
    );
    if (!docs.length) continue;
    const head = document.createElement('p');
    head.className = 'toc-group';
    head.textContent = `${g.name} · ${docs.length}`;
    host.appendChild(head);
    for (const d of docs) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'toc-item';
      b.dataset.path = d.path;
      b.textContent = d.title;
      b.title = d.path;
      b.addEventListener('click', () => void openDoc(d.path));
      host.appendChild(b);
    }
  }
  if (!host.children.length) {
    const p = document.createElement('p');
    p.className = 'search-empty';
    p.textContent = 'No document matches that.';
    host.appendChild(p);
  }
}

async function openDoc(path: string): Promise<void> {
  const doc = $('#manual-doc');
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

  const entry = manual.find((d) => d.path === path);
  doc.replaceChildren();

  const head = document.createElement('div');
  head.className = 'manual-head';
  const h = document.createElement('h3');
  h.textContent = entry?.title ?? path;
  const meta = document.createElement('p');
  meta.className = 'song-meta';
  meta.textContent =
    `${path} · ${entry?.lines ?? 0} lines` +
    (entry && entry.trimmed > 0 ? ` · ${entry.trimmed.toLocaleString('en-US')} binary bytes trimmed` : '');
  const link = document.createElement('a');
  link.href = `./explorer.html#/${path}`;
  link.textContent = 'view source';
  link.className = 'manual-source';
  head.append(h, meta, link);
  doc.appendChild(head);

  const body = document.createElement('div');
  body.className = 'doc doc-block manual-body';
  body.innerHTML = renderDolDoc(text);
  doc.appendChild(body);

  for (const b of document.querySelectorAll('.toc-item')) {
    b.classList.toggle('current', (b as HTMLElement).dataset.path === path);
  }
  history.replaceState(null, '', `#/${path}`);
}

function boot(): void {
  const groups = groupDocs();
  const total = groups.reduce((s, g) => s + g.docs.length, 0);
  const words = groups.reduce((s, g) => s + g.docs.length * 0, 0);
  void words;
  $('#manual-lede').textContent =
    `He wrote a whole operating system and then wrote the book about it. ${total} DolDoc ` +
    `documents from the tree, rendered as prose instead of markup — his DolDoc, read the way it was ` +
    `meant to be read.`;

  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'filter documents';
  search.className = 'toc-filter';
  search.setAttribute('aria-label', 'Filter documents');
  search.addEventListener('input', () => {
    filter = search.value.trim().toLowerCase();
    renderToc();
  });
  $('#manual-toc').before(search);

  renderToc();

  const hash = location.hash.replace(/^#\/?/, '');
  if (hash && manual.some((d) => d.path === decodeURIComponent(hash))) {
    void openDoc(decodeURIComponent(hash));
  }

  mountSearch({
    quickLinks: [
      { label: 'The record', href: './index.html' },
      { label: 'Source explorer', href: './explorer.html' },
      { label: 'TempleOS University', href: './university.html' },
      { label: 'The Desktop', href: './desktop.html' },
    ],
  });
}

boot();
