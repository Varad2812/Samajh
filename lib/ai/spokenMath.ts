/**
 * Speech-to-math parser for the offline analyzer (PROJECT.md §5.5).
 * "V equals I R" → V = IR, "twelve by three" → 12/3, and an ambiguous "one by three log three" yields BOTH readings,
 * never a silent guess. All values are computed later with math.js, never here.
 */
import { isParsable, mathjsToLatex } from "@/lib/engine/mathEval";
import {
  OHM_PATTERN,
  parseNumberWords,
  RELATIONS,
  SPOKEN_FUNCTIONS,
  SPOKEN_OPERATORS,
  TERM_FIXES,
  UNIT_WORDS,
} from "./physicsVocab";
import type { NormalizedTerm, Reading } from "./schemas";

export interface SpokenEquation {
  spoken: string;
  latex: string;
  mathjs: string;
  meaning: string;
  alternatives: Reading[];
  /** A result the student said right after the expression ("so about 10.5"). */
  spokenResult: number | null;
}

type Item =
  | { kind: "num"; value: number; start: number; end: number }
  | { kind: "var"; name: string; start: number; end: number }
  | { kind: "op"; sym: string; start: number; end: number }
  | { kind: "fn"; name: string; start: number; end: number }
  | { kind: "unit"; start: number; end: number }
  | { kind: "word"; text: string; start: number; end: number }
  | { kind: "break"; start: number; end: number };

interface Tok {
  text: string;
  lower: string;
  start: number;
  end: number;
  letters: boolean;
}

const VARIABLE_LETTERS = new Set(["V", "I", "R", "P", "f", "u", "v", "m", "n", "t", "h", "q", "W"]);
const ALWAYS_UPPER = new Set(["i", "r", "p", "w", "q"]);
const RESULT_LEAD = new Set(["so", "about", "around", "approximately", "roughly", "is", "gives", "get", "got", "answer", "comes", "we", "i", "to"]);
const SYMBOL_OPS: Record<string, string> = { "=": "=", "+": "+", "-": "-", "*": "*", "×": "*", "/": "/", "÷": "/", "^": "^", "²": "^2", "³": "^3" };

