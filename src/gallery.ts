import './style.css';
import { demos } from './generated/chapters';
import { mountSearch } from './search-ui';

const $ = <T extends HTMLElement>(sel: string): T => {
  const node = document.querySelector<T>(sel);
  if (!node) throw new Error(`missing element: ${sel}`);
  return node;
};

/* ------------------------------------------------------------ the shelf */

function bootShelf(): void {
  const host = $('#demo-shelf');
  host.replaceChildren(
    ...demos.map((d) => {
      const t = document.createElement('div');
      t.className = 'tile';
      const v = document.createElement('span');
      v.className = 'tile-value';
      v.textContent = d.code.toLocaleString('en-US');
      const l = document.createElement('span');
      l.className = 'tile-label';
      const a = document.createElement('a');
      a.href = `./explorer.html#/${d.file}`;
      a.textContent = d.title;
      l.appendChild(a);
      const n = document.createElement('span');
      n.className = 'tile-note';
      n.textContent =
        (d.header ? d.header.split('\n')[0] ?? '' : 'No header comment — the code speaks.') +
        (d.trimmed ? ` (${d.trimmed.toLocaleString('en-US')} binary bytes trimmed)` : '') +
        (d.living ? ' · runs above' : '');
      t.append(v, l, n);
      return t;
    }),
  );
}

/* ---------------------------------------------------------- tic-tac-toe */
// His geometry: cells at 150/250/350 on a 480 field, X and O drawn 40 wide.
function bootTicTacToe(): void {
  const canvas = $<HTMLCanvasElement>('#ttt-canvas');
  const ctx = canvas.getContext('2d');
  const status = $('#ttt-status');
  if (!ctx) return;

  const CELLS = [150, 250, 350, 150, 250, 350, 150, 250, 350];
  const ROWS = [150, 150, 150, 250, 250, 250, 350, 350, 350];
  const WINS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  let board: ('X' | 'O' | null)[] = Array(9).fill(null);
  let over = false;

  const draw = (win: number[] | null = null) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 480, 480);
    ctx.strokeStyle = '#FF5555';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(200, 100); ctx.lineTo(200, 400);
    ctx.moveTo(300, 100); ctx.lineTo(300, 400);
    ctx.moveTo(100, 200); ctx.lineTo(400, 200);
    ctx.moveTo(100, 300); ctx.lineTo(400, 300);
    ctx.stroke();
    board.forEach((p, i) => {
      const x = CELLS[i]!;
      const y = ROWS[i]!;
      if (p === 'X') {
        ctx.strokeStyle = '#55FFFF';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x - 20, y - 20); ctx.lineTo(x + 20, y + 20);
        ctx.moveTo(x + 20, y - 20); ctx.lineTo(x - 20, y + 20);
        ctx.stroke();
      } else if (p === 'O') {
        ctx.strokeStyle = '#FFFF55';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    if (win) {
      ctx.strokeStyle = '#55FF55';
      ctx.lineWidth = 3;
      const [a, , c] = [win[0]!, win[1]!, win[2]!];
      ctx.beginPath();
      ctx.moveTo(CELLS[a]!, ROWS[a]!);
      ctx.lineTo(CELLS[c]!, ROWS[c]!);
      ctx.stroke();
    }
  };

  const winner = (): { p: 'X' | 'O'; line: number[] } | 'draw' | null => {
    for (const line of WINS) {
      const [a, b, c] = [line[0]!, line[1]!, line[2]!];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { p: board[a]!, line };
      }
    }
    return board.every(Boolean) ? 'draw' : null;
  };

  const finish = (r: { p: 'X' | 'O'; line: number[] } | 'draw') => {
    over = true;
    if (r === 'draw') {
      draw();
      status.textContent = 'Draw. He would have called it a tie and moved on.';
    } else {
      draw(r.line);
      status.textContent = r.p === 'X' ? 'You win. The machine demands a rematch.' : 'The machine wins. It plays at random — imagine trying.';
    }
  };

  canvas.addEventListener('click', (e) => {
    if (over) return;
    const r = canvas.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * 480;
    const my = ((e.clientY - r.top) / r.height) * 480;
    let best = -1;
    let bestD = 55;
    for (let i = 0; i < 9; i++) {
      const d = Math.hypot(mx - CELLS[i]!, my - ROWS[i]!);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best === -1 || board[best]) return;
    board[best] = 'X';
    const w = winner();
    if (w) {
      finish(w);
      return;
    }
    // Opponent: uniform random empty cell. Mine, not his.
    const empty = board.map((p, i) => (p ? -1 : i)).filter((i) => i >= 0);
    if (empty.length) board[empty[Math.floor(Math.random() * empty.length)]!] = 'O';
    const w2 = winner();
    if (w2) finish(w2);
    else {
      draw();
      status.textContent = 'Your move — you are X.';
    }
  });

  $('#ttt-new').addEventListener('click', () => {
    board = Array(9).fill(null);
    over = false;
    draw();
    status.textContent = 'Your move — you are X.';
  });

  draw();
}

