/**
 * Physics vocabulary + spoken-math patterns (PROJECT.md §5.5).
 * Used in the analyzer prompt and by the offline fallback, so both normalise speech the same way.
 */

/** Words the speech recogniser tends to mangle → what the student meant. */
export const TERM_FIXES: { pattern: RegExp; meant: string }[] = [
  { pattern: /\bresisters?\b/gi, meant: "resistors" },
  { pattern: /\bcon[\s-]cave\b/gi, meant: "concave" },
  { pattern: /\bcon[\s-]vex\b/gi, meant: "convex" },
  { pattern: /\bfocus length\b/gi, meant: "focal length" },
  { pattern: /\bmy[\s-]opia\b/gi, meant: "myopia" },
  { pattern: /\bhyper[\s-]metropia\b/gi, meant: "hypermetropia" },
  { pattern: /\bre[\s-]fraction\b/gi, meant: "refraction" },
  { pattern: /\bam[\s-]meter\b/gi, meant: "ammeter" },
  { pattern: /\bvolt[\s-]meter\b/gi, meant: "voltmeter" },
  { pattern: /\bgalvano[\s-]meter\b/gi, meant: "galvanometer" },
  { pattern: /\bkilo[\s-]?watt[\s-]hours?\b/gi, meant: "kilowatt-hour" },
  { pattern: /\bpoll\s?ark\b/gi, meant: "parallel" },
  { pattern: /\bpair[\s-]a[\s-]lel\b/gi, meant: "parallel" },
];

/** "<number> home(s)" is a mis-heard "ohm(s)", but only with a number in front. */
export const OHM_PATTERN =
  /\b(\d+(?:\.\d+)?|(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|hundred))\s+(homes?)\b/gi;

type OperatorSymbol = "=" | "+" | "-" | "*" | "/" | "^2" | "^3" | "^" | "sqrt";

/** Spoken operator words → symbol. Longest phrases first (matched on lower-case word lists). */
export const SPOKEN_OPERATORS: { words: string[]; symbol: OperatorSymbol }[] = [
  { words: ["is", "equal", "to"], symbol: "=" },
  { words: ["equal", "to"], symbol: "=" },
  { words: ["equals"], symbol: "=" },
  { words: ["equal"], symbol: "=" },
  { words: ["divided", "by"], symbol: "/" },
  { words: ["multiplied", "by"], symbol: "*" },
  { words: ["to", "the", "power", "of"], symbol: "^" },
  { words: ["raised", "to"], symbol: "^" },
  { words: ["square", "root", "of"], symbol: "sqrt" },
  { words: ["square", "root"], symbol: "sqrt" },
  { words: ["plus"], symbol: "+" },
  { words: ["minus"], symbol: "-" },
  { words: ["into"], symbol: "*" },
  { words: ["times"], symbol: "*" },
  { words: ["over"], symbol: "/" },
  { words: ["by"], symbol: "/" },
  { words: ["squared"], symbol: "^2" },
  { words: ["square"], symbol: "^2" },
  { words: ["cubed"], symbol: "^3" },
];

export const SPOKEN_FUNCTIONS: readonly string[] = ["log", "ln"];

/** Unit words are transparent inside an expression ("twelve volts by three ohms"). */
export const UNIT_WORDS = new Set([
  "ohm", "ohms", "home", "homes", "volt", "volts", "amp", "amps", "ampere", "amperes", "watt", "watts",
  "joule", "joules", "metre", "metres", "meter", "meters", "cm",
]);

/** Single-letter physics symbols that count as variables inside a spoken expression. */
export const SYMBOLS: Record<string, string> = {
  V: "potential difference (voltage)",
  I: "current",
  R: "resistance",
  P: "power",
  f: "focal length",
  u: "object distance",
  v: "image distance",
  m: "magnification / mass",
  n: "refractive index",
  t: "time",
  h: "height",
  q: "charge",
  W: "work / energy",
};

/** Well-known relations → the concept being used (keys are compact lower-case math.js strings). */
export const RELATIONS: { keys: string[]; meaning: string }[] = [
  { keys: ["v=i*r", "v=r*i", "i=v/r", "r=v/i"], meaning: "Ohm's law (V = IR)" },
  { keys: ["1/f=1/v-1/u"], meaning: "Lens formula (1/f = 1/v − 1/u)" },
  { keys: ["1/f=1/v+1/u", "1/f=1/u+1/v"], meaning: "Mirror formula (1/f = 1/v + 1/u)" },
  { keys: ["p=v*i", "p=i*v"], meaning: "Electric power (P = VI)" },
  { keys: ["p=i^2*r", "p=r*i^2"], meaning: "Power from current (P = I²R)" },
  { keys: ["p=v^2/r"], meaning: "Power from voltage (P = V²/R)" },
  { keys: ["h=i^2*r*t"], meaning: "Joule's heating law (H = I²Rt)" },
  { keys: ["m=v/u", "m=-v/u"], meaning: "Magnification (m = v/u)" },
  { keys: ["p=1/f"], meaning: "Power of a lens (P = 1/f)" },
  { keys: ["r=2*f", "f=r/2"], meaning: "Radius of curvature = 2f" },
  { keys: ["q=i*t"], meaning: "Charge (Q = It)" },
];

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
  twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

const DIGIT_WORD = /^(zero|one|two|three|four|five|six|seven|eight|nine)$/;

/** Parse "twenty five", "two hundred", "ten point five" starting at words[i]. Returns [value, nextIndex] or null. */
export function parseNumberWords(words: string[], i: number): [number, number] | null {
  const first = words[i];
  if (first === undefined || !(first in NUMBER_WORDS)) return null;
  let value = NUMBER_WORDS[first];
  let j = i + 1;
  const next = words[j];
  if (value >= 20 && next !== undefined && next in NUMBER_WORDS && NUMBER_WORDS[next] >= 1 && NUMBER_WORDS[next] < 10) {
    value += NUMBER_WORDS[next];
    j++;
  }
  if (words[j] === "hundred") {
    value *= 100;
    j++;
    const rest = parseNumberWords(words, j);
    if (rest && rest[0] < 100) {
      value += rest[0];
      j = rest[1];
    }
  }
  if (words[j] === "point" && words[j + 1] !== undefined && DIGIT_WORD.test(words[j + 1])) {
    let frac = "";
    j++;
    while (words[j] !== undefined && DIGIT_WORD.test(words[j])) {
      frac += NUMBER_WORDS[words[j]];
      j++;
    }
    value = Number(`${value}.${frac}`);
  }
  return [value, j];
}

/** Compact glossary injected into the analyzer prompt. */
export function vocabForPrompt(): string {
  return [
    "Mis-heard terms (heard → meant): resisters→resistors; con cave→concave; con vex→convex; focus length→focal length; N home(s)→N ohm(s) (Ω); poll ark→parallel; pair a lel→parallel.",
    'Spoken maths: "equals"→=, "plus"→+, "minus"→−, "into"/"times"→×, "by"/"over"/"divided by"→/, "squared"/"square"→²; "one by f"→1/f; "V equals I R"→V = IR; "log" is base 10 (log₁₀), "ln" is natural.',
    `Symbols: ${Object.entries(SYMBOLS).map(([k, v]) => `${k}=${v}`).join("; ")}.`,
  ].join("\n");
}
