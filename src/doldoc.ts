import { escapeHtml } from './highlight-html';

/**
 * A reading-mode renderer for DolDoc (.DD) documents.
 *
 * DolDoc inline markup is `$...$`, e.g. `$FG,2$word$FG$` for colour or
 * `$LK,"label",A="..."$` for a link. This keeps the words and drops the
 * paint: colour and font codes vanish, links keep their labels, internal
 * `FI:::` file links become explorer links, and `$$` is a literal dollar.
 * It is a subset — enough to read his documentation, not a full layout engine.
 */

const PLACEHOLDER = '\uE000';

function splitArgs(s: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === '"') {
      inQ = !inQ;
      cur += c;
    } else if (c === ',' && !inQ) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function unquote(s: string): string {
  const m = /^"(.*)"$/s.exec(s.trim());
  return m?.[1] ?? s;
}

function macroToHtml(content: string): string {
  const args = splitArgs(content);
  const cmd = (args[0] ?? '').toUpperCase();
  if (cmd === 'LK' || cmd === 'TX' || cmd === 'TX+CX') {
    const label = args.length > 1 ? unquote(args[1]!) : '';
    const rest = args.slice(2).join(',');
    const text = escapeHtml(label);
    if (!text) return '';
    const a = /A="([^"]*)"/.exec(rest)?.[1];
    const html = /HTML="([^"]*)"/.exec(rest)?.[1];
    if (a?.startsWith('FI:::')) {
      const p = a.slice('FI:::'.length).replace(/^:+/, '').replace(/^\//, '');
      // The Bible and the PCI dump are data, not browsable source.
      if (p === 'Misc/Bible.TXT' || p === 'Misc/PCIDevices.DD') return `<span>${text}</span>`;
      if (p) return `<a class="doc-link" href="./explorer.html#/${encodeURI(p)}">${text}</a>`;
      return `<span>${text}</span>`;
    }
    if (html) return `<a class="doc-link" href="${escapeHtml(html)}" target="_blank" rel="noopener">${text}</a>`;
    // A bare file path with no anchor still names a file in the tree.
    if (/^::?\//.test(label)) {
      const p = label.replace(/^:+/, '').replace(/^\//, '');
      if (p && p !== 'Misc/Bible.TXT' && p !== 'Misc/PCIDevices.DD') {
        return `<a class="doc-link" href="./explorer.html#/${encodeURI(p)}">${text}</a>`;
      }
    }
    return `<span>${text}</span>`;
  }
  if (cmd === 'BT') {
    const label = args.length > 1 ? unquote(args[1]!) : '';
    return label ? `<span class="doc-btn">${escapeHtml(label)}</span>` : '';
  }
  if (cmd === 'SP') return `<span class="doc-graphic">[graphic]</span>`;
  return '';
}

/** Render DolDoc source as readable HTML paragraphs. */
export function renderDolDoc(src: string): string {
  // `$$` is ambiguous: a literal dollar in `$$3,000`, but a macro close
  // immediately followed by a macro open in `$FG,4$$TX,...`. Only the former
  // is an escape; the latter must stay two dollars so both macros parse.
  const masked = src.replace(/\$\$(?![A-Za-z])/g, PLACEHOLDER);
  const re = /\$([^$]*)\$/g;
  let html = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked)) !== null) {
    html += escapeHtml(masked.slice(last, m.index));
    html += macroToHtml(m[1]!);
    last = m.index + m[0].length;
  }
  html += escapeHtml(masked.slice(last));
  html = html.split(PLACEHOLDER).join('$');
  const paras = html
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paras.map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}
