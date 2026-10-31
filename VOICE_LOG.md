# VOICE_LOG: how Samajh was built by voice

Samajh was built **without typing prompts**. Every instruction to the coding agent (Claude Code) was **dictated with [Wispr Flow](https://wisprflow.ai)**: press the hotkey, talk, and Wispr Flow puts clean text into the prompt box. That's the same interaction Samajh asks of its students: speak your reasoning, and let the system clean it up.

## How the workflow ran

1. **Specs first, by voice.** `PROJECT.md` (what to build), `DESIGN.md` (how it looks) and `CLAUDE.md` (how to work) were written as the source of truth before any code.
2. **One spoken prompt per phase.** Each phase from `PROJECT.md §9` was one dictated paragraph naming the scope, the quality bar and the ritual: *run the build and tests → append to the DESIGN.md change log → commit → stop and summarise*.
3. **Review by reading, steer by speaking.** After each phase I read the summary and the change-log entry, looked at the screenshots, and dictated the next phase.
4. **The agent verified itself.** Each phase ended with real-browser checks (Playwright driving Edge on the production build): frame rates, the demo script, 390px layouts and console errors. Problems were fixed before committing.

## Why voice worked well

- **Speed:** a full phase brief takes about 30 seconds to say and two minutes to type.
- **Natural scope-setting:** spoken briefs read like a product manager talking ("make sure it doesn't look empty", "keep it at 55 fps"), which suited the spec-driven phases.
- **Dogfooding:** dictating every prompt kept us honest about how messy real speech is. Fillers, restarts and "actually, I mean…" are exactly what Samajh's analyzer has to handle.

## The dictated phase prompts

These are the prompts as Wispr Flow delivered them (lightly trimmed).

**Phase 1, Foundation**
> Read CLAUDE.md, PROJECT.md and DESIGN.md fully. Then do phase one, the foundation, from section nine of PROJECT.md. Scaffold Next.js with TypeScript, Tailwind and shadcn. Set up the design tokens and fonts from DESIGN.md. Build the app shell with the top bar, side nav and virtual clock. Write all the seed data in lib data: thirty-four concepts, seventeen misconceptions, at least fifty-five physics-correct questions, and thirty synthetic students using a seeded random generator. Also create the zustand store and the clock. Run the build, add the phase one entry to the DESIGN.md change log, commit, and stop with a summary.

**Phase 2, Engine**
> Do phase two, the engine, from PROJECT.md section five. In lib engine, write pure TypeScript modules for Bayesian knowledge tracing with confidence weighting, Elo difficulty, SM-2 spaced repetition, the confidence scorer, the question selector, root-cause tracing, and the mathEval module using math.js. Write vitest tests for every formula, including the log and power examples from section 5.5 and the fast-forward scheduling. Make sure all tests and the build pass, update the change log, commit, and stop with a summary.

**Phase 3, Knowledge Galaxy**
> Do phase three, the Knowledge Galaxy, from DESIGN.md section four. Use react-three-fiber and drei. Lay out the four chapter clusters as constellations, colour nodes by mastery with the shared mastery colour function, and add pulsing weak nodes, halo rings for due reviews, and prerequisite edges with flowing particles. Clicking a node should fly the camera to it and open the side sheet. Also build the MiniGalaxy component. Put the galaxy on the student home page with the full layout from DESIGN.md so the page looks dense, not empty. Check that it runs smoothly, update the change log, commit, and stop.

**Phase 3B, 3D wow pack**
> Do phase 3B, the 3D wow pack, from DESIGN.md sections 4.1 and 4.2, items one to three. Upgrade the galaxy with a custom node shader with fresnel rim glow and plasma noise, chapter nebula shaders, spiral dust of around seven thousand twinkling points, curved animated edges, and the post-processing stack with bloom, subtle chromatic aberration, film grain and vignette. Then build Galaxy Ignition, Misconception Strike and Mastery Shockwave as reusable effects I can trigger from the store. Add the performance monitor fallback. Keep it at fifty-five frames per second or better, update the change log, commit, and stop.

**Phase 4, AI layer**
> Do phase four, the AI layer, from PROJECT.md section six. Build the three API routes: analyze reasoning, generate question, and remedial worksheet. Use claude-haiku-5-5 with strict JSON validated by zod, an eight second timeout and one retry. Include the speech-to-math output with equations, alternative readings and normalized terms from section 5.5, plus the physics vocabulary file. Every route needs a working offline fallback, and the offline chip should show when the fallback is used. Test each route with and without the API key, update the change log, commit, and stop.

**Phase 5, Student flows**
> Do phase five, the student flows, from PROJECT.md section four and DESIGN.md section three. Build the diagnostic with the twelve-step rail and the Galaxy Ignition reveal at the end. Build the practice page with the Wispr Flow reasoning textarea, the browser mic backup, the "did you mean" confirm bar with KaTeX chips, MathLive editing and A or B choices for ambiguous expressions, and the full analysis panel with transcript diff, confidence meter, verdict, misconception card, and mastery delta. Trigger Misconception Strike and Mastery Shockwave on the MiniGalaxy. Also build the review page and the fast forward button, plus the hidden load demo profile shortcut, shift D. Make sure demo script steps one to five work end to end. Update the change log, commit, and stop.

**Phase 6, Teacher Class X-ray**
> Do phase six, the teacher Class X-ray, from PROJECT.md section 4.5 and DESIGN.md section 3.6. Build the KPI strip, the mastery heatmap of students by concepts grouped by chapter with tooltips and sorting, the misconception leaderboard that filters the heatmap, the weakest concepts list with root causes, the student drawer with a mini galaxy, and the remedial worksheet dialog with print support. Use the synthetic class data so it looks full and real. Update the change log, commit, and stop.

**Phase 6B, Misconception Lab + Constellation**
> Do phase 6B from DESIGN.md section 4.2, items four to six. Build the Misconception Lab: a shared split-view lab scene showing what you said versus what really happens, with a synchronized camera, and four sims: current used up in a series circuit, refraction into glass with an angle slider, field around a straight wire with concentric rings and compass needles, and blue sky scattering with a sunset slider. Open it from the "See it in 3D" button on matching misconception cards. Then add the star-streak route warp and the teacher 3D Class Constellation toggle with misconception storm clouds. Build the circuit sim first. Update the change log, commit, and stop.

**Phase 7, Polish**
> Do phase seven, polish. Build the landing page with the galaxy hero, the two role cards with live stats, and the three-step how-it-works strip. Add skeleton loading states, content-filled empty states, focus states, and reduced motion support. Check every page at 1440 by 900 and at 390 wide and fix anything that looks empty or broken. Write the README and a VOICE_LOG.md explaining that the project was built by dictating prompts with Wispr Flow. Run the full demo script from PROJECT.md section eight twice and fix any errors. Then help me deploy to Vercel, update the change log, commit, and give me a final summary.

Between phases, a few short spoken follow-ups switched the model (`/model`) and confirmed next steps. Everything else came from the prompts above.
