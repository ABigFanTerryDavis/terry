import { searchAll, type SiteHit } from './search';

/**
 * The global search bar. Added to every page's topbar by this module, so
 * one implementation serves all of them.
 */
export interface SearchMountOptions {
  /** extra pages to offer as quick links in the empty state */
  quickLinks?: { label: string; href: string }[];
}

export function mountSearch(options: SearchMountOptions = {}): void {
  const bar = document.createElement('div');
  bar.className = 'global-search';

  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'search everything  ( / )';
  input.setAttribute('aria-label', 'Search the site and the TempleOS source');
  input.autocomplete = 'off';
  input.spellcheck = false;

  const panel = document.createElement('div');
  panel.className = 'search-panel';
  panel.hidden = true;

  const list = document.createElement('ul');
  list.className = 'search-results';
  panel.appendChild(list);

  bar.append(input, panel);
  // Sit at the end of the tribute nav row so nothing overlaps the links.
  const host = document.querySelector('.topbar-sub') ?? document.body;
  host.appendChild(bar);

  let timer = 0;
  let lastQuery = '';

  const close = () => {
    panel.hidden = true;
    input.blur();
  };

  const render = (hits: SiteHit[], query: string) => {
    list.replaceChildren();
    if (!query) {
      const links = options.quickLinks ?? [];
      if (links.length) {
        const head = document.createElement('li');
        head.className = 'search-group';
        head.textContent = 'Jump to';
        list.appendChild(head);
        for (const l of links) {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = l.href;
          a.textContent = l.label;
          li.appendChild(a);
          list.appendChild(li);
        }
      }
      panel.hidden = false;
      return;
    }
    if (!hits.length) {
      const li = document.createElement('li');
      li.className = 'search-empty';
      li.textContent = `Nothing found for “${query}”.`;
      list.appendChild(li);
      panel.hidden = false;
      return;
    }
    const pages = hits.filter((h) => h.kind === 'page');
    const files = hits.filter((h) => h.kind === 'file');
    const addGroup = (name: string) => {
      const li = document.createElement('li');
      li.className = 'search-group';
      li.textContent = name;
      list.appendChild(li);
    };
    if (pages.length) {
      addGroup('Pages');
      for (const h of pages) list.appendChild(resultRow(h));
    }
    if (files.length) {
      addGroup('TempleOS source');
      for (const h of files) list.appendChild(resultRow(h));
    }
    panel.hidden = false;
  };

  const resultRow = (h: SiteHit): HTMLLIElement => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = h.kind === 'page' ? `./${h.ref}` : `./explorer.html#/${h.ref}`;
    const t = document.createElement('span');
    t.className = 'search-title';
    t.textContent = h.title;
    const s = document.createElement('span');
    s.className = 'search-snippet';
    s.textContent = h.snippet;
    a.append(t, s);
    li.appendChild(a);
    return li;
  };

  const run = async () => {
    const q = input.value.trim();
    if (q === lastQuery) return;
    lastQuery = q;
    if (!q) {
      render([], '');
      return;
    }
    render([], q); // immediate feedback while the tree index loads
    const hits = await searchAll(q);
    if (input.value.trim() === q) render(hits, q);
  };

  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void run(), 120);
  });
  input.addEventListener('focus', () => {
    if (!input.value.trim()) render([], '');
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      lastQuery = '';
      close();
    } else if (e.key === 'Enter') {
      const first = list.querySelector('a');
      if (first instanceof HTMLAnchorElement) {
        e.preventDefault();
        window.location.href = first.href;
      }
    }
  });
  document.addEventListener('click', (e) => {
    if (!bar.contains(e.target as Node)) close();
  });

  document.addEventListener('keydown', (e) => {
    const inField = (e.target as HTMLElement)?.tagName === 'INPUT';
    if (e.key === '/' && !inField) {
      e.preventDefault();
      input.focus();
      input.select();
    }
    if (e.key === 'Escape' && !inField) close();
  });
}
