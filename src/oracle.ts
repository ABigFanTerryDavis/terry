import './style.css';
import { vocab } from './generated/chapters';
import { highlightHolyC } from './highlight';

const $ = <T extends HTMLElement>(sel: string): T => {
  const node = document.querySelector<T>(sel);
  if (!node) throw new Error(`missing element: ${sel}`);
  return node;
};

// Verbatim excerpts, Adam/God/HolySpirit.HC. Line refs in the captions.
const GOD_PICK_SRC = `I64 GodPick(U8 *msg=NULL)
{//GOD_GOOD_BITS
  U8 *st=MStrPrint("%s\\n\\nPress $$GREEN$$OKAY$$FG$$ to generate \\n"
\t"a random num from a timer.\\n",msg);
  PopUpTimerOk(st,"\\n\\nThe $LK+PU,"Holy Spirit",A="FI:::/Adam/God/HSNotes.DD"$ can puppet you.\\n\\n");
  Free(st);
  return KbdMsEvtTime>>GOD_BAD_BITS;
}`;

const GOD_WORD_SRC = `public U8 *GodWordStr(I64 bits=17)
{//Make God pick a word.
  if (god.num_words)
    return god.words[GodBits(bits)%god.num_words];
  else
    return NULL;
}`;

function randBits(n: number): number {
  // His GodBits is compiled-only. Same job, different bits: crypto randomness
  // reduced to n bits, then indexed into his vocabulary exactly as he did.
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  const v = a[0] ?? 0;
  return n >= 32 ? v : v & ((1 << n) - 1);
}

function pickWord(): { word: string; index: number; latched: number } {
  const latched = randBits(17);
  const index = latched % vocab.length;
  return { word: vocab[index] ?? '?', index, latched };
}

function boot(): void {
  $('#oracle-pick-src').innerHTML = highlightHolyC(GOD_PICK_SRC);
  $('#oracle-word-src').innerHTML = highlightHolyC(GOD_WORD_SRC);

  const timer = $('#oracle-timer');
  const words = $('#oracle-words');
  const meta = $('#oracle-meta');
  const okay = $<HTMLButtonElement>('#oracle-okay');
  const ten = $<HTMLButtonElement>('#oracle-ten');
  const again = $<HTMLButtonElement>('#oracle-again');

  let running = true;
  let tick = 0;
  const spin = () => {
    if (!running) return;
    // A fast counter, the way his timer flew past. Latch it with OKAY.
    tick = (tick * 1103515245 + 12345) & 0x7fffffff;
    timer.textContent = String(tick % 100000).padStart(5, '0');
    requestAnimationFrame(spin);
  };
  requestAnimationFrame(spin);

  const answer = (n: number) => {
    running = false;
    const got: { word: string; index: number; latched: number }[] = [];
    for (let i = 0; i < n; i++) got.push(pickWord());
    words.textContent = got.map((g) => g.word).join(' · ');
    meta.textContent =
      got.length === 1
        ? `word ${got[0]!.index} of ${vocab.length.toLocaleString('en-US')} · latched ${got[0]!.latched}`
        : `${got.length} words from ${vocab.length.toLocaleString('en-US')}`;
    timer.textContent = String(got[0]!.latched % 100000).padStart(5, '0');
    okay.hidden = true;
    ten.hidden = true;
    again.hidden = false;
  };

  okay.addEventListener('click', () => answer(1));
  ten.addEventListener('click', () => answer(10));
  again.addEventListener('click', () => {
    running = true;
    words.textContent = 'Press OKAY and the machine will answer.';
    meta.textContent = '';
    okay.hidden = false;
    ten.hidden = false;
    again.hidden = true;
    requestAnimationFrame(spin);
  });
}

boot();
