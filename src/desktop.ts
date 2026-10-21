import './style.css';
import { desktop } from './generated/chapters';
import { renderDolDoc } from './doldoc';
import { mountSearch } from './search-ui';

const $ = <T extends HTMLElement>(sel: string): T => {
  const node = document.querySelector<T>(sel);
  if (!node) throw new Error(`missing element: ${sel}`);
  return node;
};

const SOURCE_BASE = new URL('templeos/', document.baseURI).href;

async function boot(): Promise<void> {
  // The welcome banner he saw on every boot.
  let welcome = desktop.welcome;
  if (!welcome) {
    try {
      const res = await fetch(SOURCE_BASE + 'Doc/Welcome.DD');
      if (res.ok) welcome = await res.text();
    } catch {
      welcome = '';
    }
  }
  const w = $('#desktop-welcome');
  w.innerHTML = welcome ? renderDolDoc(welcome) : '<p>The welcome file was not found.</p>';

  // The menu: the labelled entries he actually had.
  const menu = $('#desktop-menu');
  const labelled = desktop.items.filter((i) => i.type !== 'dir');
  menu.replaceChildren(
    ...labelled.map((i) => {
      const row = document.createElement('a');
      row.className = 'desktop-item';
      if (i.type === 'file' && i.target) {
        row.href = `./explorer.html#/${i.target}`;
      } else {
        row.href = './explorer.html';
        row.title = i.target || 'A HolyC command';
      }
      const label = document.createElement('span');
      label.className = 'desktop-item-label';
      label.textContent = i.label;
      row.appendChild(label);
      if (i.type === 'action') {
        const tag = document.createElement('span');
        tag.className = 'desktop-item-tag';
        tag.textContent = i.target || 'command';
        row.appendChild(tag);
      }
      return row;
    }),
  );

  // The directory shortcuts, as tiles.
  const dirs = desktop.items.filter((i) => i.type === 'dir');
  $('#desktop-dirs').replaceChildren(
    ...dirs.map((d) => {
      const t = document.createElement('div');
      t.className = 'tile';
      const v = document.createElement('span');
      v.className = 'tile-value';
      v.style.fontSize = '1.05rem';
      v.textContent = d.label;
      const l = document.createElement('span');
      l.className = 'tile-label';
      const a = document.createElement('a');
      a.href = `./explorer.html#/${d.target.replace(/^::\//, '')}`;
      a.textContent = d.target;
      l.appendChild(a);
      const n = document.createElement('span');
      n.className = 'tile-note';
      n.textContent = 'One command away, every single day.';
      t.append(v, l, n);
      return t;
    }),
  );

  $('#desktop-lede').textContent =
    `Every morning for years, this is what he saw. The home screen of a man who lived alone ` +
    `inside an operating system he wrote himself — ${dirs.length} directories and ` +
    `${labelled.length} entries, all of it in one file.`;

  $('#desktop-credit').textContent =
    'Rebuilt from PersonalMenu.DD and Doc/Welcome.DD, both verbatim. The window chrome is ours; ' +
    'the words are his.';

  mountSearch({
    quickLinks: [
      { label: 'The record', href: './index.html' },
      { label: 'The Manual', href: './manual.html' },
      { label: 'TempleOS University', href: './university.html' },
      { label: 'Source explorer', href: './explorer.html' },
    ],
  });
}

void boot();
