/* ---------------------------------------------------------------- GodSong */

// From Adam/God/GodSong.HC, exact arrays.
const DUR_SIMPLE = [0, 0, 0, 0, 1]; // DUR_4, DUR_4, DUR_4, DUR_4, DUR_8_8
const DUR_NORMAL = [0, 0, 1, 2, 3]; // DUR_4, DUR_4, DUR_8_8, DUR_3_3_3, DUR_16_16_16_16
const DUR_COMPLEX = [0, 0, 1, 1, 4, 2, 5, 6, 3]; // complex sequence

function godBits(numBits: number): number {
  // The real GodBits uses a linear congruential generator from a God seed.
  // It is implemented in compiled code (GodExt.HC is only extern).
  // This stand-in uses crypto.getRandomValues — same statistical purpose,
  // not the same bitstream. The structure (complexity table, octave,
  // duration selection, rest toggle) is Terry's.
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  const val = (arr[0] ?? 0) | ((arr[1] ?? 0) << 8) | ((arr[2] ?? 0) << 16) | ((arr[3] ?? 0) << 24);
  return val & ((1 << numBits) - 1);
}

export interface GodSong {
  settings: { complexity: number; rests: boolean; sixEight: boolean; octave: number };
  notation: string; // Play() notation
  quarterNotes: number;
  titleLabel: string;
}

/** Generate a hymn using Terry's GodSong structure. */
export function generateGodSong(overrides?: Partial<GodSong['settings']>): GodSong {
  const s = {
    complexity: 1,
    rests: false,
    sixEight: false,
    octave: 4,
    ...overrides,
  };

  const arrays = [DUR_SIMPLE, DUR_NORMAL, DUR_COMPLEX];
  const set = arrays[s.complexity] ?? DUR_NORMAL;

  const beatsPerMeasure = s.sixEight ? 6 : 8;
  const measures = 2;
  const totalNotes = beatsPerMeasure * measures;

  const notes: string[] = [];
  const octaveState = s.octave + 1; // GodSong writes octave as octave_state initially

  // Start with octave digit.
  notes.push(String.fromCharCode('0'.charCodeAt(0) + octaveState));

  for (let m = 0; m < totalNotes; m++) {
    const durIdx = set[m % set.length] ?? 0;

    // Number of note slots in this duration (approximate from original logic):
    // DUR_4 (0)      -> 1 note
    // DUR_8_8 (1)    -> 2 notes (each 8th)
    // DUR_3_3_3 (2)   -> 3 notes
    // DUR_16_... (3) -> 4 notes
    // Others treated as 2 notes for variety.
    const slots = durIdx === 0 ? 1 : (durIdx === 2 ? 3 : (durIdx === 3 ? 4 : 2));

    for (let n = 0; n < slots; n++) {
      const k = godBits(4);

      // Duration modifier for this note (before the note, matching Play() grammar).
      const durationModifier = (durIdx === 0) ? 'q' : ((durIdx === 2) ? 'e' : (durIdx === 3 ? 's' : 'q'));
      notes.push(durationModifier);

      if (!k && s.rests) {
        notes.push('R');
      } else {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        const note = letters[k % 7] ?? 'C';
        notes.push(note);
      }
    }
  }

  // Build notation: modifiers first, then note, matching Play() grammar.
  const notation = notes.join('').trim();
  const notePairs = Math.max(1, Math.floor((notes.length - 1) / 2));
  const quarterNotes = notePairs;

  return {
    settings: s,
    notation,
    quarterNotes,
    titleLabel: `GodSong — ${s.complexity === 0 ? 'Simple' : s.complexity === 1 ? 'Normal' : 'Complex'} · octave ${s.octave}${s.sixEight ? ' · 6/8' : ' · 4/4'}${s.rests ? ' · rests' : ''}`,
  };
}
