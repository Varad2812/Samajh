import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as analyze } from "@/app/api/analyze-reasoning/route";
import { POST as generate } from "@/app/api/generate-question/route";
import { POST as worksheet } from "@/app/api/remedial-worksheet/route";
import { MISCONCEPTIONS } from "@/lib/data/misconceptions";
import { QUESTION_BY_ID } from "@/lib/data/questions";
import { analysisAISchema, questionAISchema, worksheetSchema } from "../schemas";
import { MODEL } from "../client";

const create = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

const reply = (obj: unknown) => ({ content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj) }] });
const call = (route: (r: Request) => Promise<Response>, body: unknown) =>
  route(new Request("http://test/api", { method: "POST", body: JSON.stringify(body) }));
/** `data` is left loosely typed on purpose: these tests probe many shapes (including invalid ones). */
type Loose = ReturnType<typeof JSON.parse>;
const json = async (res: Response) => (await res.json()) as { source: string; reason?: string; data: Loose };

const MC01 = MISCONCEPTIONS.find((m) => m.id === "MC01")!;
const RAW = "umm the first bulb uses up some current so the second is dimmer, I think, not sure";
const ANALYZE_BODY = {
  question: "Two identical bulbs in series: compared with the first, the second bulb is:",
  options: ["Dimmer", "Equally bright", "Brighter", "Off"],
  selectedIndex: 0,
  correctIndex: 1,
  conceptId: "C1",
  rawTranscript: RAW,
  candidateMisconceptions: [MC01],
};
const MODEL_ANALYSIS = {
  cleanedReasoning: "I think the first bulb uses up some current, so the second is dimmer.",
  claims: ["The first bulb uses up some current"],
  finalAnswerStated: "A",
  selfCorrections: [],
  hedges: ["I think", "not sure"],
  fillers: ["umm"],
  confidence: 0.5,
  verdict: "incorrect",
  misconception: { id: "MC01", novelDescription: null, evidenceQuote: "the first bulb uses up some current" },
  feedback: "Good thinking, but current is the same everywhere in a series loop. Energy, not charge, is transferred.",
  equations: [],
  normalizedTerms: [],
  calculationSlip: false,
};

const GEN_BODY = { conceptId: "C4", conceptName: "Ohm's law", targetDifficulty: 2, avoidStems: [] as string[] };
const MODEL_QUESTION = {
  stem: "A 12 V battery is connected across a 4 Ω resistor. What current flows through it?",
  options: ["3 A", "48 A", "0.33 A", "8 A"],
  correctIndex: 0,
  explanation: "By Ohm's law I = V/R = 12/4 = 3 A. Multiplying (48 A) is the common slip.",
  check: { mathjs: "12/4", answer: 3 },
};
const WS_BODY = { conceptId: "C1", misconceptionIds: ["MC01"], classStats: { classSize: 30, affectedPct: { MC01: 40 }, weakCount: 12 } };
const MODEL_WORKSHEET = {
  title: "Series current",
  intro: "Let's fix a common idea about current in series circuits.",
  sections: [{ heading: "Spot the error", items: [{ q: "Is current used up by a bulb?", answer: "No: the same current flows through every part of a series loop." }] }],
  teacherNotes: "Many students picture current as a fuel. Use a water-loop analogy and have them predict ammeter readings.",
};