/* ------------------------------------------------------------------ maze */
// His brief: draw with the left button, solve from a right click.
function bootMaze(): void {
  const canvas = $<HTMLCanvasElement>('#maze-canvas');
  const ctx = canvas.getContext('2d');
  const status = $('#maze-status');
  if (!ctx) return;

  const COLS = 60;
  const ROWS_N = 42;
  const CW = 600 / COLS;
  const CH = 420 / ROWS_N;
  let walls = new Set<number>();
  let start: number | null = null;
  let drawing = false;
  let solution: number[] = [];

  const key = (x: number, y: number) => y * COLS + x;

  const draw = () => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 600, 420);
    ctx.fillStyle = '#AAAAAA';
    for (const k of walls) {
      const x = k % COLS;
      const y = Math.floor(k / COLS);
      ctx.fillRect(x * CW, y * CH, CW + 0.5, CH + 0.5);
    }
    if (solution.length) {
      ctx.fillStyle = '#55FF55';
      for (const k of solution) {
        if (k === start) continue;
        const x = k % COLS;
        const y = Math.floor(k / COLS);
        ctx.fillRect(x * CW + 1, y * CH + 1, CW - 2, CH - 2);
      }
    }
    if (start !== null) {
      const x = start % COLS;
      const y = Math.floor(start / COLS);
      ctx.fillStyle = '#FF5555';
      ctx.fillRect(x * CW, y * CH, CW, CH);
    }
  };

  const cell = (e: MouseEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * 600;
    const my = ((e.clientY - r.top) / r.height) * 420;
    return [
      Math.max(0, Math.min(COLS - 1, Math.floor(mx / CW))),
      Math.max(0, Math.min(ROWS_N - 1, Math.floor(my / CH))),
    ];
  };

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      const [x, y] = cell(e);
      start = key(x, y);
      walls.delete(start);
      solution = [];
      status.textContent = 'Start set. Press Solve.';
      draw();
      return;
    }
    drawing = true;
    const [x, y] = cell(e);
    walls.add(key(x, y));
    solution = [];
    draw();
  });
  canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    const [x, y] = cell(e);
    walls.add(key(x, y));
    draw();
  });
  window.addEventListener('mouseup', () => {
    drawing = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Depth-first search. His solver lives in Maze.HC; this stand-in
  // explores the same four directions in the same order.
  $('#maze-solve').addEventListener('click', () => {
    if (start === null) {
      status.textContent = 'Right-click first to set where solving starts.';
      return;
    }
    const seen = new Set<number>([start]);
    const stack: number[] = [start];
    const parent = new Map<number, number>();
    const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    let far = start;
    while (stack.length) {
      const cur = stack.pop()!;
      far = cur;
      const cx = cur % COLS;
      const cy = Math.floor(cur / COLS);
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS_N) continue;
        const nk = key(nx, ny);
        if (walls.has(nk) || seen.has(nk)) continue;
        seen.add(nk);
        parent.set(nk, cur);
        stack.push(nk);
      }
    }
    const path: number[] = [];
    let c: number | undefined = far;
    while (c !== undefined) {
      path.push(c);
      c = parent.get(c);
    }
    solution = path;
    status.textContent = `Solved — ${path.length} cells from the start to the farthest reach.`;
    draw();
  });

  $('#maze-clear').addEventListener('click', () => {
    walls = new Set();
    start = null;
    solution = [];
    status.textContent = 'Drag to draw walls. Right-click sets the start. Then solve.';
    draw();
  });

  draw();
}

/* ------------------------------------------------------------------ rain */
// His DROPS_NUM is 0x2000. Eight thousand streaks of LTRED.
function bootRain(): void {
  const canvas = $<HTMLCanvasElement>('#rain-canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const N = 2000;
  const drops = Array.from({ length: N }, () => ({
    x: Math.random() * 640,
    y: Math.random() * 360,
    v: 3 + Math.random() * 7,
    l: 6 + Math.random() * 14,
  }));

  const frame = () => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 640, 360);
    ctx.strokeStyle = '#FF5555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of drops) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 2, d.y + d.l);
      d.y += d.v;
      d.x -= 0.6;
      if (d.y > 370) {
        d.y = -10;
        d.x = Math.random() * 660;
      }
    }
    ctx.stroke();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

bootShelf();
bootTicTacToe();
bootMaze();
bootRain();

mountSearch({
  quickLinks: [
    { label: 'The Manual', href: './manual.html' },
    { label: 'TempleOS University', href: './university.html' },
    { label: 'The Desktop', href: './desktop.html' },
    { label: 'The record', href: './index.html' },
  ],
});
