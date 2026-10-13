import './style.css';
import { changelog, changelogIntro } from './generated/chapters';
import { renderDolDoc } from './doldoc';

const $ = <T extends HTMLElement>(sel: string): T => {
  const node = document.querySelector<T>(sel);
  if (!node) throw new Error(`missing element: ${sel}`);
  return node;
};

function boot(): void {
  $('#changelog-intro').innerHTML = renderDolDoc(changelogIntro || '');
  const host = $('#changes');
  host.replaceChildren(
    ...[...changelog].reverse().map((e) => {
      const li = document.createElement('li');
      const y = document.createElement('span');
      y.className = 'tl-year';
      y.textContent = e.date;
      const b = document.createElement('div');
      b.className = 'tl-body doc-inline';
      b.innerHTML = renderDolDoc(e.body);
      li.append(y, b);
      return li;
    }),
  );
}

boot();
