/**
 * All arithmetic for spoken maths (PROJECT.md §5.5). The LLM proposes readings; this module computes them.
 * `log` is base 10 (shown as log₁₀), `ln` is natural.
 */
import { all, create, type MathNode } from "mathjs";

const math = create(all);
math.import(
  {
    log: (x: number) => Math.log10(x),
    ln: (x: number) => Math.log(x),
  },
  { override: true },
);

export interface Reading {
  latex: string;
  mathjs: string;
}

/** Evaluate an expression to a real number, or null if it fails, is non-real or non-finite. */
export function evaluateExpression(expr: string, scope: Record<string, number> = {}): number | null {
  try {
    const r: unknown = math.evaluate(expr, { ...scope });
    let n: number | null = null;
    if (typeof r === "number") n = r;
    else if (math.isBigNumber(r) || math.isFraction(r)) n = Number(r.valueOf());
    else if (math.isUnit(r)) n = r.toNumber(r.formatUnits());
    return n !== null && Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Free variables in an expression (symbols that are not math.js functions or constants). */
export function freeSymbols(expr: string): string[] {
  try {
    const node: MathNode = math.parse(expr);
    const names = node
      .filter((n) => math.isSymbolNode(n))
      .map((n) => (n as MathNode & { name: string }).name)
      .filter((name) => !(name in math));
    return [...new Set(names)];
  } catch {
    return [];
  }
}

export const RESULT_TOLERANCE = 0.02;

export function relativelyClose(a: number, b: number, tol: number): boolean {
  const scale = Math.max(Math.abs(a), Math.abs(b), 1e-12);
  return Math.abs(a - b) / scale <= tol;
}

export interface ReadingChoice {
  /** Value of each reading (null when it can't be evaluated). */
  values: (number | null)[];
  /** Auto-picked reading (closest within 2% of the spoken result), or null → ask "A or B?". */
  pickedIndex: number | null;
}

/** Evaluate every plausible reading and auto-pick the one matching what the student said. */
export function chooseReading(
  readings: Reading[],
  spokenResult?: number | null,
  scope: Record<string, number> = {},
  tol = RESULT_TOLERANCE,
): ReadingChoice {
  const values = readings.map((r) => evaluateExpression(r.mathjs, scope));
  if (readings.length === 1 && values[0] !== null && (spokenResult === null || spokenResult === undefined)) {
    return { values, pickedIndex: 0 };
  }
  if (spokenResult === null || spokenResult === undefined) return { values, pickedIndex: null };
  let best: number | null = null;
  values.forEach((v, i) => {
    if (v === null || !relativelyClose(v, spokenResult, tol)) return;
    if (best === null || Math.abs(v - spokenResult) < Math.abs((values[best] as number) - spokenResult)) best = i;
  });
  return { values, pickedIndex: best };
}

/** Deterministic sample points for variable expressions (avoid 0 and 1 to dodge degenerate equalities). */
const SAMPLES = [1.7, 2.9, 0.43, 5.3];

/**
 * Equivalence by evaluation: equal at the given scope and at sample points for any free variables.
 * So "3^2" ≡ "9", and "V/R" ≡ "V*R^-1".
 */
export function areEquivalent(a: string, b: string, scope: Record<string, number> = {}, tol = 1e-9): boolean {
  const vars = [...new Set([...freeSymbols(a), ...freeSymbols(b)])].filter((v) => !(v in scope));
  const trials = vars.length === 0 ? 1 : SAMPLES.length;
  for (let t = 0; t < trials; t++) {
    const s: Record<string, number> = { ...scope };
    vars.forEach((v, k) => (s[v] = SAMPLES[(t + k) % SAMPLES.length] + k * 0.37));
    const va = evaluateExpression(a, s);
    const vb = evaluateExpression(b, s);
    if (va === null || vb === null || !relativelyClose(va, vb, tol)) return false;
  }
  return true;
}

// ───────────── LaTeX (from MathLive edits) → math.js ─────────────

/** Read a `{…}` group (or a single token) starting at i. Returns [content, nextIndex]. */
function readGroup(s: string, i: number): [string, number] {
  while (s[i] === " ") i++;
  if (s[i] === "{") {
    let depth = 0;
    for (let j = i; j < s.length; j++) {
      if (s[j] === "{") depth++;
      else if (s[j] === "}" && --depth === 0) return [s.slice(i + 1, j), j + 1];
    }
    return [s.slice(i + 1), s.length];
  }
  if (s[i] === "\\") {
    const m = /^\\[a-zA-Z]+/.exec(s.slice(i));
    if (m) return [m[0], i + m[0].length];
  }
  const num = /^\d+(\.\d+)?/.exec(s.slice(i));
  if (num) return [num[0], i + num[0].length];
  return [s[i] ?? "", i + 1];
}

/** Read a function argument: a parenthesised group stays as is, otherwise the next token. */
function readArgument(s: string, i: number): [string, number] {
  while (s[i] === " ") i++;
  if (s[i] === "(") {
    let depth = 0;
    for (let j = i; j < s.length; j++) {
      if (s[j] === "(") depth++;
      else if (s[j] === ")" && --depth === 0) return [convert(s.slice(i + 1, j)), j + 1];
    }
  }
  const [g, next] = readGroup(s, i);
  return [convert(g), next];
}

const SIMPLE: Record<string, string> = {
  "\\cdot": "*", "\\times": "*", "\\div": "/", "\\pi": " pi ", "\\left": "", "\\right": "",
  "\\,": "", "\\;": "", "\\!": "", "\\ ": "", "\\Omega": "",
};

function convert(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    // A command ending in a letter must not run into another letter (\pi ≠ \pix).
    const simple = Object.keys(SIMPLE).find(
      (k) => rest.startsWith(k) && !(/[a-zA-Z]$/.test(k) && /^[a-zA-Z]/.test(rest.slice(k.length))),
    );
    if (rest.startsWith("\\frac") || rest.startsWith("\\dfrac")) {
      const [num, j] = readGroup(s, i + (rest.startsWith("\\dfrac") ? 6 : 5));
      const [den, k] = readGroup(s, j);
      out += `((${convert(num)})/(${convert(den)}))`;
      i = k;
    } else if (rest.startsWith("\\sqrt")) {
      let j = i + 5;
      let index: string | null = null;
      if (s[j] === "[") {
        const close = s.indexOf("]", j);
        index = convert(s.slice(j + 1, close));
        j = close + 1;
      }
      const [body, k] = readGroup(s, j);
      out += index ? `nthRoot(${convert(body)}, ${index})` : `sqrt(${convert(body)})`;
      i = k;
    } else if (rest.startsWith("\\log_")) {
      const [base, j] = readGroup(s, i + 5);
      const [arg, k] = readArgument(s, j);
      out += base.trim() === "10" ? ` log(${arg})` : ` (ln(${arg})/ln(${convert(base)}))`;
      i = k;
    } else if (rest.startsWith("\\log") || rest.startsWith("\\ln")) {
      const fn = rest.startsWith("\\log") ? "log" : "ln";
      const [arg, k] = readArgument(s, i + fn.length + 1);
      out += ` ${fn}(${arg})`;
      i = k;
    } else if (simple) {
      out += SIMPLE[simple];
      i += simple.length;
    } else if (s[i] === "^") {
      const [g, k] = readGroup(s, i + 1);
      out += `^(${convert(g)})`;
      i = k;
    } else if (s[i] === "_") {
      // Subscripts become part of the identifier: R_{1} → R1.
      const [g, k] = readGroup(s, i + 1);
      out += g.replace(/[^a-zA-Z0-9]/g, "");
      i = k;
    } else if (s[i] === "{") {
      const [g, k] = readGroup(s, i);
      out += `(${convert(g)})`;
      i = k;
    } else {
      out += s[i];
      i++;
    }
  }
  return out;
}

/** Convert simple LaTeX (fractions, roots, powers, log/ln, ·/×) to a math.js expression. */
export function latexToMathjs(latex: string): string {
  return convert(latex).replace(/\s+/g, " ").trim();
}