beforeEach(() => {
  create.mockReset();
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  // Without Claude the routes would use Gemini; these tests cover the offline path.
  vi.stubEnv("GEMINI_API_KEY", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("without an API key → offline fallback, no network call", () => {
  it("analyze-reasoning", async () => {
    const body = await json(await call(analyze, ANALYZE_BODY));
    expect(body).toMatchObject({ source: "offline", reason: "no-key" });
    expect(body.data.misconception.id).toBe("MC01");
    expect(body.data.verdict).toBe("incorrect");
    expect(RAW).toContain(body.data.misconception.evidenceQuote);
    expect(create).not.toHaveBeenCalled();
  });
  it("generate-question: nearest seeded question for the concept", async () => {
    const body = await json(await call(generate, { ...GEN_BODY, conceptId: "C1", conceptName: "Current", misconceptionId: "MC01" }));
    expect(body).toMatchObject({ source: "offline", reason: "no-key" });
    expect(body.data.conceptId).toBe("C1");
    expect(Object.values(QUESTION_BY_ID[body.data.id].distractorMisconceptions ?? {})).toContain("MC01");
    expect(create).not.toHaveBeenCalled();
  });
  it("generate-question: skips avoided stems", async () => {
    const first = await json(await call(generate, GEN_BODY));
    const second = await json(await call(generate, { ...GEN_BODY, avoidStems: [first.data.stem] }));
    expect(second.data.stem).not.toBe(first.data.stem);
    expect(second.data.conceptId).toBe("C4");
  });
  it("remedial-worksheet: assembled from seeded questions + correctIdeas", async () => {
    const body = await json(await call(worksheet, WS_BODY));
    expect(body).toMatchObject({ source: "offline", reason: "no-key" });
    expect(worksheetSchema.safeParse(body.data).success).toBe(true);
    expect(JSON.stringify(body.data)).toContain(MC01.correctIdea);
    expect(body.data.teacherNotes).toMatch(/40%/);
    expect(create).not.toHaveBeenCalled();
  });
  it("an empty explanation never calls the model, even with a key", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    const body = await json(await call(analyze, { ...ANALYZE_BODY, rawTranscript: "" }));
    expect(body).toMatchObject({ source: "offline", reason: "no-reasoning" });
    expect(body.data.confidence).toBe(0.6);
    expect(create).not.toHaveBeenCalled();
  });
});

describe("with an API key", () => {
  beforeEach(() => vi.stubEnv("ANTHROPIC_API_KEY", "sk-test"));

  it("analyze-reasoning: uses claude-haiku-5-5 and returns the validated, post-processed result", async () => {
    create.mockResolvedValue(reply(MODEL_ANALYSIS));
    const body = await json(await call(analyze, ANALYZE_BODY));
    expect(body.source).toBe("ai");
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].model).toBe(MODEL);
    expect(MODEL).toBe("claude-haiku-5-5");
    expect(body.data.misconception).toMatchObject({ id: "MC01", evidenceQuote: "the first bulb uses up some current" });
    // 0.6·AI + 0.4·baseline (§5.1)
    expect(body.data.confidence).toBeCloseTo(0.6 * 0.5 + 0.4 * body.data.confidenceDetail.baseline, 6);
  });

  it("analyze-reasoning: tolerates ```json fences", async () => {
    create.mockResolvedValue(reply("```json\n" + JSON.stringify(MODEL_ANALYSIS) + "\n```"));
    expect((await json(await call(analyze, ANALYZE_BODY))).source).toBe("ai");
  });

  it("analyze-reasoning: code overrides the model on verdict, unknown ids and non-verbatim quotes", async () => {
    create.mockResolvedValue(
      reply({
        ...MODEL_ANALYSIS,
        verdict: "correct_sound", // but the student tapped the wrong option
        misconception: { id: "MC99", novelDescription: "thinks bulbs eat electrons", evidenceQuote: "Bulbs Eat Electrons" },
      }),
    );
    const body = await json(await call(analyze, ANALYZE_BODY));
    expect(body.data.verdict).toBe("incorrect");
    expect(body.data.misconception).toBeNull(); // id not a candidate and the quote is not in the raw transcript
  });

  it("analyze-reasoning: every reading is evaluated with math.js, never by the model", async () => {
    const raw = "log 6 plus one by three log three plus three squared, so about 10.5";
    create.mockResolvedValue(
      reply({
        ...MODEL_ANALYSIS,
        misconception: null,
        verdict: "incorrect",
        equations: [
          {
            spoken: "log 6 plus one by three log three plus three squared",
            latex: "\\log 6+\\frac{1}{3\\log 3}+3^{2}",
            mathjs: "log(6) + 1/(3*log(3)) + 3^2",
            meaning: "Evaluating a logarithmic expression",
            alternatives: [{ latex: "\\log 6+\\frac{1}{3}\\log 3+3^{2}", mathjs: "log(6) + (1/3)*log(3) + 3^2" }],
            spokenResult: 10.5,
          },
        ],
      }),
    );
    const { data } = await json(await call(analyze, { ...ANALYZE_BODY, rawTranscript: raw }));
    const [eq] = data.equations;
    expect(eq.values[0]).toBeCloseTo(10.477, 3);
    expect(eq.values[1]).toBeCloseTo(9.937, 3);
    expect(eq.pickedIndex).toBe(0); // 10.477 is within 2% of the spoken 10.5
    expect(eq.needsChoice).toBe(false);
  });

  it("analyze-reasoning: with no spoken result an ambiguous equation asks 'A or B?'", async () => {
    create.mockResolvedValue(
      reply({
        ...MODEL_ANALYSIS,
        misconception: null,
        equations: [
          { spoken: "x", latex: "", mathjs: "log(6) + 1/(3*log(3))", alternatives: [{ latex: "", mathjs: "log(6) + (1/3)*log(3)" }], spokenResult: null },
        ],
      }),
    );
    const { data } = await json(await call(analyze, ANALYZE_BODY));
    expect(data.equations[0]).toMatchObject({ pickedIndex: null, needsChoice: true });
    expect(data.equations[0].latex).toContain("\\frac"); // rebuilt from the math.js expression
  });

  it("retries once: a first invalid reply then a good one still returns AI output", async () => {
    create.mockResolvedValueOnce(reply("not json at all")).mockResolvedValueOnce(reply(MODEL_ANALYSIS));
    const body = await json(await call(analyze, ANALYZE_BODY));
    expect(body.source).toBe("ai");
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("falls back after the retry also fails (schema mismatch)", async () => {
    create.mockResolvedValue(reply({ ...MODEL_ANALYSIS, verdict: "maybe" }));
    const body = await json(await call(analyze, ANALYZE_BODY));
    expect(body).toMatchObject({ source: "offline", reason: "schema-mismatch" });
    expect(create).toHaveBeenCalledTimes(2);
    expect(body.data.misconception.id).toBe("MC01");
  });

  it("falls back when the API throws", async () => {
    create.mockRejectedValue(new Error("connection refused"));
    const body = await json(await call(analyze, ANALYZE_BODY));
    expect(body.source).toBe("offline");
    expect(body.reason).toMatch(/^api-error/);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("times out after 8 s per attempt, retries once, then falls back", async () => {
    vi.useFakeTimers();
    create.mockImplementation(
      (_params: unknown, opts: { signal: AbortSignal }) =>
        new Promise((_, reject) => opts.signal.addEventListener("abort", () => reject(new Error("aborted")))),
    );
    const pending = call(analyze, ANALYZE_BODY);
    await vi.advanceTimersByTimeAsync(7999);
    expect(create).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); // 8 s → first attempt aborted
    await vi.advanceTimersByTimeAsync(8000); // retry aborted
    const body = await json(await pending);
    expect(body).toMatchObject({ source: "offline", reason: "timeout" });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("generate-question: returns an AI question after the numeric self-check passes", async () => {
    create.mockResolvedValue(reply(MODEL_QUESTION));
    const body = await json(await call(generate, GEN_BODY));
    expect(body.source).toBe("ai");
    expect(body.data).toMatchObject({ source: "ai", conceptId: "C4", difficulty: 2, elo: 1000, correctIndex: 0 });
    expect(body.data.id).toMatch(/^AI-C4-/);
    expect(questionAISchema.safeParse(MODEL_QUESTION).success).toBe(true);
  });

  it("generate-question: rejects a wrong numeric self-check, a repeated stem and bad distractor maps", async () => {
    create.mockResolvedValue(reply({ ...MODEL_QUESTION, check: { mathjs: "12/4", answer: 4 } }));
    expect(await json(await call(generate, GEN_BODY))).toMatchObject({ source: "offline", reason: "numeric-self-check-failed" });

    create.mockResolvedValue(reply(MODEL_QUESTION));
    expect(await json(await call(generate, { ...GEN_BODY, avoidStems: [MODEL_QUESTION.stem] }))).toMatchObject({ source: "offline", reason: "repeats-avoided-stem" });

    create.mockResolvedValue(reply({ ...MODEL_QUESTION, distractorMisconceptions: { "1": "MC404" } }));
    expect(await json(await call(generate, GEN_BODY))).toMatchObject({ source: "offline", reason: "bad-distractor-map" });
  });

  it("generate-question: the correct option must agree with the self-check", async () => {
    create.mockResolvedValue(reply({ ...MODEL_QUESTION, options: ["5 A", "48 A", "0.33 A", "8 A"] }));
    expect(await json(await call(generate, GEN_BODY))).toMatchObject({ source: "offline", reason: "correct-option-disagrees-with-check" });
  });

  it("remedial-worksheet: returns the validated worksheet", async () => {
    create.mockResolvedValue(reply(MODEL_WORKSHEET));
    const body = await json(await call(worksheet, WS_BODY));
    expect(body).toMatchObject({ source: "ai", data: MODEL_WORKSHEET });
  });

  it("remedial-worksheet: an empty section list is invalid → offline", async () => {
    create.mockResolvedValue(reply({ ...MODEL_WORKSHEET, sections: [] }));
    expect(await json(await call(worksheet, WS_BODY))).toMatchObject({ source: "offline", reason: "schema-mismatch" });
  });
});

describe("request validation", () => {
  it.each([
    ["analyze-reasoning", analyze, { ...ANALYZE_BODY, selectedIndex: 7 }],
    ["generate-question", generate, { ...GEN_BODY, targetDifficulty: 9 }],
    ["remedial-worksheet", worksheet, { misconceptionIds: [] }],
  ])("%s answers 400 to a bad body", async (_name, route, body) => {
    const res = await call(route, body);
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
  it("answers 400 to non-JSON", async () => {
    const res = await analyze(new Request("http://test/api", { method: "POST", body: "{nope" }));
    expect(res.status).toBe(400);
  });
  it("the analysis schema accepts the documented shape", () => {
    expect(analysisAISchema.safeParse(MODEL_ANALYSIS).success).toBe(true);
  });
});
