# Samajh: the tutor that listens to how you think

**Adaptive CBSE Class 10 Physics exam prep that grades your *reasoning*, not just your answer.**
Students tap an answer and then **say why** in a sentence or two, dictated with [Wispr Flow](https://wisprflow.ai). Samajh:
- cleans the messy speech;
- reads hesitation as confidence;
- detects the misconception behind the answer, even when the answer is right;
- updates a per-concept learner model, shown as a 3D **Knowledge Galaxy**.

> Built for a hackathon in phases, entirely by dictating prompts to Claude Code with Wispr Flow. See [VOICE_LOG.md](VOICE_LOG.md).

## What's inside

| | |
|---|---|
| **Voice reasoning** | A large textarea that Wispr Flow dictates into, plus a browser-mic backup. Shows the raw transcript next to the cleaned version, with fillers struck, self-corrections highlighted, hedges underlined and evidence quoted. |
| **Speech-to-math** | "V equals I R, so twelve by three, four amps" becomes KaTeX chips. All arithmetic is done by math.js, never the LLM. Ambiguous groupings ask "A or B?" with both values. Edits use MathLive. |
| **Learner model** | Confidence-weighted Bayesian Knowledge Tracing, Elo difficulty (target 70% success), SM-2 spaced repetition, and root-cause tracing down the prerequisite graph. |
| **Knowledge Galaxy** | react-three-fiber: plasma/fresnel node shaders, chapter nebulae, 7k spiral dust, bloom/aberration/grain. Plus Galaxy Ignition, Misconception Strike and Mastery Shockwave. |
| **Misconception Lab** | "What you said" vs "What really happens" 3D sims with a synced camera: series circuit, refraction, field around a wire, blue sky. |
| **Teacher Class X-ray** | KPIs, a 31×34 mastery heatmap, a misconception leaderboard that filters it, weakest concepts with root causes, student drawer, printable AI remedial worksheets, and a 3D Class Constellation. |
| **Offline-first AI** | Three Claude routes (`claude-haiku-5-5`, zod-validated JSON, 8s timeout, 1 retry). Each has a deterministic fallback, so the app works with no key or network. An "offline" chip shows when the fallback is used. |

## Demo script (2 minutes)

1. Landing → **Student**. Press **⇧D** ("Load demo profile") → Galaxy Ignition; Electricity is mostly red.
2. **Practice** a series-circuit question (`/student/practice?concept=C6`). Tap "Dimmer…" and dictate: *"umm so the first bulb uses up some of the current so the second one is dimmer… wait no I mean, actually I think it's the same? not sure."*
3. The analysis shows:
   - raw vs cleaned transcript, self-corrections and hedges;
   - confidence **.38**;
   - **MC01 Current used up** with a verbatim quote, and the verdict;
   - the mastery delta.

   The MiniGalaxy flies to C1, the Strike lands, and the panel shows "Root cause: likely C1". "See it in 3D" opens the circuit lab.
4. **Probe C1**: the next question targets MC01 at the right difficulty. A correct, confident answer turns C1 amber.
5. **⏩ +3 days** → the Review queue fills with due concepts.
6. **Teacher**: heatmap → "MC01 affects 39%" → filter → **Worksheet** → Print. Toggle **3D Constellation**.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run test         # vitest: engine, AI routes, lab physics, class stats
npm run lint
npm run build
```

Optional: put an Anthropic key in `.env.local` (see `.env.example`). Without it, every AI route uses its offline fallback and the app still works end to end.

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Architecture

```
app/                     pages (landing, student/*, teacher) + api/{analyze-reasoning,generate-question,remedial-worksheet}
lib/engine/              pure TS: bkt, elo, sm2, confidence, selector, rootCause, mathEval, attempt, diagnostic (+ tests)
lib/ai/                  client (Claude + zod + timeout/retry), prompts, schemas, physicsVocab, spokenMath, offline fallbacks
lib/data/                34 concepts, 17 misconceptions, 85 questions, 30 seeded synthetic students (mulberry32, seed 42)
lib/lab/, lib/teacher/   lab physics (Snell, Rayleigh, B-field) and class aggregates (+ tests)
lib/store.ts             one zustand store (persisted to localStorage): student, attempts, mastery, schedule, settings, fx
lib/clock.ts             virtual clock, so "fast-forward 3 days" works everywhere
components/galaxy|fx|lab 3D: galaxy scene, shaders (lib/shaders), signature effects, Misconception Lab
```

There's no database and no auth: all state lives in the browser. Time comes from the virtual clock. The LLM never computes numbers, and code re-checks its verdicts and quotes.

## Deploy (Vercel)

Live (temporary deployment): https://samajh-silk.vercel.app

```bash
npx vercel login
npx vercel --prod
# optional: npx vercel env add ANTHROPIC_API_KEY production   (then redeploy)
```

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · shadcn/Base UI · three.js via @react-three/fiber, drei, postprocessing · framer-motion · zustand · zod · math.js · KaTeX · MathLive · @anthropic-ai/sdk · vitest.

Design system, screen specs and the per-phase change log: [DESIGN.md](DESIGN.md). Product spec and algorithms: [PROJECT.md](PROJECT.md).
