import { noteMap, onaToFreq, stacattoFactor, type Song } from './generated/songs';

/** Musical state that persists across a whole Play() string, as in the original. */
interface MusicState {
  octave: number;
  noteLen: number;
}

/** One scheduled note, before conversion from quarters to seconds. */
interface RawNote {
  ona: number;
  freq: number;
  /** start position, in quarter notes */
  startQ: number;
  /** sounding length, in quarter notes (ties already merged in) */
  lenQ: number;
  /** index into song.lines, for lyric highlighting */
  line: number;
  /** true when a tie extended this note from the previous one */
  sustained: boolean;
}

export interface NoteEvent extends RawNote {
  start: number;
  duration: number;
  /** the PC speaker sounds for this fraction of the note, then ticks off */
  on: number;
  /** musical name, e.g. "E6" */
  name: string;
}

export interface ParsedSong {
  events: NoteEvent[];
  /** total length in seconds at the song's tempo */
  duration: number;
  tempo: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function onaName(ona: number): string {
  if (ona <= 0) return 'rest';
  // mid C is ona 51
  const semis = ona - 51;
  const oct = 4 + Math.floor(semis / 12);
  return `${NOTE_NAMES[((semis % 12) + 12) % 12]}${oct}`;
}

function setMeter(s: string, i: number): number {
  if (s[i] !== 'M') return i;
  const m = /^M(\d)?(?:\/(\d))?/.exec(s.slice(i));
  return m ? i + m[0].length : i;
}

function setOctave(s: string, i: number, st: MusicState): number {
  const c = s.charCodeAt(i);
  if (c >= 49 && c <= 55) {
    // '1'..'7'
    st.octave = c - 48;
    return i + 1;
  }
  return i;
}

function setNoteLen(s: string, i: number, st: MusicState): number {
  let cur = i;
  for (;;) {
    const c = s[cur];
    if (c === 'w') st.noteLen = 4;
    else if (c === 'h') st.noteLen = 2;
    else if (c === 'q') st.noteLen = 1;
    else if (c === 'e') st.noteLen = 0.5;
    else if (c === 's') st.noteLen = 0.25;
    else if (c === 't') st.noteLen = (2 * st.noteLen) / 3;
    else if (c === '.') st.noteLen = st.noteLen * 1.5;
    else break;
    cur++;
  }
  return cur;
}

/**
 * A direct port of `Play()` from ::/Adam/ASnd.HC.
 *
 * Grammar, as documented in the original:
 *   'w' whole (4)  'h' half (2)  'q' quarter (1)  'e' eighth (0.5)  's' 16th (0.25)
 *   't' => 2/3 of current   '.' => 1.5x current   durations persist until changed
 *   '(' tie, placed before the note to be extended
 *   '1'-'7' set the octave (mid C is octave 4), and persist
 *   'M3/4' sets the meter
 *   'A'-'G' sound a note, optionally followed by '#' or 'b'
 *   'R' — or any other unconsumed character — rests
 */
export function parseSong(song: Song): ParsedSong {
  const st: MusicState = { octave: 4, noteLen: 1.0 };
  const raw: RawNote[] = [];
  let startQ = 0;

  song.lines.forEach((line, lineIdx) => {
    const s = line.notes;
    let i = 0;

    while (i < s.length) {
      let tie = false;

      // consume any run of modifiers that precede the note
      for (;;) {
        const before = i;
        if (s[i] === '(') {
          tie = true;
          i++;
        } else {
          i = setMeter(s, i);
          i = setOctave(s, i, st);
          i = setNoteLen(s, i, st);
        }
        if (i === before) break;
      }
      if (i >= s.length) break;

      const ch = s[i]!;
      const idx = ch.charCodeAt(0) - 65; // 'A' === 65
      i++;

      const len = st.noteLen;

      if (idx >= 0 && idx < 7) {
        let note = noteMap[ch]!;
        let oct = st.octave;
        if (s[i] === 'b') {
          note--;
          if (note === 2) oct--;
          i++;
        } else if (s[i] === '#') {
          note++;
          if (note === 3) oct++;
          i++;
        }
        // Note2Ona(): a note below C belongs to the octave above
        const ona = note < 3 ? (oct + 1) * 12 + note : oct * 12 + note;
        const prev = raw[raw.length - 1];
        if (tie && prev) {
          // a tied note re-triggers but is never switched off, so it sustains
          prev.lenQ += len;
          prev.sustained = true;
        } else {
          raw.push({ ona, freq: onaToFreq(ona), startQ, lenQ: len, line: lineIdx, sustained: false });
        }
      } else {
        raw.push({ ona: 0, freq: 0, startQ, lenQ: len, line: lineIdx, sustained: false });
      }
      startQ += len;
    }
  });

  const tempo = song.tempo > 0 ? song.tempo : 2.5;
  const events: NoteEvent[] = raw.map((n) => {
    const duration = n.lenQ / tempo;
    return {
      ...n,
      start: n.startQ / tempo,
      duration,
      on: duration * stacattoFactor,
      name: onaName(n.ona),
    };
  });

  return { events, duration: startQ / tempo, tempo };
}

// ---------------------------------------------------------------------------

type Ctx = AudioContext;

let sharedCtx: Ctx | null = null;

export function ctx(): Ctx {
  if (!sharedCtx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) throw new Error('Web Audio is unavailable in this browser.');
    sharedCtx = new AC();
  }
  return sharedCtx;
}

