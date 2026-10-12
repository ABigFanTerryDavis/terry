import { fontGlyphs } from './generated/glyphs';

/**
 * sys_font_std[] is a table of 256 U64 values, eight bytes each.
 * Byte 0 is the BOTTOM row; within a byte the MSB is the leftmost pixel.
 * TempleOS draws an 80x30 grid of 8x16 cells at 640x480, so glyphs are
 * stretched 2x vertically on screen.
 */
export const GLYPH_W = 8;
export const GLYPH_H = 8;

export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  code: number,
  x: number,
  y: number,
  scale: number,
): void {
  const g = fontGlyphs[code & 0xff];
  if (!g) return;
  for (let r = 0; r < GLYPH_H; r++) {
    const byte = g[r]!;
    if (!byte) continue;
    // r = 0 is the bottom row, so flip when writing top-down
    const rowY = y + (GLYPH_H - 1 - r) * scale * 2;
    for (let b = 0; b < GLYPH_W; b++) {
      if ((byte >> (GLYPH_W - 1 - b)) & 1) {
        ctx.fillRect(x + b * scale, rowY, scale, scale * 2);
      }
    }
  }
}

export function textWidth(text: string, scale: number): number {
  return text.length * GLYPH_W * scale;
}

/**
 * Render a line of text in Terry's own font at `scale` pixels per glyph
 * column. Returns a canvas sized to fit.
 */
export function renderText(
  text: string,
  opts: { scale?: number; color?: string; pad?: number; background?: string } = {},
): HTMLCanvasElement {
  const scale = opts.scale ?? 3;
  const pad = opts.pad ?? scale * 2;
  const w = Math.ceil(textWidth(text, scale)) + pad * 2;
  const h = GLYPH_H * scale * 2 + pad * 2;

  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.scale(dpr, dpr);

  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.fillStyle = opts.color ?? '#FF5555';

  let x = pad;
  for (const ch of text) {
    drawGlyph(ctx, ch.charCodeAt(0), x, pad, scale);
    x += GLYPH_W * scale;
  }
  return canvas;
}

/** Mount a rendered line of text into a container element. */
export function mountText(
  host: HTMLElement,
  text: string,
  opts: { scale?: number; color?: string } = {},
): void {
  host.replaceChildren(renderText(text, opts));
}
