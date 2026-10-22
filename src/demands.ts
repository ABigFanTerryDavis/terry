import './style.css';
import { demands } from './generated/demands';
import { mountSearch } from './search-ui';

const $ = <T extends HTMLElement>(sel: string): T => {
  const node = document.querySelector<T>(sel);
  if (!node) throw new Error(`missing element: ${sel}`);
  return node;
};

const VERDICT_LABEL: Record<string, string> = {
  yes: 'the industry did this',
  partly: 'partly',
  no: 'the industry did not',
};

function boot(): void {
  // The scorecard: one row per scored demand.
  const scored = demands.filter((d) => d.scores.length > 0);
  const sc = $('#scorecard');
  sc.replaceChildren(
    ...scored.map((d) => {
      const row = document.createElement('div');
      row.className = 'score-row';

      const verdict = document.createElement('span');
      const v = d.scores[0]!.verdict;
      verdict.className = `verdict v-${v}`;
      verdict.textContent = v === 'yes' ? 'yes' : v === 'partly' ? 'partly' : 'no';
      verdict.title = VERDICT_LABEL[v] ?? v;

      const demand = document.createElement('p');
      demand.className = 'score-demand';
      demand.textContent = d.text.length > 240 ? d.text.slice(0, 237) + '…' : d.text;

      const answers = document.createElement('div');
      answers.className = 'score-answers';
      for (const s of d.scores) {
        const a = document.createElement('p');
        a.className = 'score-answer';
        a.textContent = s.answer;
        if (s.note) {
          const n = document.createElement('em');
          n.className = 'score-note';
          n.textContent = ' ' + s.note;
          a.appendChild(n);
        }
        answers.appendChild(a);
      }

      row.append(verdict, demand, answers);
      return row;
    }),
  );

  // The letter itself.
  const list = $('#demands');
  list.replaceChildren(
    ...demands.map((d) => {
      const item = document.createElement('article');
      item.className = d.kind === 'notice' ? 'demand demand-notice' : 'demand';

      const p = document.createElement('p');
      p.className = 'demand-text';
      p.textContent = d.text;
      item.appendChild(p);

      if (d.counts.length) {
        const c = document.createElement('ul');
        c.className = 'demand-counts';
        for (const n of d.counts) {
          const li = document.createElement('li');
          const strong = document.createElement('strong');
          strong.textContent = `${n.file}: ${n.lines}`;
          li.appendChild(strong);
          if (n.note) li.appendChild(document.createTextNode(' — ' + n.note));
          c.appendChild(li);
        }
        item.appendChild(c);
      }

      const files = d.links.filter((l) => l.file);
      if (files.length) {
        const f = document.createElement('p');
        f.className = 'demand-files';
        for (const l of files) {
          const a = document.createElement('a');
          a.href = `./explorer.html#/${l.file}`;
          a.textContent = l.file;
          f.appendChild(a);
          f.appendChild(document.createTextNode(' '));
        }
        item.appendChild(f);
      }

      return item;
    }),
  );

  const yes = demands.reduce(
    (n, d) => n + d.scores.filter((s) => s.verdict === 'yes').length,
    0,
  );
  const no = demands.reduce(
    (n, d) => n + d.scores.filter((s) => s.verdict === 'no').length,
    0,
  );
  const partly = demands.reduce(
    (n, d) => n + d.scores.filter((s) => s.verdict === 'partly').length,
    0,
  );

  mountSearch({
    quickLinks: [
      { label: 'The record', href: './index.html' },
      { label: 'The Language', href: './language.html' },
      { label: 'The Manual', href: './manual.html' },
      { label: 'Source explorer', href: './explorer.html' },
    ],
  });

  // The hero line carries the tally, so it is never stale.
  const lede = document.querySelector('.hero .lede');
  if (lede) {
    lede.textContent =
      `He wrote a letter to the computer industry. He asked Microsoft to cancel SecureBoot, ` +
      `Intel to burn TempleOS into every CPU's factory ROM, and VMware to list his operating ` +
      `system as a first-class guest — and he argued every point with line counts. ` +
      `Of ${yes + no + partly} demands we can check: ${yes} happened, ${partly} half happened, ` +
      `${no} did not.`;
  }
}

boot();
