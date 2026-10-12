/** Small, dependency-free SVG chart builders. */

const NS = 'http://www.w3.org/2000/svg';

export function el<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

export function svg(w: number, h: number, cls = ''): SVGSVGElement {
  const s = el('svg', {
    viewBox: `0 0 ${w} ${h}`,
    preserveAspectRatio: 'xMinYMin meet',
    role: 'img',
  });
  if (cls) s.setAttribute('class', cls);
  return s;
}

export interface BarDatum {
  label: string;
  value: number;
  /** optional secondary value shown as a lighter underlay */
  secondary?: number;
  color?: string;
  note?: string;
}

/**
 * Horizontal bars. Labels sit in a fixed left gutter so the bars all start
 * from the same x, which keeps long file paths readable.
 */
export function barChart(
  data: BarDatum[],
  opts: { labelWidth: number; rowHeight?: number; barHeight?: number; valueWidth?: number; format?: (n: number) => string } = {
    labelWidth: 180,
  },
): SVGSVGElement {
  const rowH = opts.rowHeight ?? 26;
  const barH = opts.barHeight ?? 12;
  const valueW = opts.valueWidth ?? 64;
  const labelW = opts.labelWidth;
  const pad = 4;
  const w = 1000;
  const h = data.length * rowH + pad * 2;
  const trackW = w - labelW - valueW - 8;
  const max = Math.max(...data.map((d) => Math.max(d.value, d.secondary ?? 0)), 1);
  const fmt = opts.format ?? ((n: number) => n.toLocaleString('en-US'));

  const s = svg(w, h, 'chart');
  const defs = el('defs');
  s.appendChild(defs);

  data.forEach((d, i) => {
    const y = pad + i * rowH;
    const mid = y + rowH / 2;

    const label = el('text', { x: labelW - 12, y: mid, 'text-anchor': 'end', class: 'bar-label' });
    label.textContent = d.label;
    s.appendChild(label);

    const track = el('rect', { x: labelW, y: mid - barH / 2, width: trackW, height: barH, class: 'bar-track' });
    s.appendChild(track);

    if (d.secondary != null) {
      const sw = (d.secondary / max) * trackW;
      s.appendChild(
        el('rect', { x: labelW, y: mid - barH / 2, width: sw, height: barH, class: 'bar-secondary' }),
      );
    }

    const bw = Math.max(1, (d.value / max) * trackW);
    const bar = el('rect', {
      x: labelW,
      y: mid - barH / 2,
      width: bw,
      height: barH,
      class: 'bar-fill',
      fill: d.color ?? 'var(--accent-1)',
    });
    if (d.note) {
      const t = el('title');
      t.textContent = d.note;
      bar.appendChild(t);
    }
    s.appendChild(bar);

    const val = el('text', { x: w - 6, y: mid, 'text-anchor': 'end', class: 'bar-value' });
    val.textContent = fmt(d.value);
    s.appendChild(val);
  });

  return s;
}

export interface Column {
  label: string;
  value: number;
  color?: string;
}

/** Vertical columns, for the per-year commit counts. */
export function columnChart(
  data: Column[],
  opts: { height?: number; format?: (n: number) => string } = {},
): SVGSVGElement {
  const h = opts.height ?? 220;
  const w = 1000;
  const padL = 44;
  const padB = 34;
  const padT = 12;
  const plotH = h - padB - padT;
  const plotW = w - padL - 12;
  const max = Math.max(...data.map((d) => d.value), 1);
  const fmt = opts.format ?? ((n: number) => String(n));
  const slot = plotW / data.length;
  const barW = Math.min(46, slot * 0.62);

  const s = svg(w, h, 'chart');

  // gridlines at 0, 1/2, max
  for (const frac of [0, 0.5, 1]) {
    const v = max * frac;
    const y = padT + plotH - (v / max) * plotH;
    s.appendChild(el('line', { x1: padL, x2: w - 12, y1: y, y2: y, class: 'grid' }));
    const t = el('text', { x: padL - 10, y: y + 4, 'text-anchor': 'end', class: 'axis-label' });
    t.textContent = fmt(v);
    s.appendChild(t);
  }

  data.forEach((d, i) => {
    const bh = (d.value / max) * plotH;
    const x = padL + i * slot + (slot - barW) / 2;
    const y = padT + plotH - bh;
    const rect = el('rect', {
      x,
      y,
      width: barW,
      height: Math.max(1, bh),
      class: 'col-fill',
      fill: d.color ?? 'var(--accent-1)',
    });
    const title = el('title');
    title.textContent = `${d.label}: ${d.value} commit${d.value === 1 ? '' : 's'}`;
    rect.appendChild(title);
    s.appendChild(rect);

    const lab = el('text', { x: x + barW / 2, y: h - padB + 16, 'text-anchor': 'middle', class: 'axis-label' });
    lab.textContent = d.label;
    s.appendChild(lab);

    const val = el('text', { x: x + barW / 2, y: y - 6, 'text-anchor': 'middle', class: 'col-value' });
    val.textContent = d.value === 0 ? '' : String(d.value);
    s.appendChild(val);
  });

  s.appendChild(el('line', { x1: padL, x2: w - 12, y1: padT + plotH, y2: padT + plotH, class: 'axis' }));

  return s;
}

/** A single stacked horizontal proportion bar, e.g. code / comment / blank. */
export function stackBar(
  parts: { label: string; value: number; color: string }[],
): SVGSVGElement {
  const w = 1000;
  const h = 44;
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const s = svg(w, h, 'chart');
  let x = 0;
  for (const p of parts) {
    const pw = (p.value / total) * w;
    const r = el('rect', { x, y: 6, width: Math.max(0, pw - 2), height: 22, fill: p.color, class: 'stack-seg' });
    const t = el('title');
    t.textContent = `${p.label}: ${p.value.toLocaleString('en-US')} (${((p.value / total) * 100).toFixed(1)}%)`;
    r.appendChild(t);
    s.appendChild(r);
    x += pw;
  }
  return s;
}

/** Legend swatches matching a stackBar / chart palette. */
export function legend(items: { label: string; color: string; value?: string }[]): HTMLElement {
  const wrap = document.createElement('ul');
  wrap.className = 'legend';
  for (const it of items) {
    const li = document.createElement('li');
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = it.color;
    li.appendChild(sw);
    li.appendChild(document.createTextNode(it.label + (it.value ? ` — ${it.value}` : '')));
    wrap.appendChild(li);
  }
  return wrap;
}
