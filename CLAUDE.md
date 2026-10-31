# CLAUDE.md — Samajh

> "The tutor that listens to how you think."
> Adaptive Class 10 Physics exam-prep tutor. Students explain their reasoning **by voice (Wispr Flow)**; we detect misconceptions and confidence from that messy speech, update a per-concept learner model, and visualize mastery as a 3D "Knowledge Galaxy" (three.js).

This is a **5-hour hackathon build**. Optimize for a working, polished, demo-able product. No over-engineering.

## Read first, every session
1. `PROJECT.md` — full product spec, data models, algorithms, API contracts, build phases. **Source of truth for WHAT to build.**
2. `DESIGN.md` — design system, screen layouts, 3D galaxy spec. **Source of truth for HOW it looks.**
3. This file — rules for HOW to work.

If something is ambiguous, pick the simplest option consistent with these docs, note it in the change log, and keep moving. Do not stop to ask unless a decision is irreversible.

## Stack (do not swap)
- Next.js (App Router) + TypeScript (strict) + Tailwind CSS + shadcn/ui
- three.js via `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` (bloom)
- `framer-motion` for UI motion, `recharts` for 2D charts, `lucide-react` for icons, `katex` (via `react-katex` or direct render) for spoken-equation chips, `mathjs` for all arithmetic/equivalence checks (never let the LLM compute numbers), `mathlive` for the equation edit field
- `zustand` with `persist` (localStorage) for all state. **No database.**
- `zod` for validating every AI response
- `@anthropic-ai/sdk`, model `claude-haiku-5-5`, called **only from Next API routes** (`ANTHROPIC_API_KEY` in `.env.local`, never in client code)
- Deploy target: Vercel

## Commands
```bash
npm run dev        # local dev on :3000
npm run build      # must pass before every phase is marked done
npm run lint
npm run test       # vitest — engine unit tests in lib/engine/__tests__
```

## Architecture rules
- `lib/engine/*` (BKT, Elo, SM-2, confidence, selector, rootCause) is **pure TypeScript**: no React, no fetch, no Date.now() (take `now` as a parameter). Unit-test it.
- `lib/data/*` holds static seed data (concepts, misconceptions, question bank, synthetic students). Synthetic data uses a **seeded RNG** so the demo is identical every run.
- `lib/ai/*` holds prompts, zod schemas and the client wrapper. Every AI call:
  - asks for **strict JSON only**, validated with zod;
  - has a timeout (8 s) and **one retry**;
  - has a **deterministic fallback** (heuristic analyzer / seeded question bank) so the demo never breaks without network or API key. Show a small "offline mode" chip when the fallback is used.
- Time comes from `lib/clock.ts` (`now() = Date.now() + offsetDays * 86_400_000`) so the "Fast-forward 3 days" demo button works everywhere.
- One zustand store (`lib/store.ts`) with slices: `student`, `attempts`, `mastery`, `schedule`, `settings`. Provide a **"Reset demo"** action.

## Voice input rules (critical to the hackathon brief)
- The primary input is a large focused `<textarea>` that Wispr Flow dictates into. Assume input is **messy natural speech**: fillers ("umm", "like", "basically"), digressions, self-corrections ("20 ohms… no wait, 5").
- Never ask the user to clean their speech. The system does it.
- Always show **raw transcript → cleaned reasoning** side by side, with self-corrections, fillers and hedges visibly marked (see DESIGN.md).
- Include a Web Speech API mic button as a backup input (feature-detect; hide if unsupported).
- Students **tap** answers and **speak only the why** (1–3 sentences). Never require dictating full solutions. Spoken maths ("V equals I R", "one by f") is converted to KaTeX equation chips with a one-tap confirm/edit step (PROJECT.md §5.5).

## 3D is the centrepiece
The 3D work (DESIGN.md §4) is what judges will remember. Treat it as a first-class feature, not decoration: custom shaders, post-processing, cinematic camera, and the Misconception Lab sims. Put 3D code in `components/galaxy/*`, `components/lab/*`, `components/fx/*` (shared shaders in `lib/shaders/*.glsl.ts`). If time gets tight, cut in this order: route warp → teacher Constellation → Misconception Lab sims beyond MC01 → chromatic aberration. **Never cut:** Galaxy Ignition, Misconception Strike, Mastery Shockwave, Lab sim MC01.

## UI quality bar (non-negotiable)
- The user has found past AI-built UIs **empty-looking**. Every screen must be **dense, polished and full of real content**: no lonely centered cards, no placeholder "Coming soon", no empty states without seeded data or a helpful hint.
- Follow DESIGN.md tokens exactly. Dark theme first.
- Every number uses tabular figures; every chart has a label; every interactive element has hover + focus states.
- Must look good at 1440×900 (demo laptop) and not break at 390px wide.

## Workflow
- Build **phase by phase** as listed in PROJECT.md §9. Finish one phase, run `npm run build` and `npm run test`, then stop and summarize.
- After each phase, **append an entry to the Change Log at the bottom of DESIGN.md** (what changed in the UI/UX, screens touched, any deviation from spec and why). Keep it short; the user reviews this.
- Commit after each phase: `git commit -m "phase N: <summary>"`.
- Prefer editing existing files to creating new ones. Keep components under ~250 lines; split if larger.
- No `any`. No unused deps. No console noise in the final build.
- Physics content (questions, explanations, misconception text) must be **correct for CBSE Class 10**. Double-check numbers and units in seeded questions.

## Don't
- Don't add auth, a database, or a backend server beyond Next API routes.
- Don't call the AI from the client.
- Don't recommend features outside PROJECT.md until all phases are done.
- Don't remove the offline fallbacks.
