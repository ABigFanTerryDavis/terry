import './style.css';
import { compilerStages } from './generated/chapters';
import { highlightHolyC } from './highlight';
import { escapeHtml } from './highlight-html';
import { mountSearch } from './search-ui';

const $ = <T extends HTMLElement>(sel: string): T => {
  const node = document.querySelector<T>(sel);
  if (!node) throw new Error(`missing element: ${sel}`);
  return node;
};

function boot(): void {
  const host = $('#stages');
  host.replaceChildren(
    ...compilerStages.map((s, i) => {
      const card = document.createElement('article');
      card.className = 'stage';

      const head = document.createElement('div');
      head.className = 'stage-head';
      const num = document.createElement('span');
      num.className = 'stage-num';
      num.textContent = String(i + 1).padStart(2, '0');
      const title = document.createElement('h3');
      title.className = 'stage-title';
      const link = document.createElement('a');
      link.href = `./explorer.html#/${s.file}`;
      link.textContent = s.stage;
      title.appendChild(link);
      const meta = document.createElement('span');
      meta.className = 'song-meta';
      meta.textContent = `${s.code.toLocaleString('en-US')} lines in file`;
      head.append(num, title, meta);

      const note = document.createElement('p');
      note.className = 'song-blurb';
      note.textContent = s.note;

      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      const pre = document.createElement('pre');
      pre.className = 'code code-static';
      pre.innerHTML = highlightHolyC(s.excerpt);
      pre.setAttribute('aria-label', `Excerpt from ${s.file}`);
      wrap.appendChild(pre);

      const foot = document.createElement('p');
      foot.className = 'fineprint';
      foot.innerHTML = `First function of <code>${escapeHtml(s.file)}</code> — `;
      const more = document.createElement('a');
      more.href = `./explorer.html#/${s.file}`;
      more.textContent = 'read the whole file';
      foot.appendChild(more);

      card.append(head, note, wrap, foot);
      return card;
    }),
  );
}

mountSearch({
  quickLinks: [
    { label: 'The Manual', href: './manual.html' },
    { label: 'TempleOS University', href: './university.html' },
    { label: 'The Desktop', href: './desktop.html' },
    { label: 'The record', href: './index.html' },
  ],
});
boot();
