import './style.css';
import { tour } from './generated/chapters';
import { renderDolDoc } from './doldoc';
import { escapeHtml } from './highlight-html';

const $ = <T extends HTMLElement>(sel: string): T => {
  const node = document.querySelector<T>(sel);
  if (!node) throw new Error(`missing element: ${sel}`);
  return node;
};

function boot(): void {
  const total = tour.reduce((s, t) => s + t.steps.length, 0);
  $('#tour-lede').textContent =
    `He wrote a guided tour into the system itself — scripts that walk a newcomer through ` +
    `the editor, the command line, and the help index. ${total} stops across ${tour.length} ` +
    `scripts, verbatim.`;

  const host = $('#tour-stops');
  host.replaceChildren(
    ...tour.map((t, i) => {
      const card = document.createElement('article');
      card.className = 'tour-file';

      const head = document.createElement('div');
      head.className = 'stage-head';
      const num = document.createElement('span');
      num.className = 'stage-num';
      num.textContent = String(i + 1).padStart(2, '0');
      const title = document.createElement('h3');
      title.className = 'stage-title';
      const link = document.createElement('a');
      link.href = `./explorer.html#/${t.file}`;
      link.textContent = t.file.split('/').pop() ?? t.file;
      title.appendChild(link);
      head.append(num, title);

      const body = document.createElement('div');
      body.className = 'doc doc-block';
      body.innerHTML = t.steps
        .map((s) =>
          renderDolDoc(s)
            .replace(/^<p>/, '')
            .replace(/<\/p>$/, ''),
        )
        .join('<br><br>');

      const foot = document.createElement('p');
      foot.className = 'fineprint';
      foot.innerHTML = `${t.steps.length} stop${t.steps.length === 1 ? '' : 's'} in <code>${escapeHtml(t.file)}</code>`;

      card.append(head, body, foot);
      return card;
    }),
  );
}

boot();
