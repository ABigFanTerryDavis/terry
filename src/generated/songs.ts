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

export const arcadeSongs: Song[] = [
  {
    "id": "squirt",
    "title": "Squirt",
    "file": "Demo/Games/Squirt.HC",
    "blurb": "Title music for Squirt, one of his arcade demos.",
    "tempo": 2.5,
    "lines": [
      {
        "notes": "5sDCDC4qA5DetDFFeDG4etA5EF4qG5eFC",
        "words": ""
      },
      {
        "notes": "5sDCDC4qA5DetDFFeDG4etA5EF4qG5eFC",
        "words": ""
      },
      {
        "notes": "5DCsG4A5G4AqBeBA5qEE4B5eC4B",
        "words": ""
      },
      {
        "notes": "5DCsG4A5G4AqBeBA5qEE4B5eC4B",
        "words": ""
      }
    ]
  },
  {
    "id": "elephant",
    "title": "Elephant",
    "file": "Demo/Graphics/Elephant.HC",
    "blurb": "Music from a graphics demo.",
    "tempo": 2.5,
    "lines": [
      {
        "notes": "4qG5eCGqE4A5FCeDF4qB",
        "words": ""
      },
      {
        "notes": "4G5eCGqE4A5FCeDF4qB",
        "words": ""
      },
      {
        "notes": "4B5DeF4G5etE4BAqBAetA5EDeE4G",
        "words": ""
      },
      {
        "notes": "4qB5DeF4G5etE4BAqBAetA5EDeE4G",
        "words": ""
      }
    ]
  },
  {
    "id": "zoneout",
    "title": "ZoneOut",
    "file": "Demo/Games/ZoneOut.HC",
    "blurb": "Music from the ZoneOut demo.",
    "tempo": 2.5,
    "lines": [
      {
        "notes": "5sD4B5D4B5qEsG4B5G4B5eD4GsB5F4B5FeD4A5qFG",
        "words": ""
      },
      {
        "notes": "5sD4B5D4B5qEsG4B5G4B5eD4GsB5F4B5FeD4A5qFG",
        "words": ""
      },
      {
        "notes": "5eGDsFGFGqDE4eB5E4sG5D4G5DqF4sGAGA",
        "words": ""
      },
      {
        "notes": "5eGDsFGFGqDE4eB5E4sG5D4G5DqF4sGAGA",
        "words": ""
      }
    ]
  },
  {
    "id": "talons",
    "title": "Talons",
    "file": "Demo/Games/Talons.HC",
    "blurb": "Music from the Talons demo.",
    "tempo": 2.5,
    "lines": [
      {
        "notes": "5eCGFsD4A5e.C4sG5eGDqCDeGsGG4qG",
        "words": ""
      },
      {
        "notes": "5eCGFsD4A5e.C4sG5eGDqCDeGsGG4qG",
        "words": ""
      },
      {
        "notes": "5eGECGC4A5FCsC4B5C4B5e.GsG4qGB",
        "words": ""
      },
      {
        "notes": "5eGECGC4A5FCsC4B5C4B5e.GsG4qGB",
        "words": ""
      }
    ]
  },
  {
    "id": "rawhide",
    "title": "RawHide",
    "file": "Demo/Games/RawHide.HC",
    "blurb": "Music from the RawHide demo.",
    "tempo": 2.5,
    "lines": [
      {
        "notes": "5qC4etG5DC4B5DCECFqFC4sA5D4A5D4qB",
        "words": ""
      },
      {
        "notes": "5C4etG5DC4B5DCECFqFC4sA5D4A5D4qB",
        "words": ""
      },
      {
        "notes": "4sGAGA5qG4etG5GD4eBBqB5F4eBA5qE",
        "words": ""
      },
      {
        "notes": "4sGAGA5qG4etG5GD4eBBqB5F4eBA5qE",
        "words": ""
      }
    ]
  },
  {
    "id": "wenceslas",
    "title": "Wenceslas",
    "file": "Demo/Games/Wenceslas.HC",
    "blurb": "Music from the Wenceslas demo.",
    "tempo": 2.48,
    "lines": [
      {
        "notes": "5eCCCDCC4qGeAGAB5qCC",
        "words": ""
      },
      {
        "notes": "5eCCCDCC4qGeAGAB5qCC",
        "words": ""
      },
      {
        "notes": "5eGFEDEDqC4eAGAB5qCC",
        "words": ""
      }
    ]
  },
  {
    "id": "flapbat",
    "title": "FlapBat",
    "file": "Demo/Games/FlapBat.HC",
    "blurb": "Music from the FlapBat demo.",
    "tempo": 2.5,
    "lines": [
      {
        "notes": "4eB5E4B5C4B5EsEFqE4eB5E4B5C4B5EsEF",
        "words": ""
      },
      {
        "notes": "5qE4eA5D4ABA5DsDCqD4eB5E4B5C4B",
        "words": ""
      },
      {
        "notes": "5EsEDqE",
        "words": ""
      }
    ]
  },
  {
    "id": "castle",
    "title": "Castle Frankenstein",
    "file": "Demo/Games/CastleFrankenstein.HC",
    "blurb": "Music from Castle Frankenstein, his 594-line first-person demo.",
    "tempo": 2.5,
    "lines": [
      {
        "notes": "3q.A#eGAeA#qAq.A#eGeAeA#qA",
        "words": ""
      },
      {
        "notes": "3q.A#eGA#AqGq.A#eGA#AqG",
        "words": ""
      },
      {
        "notes": "4eA#AqGeA#AqGeA#AGAA#AqG",
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
