// AUTO-GENERATED from the TempleOS source tree. Do not edit by hand.
// Source: https://github.com/cia-foundation/TempleOS

export interface DirRow { dir: string; code: number; comments: number; files: number; }
export interface FileRow { path: string; dir: string; code: number; comments: number; }

export const totals = {"code":116129,"comments":5989,"blank":8949,"lines":131067,"sourceFiles":492,"dataFiles":[{"path":"Misc/Bible.TXT","lines":100118},{"path":"Misc/PCIDevices.DD","lines":9430}]};

export const byDir: DirRow[] = [{"dir":"Adam","code":41659,"comments":2466,"files":132},{"dir":"Kernel","code":21983,"comments":777,"files":77},{"dir":"Demo","code":20721,"comments":2164,"files":178},{"dir":"Compiler","code":19139,"comments":153,"files":35},{"dir":"Apps","code":5178,"comments":137,"files":63},{"dir":"Doc","code":2880,"comments":85,"files":91},{"dir":"Misc","code":2300,"comments":132,"files":16},{"dir":"Downloads","code":1022,"comments":3,"files":4},{"dir":"Linux","code":917,"comments":23,"files":6},{"dir":"HomeKeyPlugIns.HC","code":182,"comments":12,"files":1},{"dir":"Once.HC","code":45,"comments":6,"files":1},{"dir":"HomeSys.HC","code":31,"comments":2,"files":1},{"dir":"StartOS.HC","code":31,"comments":4,"files":1},{"dir":"ReadMe.TXT","code":17,"comments":0,"files":1},{"dir":"MakeHome.HC","code":10,"comments":2,"files":1},{"dir":"HomeLocalize.HC","code":8,"comments":6,"files":1},{"dir":"HomeWrappers.HC","code":4,"comments":17,"files":1},{"dir":"PersonalNotes.DD","code":2,"comments":0,"files":1}];

export const topFiles: FileRow[] = [{"path":"Kernel/KernelA.HH","dir":"Kernel","code":3318,"comments":174},{"path":"Adam/Gr/GrBitMap.HC","dir":"Adam","code":1994,"comments":7},{"path":"Adam/Gr/GrPrimatives.HC","dir":"Adam","code":1697,"comments":45},{"path":"Misc/OSTestSuite.HC","dir":"Misc","code":1518,"comments":72},{"path":"Adam/Gr/SpriteMesh.HC","dir":"Adam","code":1386,"comments":23},{"path":"Adam/DolDoc/DocRecalc.HC","dir":"Adam","code":1288,"comments":4},{"path":"Compiler/OptPass012.HC","dir":"Compiler","code":1236,"comments":23},{"path":"Adam/Gr/SpriteMain.HC","dir":"Adam","code":1197,"comments":1},{"path":"Compiler/PrsStmt.HC","dir":"Compiler","code":1182,"comments":0},{"path":"Compiler/Lex.HC","dir":"Compiler","code":1173,"comments":4},{"path":"Compiler/PrsExp.HC","dir":"Compiler","code":1139,"comments":5},{"path":"Compiler/OptPass789A.HC","dir":"Compiler","code":1138,"comments":9},{"path":"Adam/Gr/SpriteEd.HC","dir":"Adam","code":1117,"comments":0},{"path":"Adam/DolDoc/DocWidgetWiz.HC","dir":"Adam","code":1105,"comments":0},{"path":"Compiler/Asm.HC","dir":"Compiler","code":1088,"comments":0},{"path":"Downloads/Linux/TOSZ.CPP","dir":"Downloads","code":998,"comments":3},{"path":"Kernel/BlkDev/FileSysFAT.HC","dir":"Kernel","code":922,"comments":3},{"path":"Linux/TOSZ.CPP","dir":"Linux","code":893,"comments":23},{"path":"Kernel/StrPrint.HC","dir":"Kernel","code":878,"comments":8},{"path":"Adam/WinMgr.HC","dir":"Adam","code":829,"comments":7},{"path":"Apps/Psalmody/PsalmodyMain.HC","dir":"Apps","code":765,"comments":4},{"path":"Adam/Gr/GrMath.HC","dir":"Adam","code":751,"comments":3},{"path":"Compiler/BackC.HC","dir":"Compiler","code":743,"comments":0},{"path":"Adam/DolDoc/DocPutKey.HC","dir":"Adam","code":720,"comments":6},{"path":"Compiler/PrsVar.HC","dir":"Compiler","code":695,"comments":0},{"path":"Compiler/BackB.HC","dir":"Compiler","code":689,"comments":0},{"path":"Compiler/OptPass4.HC","dir":"Compiler","code":679,"comments":2},{"path":"Compiler/CMain.HC","dir":"Compiler","code":669,"comments":4},{"path":"Compiler/BackLib.HC","dir":"Compiler","code":665,"comments":16},{"path":"Kernel/KernelC.HH","dir":"Kernel","code":664,"comments":1}];

export interface DataFile { path: string; lines: number; }

export const commits: {
  total: number;
  byAuthor: Record<string, number>;
  firstDate: string;
  lastDate: string;
  byYear: Record<string, number>;
} = {
  total: 49,
  byAuthor: {"Terry A. Davis":48,"minexew":1},
  firstDate: "2006-07-18",
  lastDate: "2020-02-24",
  byYear: {"2006":2,"2007":1,"2012":1,"2013":3,"2014":2,"2015":4,"2016":14,"2017":21,"2020":1},
};

export const excludedDataFiles: DataFile[] = [{"path":"Misc/Bible.TXT","lines":100118},{"path":"Misc/PCIDevices.DD","lines":9430}];
