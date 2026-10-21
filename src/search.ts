import { sitePages } from './generated/chapters';

/**
 * Site-wide search: one box, every page.
 *
 * Two sources, both built at compile time:
 *  - the site's own prose (sitePages), indexed here;
 *  - the TempleOS tree (code and documents), via the explorer's token index.
 *
 * Results are ranked: page hits score by term frequency, tree hits by how
 * rare the term is across the corpus.
 */

export interface SiteHit {
  kind: 'page' | 'file';
  title: string;
  /** page file, or tree path */
  ref: string;
  snippet: string;
  score: number;
}

interface TreeIndex {
  tokens: string[];
  postings: number[][];
}

const INDEX_URL = new URL('templeos-search.json', document.baseURI).href;

let treeIndex: TreeIndex | null = null;
let treeLoading = false;

async function loadTreeIndex(): Promise<TreeIndex | null> {
  if (treeIndex) return treeIndex;
  if (treeLoading) return null;
  treeLoading = true;
  try {
    const res = await fetch(INDEX_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    treeIndex = (await res.json()) as TreeIndex;
    return treeIndex;
  } catch {
    return null;
  } finally {
    treeLoading = false;
  }
}

function terms(q: string): string[] {
  return [...new Set((q.toLowerCase().match(/[a-z0-9_]{2,24}/g) ?? []))];
}

function snippetAround(text: string, term: string, len = 150): string {
  const i = text.toLowerCase().indexOf(term);
  if (i === -1) return text.slice(0, len);
  const start = Math.max(0, i - Math.floor(len / 3));
  const raw = text.slice(start, start + len);
  return (start > 0 ? '…' : '') + raw + (start + len < text.length ? '…' : '');
}

/** Search the site's own pages. Synchronous — the prose is already here. */
export function searchPages(query: string, limit = 8): SiteHit[] {
  const toks = terms(query);
  if (!toks.length) return [];
  const hits: SiteHit[] = [];
  for (const p of sitePages) {
    const hay = `${p.title} ${p.keywords} ${p.text}`.toLowerCase();
    let score = 0;
    let matched = 0;
    for (const t of toks) {
      const n = hay.split(t).length - 1;
      if (n > 0) {
        matched++;
        score += n;
      }
    }
    if (!matched) continue;
    // Require every term to appear somewhere, unless there is only one.
    if (toks.length > 1 && matched < toks.length) continue;
    if (p.title.toLowerCase().includes(query.toLowerCase())) score += 50;
    hits.push({
      kind: 'page',
      title: p.title,
      ref: p.file,
      snippet: snippetAround(p.text, toks[0]!),
      score,
    });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

/** Search the TempleOS tree. Needs the token index, so it is async. */
export async function searchTree(query: string, limit = 12): Promise<SiteHit[]> {
  const idx = await loadTreeIndex();
  if (!idx) return [];
  const toks = terms(query);
  if (!toks.length) return [];

  // AND over tokens.
  let candidate: Set<number> | null = null;
  const lists: number[][] = [];
  for (const t of toks) {
    const at = idx.tokens.indexOf(t);
    if (at === -1) return [];
    lists.push(idx.postings[at] ?? []);
  }
  lists.sort((a, b) => a.length - b.length);
  candidate = new Set(lists[0]);
  for (const l of lists.slice(1)) {
    const next = new Set<number>();
    for (const i of l) if (candidate.has(i)) next.add(i);
    candidate = next;
    if (!candidate.size) break;
  }
  if (!candidate || !candidate.size) return [];

  // We need the file list; the index is shared with the explorer.
  const files = await loadFileList();
  if (!files) return [];

  const hits: SiteHit[] = [];
  for (const i of candidate) {
    const f = files[i];
    if (!f) continue;
    let score = 0;
    for (const l of lists) score += 1 / Math.max(1, l.length);
    hits.push({
      kind: 'file',
      title: f.path,
      ref: f.path,
      snippet: `${f.path} — ${f.code} lines of code`,
      score,
    });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

interface FileRow {
  path: string;
  code: number;
}

let fileList: FileRow[] | null = null;

async function loadFileList(): Promise<FileRow[] | null> {
  if (fileList) return fileList;
  try {
    const res = await fetch(new URL('templeos-index.json', document.baseURI).href);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const idx = (await res.json()) as { files: FileRow[] };
    fileList = idx.files;
    return fileList;
  } catch {
    return null;
  }
}

export async function searchAll(query: string): Promise<SiteHit[]> {
  const [pages, tree] = [searchPages(query), await searchTree(query)];
  return [...pages, ...tree].sort((a, b) => b.score - a.score);
}
