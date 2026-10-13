import './style.css';
import { highlightHolyC } from './highlight';
import { renderDolDoc } from './doldoc';

interface FileEntry {
  path: string;
  dir: string;
  name: string;
  ext: string;
  kind: 'code' | 'doc';
  bytes: number;
  trimmed: number;
  code: number;
  comments: number;
  blank: number;
  lines: number;
}

interface Index {
  generated: string;
  source?: { repo: string; head: string | null; headShort: string | null } | string;
  totals: {
    files: number;
    sourceBytes: number;
    readableBytes: number;
    trimmedFiles: number;
    trimmedBytes: number;
  };
  files: FileEntry[];
}

interface SearchIndex {
  tokens: string[];
  postings: number[][];
}

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  files: FileEntry[];
}

const $ = <T extends HTMLElement>(sel: string): T => {
  const node = document.querySelector<T>(sel);
  if (!node) throw new Error(`missing element: ${sel}`);
  return node;
};

const INDEX_URL = new URL('templeos-index.json', document.baseURI).href;
const SOURCE_BASE = new URL('templeos/', document.baseURI).href;

/** Past this size, skip tokenising and render plain text. */
const HIGHLIGHT_LIMIT = 220_000;

const state: {
  index: Index | null;
  tree: TreeNode | null;
  /** directory paths the user has opened */
  open: Set<string>;
  filter: string;
  current: string | null;
  currentText: string;
  currentLine: number | null;
  docMode: 'source' | 'reading';
  /** flattened, filtered file list, for j/k navigation */
  visible: FileEntry[];
  search: SearchIndex | null;
  searchLoading: boolean;
  searchResults: { file: FileEntry; score: number }[] | null;
} = {
  index: null,
  tree: null,
  open: new Set(),
  filter: '',
  current: null,
  currentText: '',
  currentLine: null,
  docMode: 'reading',
  visible: [],
  search: null,
  searchLoading: false,
  searchResults: null,
};

const mb = (n: number) => `${(n / 1048576).toFixed(2)} MB`;
const nf = (n: number) => n.toLocaleString('en-US');

/* ------------------------------------------------------------------- tree */

function makeNode(name: string, path: string): TreeNode {
  return { name, path, children: new Map(), files: [] };
}

function buildTree(files: FileEntry[]): TreeNode {
  const root = makeNode('', '');
  for (const f of files) {
    let node = root;
    if (f.dir) {
      const parts = f.dir.split('/');
      let acc = '';
      for (const part of parts) {
        acc = acc ? `${acc}/${part}` : part;
        let next = node.children.get(part);
        if (!next) {
          next = makeNode(part, acc);
          node.children.set(part, next);
        }
        node = next;
      }
    }
    node.files.push(f);
  }
  return root;
}

function matches(f: FileEntry, q: string): boolean {
  return f.path.toLowerCase().includes(q);
}

/** Every file at or below a node, depth-first in name order. */
function collectUnder(node: TreeNode, out: FileEntry[]): FileEntry[] {
  for (const f of node.files) out.push(f);
  for (const c of sortedChildren(node)) collectUnder(c, out);
  return out;
}

function sortedChildren(n: TreeNode): TreeNode[] {
  return [...n.children.values()].sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

/** All files, depth-first, honouring the current filter. */
function collectVisible(root: TreeNode, q: string): FileEntry[] {
  const out: FileEntry[] = [];
  const walk = (n: TreeNode) => {
    for (const f of n.files) if (!q || matches(f, q)) out.push(f);
    for (const c of sortedChildren(n)) walk(c);
  };
  walk(root);
  return out;
}

function fileButton(f: FileEntry): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 't-file';
  b.dataset.path = f.path;
  b.title = `${nf(f.code)} lines of code · ${nf(f.bytes)} bytes`;
  const dot = document.createElement('span');
  dot.className = `t-kind k-${f.kind}`;
  const name = document.createElement('span');
  name.className = 't-name';
  name.textContent = f.name;
  const loc = document.createElement('span');
  loc.className = 't-loc';
  loc.textContent = nf(f.code);
  b.append(dot, name, loc);
  b.addEventListener('click', () => open(f.path));
  return b;
}