/** The shared clock. UI must use this, never its own AudioContext. */
export function audioNow(): number {
  return ctx().currentTime;
}

export interface Playback {
  stop(): void;
  /** AudioContext time at which t = 0 of the song falls */
  readonly startedAt: number;
}

/**
 * Renders a parsed song on a single square-wave voice, the way the PC speaker
 * did: no polyphony, one oscillator, hard note boundaries.
 */
export function playSong(
  parsed: ParsedSong,
  opts: { loop: boolean; volume: number; onEnd?: () => void },
): Playback {
  const ac = ctx();
  if (ac.state === 'suspended') void ac.resume();

  const master = ac.createGain();
  master.gain.value = opts.volume;
  // A gentle low-pass takes the harshest edge off a raw square wave.
  const tone = ac.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 5200;
  master.connect(tone).connect(ac.destination);

  const nodes: OscillatorNode[] = [];
  const t0 = ac.currentTime + 0.08;
  let timer = 0;
  let stopped = false;

  const schedule = (from: number) => {
    const base = t0 + from;
    for (const ev of parsed.events) {
      if (ev.ona === 0) continue;
      if (ev.start + ev.duration < from) continue;

      const at = base + Math.max(0, ev.start - from);
      const off = at + ev.on;
      const rel = 0.012; // click-free release
      if (off <= ac.currentTime) continue;

      const osc = ac.createOscillator();
      osc.type = 'square';
      osc.frequency.value = ev.freq;

      const env = ac.createGain();
      env.gain.setValueAtTime(0, at);
      env.gain.linearRampToValueAtTime(1, at + 0.003);
      env.gain.setValueAtTime(1, Math.max(off, at + 0.004));
      env.gain.linearRampToValueAtTime(0, off + rel);

      osc.connect(env).connect(master);
      osc.start(at);
      osc.stop(off + rel + 0.02);
      nodes.push(osc);
    }

    const waitMs = Math.max(0, (base + parsed.duration - ac.currentTime) * 1000);
    if (opts.loop) {
      timer = window.setTimeout(() => {
        if (!stopped) schedule(parsed.duration);
      }, waitMs + 60);
    } else {
      timer = window.setTimeout(() => {
        if (stopped) return;
        opts.onEnd?.();
        master.disconnect();
      }, waitMs + 80);
    }
  };

  schedule(0);

  return {
    startedAt: t0,
    stop() {
      if (stopped) return;
      stopped = true;
      window.clearTimeout(timer);
      for (const n of nodes) {
        try {
          n.stop();
        } catch {
          /* already stopped */
        }
      }
      master.disconnect();
    },
  };
}

/** Index of the note sounding at `t` seconds, or -1 if nothing is sounding. */
export function noteAt(parsed: ParsedSong, t: number): number {
  let found = -1;
  for (let i = 0; i < parsed.events.length; i++) {
    const e = parsed.events[i]!;
    if (e.start > t) break;
    if (e.ona !== 0 && t < e.start + e.duration) found = i;
  }
  return found;
}