function tokenize(raw: string): Tok[] {
  const out: Tok[] = [];
  for (const m of raw.matchAll(/\d+(?:\.\d+)?|[A-Za-z][A-Za-z']*|\S/g)) {
    const text = m[0];
    out.push({ text, lower: text.toLowerCase(), start: m.index, end: m.index + text.length, letters: /^[A-Za-z]/.test(text) });
  }
  return out;
}

function classify(toks: Tok[]): Item[] {
  const lowers = toks.map((t) => t.lower);
  const items: Item[] = [];
  const prevIsOperand = () => {
    const p = items[items.length - 1];
    return p !== undefined && (p.kind === "num" || p.kind === "var" || (p.kind === "op" && (p.sym === "^2" || p.sym === "^3")) || p.kind === "unit");
  };

  for (let i = 0; i < toks.length; ) {
    const t = toks[i];
    if (/^\d/.test(t.text)) {
      items.push({ kind: "num", value: Number(t.text), start: t.start, end: t.end });
      i++;
      continue;
    }
    if (!t.letters) {
      const sym = SYMBOL_OPS[t.text];
      items.push(sym ? { kind: "op", sym, start: t.start, end: t.end } : { kind: "break", start: t.start, end: t.end });
      i++;
      continue;
    }
    // Multi-word operator phrases, longest first.
    const phrase = SPOKEN_OPERATORS.find(
      (o) => o.words.every((w, k) => lowers[i + k] === w) && (o.words[0] !== "square" || o.words.length > 1 || prevIsOperand()),
    );
    if (phrase) {
      const last = toks[i + phrase.words.length - 1];
      items.push(
        phrase.symbol === "sqrt"
          ? { kind: "fn", name: "sqrt", start: t.start, end: last.end }
          : { kind: "op", sym: phrase.symbol, start: t.start, end: last.end },
      );
      i += phrase.words.length;
      continue;
    }
    if (SPOKEN_FUNCTIONS.includes(t.lower)) {
      items.push({ kind: "fn", name: t.lower, start: t.start, end: t.end });
      i++;
      continue;
    }
    const num = parseNumberWords(lowers, i);
    if (num) {
      items.push({ kind: "num", value: num[0], start: t.start, end: toks[num[1] - 1].end });
      i = num[1];
      continue;
    }
    if (UNIT_WORDS.has(t.lower)) {
      items.push({ kind: "unit", start: t.start, end: t.end });
      i++;
      continue;
    }
    if (t.text.length === 1 && VARIABLE_LETTERS.has(ALWAYS_UPPER.has(t.lower) ? t.text.toUpperCase() : t.text)) {
      items.push({ kind: "var", name: ALWAYS_UPPER.has(t.lower) ? t.text.toUpperCase() : t.text, start: t.start, end: t.end });
      i++;
      continue;
    }
    items.push({ kind: "word", text: t.lower, start: t.start, end: t.end });
    i++;
  }
  return items;
}

/** Maximal runs of math-like items. */
function runsOf(items: Item[]): Item[][] {
  const runs: Item[][] = [];
  let cur: Item[] = [];
  for (const it of items) {
    if (it.kind === "word" || it.kind === "break") {
      if (cur.length) runs.push(cur);
      cur = [];
    } else cur.push(it);
  }
  if (cur.length) runs.push(cur);
  return runs;
}

type Piece = { t: "operand"; text: string; plain: boolean } | { t: "op"; sym: string } | { t: "imp" };

/** Items → operands (with powers and functions folded in) and binary operators, with implicit products marked. */
function toPieces(run: Item[]): Piece[] | null {
  const body = run.filter((r) => r.kind !== "unit");
  // 1) postfix powers bind to the nearest operand on their left.
  const a: (Piece | { t: "fn"; name: string })[] = [];
  for (const it of body) {
    if (it.kind === "num") a.push({ t: "operand", text: String(it.value), plain: true });
    else if (it.kind === "var") a.push({ t: "operand", text: it.name, plain: true });
    else if (it.kind === "fn") a.push({ t: "fn", name: it.name });
    else if (it.kind === "op") {
      const prev = a[a.length - 1];
      if ((it.sym === "^2" || it.sym === "^3") && prev?.t === "operand") {
        prev.text = `${prev.plain ? prev.text : `(${prev.text})`}${it.sym}`;
        prev.plain = false;
      }
      else if (it.sym === "^2" || it.sym === "^3") return null;
      else a.push({ t: "op", sym: it.sym });
    }
  }
  // 2) binary "to the power of": operand ^ operand.
  for (let i = 1; i < a.length - 1; i++) {
    const [l, o, r] = [a[i - 1], a[i], a[i + 1]];
    if (o.t === "op" && o.sym === "^" && l.t === "operand" && r.t === "operand") {
      a.splice(i - 1, 3, { t: "operand", text: `${l.plain ? l.text : `(${l.text})`}^${r.plain ? r.text : `(${r.text})`}`, plain: false });
      i--;
    }
  }
  // 3) functions take the operand that follows them.
  const b: Piece[] = [];
  for (let i = 0; i < a.length; i++) {
    const p = a[i];
    if (p.t === "fn") {
      const arg = a[i + 1];
      if (arg?.t !== "operand") continue; // a dangling "log" is dropped
      b.push({ t: "operand", text: `${p.name}(${arg.text})`, plain: false });
      i++;
    } else b.push(p as Piece);
  }
  // 4) unary minus, then implicit multiplication between adjacent operands.
  const c: Piece[] = [];
  for (let i = 0; i < b.length; i++) {
    const p = b[i];
    const prev = c[c.length - 1];
    if (p.t === "op" && p.sym === "-" && (prev === undefined || prev.t === "op") && b[i + 1]?.t === "operand") {
      const nxt = b[i + 1] as Extract<Piece, { t: "operand" }>;
      c.push({ t: "operand", text: `-${nxt.plain ? nxt.text : `(${nxt.text})`}`, plain: false });
      i++;
      continue;
    }
    if (p.t === "operand" && prev?.t === "operand") c.push({ t: "imp" });
    c.push(p);
  }
  // 5) trim stray operators at the edges, then require strict operand/operator alternation.
  while (c.length && c[0].t === "op") c.shift();
  while (c.length && c[c.length - 1].t === "op") c.pop();
  for (let i = 0; i < c.length; i++) {
    const isOperand = c[i].t === "operand";
    if (isOperand !== (i % 2 === 0)) return null;
  }
  return c.length >= 3 ? c : null;
}

/** All readings of a run: every "a / b c" is ambiguous between a/(b·c) and (a/b)·c. */
function readingsOf(pieces: Piece[]): string[] {
  const slashes: number[] = [];
  pieces.forEach((p, i) => {
    if (p.t === "op" && p.sym === "/" && pieces[i + 2]?.t === "imp") slashes.push(i);
  });
  const toggled = slashes.slice(0, 2);
  const variants: string[] = [];
  for (let mask = 0; mask < 1 << toggled.length; mask++) {
    // mask bit set = tight reading for that slash; bit clear (first variant) = wide.
    const wide = new Set(toggled.filter((_, k) => !(mask & (1 << k))));
    let out = "";
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (p.t === "operand") out += p.text;
      else if (p.t === "imp") out += "*";
      else if (p.t === "op" && p.sym === "/" && wide.has(i)) {
        // Group the denominator with every implicitly multiplied factor after it.
        let j = i + 1;
        const parts: string[] = [(pieces[j] as Extract<Piece, { t: "operand" }>).text];
        while (pieces[j + 1]?.t === "imp" && pieces[j + 2]?.t === "operand") {
          parts.push((pieces[j + 2] as Extract<Piece, { t: "operand" }>).text);
          j += 2;
        }
        out += `/(${parts.join("*")})`;
        i = j;
      } else if (p.t === "op") out += p.sym;
    }
    variants.push(out.replace(/([+\-=*/])/g, " $1 ").replace(/\s+/g, " ").trim());
  }
  return [...new Set(variants)];
}

const compact = (expr: string) => expr.toLowerCase().replace(/\s+/g, "");

function meaningOf(readings: string[]): string {
  for (const r of readings) {
    const key = compact(r);
    const hit = RELATIONS.find((rel) => rel.keys.includes(key));
    if (hit) return hit.meaning;
  }
  return readings[0].includes("=") ? "Equation stated by the student" : "Calculation stated by the student";
}

function spokenResultAfter(items: Item[], runEnd: Item): number | null {
  const idx = items.indexOf(runEnd);
  for (let j = idx + 1, seen = 0; j < items.length && seen < 5; j++, seen++) {
    const it = items[j];
    if (it.kind === "num") return it.value;
    if (it.kind === "break" || it.kind === "unit") continue;
    if (it.kind === "word" && RESULT_LEAD.has(it.text)) continue;
    return null;
  }
  return null;
}

/** Every spoken equation / calculation in a raw transcript. */
export function parseSpokenMath(raw: string): SpokenEquation[] {
  const items = classify(tokenize(raw));
  const found: SpokenEquation[] = [];
  for (const run of runsOf(items)) {
    const pieces = toPieces(run);
    if (!pieces) continue;
    const hasEquals = pieces.some((p) => p.t === "op" && p.sym === "=");
    const hasVarOrFn = run.some((r) => r.kind === "var" || r.kind === "fn");
    const nums = run.filter((r) => r.kind === "num").length;
    if (!hasEquals && !hasVarOrFn && nums < 2) continue;

    const readings = readingsOf(pieces).filter(isParsable);
    if (!readings.length) continue;
    const toReading = (mathjs: string): Reading => ({ mathjs, latex: mathjsToLatex(mathjs) });
    const [primary, ...rest] = readings.map(toReading);
    const first = run[0];
    const last = run[run.length - 1];
    found.push({
      spoken: raw.slice(first.start, last.end),
      latex: primary.latex,
      mathjs: primary.mathjs,
      meaning: meaningOf(readings),
      alternatives: rest,
      spokenResult: spokenResultAfter(items, last),
    });
  }
  return found;
}

const plainMath = (mathjs: string) => mathjs.replace(/([A-Za-z])\s*\*\s*(?=[A-Za-z])/g, "$1").replace(/\s*\*\s*/g, " × ");

/** `normalizedTerms` for the offline analyzer: mis-heard words, "N home" → ohms, and the spoken equations. */
export function normalizeTerms(raw: string, equations: SpokenEquation[]): NormalizedTerm[] {
  const out: NormalizedTerm[] = [];
  const seen = new Set<string>();
  const add = (heard: string, meant: string) => {
    const k = heard.toLowerCase();
    if (k === meant.toLowerCase() || seen.has(k)) return;
    seen.add(k);
    out.push({ heard, meant });
  };
  for (const { pattern, meant } of TERM_FIXES) for (const m of raw.matchAll(new RegExp(pattern.source, pattern.flags))) add(m[0], meant);
  for (const m of raw.matchAll(new RegExp(OHM_PATTERN.source, OHM_PATTERN.flags))) add(m[2], /^(1|one)$/i.test(m[1]) ? "ohm (Ω)" : "ohms (Ω)");
  for (const eq of equations) add(eq.spoken, plainMath(eq.mathjs));
  return out;
}
