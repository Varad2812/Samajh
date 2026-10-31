# PROJECT.md — Samajh: Adaptive Exam-Prep Tutor with a Learner Model

Hackathon: Product Space × Wispr Flow. Track: **02 Adaptive exam-prep tutor with a learner model**.
Syllabus: **CBSE Class 10 Physics** (Light, Human Eye, Electricity, Magnetic Effects).

## 1. The pitch
Generic AI tutors grade the final answer. Samajh grades **the reasoning**. After every question the student *thinks out loud* via Wispr Flow. We:
1. clean the messy speech into structured reasoning,
2. read **hesitation and self-corrections as a confidence signal**,
3. fingerprint **misconceptions** even when the final answer is right,
4. update a **Bayesian learner model** per concept and trace weak spots back through **prerequisites**,
5. pick the next question at the right difficulty (**Elo**) and schedule reviews (**SM-2**),
6. show it all as a living 3D **Knowledge Galaxy**, plus a **teacher "Class X-ray"** dashboard.

## 2. Hackathon requirements → features
| Requirement | Feature | Section |
|---|---|---|
| Voice input via Wispr Flow, handles fillers/self-corrections | Reasoning capture + Transcript Diff + confidence | §5.1, §6.1 |
| Diagnostic test | 12-question adaptive diagnostic | §4.1 |
| Concept graph (one syllabus) | 34 concepts, prerequisite DAG | §3.1 |
| Learner model, update per answer | BKT weighted by confidence + prerequisite propagation | §5.2 |
| Targeted question generation + difficulty calibration | Selector + Elo + AI generator | §5.3, §6.2 |
| Misconception detection from reasoning | Misconception library + AI classifier | §3.2, §6.1 |
| Spaced repetition | SM-2 per concept + virtual clock | §5.4 |
| Teacher dashboard with class-wide gaps | Class X-ray | §4.5 |

## 3. Seed data (`lib/data/`)