function renderNode(n: TreeNode, host: HTMLElement, depth: number, q: string): void {
  for (const c of sortedChildren(n)) {
    const kids = collectUnder(c, []);
    const shown = q ? kids.filter((f) => matches(f, q)) : kids;
    if (q && shown.length === 0) continue;

    const row = document.createElement('div');
    row.className = 't-row';
    row.style.paddingLeft = `${8 + depth * 14}px`;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 't-caret';
    const expanded = q ? true : state.open.has(c.path);
    toggle.textContent = expanded ? '▾' : '▸';
    toggle.setAttribute('aria-expanded', String(expanded));

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 't-dir';
    label.append(document.createTextNode(c.name));
    const count = document.createElement('span');
    count.className = 't-count';
    count.textContent = String(shown.length);
    label.appendChild(count);
    label.addEventListener('click', () => {
      if (state.open.has(c.path)) state.open.delete(c.path);
      else state.open.add(c.path);
      renderTree();
    });

    row.append(toggle, label);
    host.appendChild(row);

    if (expanded) {
      const child = document.createElement('div');
      child.className = 't-children';
      renderNode(c, child, depth + 1, q);
      host.appendChild(child);
    }
  }

  const files = q ? n.files.filter((f) => matches(f, q)) : n.files;
  for (const f of files) {
    const row = document.createElement('div');
    row.className = 't-row';
    row.style.paddingLeft = `${8 + depth * 14 + 18}px`;
    row.appendChild(fileButton(f));
    host.appendChild(row);
  }
}

function renderTree(): void {
  if (!state.tree) return;
  const host = $('#tree');
  const scroll = host.scrollTop;
  host.replaceChildren();

  if (state.filter) {
    // flat, filtered result list
    const list = document.createElement('div');
    list.className = 't-children';
    if (state.searchResults) {
      const meta = document.createElement('p');
      meta.className = 'search-meta';
      meta.textContent =
        state.searchResults.length === 0
          ? `no file contains “${state.filter.slice(5).trim()}”`
          : `${nf(state.searchResults.length)} file${state.searchResults.length === 1 ? '' : 's'} contain “${state.filter.slice(5).trim()}”`;
      list.appendChild(meta);
    }
    for (const f of state.visible.slice(0, 400)) {
      const row = document.createElement('div');
      row.className = 't-row';
      row.style.paddingLeft = '8px';
      row.appendChild(fileButton(f));
      list.appendChild(row);
    }
    if (state.visible.length > 400) {
      const more = document.createElement('p');
      more.className = 't-more';
      more.textContent = `+ ${nf(state.visible.length - 400)} more — keep typing to narrow it down`;
      list.appendChild(more);
    }
    host.appendChild(list);
  } else {
    renderNode(state.tree, host, 0, '');
  }

  host.scrollTop = scroll;
  markCurrent();
}

function markCurrent(): void {
  for (const el of document.querySelectorAll('.t-file')) {
    el.classList.toggle('current', (el as HTMLElement).dataset.path === state.current);
  }
}

/* ------------------------------------------------------------ full-text */

const SEARCH_URL = new URL('templeos-search.json', document.baseURI).href;

function tokenize(q: string): string[] {
  return q.toLowerCase().match(/[a-z0-9_]{3,24}/g) ?? [];
}

