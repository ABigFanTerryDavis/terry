import './style.css';
import { directives, types, languageDocs } from './generated/language';
import { mountSearch } from './search-ui';

const $ = <T extends HTMLElement>(sel: string): T => {
  const node = document.querySelector<T>(sel);
  if (!node) throw new Error(`missing element: ${sel}`);
  return node;
};

// The quirks are his words, quoted from the documents he wrote.
const QUIRKS: { quote: string; from: string }[] = [
  {
    quote:
      'There is no separate preprocessor pass. The parser front-end calls Lex() which has the ' +
      'preprocessor built-in.',
    from: 'Doc/PreProcessor.DD',
  },
  {
    quote:
      'The compiler looks ahead a token, most of the time, so you might throw an extra semicolon ' +
      'after a directive if it\'s not taking affect right away.',
    from: 'Doc/PreProcessor.DD',
  },
  {
    quote: 'There is no angle bracket <> form of this directive.',
    from: 'Doc/PreProcessor.DD',
  },
  {
    quote:
      'Will execute code at compile-time and can be used to insert code into the stream being ' +
      'compiled.',
    from: 'Doc/PreProcessor.DD',
  },
  {
    quote:
      'TempleOS has a string indirection feature implemented with the same hash symbol table ' +
      'entry as #define macros.',
    from: 'Doc/Define.DD',
  },
  {
    quote:
      'The compiler\'s lexical analyzer can be used in your programs to simplify parsing.',
    from: 'Doc/Lex.DD',
  },
];

function boot(): void {
  // Types
  const max = Math.max(...types.map((t) => t.count), 1);
  $('#types').replaceChildren(
    ...types.map((t) => {
      const cell = document.createElement('div');
      cell.className = 'type-cell';

      const name = document.createElement('span');
      name.className = 'type-name';
      name.textContent = t.type;

      const bar = document.createElement('div');
      bar.className = 'type-bar';
      const fill = document.createElement('span');
      fill.style.width = `${Math.max(1, (t.count / max) * 100)}%`;
      bar.appendChild(fill);

      const count = document.createElement('span');
      count.className = 'type-count';
      count.textContent = `${t.count.toLocaleString('en-US')} fn`;

      cell.append(name, bar, count);
      return cell;
    }),
  );

  // Directives
  $('#directives').replaceChildren(
    ...directives.map((d) => {
      const row = document.createElement('div');
      row.className = 'directive-row';

      const head = document.createElement('div');
      head.className = 'directive-head';
      const sig = document.createElement('code');
      sig.className = 'directive-sig';
      sig.textContent = '#' + d.name;
      const count = document.createElement('span');
      count.className = 'directive-count';
      count.textContent = `${d.count.toLocaleString('en-US')}×`;
      head.append(sig, count);

      const desc = document.createElement('p');
      desc.className = 'directive-desc';
      desc.textContent = d.desc || 'Used in the tree; not described in the compiler documents.';

      row.append(head, desc);
      if (d.doc) {
        const src = document.createElement('a');
        src.className = 'directive-src';
        src.href = `./explorer.html#/${d.doc}`;
        src.textContent = d.doc;
        row.appendChild(src);
      }
      return row;
    }),
  );

  // Quirks
  $('#quirks').replaceChildren(
    ...QUIRKS.map((q) => {
      const block = document.createElement('blockquote');
      block.className = 'quirk';
      const p = document.createElement('p');
      p.textContent = q.quote;
      const cite = document.createElement('cite');
      cite.textContent = q.from;
      block.append(p, cite);
      return block;
    }),
  );

  // His documentation index
  $('#lang-docs').replaceChildren(
    ...languageDocs.map((d) => {
      const t = document.createElement('div');
      t.className = 'tile';
      const v = document.createElement('span');
      v.className = 'tile-value';
      v.style.fontSize = '1.05rem';
      const a = document.createElement('a');
      a.href = `./explorer.html#/Doc/${d.file}`;
      a.textContent = d.title;
      v.appendChild(a);
      const l = document.createElement('span');
      l.className = 'tile-label';
      l.textContent = 'Doc/' + d.file;
      const n = document.createElement('span');
      n.className = 'tile-note';
      n.textContent = d.blurb;
      t.append(v, l, n);
      return t;
    }),
  );

  const totalDirectives = directives.reduce((n, d) => n + d.count, 0);
  const totalFns = types.reduce((n, t) => n + t.count, 0);
  $('#lang-lede').textContent =
    `He invented a language for his operating system and then documented it himself. This is ` +
    `that documentation, with the usage counted from the tree: ${directives.length} directives ` +
    `used ${totalDirectives.toLocaleString('en-US')} times, and ${totalFns.toLocaleString('en-US')} ` +
    `functions returning one of his ${types.length} types.`;

  mountSearch({
    quickLinks: [
      { label: 'The record', href: './index.html' },
      { label: 'The Demands', href: './demands.html' },
      { label: 'The Manual', href: './manual.html' },
      { label: 'Source explorer', href: './explorer.html' },
    ],
  });
}

boot();
