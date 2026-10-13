// AUTO-GENERATED from the TempleOS source tree. Do not edit by hand.
// Source: https://github.com/cia-foundation/TempleOS
// Songs are the real Play() calls found in the TempleOS tree.
export interface SongLine { notes: string; words: string; }
export interface Song { id: string; title: string; file: string; blurb: string; tempo: number; lines: SongLine[]; }

export const songs: Song[] = [
  {
    "id": "ohgreat",
    "title": "Oh Great",
    "file": "Demo/Snd/OhGreat.HC",
    "blurb": "A complete song, lyrics and melody, in his own notation. Found in the demo folder.",
    "tempo": 2.5,
    "lines": [
      {
        "notes": "6hEqDC5B6CDhE",
        "words": "God  is  a  g od  of  love."
      },
      {
        "notes": "5GqFEFhG6E",
        "words": "He"
      },
      {
        "notes": "6qDC5B6CDhE5G",
        "words": "wat ches  us  from  a bove."
      },
      {
        "notes": "5qFEFhGB6qC",
        "words": "Our  world"
      },
      {
        "notes": "6DhCeDC5hBG",
        "words": "is n't  al ways  nice."
      },
      {
        "notes": "5qFEFhG6EqD",
        "words": "Be fore"
      },
      {
        "notes": "6C5B6CDhE5G",
        "words": "you  gr ipe  think  twice."
      },
      {
        "notes": "5qFEFhG6EqD",
        "words": "He  wat"
      },
      {
        "notes": "6C5B6CDhE5G",
        "words": "ches  us  from  a bove."
      },
      {
        "notes": "5qFEFhG6EqD",
        "words": "He'll  smack"
      },
      {
        "notes": "6C5B6CDhE5G",
        "words": "you  with  out  a  glove."
      },
      {
        "notes": "5qFEFhGB6qC",
        "words": "Our  world"
      },
      {
        "notes": "6DhCeDC5hBG",
        "words": "is n't  al ways  nice."
      },
      {
        "notes": "5qFEFhG",
        "words": ""
      }
    ]
  },
  {
    "id": "childish",
    "title": "Childish",
    "file": "Apps/Psalmody/Examples/childish.HC",
    "blurb": "One of the example compositions that shipped with Psalmody, his sheet-music editor.",
    "tempo": 2.48,
    "lines": [
      {
        "notes": "5qEsCDCDqCDeEGsE4B5E4B5eC4B5sD4A5D4A",
        "words": "Be  like    a    child        some    re   spect."
      },
      {
        "notes": "5qEsCDCDqCDeEGsE4B5E4B5eC4B5sD4A5D4A",
        "words": "Ma tur   i   ty        don't    ne   glect."
      },
      {
        "notes": "4eB5DqF4sGAGAqAAA5etD4AA5sD4B5D4B",
        "words": ""
      },
      {
        "notes": "4eB5DqF4sGAGAqAAA5etD4AA5sD4B5D4B",
        "words": ""
      }
    ]
  },
  {
    "id": "prosper",
    "title": "Prosper",
    "file": "Apps/Psalmody/Examples/prosper.HC",
    "blurb": "Another Psalmody example, built to run alongside a moving sprite animation.",
    "tempo": 3.5,
    "lines": [
      {
        "notes": "5qG4G5D4B5sDCDCqRCG",
        "words": "Baa,  the  grass  is  green."
      },
      {
        "notes": "5G4G5D4B5sDCDCqRCG",
        "words": "This  must  be  a  dream."
      },
      {
        "notes": "5EeGF4qBB5D4AeGGqR",
        "words": "Thanks,  my    shep herd.   You  are  good."
      },
      {
        "notes": "5EeGF4qBB5D4AeGGqR",
        "words": "Thanks,  my    shep herd.   You  are  good."
      }
    ]
  },
  {
    "id": "night",
    "title": "God Said This Was A Dirge",
    "file": "Apps/Psalmody/Examples/night.HC",
    "blurb": "A dirge. He labels it as such on screen before the first note plays.",
    "tempo": 2,
    "lines": [
      {
        "notes": "5FqDqD4eA5CqEqEqDqDq",
        "words": "Gone  to  sleep  for  the  fi nal  time."
      },
      {
        "notes": "5FqDqD4eA5CqEqEqDqDq",
        "words": "Gone  to  sleep  for  the  fi nal  time."
      },
      {
        "notes": "5DqGqFeGFqFqEqE4qBq",
        "words": "Ash  to...  and    dust  to  dust."
      },
      {
        "notes": "5DqGqFeGFqFqEqE4qBq",
        "words": "Ash  to...  and    dust  to  dust."
      }
    ]
  },
  {
    "id": "risen",
    "title": "Risen (TempleOS Theme)",
    "file": "Demo/AcctExample/TOS/TOSTheme.HC",
    "blurb": "The oldest song. He picked the name \"risen\" and said to God, \"Oh, you're ambitious,\" and God laughed. The real TOSTheme.",
    "tempo": 2.85,
    "lines": [
      {
        "notes": "5eDEqFFetEEFqDeCDDEetCGF",
        "words": ""
      },
      {
        "notes": "5eDEqFFetEEFqDeCDDEetCGF",
        "words": ""
      },
      {
        "notes": "5eDCqDE4eAA5etEEFEDG4B5DCqF",
        "words": ""
      },
      {
        "notes": "5eDCqDE4eAA5etEEFEDG4B5DCqF",
        "words": ""
      }
    ]
  }
];

// Musical grammar, taken verbatim from ::/Adam/ASnd.HC
// Play(): 'w'=4 'h'=2 'q'=1 'e'=0.5 's'=0.25 quarter-notes, 't'=*2/3, '.'=*1.5,
// '('=tie, 'R'=rest, digits 1-7 set octave (mid C is octave 4).
export const durationCodes: Record<string, number> = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };
export const noteMap = {"A":12,"B":14,"C":3,"D":5,"E":7,"F":8,"G":10} as Record<string, number>;
export const stacattoFactor = 0.9;
export const defaultTempo = 2.5;
// ::/Kernel/KMisc.HC  —  "Ona to freq. Ona=60 is 440.0Hz."
export const onaToFreq = (ona: number) => (ona === 0 ? 0 : (440 / 32) * Math.pow(2, ona / 12));