async function loadSearchIndex(): Promise<SearchIndex | null> {
  if (state.search) return state.search;
  if (state.searchLoading) return null;
  state.searchLoading = true;
  try {
    const res = await fetch(SEARCH_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.search = (await res.json()) as SearchIndex;
    return state.search;
  } catch {
    return null;
  } finally {
    state.searchLoading = false;
  }
}

/** AND-search over the token index; rarer tokens score higher. */
function contentSearch(idx: SearchIndex, query: string): { file: FileEntry; score: number }[] {
  const toks = [...new Set(tokenize(query))];
  if (!toks.length || !state.index) return [];
  const lists: number[][] = [];
  for (const t of toks) {
    const at = idx.tokens.indexOf(t);
    if (at === -1) return [];
    lists.push(idx.postings[at] ?? []);
  }
  lists.sort((a, b) => a.length - b.length);
  let hits = new Set(lists[0]);
  for (const l of lists.slice(1)) {
    const next = new Set<number>();
    for (const i of l) if (hits.has(i)) next.add(i);
    hits = next;
    if (!hits.size) break;
  }
  const out: { file: FileEntry; score: number }[] = [];
  for (const i of hits) {
    const file = state.index.files[i];
    if (!file) continue;
    let score = 0;
    for (const l of lists) score += 1 / Math.max(1, l.length);
    out.push({ file, score });
  }
  out.sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path, 'en'));
  return out.slice(0, 200);
}

/* ----------------------------------------------------------------- viewer */

function breadcrumb(path: string): string[] {
  const parts = path.split('/');
  const crumbs = parts.map((_, i) => parts.slice(0, i + 1).join('/'));
  return crumbs;
}

