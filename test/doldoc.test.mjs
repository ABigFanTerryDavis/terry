// Verifies the DolDoc reading renderer against the real Credits.DD.
//   npm run test:doldoc   (bundles src/doldoc.ts with esbuild first)
import { renderDolDoc } from '../.cache/doldoc.bundle.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const src = fs.readFileSync(path.join(root, 'public/templeos/Doc/Credits.DD'), 'utf8');
const html = renderDolDoc(src);

let fails = 0;
const check = (label, ok, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra && !ok ? `  -> ${extra}` : ''}`);
};

check('renders paragraphs', html.includes('<p>') && html.includes('</p>'));
check('no raw $ macros remain', !/\$[A-Z]{2},/.test(html), html.slice(0, 200));
check('literal dollar kept', html.includes('$3,000'));
check(
  'prose survives',
  html.includes('wrote all of TempleOS over the past') && html.includes('13.9'),
);
check(
  'internal file link becomes explorer link',
  html.includes('href="./explorer.html#/Kernel/FontStd.HC"'),
  html.slice(0, 400),
);
check(
  'external link kept',
  html.includes('href="http://www.freedos.org"') && html.includes('>FreeDOS</a>'),
);
check(
  'excluded data files are not linked',
  !html.includes('explorer.html#/Misc/Bible.TXT'),
);
check(
  'no unescaped angle brackets from prose',
  !html.includes('<VAX') || html.includes('&lt;VAX'),
);

console.log(fails === 0 ? '\nDolDoc checks passed.' : `\n${fails} CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
