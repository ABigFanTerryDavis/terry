/**
 * A small tokenizer for HolyC, which is C/C++ with some local colour.
 *
 * Hand-rolled rather than pulled from a highlighter library: the grammar is
 * small, and it keeps the whole explorer dependency-free.
 */
import { escapeHtml } from './highlight-html';

const KEYWORDS = new Set([
  'public', 'class', 'struct', 'union', 'enum', 'extern', 'static', 'reg',
  'if', 'else', 'while', 'for', 'do', 'switch', 'case', 'default', 'break',
  'continue', 'return', 'goto', 'try', 'catch', 'throw', 'import', 'no_caller',
  'no_pop', 'argpop', 'lastclass', 'offsetof', 'sizeof', 'typeof',
]);

// Fixed-width integer and float types used throughout TempleOS.
const TYPES = new Set(['U0', 'U8', 'U16', 'U32', 'U64', 'I0', 'I8', 'I16', 'I32', 'I64', 'F64', 'Bool', 'CStr', 'CDoc']);

// Order matters: the first alternative that matches at a position wins.
const TOKEN = new RegExp(
  [
    // line comment
    '(\\/\\/[^\\n]*)',
    // block comment
    '(/\\*[\\s\\S]*?(?:\\*\\/|$))',
    // DolDoc / HolyC macro, e.g. $FG,1$ or $LINK,"::/Doc/Credits.DD"$
    '(\\$[^$]*\\$)',
    // double-quoted string
    '("(?:[^"\\\\\\n]|\\\\.)*")',
    // backtick string (HolyC identifier with dots, and #defines use these)
    '(`[^`]*`)',
    // preprocessor directive
    '(#[a-zA-Z_][a-zA-Z0-9_]*)',
    // number
    '(\\b0[xX][0-9a-fA-F]+\\b|\\b\\d+(?:\\.\\d+)?\\b)',
    // identifier
    '([A-Za-z_][A-Za-z0-9_]*)',
  ].join('|'),
  'g',
);

/** Returns HTML with each token wrapped in a span. Input is escaped. */
export function highlightHolyC(src: string): string {
  let out = '';
  let last = 0;
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = TOKEN.exec(src)) !== null) {
    out += escapeHtml(src.slice(last, m.index));

    const [whole, line, block, macro, dq, bq, directive, num, ident] = m;
    let cls = '';
    if (line != null) cls = 'c-com';
    else if (block != null) cls = 'c-com';
    else if (macro != null) cls = 'c-macro';
    else if (dq != null) cls = 'c-str';
    else if (bq != null) cls = 'c-str';
    else if (directive != null) cls = 'c-dir';
    else if (num != null) cls = 'c-num';
    else if (ident != null) {
      if (TYPES.has(ident)) cls = 'c-type';
      else if (KEYWORDS.has(ident)) cls = 'c-kw';
      // a capitalised identifier directly followed by '(' reads as a call
      else if (src[TOKEN.lastIndex] === '(') cls = 'c-fn';
    }

    out += cls ? `<span class="${cls}">${escapeHtml(whole)}</span>` : escapeHtml(whole);
    last = m.index + whole.length;
  }

  out += escapeHtml(src.slice(last));
  return out;
}