### 3.1 Concept graph — `concepts.ts`
```ts
type Chapter = "light" | "eye" | "electricity" | "magnetism";
interface Concept { id: string; name: string; chapter: Chapter; prereqs: string[]; weight: 1|2|3 /* exam importance → node size */; summary: string; }
```
| ID | Name | Prereqs | W |
|---|---|---|---|
| L1 | Reflection & laws of reflection | — | 2 |
| L2 | Image in a plane mirror | L1 | 1 |
| L3 | Spherical mirror terms (pole, focus, R = 2f) | L1 | 2 |
| L4 | Ray diagrams: concave mirror | L3 | 3 |
| L5 | Ray diagrams: convex mirror | L3 | 2 |
| L6 | Mirror formula & magnification | L4, L5 | 3 |
| L7 | Refraction & laws (Snell's law) | L1 | 3 |
| L8 | Refractive index | L7 | 2 |
| L9 | Spherical lens terms | L7 | 2 |
| L10 | Ray diagrams: convex lens | L9 | 3 |
| L11 | Ray diagrams: concave lens | L9 | 2 |
| L12 | Lens formula & magnification | L10, L11 | 3 |
| L13 | Power of a lens | L12 | 2 |
| E1 | Structure of the human eye | L10 | 2 |
| E2 | Power of accommodation | E1 | 1 |
| E3 | Defects of vision & correction | E2, L13 | 3 |
| E4 | Refraction through a prism | L7 | 2 |
| E5 | Dispersion of white light | E4 | 2 |
| E6 | Atmospheric refraction | L8 | 2 |
| E7 | Scattering of light (Tyndall, blue sky, red sunset) | E5 | 2 |
| C1 | Electric charge & current | — | 2 |
| C2 | Potential difference | C1 | 2 |
| C3 | Circuit diagrams & symbols | C1 | 1 |
| C4 | Ohm's law | C2, C3 | 3 |
| C5 | Factors affecting resistance, resistivity | C4 | 3 |
| C6 | Resistors in series | C4 | 3 |
| C7 | Resistors in parallel | C4, C6 | 3 |
| C8 | Heating effect (Joule's law) | C4 | 2 |
| C9 | Electric power & energy (kWh) | C2, C8 | 3 |
| M1 | Magnetic field & field lines | — | 2 |
| M2 | Field of a straight conductor (RH thumb rule) | M1, C1 | 2 |
| M3 | Field of a circular loop & solenoid | M2 | 2 |
| M4 | Force on a conductor (Fleming's left-hand rule) | M1, M3 | 3 |
| M5 | Domestic electric circuits (earthing, fuse, overload) | C7, C8, C9 | 2 |

### 3.2 Misconception library — `misconceptions.ts`
```ts
interface Misconception { id: string; conceptId: string; label: string; wrongBelief: string; correctIdea: string; cues: string[] /* phrases that hint at it */; }
```
| ID | Concept | Wrong belief | Correct idea |
|---|---|---|---|
| MC01 | C1 | Current is used up by bulbs, so less flows after each one | Current is the same everywhere in a series loop; energy is transferred, not charge |
| MC02 | C6 | Resistors in series all get the same voltage | Same current in series; voltage divides in proportion to R |
| MC03 | C7 | Adding a resistor in parallel increases total resistance | Parallel resistance is less than the smallest branch |
| MC04 | C4 | R changes when V changes, because R = V/I | R is a property of the conductor (fixed T); V/I just measures it |
| MC05 | C5 | A thicker wire has more resistance | R ∝ L/A; thicker → less resistance |
| MC06 | C9 | kWh is a unit of power | kWh is a unit of energy (1 kWh = 3.6 × 10⁶ J) |
| MC07 | C2 | Voltage flows through the circuit | Current flows; potential difference is across two points |
| MC08 | L2 | Plane mirror image gets smaller as you move away | Image size equals object size; only apparent size changes |
| MC09 | L4 | A concave mirror always magnifies | Image depends on object position (beyond C → diminished) |
| MC10 | L10 | A virtual image can be caught on a screen | Only real images form on screens |
| MC11 | L7 | Light bends away from the normal entering a denser medium | Bends towards the normal entering denser medium |
| MC12 | L13 | Higher power means longer focal length | P = 1/f (m); higher power → shorter f |
| MC13 | E3 | Myopia is corrected with a convex lens | Myopia → concave (diverging) lens |
| MC14 | E7 | The sky is blue because it reflects the ocean | Shorter (blue) wavelengths scatter more off air molecules |
| MC15 | M1 | Magnetic field lines can cross | Field lines never intersect (field has one direction at a point) |
| MC16 | M2 | Field around a straight wire points radially outward | Field lines are concentric circles around the wire |
| MC17 | E5 | A prism adds colours to white light | White light already contains colours; the prism separates them |

### 3.3 Question bank — `questions.ts`
```ts
interface Question {
  id: string; conceptId: string; stem: string; options: [string,string,string,string];
  correctIndex: 0|1|2|3; difficulty: 1|2|3|4|5; elo: number; // 1→800,2→1000,3→1200,4→1400,5→1600 (initial)
  explanation: string; distractorMisconceptions?: Partial<Record<0|1|2|3, string>>; // option → MCxx
  source: "seed" | "ai";
}
```
- **≥ 55 seeded MCQs**, at least 1 per concept and 2–3 for every weight-3 concept, spread across difficulties 1–5.
- Where possible, wire **distractors to misconceptions** (e.g. an option that is only chosen if you believe MC01).
- Numerical questions must have correct numbers and SI units. Reasoning-friendly stems ("Which bulb glows brighter and why?").

### 3.4 Synthetic class — `students.ts`
- 30 students (Indian names) + the demo student "Aarav". Seeded RNG (mulberry32, seed 42).
- Each student gets mastery per concept from a profile (strong / average / struggling) with chapter-level noise.
- Plant patterns for the demo: ~40% of the class has MC01, ~30% MC03, ~25% MC13; Electricity is the weakest chapter on average.
- Each student has 10–40 historical attempts so the teacher views look real.

## 4. Screens & flows (layouts in DESIGN.md)
### 4.1 Diagnostic (`/student/diagnostic`)
- 12 questions. Start with one from each chapter at difficulty 2, then adapt: correct → harder in a dependent concept, wrong → probe a prerequisite.
- Voice reasoning is **optional** here (to keep it quick) but encouraged; analysis still runs if provided.
- Finish → "Galaxy reveal" animation: nodes light up one by one with their initial mastery. Untested concepts inherit an estimate from tested neighbours (average of prereqs/dependents × 0.8, flagged "estimated").

### 4.2 Student home (`/student`)
Knowledge Galaxy + Today's Plan (reviews due, focus concepts, root-cause suggestions) + chapter mastery bars + recent misconceptions + stats (accuracy, avg confidence, streak). Top bar shows the virtual date and **⏩ Fast-forward 3 days**.

### 4.3 Practice (`/student/practice?concept=ID` or auto)
Question → choose option (tap) → **think out loud, 1–3 sentences on why** (Wispr Flow textarea) → Submit → *(if equations/terms detected)* quick "Did you mean" confirm chips (§5.5) → Analysis panel:
- Transcript Diff (raw vs cleaned, fillers struck, self-corrections highlighted, hedges underlined)
- Confidence meter with the reasons ("2 self-corrections, 3 hedges")
- Verdict: `correct_sound` / `correct_flawed` / `incorrect`
- Misconception card (if any): wrong belief → correct idea, evidence quote from their speech
- Mastery delta animation ("Ohm's law 0.42 → 0.58") and the mini-galaxy pulsing that node
- "Next question" (auto-selected) or "Why did I get this?" (explanation)

### 4.4 Review (`/student/review`)
Queue of concepts due by SM-2 at the virtual date, each with an overdue indicator. Runs practice in review mode.

### 4.5 Teacher Class X-ray (`/teacher`)
- KPI strip: class mean mastery, students at risk (< 0.4 mean), most common misconception, reviews overdue
- Heatmap: students × concepts (31 × 34), coloured by mastery, sortable by weakest
- Misconception leaderboard: bar chart of % students affected
- Weakest concepts ranking with "root cause" prereq
- Student drawer: click a row → that student's mini-galaxy + misconceptions + recent attempts
- **Generate remedial worksheet** for a concept → AI-generated printable worksheet (fallback: assembled from the seeded bank)

### 4.6 Landing (`/`)
Galaxy as hero background, one-line pitch, two role cards: Student (Aarav) / Teacher (Ms. Kulkarni), and a "How it works" strip of 3 steps.

## 5. Engine (`lib/engine/`, pure TS + vitest)
### 5.1 Confidence — `confidence.ts`
Deterministic baseline (always computed) combined with AI features (when available):
```
selfCorrections  // "no wait", "I mean", "actually", "sorry", "no no", answer changed mid-speech
hedges           // "I think", "maybe", "probably", "not sure", "I guess", "kind of"
fillerRate       // fillers per 10 words: umm, uh, like, basically, you know, so yeah
answerMismatch   // spoken final answer ≠ selected option
conf = clamp(1 − 0.15·selfCorrections − 0.08·hedges − 0.04·fillerRate − 0.3·answerMismatch, 0.1, 1)
```
If the AI returns `confidence`, use `0.6·ai + 0.4·baseline`. No reasoning given → conf = 0.6 (neutral).

### 5.2 Learner model — `bkt.ts`
Per-concept Bayesian Knowledge Tracing. Defaults: `pInit` from diagnostic (else 0.3), `pT = 0.15`, `pS = 0.10`, `pG = 0.25`.
```
correct:   post = L(1−S) / (L(1−S) + (1−L)G)
incorrect: post = L·S / (L·S + (1−L)(1−G))
weight w:  correct_sound → 0.5 + 0.5·conf ; correct_flawed → 0.3 ; incorrect → 1.0
L'  = L + w·(post − L)
L'' = L' + (1 − L')·pT·(verdict === "correct_sound" ? 1 : 0.5)
```
- `correct_flawed` (right answer, misconception in reasoning) updates like a weak correct, and the misconception is recorded.
- **Prerequisite propagation** (`rootCause.ts`): on an incorrect answer, each prereq gets `L_p ← L_p − 0.05·(1 − conf)` (min 0.05) and is marked `suspect`. If a concept is < 0.4 and any prereq is < 0.5 or `suspect`, the selector **probes the prereq first** and the UI says "Root cause: likely <prereq>".
- Store history of mastery per concept (for sparklines).
- Mastery bands: < 0.3 weak, 0.3–0.6 developing, 0.6–0.85 proficient, ≥ 0.85 mastered.

### 5.3 Selection & difficulty — `elo.ts`, `selector.ts`
- Student ability θ (start 1100). `P(correct) = 1 / (1 + 10^((d − θ)/400))`.
- After an attempt: `θ += 32·(o − P)`, question `d −= 16·(o − P)` (o = 1 if correct_sound, 0.6 if correct_flawed, 0 if incorrect).
- Target success ≈ 0.7 → target `d ≈ θ − 147`.
- Next concept priority: due reviews > root-cause probes > lowest mastery weighted by concept weight > unexplored concepts. Avoid repeating a question within 5 attempts.
- If no seeded question is within ±150 Elo for the chosen concept, call `/api/generate-question` (with the most relevant misconception for that concept, to target it). Fallback: nearest seeded question.

### 5.4 Spaced repetition — `sm2.ts`
Quality q: correct_sound & conf > 0.75 → 5; correct_sound → 4; correct_flawed → 3; incorrect (no MC) → 2; incorrect with MC → 1.
Standard SM-2: EF' = EF + (0.1 − (5−q)(0.08 + (5−q)·0.02)), min 1.3; q < 3 → repetition 0, interval 1 day; intervals 1, 6, then round(I·EF). Uses `lib/clock.ts`.

### 5.5 Speech-to-math (spoken equations & numericals)
Students never dictate full solutions or proofs. They **tap** the answer and **speak only the why/approach** (1–3 sentences). For numericals they say things like *"I used V equals I R, so twelve by three, four amps"*.
- `lib/ai/physicsVocab.ts`: glossary of terms + spoken-math patterns used in the prompt and in the offline fallback ("by" → "/", "into" → "×", "equals" → "=", "square" → "²", "one by f" → "1/f", "ohm(s)"/"home" → "Ω", "resisters" → "resistors", "con cave" → "concave", symbols V, I, R, P, f, u, v, m, n).
- The analyzer returns `equations` (rendered with **KaTeX**) and `normalizedTerms`.
- **Confirm step:** if any equation or normalized term was produced, show "Did you mean: …?" chips with ✓ (accept) and ✎ (inline edit) **before** grading the reasoning. Edits are stored with the attempt. One tap; never blocks for more than a moment ("✓ all" button).
- Grading uses the **concept/relation used** (e.g. "used V = IR", "used 1/f = 1/v − 1/u with sign convention"), not exact spoken arithmetic. A wrong relation can map to a misconception; an arithmetic slip with the correct relation → verdict `incorrect` but feedback says "right idea, calculation slip", and BKT weight is halved (w = 0.5) because the concept is likely known.
- Evidence quotes for misconceptions always come from the **raw** transcript, verbatim.
- **Ambiguous grouping** (e.g. "log 6 plus one by three log three plus three squared"): the analyzer returns **all plausible readings** as `equations[i].alternatives: { latex, mathjs }[]`, never a single silent guess.
  - Every reading is evaluated in code with **math.js** (`lib/engine/mathEval.ts`), never by the LLM. `log` = base 10 (shown as log₁₀), `ln` = natural log.
  - If the student spoke a result ("so about 10.5"), auto-pick the reading whose value matches within 2%; otherwise show a one-tap "Did you mean A or B?" with both rendered in KaTeX and their values.
  - ✎ edit opens a **MathLive** `<math-field>` (virtual math keyboard) with live preview; edited LaTeX is converted back to math.js for evaluation.
  - Grading of expressions uses **equivalence** (math.js evaluate at the given values / `simplify` compare), so "3 squared" ≡ "9" ≡ "3^2".
  - Unit test: `log 6 + 1/(3 log 3) + 3^2 ≈ 10.477` and `log 6 + (1/3) log 3 + 3^2 ≈ 9.937`; `3^4 = 81`.

## 6. AI routes (`app/api/*`, model `claude-haiku-5-5`, zod-validated, 8 s timeout, 1 retry, fallback)
### 6.1 `POST /api/analyze-reasoning`
Input: `{ question, options, selectedIndex, correctIndex, conceptId, rawTranscript, candidateMisconceptions: Misconception[] }`
Output:
```ts
{
  cleanedReasoning: string;          // concise, first person, fillers removed, final intent kept
  claims: string[];                  // atomic physics claims the student made
  finalAnswerStated: string | null;
  selfCorrections: { from: string; to: string }[];
  hedges: string[]; fillers: string[];
  confidence: number;                // 0..1
  verdict: "correct_sound" | "correct_flawed" | "incorrect";
  misconception: { id: string | null; novelDescription: string | null; evidenceQuote: string; } | null;
  feedback: string;                  // 2–3 sentences, encouraging, addresses the specific flaw
  equations: { spoken: string; latex: string; meaning: string }[]; // speech-to-math, see §5.5
  normalizedTerms: { heard: string; meant: string }[];             // e.g. "resisters" → "resistors", "1 by F" → "1/f"
}
```
Prompt rules: treat the transcript as messy speech; the **last self-correction wins**; match against candidate misconceptions only when the claims actually express that belief; never invent physics; `evidenceQuote` must be a substring of the raw transcript.
Fallback: regex cue matching against `misconception.cues` + the confidence baseline + seeded explanation.

### 6.2 `POST /api/generate-question`
Input `{ conceptId, conceptName, targetDifficulty: 1..5, misconceptionId?: string, avoidStems: string[] }` → one `Question` (source "ai"). The prompt asks for one distractor that a student holding the misconception would pick, and requires a self-check of the numbers. Fallback: nearest seeded question.

### 6.3 `POST /api/remedial-worksheet`
Input `{ conceptId, misconceptionIds, classStats }` → `{ title, intro, sections: { heading, items: { q, answer }[] }[], teacherNotes }`. Fallback: assembled from seeded questions + misconception `correctIdea`s.

## 7. File structure
```
app/
  page.tsx                      # landing
  student/page.tsx              # home + galaxy
  student/diagnostic/page.tsx
  student/practice/page.tsx
  student/review/page.tsx
  teacher/page.tsx
  api/analyze-reasoning/route.ts
  api/generate-question/route.ts
  api/remedial-worksheet/route.ts
components/
  galaxy/KnowledgeGalaxy.tsx ConceptNode.tsx PrereqEdges.tsx Starfield.tsx MiniGalaxy.tsx
  voice/ReasoningInput.tsx TranscriptDiff.tsx ConfidenceMeter.tsx
  practice/QuestionCard.tsx AnalysisPanel.tsx MisconceptionCard.tsx MasteryDelta.tsx
  teacher/KpiStrip.tsx MasteryHeatmap.tsx MisconceptionChart.tsx StudentDrawer.tsx WorksheetDialog.tsx
  shell/TopBar.tsx SideNav.tsx VirtualClock.tsx OfflineChip.tsx
lib/
  engine/{bkt,elo,sm2,confidence,selector,rootCause}.ts + __tests__/
  data/{concepts,misconceptions,questions,students}.ts
  ai/{client,prompts,schemas}.ts
  store.ts clock.ts rng.ts utils.ts
```

## 8. Demo script (2 minutes, must work end-to-end)
1. Landing → Student. Take the diagnostic quickly (or click "Load demo profile"). Galaxy reveal: Electricity mostly red.
2. Practice a series-circuit question. Dictate: *"umm so the first bulb uses up some of the current so the second one is dimmer… wait no I mean, actually I think it's the same? not sure."*
3. Analysis shows: raw vs cleaned, 2 self-corrections, hedges, confidence 0.38, **MC01 detected**, verdict, mastery delta, camera flies to C1 and shows "Root cause".
4. Next question is auto-targeted at MC01 at the right difficulty. Correct + confident → node turns amber.
5. ⏩ Fast-forward 3 days → Review queue shows due concepts.
6. Teacher view: heatmap, "MC01 affects 40% of class" → Generate remedial worksheet.

Add a hidden **"Load demo profile"** button (keyboard `Shift+D`) that loads Aarav's pre-made state, so the demo never depends on finishing the diagnostic live.

## 9. Build phases (stop and summarize after each)
| Phase | Scope | Done when |
|---|---|---|
| **1. Foundation** | Scaffold, Tailwind tokens from DESIGN.md, shadcn, app shell (TopBar, SideNav, VirtualClock), all seed data in `lib/data`, zustand store, clock, rng | `npm run build` passes; all routes render with the shell; data typed and loaded |
| **2. Engine** | bkt, elo, sm2, confidence, selector, rootCause + vitest tests | Tests pass for every formula, including root-cause probing and fast-forward scheduling |
| **3. Knowledge Galaxy** | 3D galaxy per DESIGN.md: clusters, mastery colours, bloom, pulse, edges with particles, click → fly-to + side panel, MiniGalaxy | Smooth 60fps at 1440×900; clicking a node opens its details |
| **3B. 3D wow pack** | DESIGN.md §4.1 shaders/nebulae/dust/post + §4.2 moments 1–3 (Ignition, Misconception Strike, Mastery Shockwave) | Recorded screen capture looks cinematic; ≥ 55fps |
| **4. AI layer** | 3 API routes, prompts, zod schemas, fallbacks, OfflineChip | Each route works with and without an API key |
| **5. Student flows** | Diagnostic + reveal, Practice + full Analysis panel, Review, Student home | The demo script steps 1–5 work end-to-end |
| **6. Teacher** | KPI strip, heatmap, misconception chart, student drawer, worksheet dialog | Demo step 6 works; looks dense and real |
| **6B. Misconception Lab + Constellation** | DESIGN.md §4.2 items 4–6: four 3D split-view sims (MC01, MC11, MC16, MC14), route warp, teacher 3D Class Constellation | "See it in 3D" opens from every matching misconception card; teacher toggle works |
| **7. Polish** | Landing, motion, loading states, empty-state hints, demo profile, README + VOICE_LOG.md | Full demo rehearsed twice with no errors; deployed on Vercel |

## 10. Out of scope
Auth, databases, multi-user sync, other subjects, mobile apps, payments.
