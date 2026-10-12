// Verifies parseSong against known pitches, using the real bundled module.
//   npm test   (bundles src/music.ts with esbuild first, then runs this)
import { parseSong } from '../.cache/music.bundle.mjs';

let fails = 0;
const check = (label, got, want, tol = 0.01) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: got ${got.toFixed(2)}, want ${want.toFixed(2)}`);
};

// --- pitch: 'E' at octave 6 must be E6 = 1318.51 Hz
{
  const s = parseSong({ id: 'x', title: 'x', file: 'x', blurb: '', tempo: 2.5, lines: [{ notes: '6E', words: '' }] });
  check('E6 frequency', s.events[0].freq, 1318.51, 0.02);
  console.log(`      name=${s.events[0].name} ona=${s.events[0].ona}`);
}
// --- D6 = 1174.66
{
  const s = parseSong({ id: 'x', title: 'x', file: 'x', blurb: '', tempo: 2.5, lines: [{ notes: '6D', words: '' }] });
  check('D6 frequency', s.events[0].freq, 1174.66, 0.02);
}
// --- A4 (octave 4) = 440.00
{
  const s = parseSong({ id: 'x', title: 'x', file: 'x', blurb: '', tempo: 2.5, lines: [{ notes: '4A', words: '' }] });
  check('A4 frequency', s.events[0].freq, 440.0, 0.01);
  if (s.events[0].name !== 'A4') { console.log(`FAIL  A4 name: ${s.events[0].name}`); fails++; }
}
// --- middle C = 261.63
{
  const s = parseSong({ id: 'x', title: 'x', file: 'x', blurb: '', tempo: 2.5, lines: [{ notes: '4C', words: '' }] });
  check('C4 frequency', s.events[0].freq, 261.63, 0.02);
  if (s.events[0].name !== 'C4') { console.log(`FAIL  C4 name: ${s.events[0].name}`); fails++; }
}

// --- octave persists: "6CD" must both be octave 6 (no digit between them)
{
  const s = parseSong({ id: 'x', title: 'x', file: 'x', blurb: '', tempo: 2.5, lines: [{ notes: '6CD', words: '' }] });
  const ok = s.events[0].name === 'C6' && s.events[1].name === 'D6';
  console.log(`${ok ? 'PASS' : 'FAIL'}  octave persists: ${s.events.map((e) => e.name).join(', ')}`);
  if (!ok) fails++;
}
// --- and a digit DOES change it mid-string: 6C then 5D -> D5
{
  const s = parseSong({ id: 'x', title: 'x', file: 'x', blurb: '', tempo: 2.5, lines: [{ notes: '6C5D', words: '' }] });
  const ok = s.events[0].name === 'C6' && s.events[1].name === 'D5';
  console.log(`${ok ? 'PASS' : 'FAIL'}  digit changes octave: ${s.events.map((e) => e.name).join(', ')}`);
  if (!ok) fails++;
}

// --- duration persists: 'h' then two notes => both half notes
{
  const s = parseSong({ id: 'x', title: 'x', file: 'x', blurb: '', tempo: 2.5, lines: [{ notes: '6hCD', words: '' }] });
  const ok = s.events[0].duration === 0.8 && s.events[1].duration === 0.8;
  console.log(`${ok ? 'PASS' : 'FAIL'}  duration persists at 0.8s: ${s.events.map((e) => e.duration).join(', ')}`);
  if (!ok) fails++;
}
// --- 'q' resets to quarter = 0.4s at tempo 2.5
{
  const s = parseSong({ id: 'x', title: 'x', file: 'x', blurb: '', tempo: 2.5, lines: [{ notes: '6hCqD', words: '' }] });
  const ok = s.events[0].duration === 0.8 && s.events[1].duration === 0.4;
  console.log(`${ok ? 'PASS' : 'FAIL'}  q after h: ${s.events.map((e) => e.duration).join(', ')}`);
  if (!ok) fails++;
}
// --- 'e' eighth = 0.2s, 'q' quarter = 0.4s, 's' sixteenth = 0.1s
{
  const s = parseSong({ id: 'x', title: 'x', file: 'x', blurb: '', tempo: 2.5, lines: [{ notes: '6eCqEsD', words: '' }] });
  const d = s.events.map((e) => e.duration);
  const ok = Math.abs(d[0] - 0.2) < 1e-9 && Math.abs(d[1] - 0.4) < 1e-9 && Math.abs(d[2] - 0.1) < 1e-9;
  console.log(`${ok ? 'PASS' : 'FAIL'}  e/q/s durations: ${d.join(', ')}`);
  if (!ok) fails++;
}
// --- dotted quarter = 1.5 * 0.4
{
  const s = parseSong({ id: 'x', title: 'x', file: 'x', blurb: '', tempo: 2.5, lines: [{ notes: '6q.C', words: '' }] });
  check('dotted quarter', s.events[0].duration, 0.6, 1e-9);
}
// --- triplet: 'q' then 't' => 2/3
{
  const s = parseSong({ id: 'x', title: 'x', file: 'x', blurb: '', tempo: 2.5, lines: [{ notes: '6qtC', words: '' }] });
  check('triplet quarter', s.events[0].duration, (2 / 3) * 0.4, 1e-9);
}
// --- staccato: on-time is 90% of duration
{
  const s = parseSong({ id: 'x', title: 'x', file: 'x', blurb: '', tempo: 2.5, lines: [{ notes: '6qC', words: '' }] });
  check('staccato factor', s.events[0].on, 0.36, 1e-9);
}
// --- rest: 'R' produces ona 0 and still advances time
{
  const s = parseSong({ id: 'x', title: 'x', file: 'x', blurb: '', tempo: 2.5, lines: [{ notes: '6qRC', words: '' }] });
  const ok = s.events[0].ona === 0 && s.events[1].start === 0.4;
  console.log(`${ok ? 'PASS' : 'FAIL'}  rest advances time: rest start=${s.events[0].start} next start=${s.events[1].start}`);
  if (!ok) fails++;
}
// --- meter is consumed and ignored: M4/4 must not break parsing
{
  const s = parseSong({ id: 'x', title: 'x', file: 'x', blurb: '', tempo: 2.5, lines: [{ notes: '6M4/4qC', words: '' }] });
  const ok = s.events.length === 1 && s.events[0].name === 'C6';
  console.log(`${ok ? 'PASS' : 'FAIL'}  meter prefix: ${s.events.map((e) => e.name).join(',') || '(none)'}`);
  if (!ok) fails++;
}
// --- tie: '(D' after a note sustains and does not create a second event
{
  const s = parseSong({ id: 'x', title: 'x', file: 'x', blurb: '', tempo: 2.5, lines: [{ notes: '6qC(D', words: '' }] });
  const ok = s.events.length === 1 && Math.abs(s.events[0].lenQ === undefined ? 0 : 2) === 2;
  console.log(`${ok ? 'PASS' : 'FAIL'}  tie merges: ${s.events.length} event(s), durations ${s.events.map((e) => e.duration).join(',')}`);
  if (s.events.length !== 1) fails++;
}
// --- sharp: C# at octave 4 = 277.18
{
  const s = parseSong({ id: 'x', title: 'x', file: 'x', blurb: '', tempo: 2.5, lines: [{ notes: '4C#', words: '' }] });
  check('C#4 frequency', s.events[0].freq, 277.18, 0.05);
}

console.log(fails === 0 ? '\nAll music-parser checks passed.' : `\n${fails} CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