async function open(path: string, line?: number): Promise<void> {
  if (!state.index) return;
  const entry = state.index.files.find((f) => f.path === path);
  if (!entry) return;

  state.current = path;

  // reveal the file's directory in the tree
  let acc = '';
  for (const part of path.split('/').slice(0, -1)) {
    acc = acc ? `${acc}/${part}` : part;
    state.open.add(acc);
  }
  renderTree();

  // deep link
  const hash = line ? `#/${path}:${line}` : `#/${path}`;
  if (location.hash !== hash) history.replaceState(null, '', hash);

  const crumbs = $('#crumbs');
  const parts = breadcrumb(path);
  crumbs.replaceChildren();
  parts.forEach((p, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'crumb-sep';
      sep.textContent = '/';
      crumbs.appendChild(sep);
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'crumb';
    b.textContent = p.split('/').pop() ?? p;
    b.addEventListener('click', () => revealDir(p));
    crumbs.appendChild(b);
  });

  const badges = $('#badges');
  badges.replaceChildren();
  const add = (text: string, cls: string) => {
    const s = document.createElement('span');
    s.className = `badge ${cls}`;
    s.textContent = text;
    badges.appendChild(s);
  };
  add(`${nf(entry.code)} code`, 'b-accent');
  add(`${nf(entry.comments)} comment`, '');
  add(`${nf(entry.blank)} blank`, '');
  add(`${nf(entry.lines)} lines`, '');
  add(`${nf(entry.bytes)} bytes`, '');
  if (entry.kind === 'doc') add('DolDoc', 'b-doc');

  const notice = $('#notice');
  if (entry.trimmed > 0) {
    notice.hidden = false;
    const pct = ((entry.trimmed / (entry.bytes + entry.trimmed)) * 100).toFixed(0);
    notice.textContent =
      `${nf(entry.trimmed)} bytes (${pct}%) of the original file was embedded binary — ` +
      `sprite or sound data appended after the source. Only the readable ${nf(entry.bytes)} bytes are shown.`;
  } else {
    notice.hidden = true;
    notice.textContent = '';
  }

  $('#empty').hidden = true;
  const scroll = $('#code-scroll');
  scroll.hidden = false;

  const pre = $('#code');
  pre.textContent = 'loading…';
  $('#doc').hidden = true;

  let text: string;
  try {
    const res = await fetch(SOURCE_BASE + path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (err) {
    pre.textContent = `Could not load ${path}\n\n${String(err)}`;
    return;
  }
  state.currentText = text;
  state.currentLine = line ?? null;

  // Docs open in reading mode unless the reader asked for source.
  if (entry.kind === 'doc' && state.docMode === 'reading') renderDoc(text);
  else renderSource(text);
  updateModeToggle(entry);
  $('#viewer-actions').hidden = false;
  scroll.scrollTop = 0;

  const foot = $('#viewer-foot');
  foot.textContent =
    `${path} — ${nf(entry.lines)} lines, ${nf(entry.bytes)} bytes` +
    (entry.trimmed ? ` (${nf(entry.trimmed)} binary bytes trimmed)` : '');

  if (line != null) scrollToLine(line);
}

function renderSource(text: string): void {
  const pre = $('#code');
  const doc = $('#doc');
  doc.hidden = true;
  pre.hidden = false;
  if (text.length > HIGHLIGHT_LIMIT) {
    pre.textContent = text;
  } else {
    const lines = text.split('\n');
    // The spans are display:block, so they must be joined with no separator --
    // a newline here would render as an extra blank line between each one.
    pre.innerHTML = lines
      .map((l, i) => `<span class="l" data-n="${i + 1}">${highlightHolyC(l) || ' '}</span>`)
      .join('');
  }
}

function renderDoc(text: string): void {
  const pre = $('#code');
  const doc = $('#doc');
  pre.hidden = true;
  doc.hidden = false;
  doc.innerHTML = renderDolDoc(text);
}

function updateModeToggle(entry: FileEntry): void {
  const toggle = $('#mode-toggle');
  const isDoc = entry.kind === 'doc';
  toggle.hidden = !isDoc;
  $('#mode-source').classList.toggle('active', !isDoc || state.docMode === 'source');
  $('#mode-reading').classList.toggle('active', isDoc && state.docMode === 'reading');
}

function setDocMode(mode: 'source' | 'reading'): void {
  state.docMode = mode;
  if (!state.index || !state.current) return;
  const entry = state.index.files.find((f) => f.path === state.current);
  if (!entry) return;
  if (entry.kind === 'doc' && mode === 'reading') renderDoc(state.currentText);
  else renderSource(state.currentText);
  updateModeToggle(entry);
}

async function copyText(text: string, btn: HTMLButtonElement): Promise<void> {
  const done = () => {
    const prev = btn.textContent;
    btn.textContent = 'Copied';
    window.setTimeout(() => {
      btn.textContent = prev;
    }, 1200);
  };
  try {
    await navigator.clipboard.writeText(text);
    done();
    return;
  } catch {
    /* fall through to the legacy path */
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    done();
  } catch {
    /* clipboard unavailable */
  }
  ta.remove();
}

function scrollToLine(n: number): void {
  const el = document.querySelector(`.l[data-n="${n}"]`);
  if (!el) return;
  const scroll = $('#code-scroll');
  scroll.scrollTop = Math.max(0, (el as HTMLElement).offsetTop - scroll.clientHeight / 3);
  el.classList.add('flash');
  window.setTimeout(() => el.classList.remove('flash'), 1600);
}

/** Open a directory in the tree by collapsing everything else. */
function revealDir(prefix: string): void {
  if (!state.tree) return;
  const node = findNode(state.tree, prefix);
  if (!node) return;
  state.open = new Set();
  let acc = '';
  for (const part of prefix.split('/')) {
    acc = acc ? `${acc}/${part}` : part;
    state.open.add(acc);
  }
  renderTree();
  const first = node.files[0];
  if (first) open(first.path);
}

function findNode(root: TreeNode, prefix: string): TreeNode | null {
  if (root.path === prefix) return root;
  for (const c of root.children.values()) {
    const hit = findNode(c, prefix);
    if (hit) return hit;
  }
  return null;
}

/* -------------------------------------------------------------------- nav */

function step(delta: number): void {
  if (!state.visible.length) return;
  const i = state.visible.findIndex((f) => f.path === state.current);
  const next = Math.min(state.visible.length - 1, Math.max(0, (i === -1 ? 0 : i) + delta));
  const f = state.visible[next];
  if (f) open(f.path);
}

function parseHash(): { path: string; line?: number } | null {
  const h = location.hash.replace(/^#\/?/, '');
  if (!h) return null;
  const m = /^(.*?):(\d+)$/.exec(h);
  if (m?.[1]) return { path: decodeURIComponent(m[1]), line: Number(m[2]) };
  return { path: decodeURIComponent(h) };
}

/* ------------------------------------------------------------------- boot */

async function boot(): Promise<void> {
  const res = await fetch(INDEX_URL);
  if (!res.ok) {
    $('#rail-stats').textContent = `index unavailable (HTTP ${res.status})`;
    return;
  }
  const index = (await res.json()) as Index;
  state.index = index;
  state.tree = buildTree(index.files);
  state.visible = collectVisible(state.tree, '');

  $('#rail-stats').textContent =
    `${nf(index.totals.files)} files · ${mb(index.totals.readableBytes)} readable`;
  const src = typeof index.source === 'string' ? null : index.source;
  $('#rail-foot').textContent =
    `${nf(index.totals.trimmedFiles)} files had binary tails trimmed — ` +
    `${mb(index.totals.trimmedBytes)} of embedded sprite and sound data. ` +
    `TempleOS is public domain.` +
    (src?.headShort ? ` Index built from ${src.headShort}, ${index.generated.slice(0, 10)}.` : '');

  // start with the top-level directories open
  for (const c of state.tree.children.keys()) state.open.add(c);
  renderTree();

  const initial = parseHash();
  if (initial) void open(initial.path, initial.line);

  window.addEventListener('hashchange', () => {
    const h = parseHash();
    if (h && h.path !== state.current) void open(h.path, h.line);
  });

  // search: plain text filters paths; `text:` searches file contents
  const search = $<HTMLInputElement>('#search');
  const clear = $<HTMLButtonElement>('#clear');
  const apply = () => {
    state.filter = search.value.trim().toLowerCase();
    clear.hidden = !state.filter;
    if (state.filter.startsWith('text:')) {
      state.searchResults = [];
      state.visible = [];
      renderTree();
      void (async () => {
        const idx = await loadSearchIndex();
        const q = search.value.trim();
        // the user may have typed on while the index loaded
        if (q.trim().toLowerCase() !== state.filter) return;
        if (!idx) {
          state.searchResults = null;
          state.visible = [];
        } else {
          const hits = contentSearch(idx, q.slice(5));
          state.searchResults = hits;
          state.visible = hits.map((h) => h.file);
        }
        renderTree();
      })();
      return;
    }
    state.searchResults = null;
    state.visible = collectVisible(state.tree!, state.filter);
    renderTree();
  };
  search.addEventListener('input', apply);
  clear.addEventListener('click', () => {
    search.value = '';
    apply();
    search.focus();
  });

  // viewer actions: reading/source toggle, copy link, copy text
  $('#mode-source').addEventListener('click', () => setDocMode('source'));
  $('#mode-reading').addEventListener('click', () => setDocMode('reading'));
  $('#copy-link').addEventListener('click', (e) => {
    void copyText(location.href, e.currentTarget as HTMLButtonElement);
  });
  $('#copy-file').addEventListener('click', (e) => {
    if (state.currentText) void copyText(state.currentText, e.currentTarget as HTMLButtonElement);
  });

  // clicking a source line deep-links to it
  $('#code').addEventListener('click', (e) => {
    const line = (e.target as HTMLElement).closest('.l') as HTMLElement | null;
    if (!line?.dataset.n || !state.current) return;
    const n = Number(line.dataset.n);
    state.currentLine = n;
    const hash = `#/${state.current}:${n}`;
    if (location.hash !== hash) location.hash = hash;
    scrollToLine(n);
  });

  // suggested files on the empty state
  for (const b of document.querySelectorAll('[data-goto]')) {
    b.addEventListener('click', () => {
      const p = (b as HTMLElement).dataset.goto;
      if (p) void open(p);
    });
  }

  // keyboard
  document.addEventListener('keydown', (e) => {
    const inField = (e.target as HTMLElement)?.tagName === 'INPUT';
    if (e.key === '/' && !inField) {
      e.preventDefault();
      search.focus();
      search.select();
      return;
    }
    if (e.key === 'Escape') {
      if (inField) {
        search.value = '';
        apply();
        search.blur();
      } else {
        state.filter = '';
        search.value = '';
        clear.hidden = true;
        state.visible = collectVisible(state.tree!, '');
        renderTree();
      }
      return;
    }
    if (inField) return;
    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault();
      step(-1);
    }
  });
}

void boot();
