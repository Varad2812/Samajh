# DESIGN.md — Samajh

**Direction:** "Night observatory meets lab notebook." A deep-space 3D galaxy for the emotional hook; around it, a dense, precise, data-rich interface like a pro analytics tool. Dark theme first.

**Hard rule:** no screen may look empty. Every panel shows real data, a chart, a sparkline, or a concrete next-step hint. Prefer 3 information-rich columns over one centered card.

## 1. Tokens (define as CSS variables + Tailwind theme)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#07080D` | page background |
| `--surface` | `#0E1018` | cards, panels |
| `--surface-2` | `#151826` | inputs, nested panels, table rows hover |
| `--border` | `rgba(255,255,255,0.08)` | 1px borders (prefer borders over shadows) |
| `--text` | `#E7E9F0` | primary text |
| `--muted` | `#8A90A6` | secondary text, labels |
| `--accent` | `#4FD1FF` | primary actions, focus rings, links |
| `--accent-2` | `#7C5CFF` | secondary highlight, gradients with accent |
| `--weak` | `#FF4D6D` | mastery < 0.3 |
| `--developing` | `#FFB547` | 0.3–0.6, also self-corrections highlight |
| `--proficient` | `#9BE15D` | 0.6–0.85 |
| `--mastered` | `#2EE6A6` | ≥ 0.85 |
| `--unknown` | `#3A3F55` | untested / estimated |
| `--misconception` | `#A78BFA` | misconception cards and tags |

Mastery colour is a **continuous interpolation** weak → developing → proficient → mastered (use the same function in 2D and 3D: `lib/utils.ts → masteryColor(m)`).

- **Type:** Space Grotesk (display, headings), Inter (UI), JetBrains Mono (numbers, IDs, transcripts). `font-variant-numeric: tabular-nums` on all numbers.
- **Scale:** 12 / 13 / 14 (body) / 16 / 20 / 28 / 44 (hero).
- **Spacing:** 4px base, 8px grid. Panel padding 16px. Gaps 12–16px.
- **Radius:** 12px panels, 8px inputs/buttons, 999px chips.
- **Surfaces:** subtle 1px top highlight `inset 0 1px 0 rgba(255,255,255,0.04)`; optional faint grid pattern on `--bg`.
- **Motion:** framer-motion, 150–250ms ease-out for UI; 600–900ms for camera moves; respect `prefers-reduced-motion`.

## 2. App shell
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ◉ Samajh   Student ▾      [ Oct 31 · Day +0 ]  [⏩ +3 days]  [offline]  ⟲ │  TopBar 56px
├────┬─────────────────────────────────────────────────────────────────────┤
│ ⌂  │                                                                     │
│ ◎  │                         page content                                │
│ ✎  │                                                                     │
│ ↻  │                                                                     │
│ ▤  │                                                                     │
└────┴─────────────────────────────────────────────────────────────────────┘
 SideNav 64px icons + tooltips: Home, Diagnostic, Practice, Review (badge = due count), Teacher
```

## 3. Screens
### 3.1 Landing `/`
Full-bleed Knowledge Galaxy (auto-rotating, demo mastery) behind a left-aligned hero: headline "The tutor that listens to how you think.", sub-line, two role cards (Student · Aarav / Teacher · Ms. Kulkarni) showing live mini-stats. Bottom strip: 3 steps "Speak your reasoning → We find the misconception → Your galaxy adapts", each with a tiny illustrated example (transcript snippet, MC tag, glowing node).

### 3.2 Student home `/student`
```
┌───────────────────────────────────────────────┬──────────────────────────┐
│ KNOWLEDGE GALAXY (≈62% width, full height)     │ TODAY'S PLAN             │
│  chapter legend · mastery legend · search      │  • 3 reviews due         │
│                                                │  • Focus: C6 Series (.28)│
│        ✦  clusters per chapter                 │  • Root cause: C1 →  ▶   │
│                                                ├──────────────────────────┤
│  [selected node side sheet slides over here]   │ CHAPTER MASTERY          │
│                                                │  Light ▓▓▓▓▓░░ .61  ~spark│
├───────────────────────────────────────────────┤  Eye   ▓▓▓▓░░░ .52       │
│ STATS ROW: Accuracy 68% · Avg confidence .57 · │  Elec  ▓▓░░░░░ .34       │
│ Attempts 23 · Streak 4 · Misconceptions 3      │  Mag   ▓▓▓▓▓▓░ .71       │
│                                                ├──────────────────────────┤
│                                                │ ACTIVE MISCONCEPTIONS    │
│                                                │  MC01 Current used up ×3 │
└───────────────────────────────────────────────┴──────────────────────────┘
```
Node side sheet: name, chapter, mastery (big number + band), sparkline of history, prereqs/dependents as chips (clickable), linked misconceptions, next review date, "Practice this" button.

### 3.3 Practice `/student/practice`
```
┌────────────────────────────────────────────┬─────────────────────────────┐
│ C6 · Resistors in series  · Difficulty ●●●○○│ MINI GALAXY (focused on C6) │
│ Q: Two identical bulbs in series…          │                             │
│ (A) … (B) … (C) … (D) …   option cards     ├─────────────────────────────┤
├────────────────────────────────────────────┤ MASTERY  C6  0.28 → 0.41 ▲  │
│ 🎙 THINK OUT LOUD                            │ θ 1080 → 1104               │
│ "Press your Wispr Flow hotkey and explain  │ Next review: in 1 day        │
│  why. Ramble — we'll clean it up."         ├─────────────────────────────┤
│ [ large textarea, mono, live word count ]  │ SESSION                      │
│ [🎤 browser mic]            [Submit ⏎]      │  5 attempts · 3 ✓ · conf .55│
├────────────────────────────────────────────┴─────────────────────────────┤
│ ANALYSIS (appears after submit, staggered reveal)                        │
│ ┌ Transcript Diff ───────────────┐ ┌ Confidence ─┐ ┌ Verdict ──────────┐ │
│ │ RAW (fillers struck, edits hl) │ │  gauge .38  │ │ Correct, flawed  │ │
│ │ CLEANED (claims as bullets)    │ │  reasons    │ │ reasoning        │ │
│ └────────────────────────────────┘ └─────────────┘ └──────────────────┘ │
│ ┌ Misconception MC01 (violet) ─ wrong belief → correct idea · "quote" ┐ │
│ [Why?]  [Next question →]                                               │
└─────────────────────────────────────────────────────────────────────────┘
```
**Transcript Diff marks:** fillers → `--muted` with strikethrough; self-corrections → `~~20 Ω~~ → 5 Ω` with an `--developing` background pill; hedges → dotted underline + tooltip "hedge"; evidence quote → `--misconception` underline. A small legend sits under the diff.
**Equation chips:** spoken maths appears as KaTeX chips under the cleaned reasoning (e.g. `"twelve by three" → I = 12/3 = 4 A`), with the spoken phrase in small mono `--muted` above each chip. Before grading, a compact **"Did you mean?"** bar shows these chips plus normalized terms ("resisters → resistors") with ✓ / ✎ per chip and a "✓ all" button; ✎ opens an inline MathLive math field (virtual keyboard) with live KaTeX preview. **Ambiguous expressions** show as a segmented choice: two rendered readings side by side (A / B), each with its computed value in mono, the auto-picked one pre-selected with an "matches what you said" tag. Textarea placeholder: "Tap your answer, then say *why* in a sentence or two — e.g. 'I used V = IR, so 12 by 3…'".
**Textarea:** when focused, show a subtle animated waveform border and the hint "Listening for Wispr Flow…" (purely visual).

### 3.4 Diagnostic `/student/diagnostic`
Same question UI, lighter: 12-step progress rail at top with chapter colours, reasoning optional ("Skip reasoning" link). End screen: full-screen **Galaxy reveal** (nodes ignite one by one over ~3s with their mastery colour, then camera settles) + a summary column: strongest chapter, weakest chapter, detected misconceptions, "Start your plan" CTA.

### 3.5 Review `/student/review`
Table-like list of due concepts: colour dot, name, mastery, last seen, due (overdue in `--weak`), EF, interval, Start button. Header shows virtual date and the fast-forward control. If nothing is due, show the next 5 upcoming reviews with dates (never empty).

### 3.6 Teacher Class X-ray `/teacher`
```
┌ KPI STRIP: Class mastery .54 ▼ · At risk 7/31 · Top MC: MC01 (40%) · Overdue 52 ┐
├───────────────────────────────────────────────────────┬────────────────────────┤
│ MASTERY HEATMAP students(31) × concepts(34)            │ MISCONCEPTION LEADERS  │
│ column headers grouped by chapter, sortable;           │  horizontal bars, %    │
│ hover cell → tooltip (student, concept, mastery, last) │  click → filter heatmap│
│ click row → Student drawer                             ├────────────────────────┤
│                                                        │ WEAKEST CONCEPTS       │
│                                                        │ C6 .31 · root: C1      │
│                                                        │ [Generate worksheet]   │
└───────────────────────────────────────────────────────┴────────────────────────┘
```
Heatmap cells 16–20px, 1px gaps, colour = masteryColor. Worksheet dialog renders a clean printable layout (light theme inside the dialog, `window.print()` button).

## 4. Knowledge Galaxy (three.js via R3F)
- **Layout:** 4 chapter clusters arranged as constellations on a tilted ring (Light, Eye, Electricity, Magnetism). Positions are a deterministic force layout within each cluster, computed once from the DAG (prereqs slightly "inward"). Cluster labels as drei `<Html>` or `<Text>`.
- **Nodes:** sphere (radius 0.18 + 0.08·weight), `meshStandardMaterial` with `emissive = masteryColor(m)`, emissiveIntensity 1.2–2.5 by mastery; unknown → `--unknown`, low intensity, dashed ring for "estimated".
- **Weak pulse:** mastery < 0.4 → scale/intensity sine pulse (1.6s).
- **Due review:** thin rotating halo ring in `--accent`.
- **Misconception:** small violet satellite orbiting the node per active misconception.
- **Edges:** prereq → dependent as thin lines (`opacity 0.25`), plus 1–2 particles flowing along each edge toward the dependent; edges touching the selected node brighten.
- **Background:** drei `<Stars>` + faint nebula sprite gradients per cluster colour.
- **Post:** Bloom (luminanceThreshold ~0.2, intensity ~0.9), vignette.
- **Interaction:** OrbitControls (damping, slow auto-rotate when idle, disabled during fly-to). Hover → scale 1.15 + label tooltip. Click → camera tweens (~800ms) to frame the node, opens the side sheet. Programmatic `focusConcept(id)` used by practice/analysis.
- **Mastery change:** when a node's mastery updates, animate colour over 600ms and emit a ring "shockwave".
- **MiniGalaxy:** same scene, smaller canvas, camera locked on the focus node and its 1-hop neighbours, no controls.
- **Performance:** DPR capped at 2, instanced edges/particles, `frameloop="demand"` for MiniGalaxy when idle.

### 4.1 Galaxy visual upgrade (make it unmistakably premium)
- **Node shader** (custom `shaderMaterial`): bright core + **fresnel rim glow** in the mastery colour + slow animated noise "plasma" surface. Mastered nodes get a soft corona sprite; weak nodes flicker subtly like an unstable star.
- **Chapter nebulae:** one large additive-blended plane per cluster with a **fbm noise fragment shader** (slowly drifting), tinted per chapter (Light = cyan-blue, Eye = violet, Electricity = amber-gold, Magnetism = magenta-red). Faint but visible behind each cluster.
- **Galactic core & dust:** ~6–8k instanced points in a spiral-arm distribution (custom points shader, size attenuation, twinkle), slowly rotating; clusters sit on the arms.
- **Edges:** curved (quadratic bezier, lifted toward the camera) tube/line with **animated dash shader** flowing prereq → dependent; brightness = mastery of the prereq ("knowledge flows").
- **Labels:** drei `<Text>` (Space Grotesk) billboarded, fade by camera distance; only selected/hovered + cluster names at far zoom.
- **Post stack:** Bloom (mipmap blur), ChromaticAberration (very subtle, ↑ briefly during fly-to), Noise (film grain 0.03), Vignette. Tone mapping ACES.
- **Camera:** gentle idle drift (sine on position) + mouse parallax on landing; fly-to uses eased spline with slight FOV punch.

### 4.2 Signature 3D moments (these win the demo — build in this order)
1. **Galaxy Ignition (diagnostic reveal):** screen starts black with one point → expands ("big bang" particle burst, 1s) → spiral dust forms → nodes ignite one by one in prerequisite order with a light-pulse travelling along edges → camera pulls back to full galaxy. ~4s, skippable.
2. **Misconception Strike (practice analysis):** when a misconception is detected, a violet comet streaks across the MiniGalaxy, impacts the concept node, and leaves an orbiting violet satellite; node shockwave ring. When the misconception is later cleared (2 sound correct answers), the satellite shatters into particles ✨.
3. **Mastery Shockwave:** on any mastery change, node colour lerps (600ms), expanding ring on a plane, and connected dependents briefly brighten (prerequisite unlock feel). Crossing into "mastered" fires a small supernova sparkle.
4. **Misconception Lab (3D mini-simulations, opens from the Misconception card → "See it in 3D"):** split view, **"What you said" vs "What really happens"**, same scene side by side, synchronized camera. Build these 4 (one shared `<LabScene>` shell, each sim < 200 lines):
   - **MC01 Current used up** — 3D series circuit with two glowing bulbs; left: electron particles thin out after bulb 1 and bulb 2 is dim; right: same particle density everywhere, energy shown as glow leaving each bulb, both equally bright. Ammeter readouts in 3D labels.
   - **MC11 Refraction** — light beam from air into a glass block (transmission material); left bends away from normal (wrong), right bends toward normal with correct angle from Snell's law (n = 1.5); draggable incidence angle slider updates both.
   - **MC16 Field around a wire** — vertical current-carrying wire; left: arrows radiating outward; right: concentric animated field-line rings (compass needles around the wire rotate to align), current direction toggle flips them (RH thumb rule).
   - **MC14 Blue sky** — sun beam through atmosphere particle volume; left: ocean reflecting upward; right: blue photons scatter in all directions, red continues; sunset slider lengthens the path → sky goes orange.
5. **Route warp transition:** navigating between Student ↔ Teacher plays a 500ms star-streak warp (stretched points along view direction) over the page.
6. **Teacher "Class Constellation" (3D toggle on the teacher page):** the same galaxy but node colour = **class average** mastery, and node height/pillar = % of students with a misconception there; misconception "storm clouds" (violet particle clusters) hover over the worst concepts. Toggle 2D Heatmap ⇄ 3D Constellation.

### 4.3 3D quality checklist
- 60fps on a laptop iGPU at 1440×900; auto-reduce dust count + disable chromatic aberration if FPS < 45 (drei `PerformanceMonitor`).
- Every 3D canvas has a styled loading state (shimmering starfield CSS) — never a blank box.
- All 3D text uses design-token colours; no default three.js grey or white boxes anywhere.
- `prefers-reduced-motion`: skip Ignition/warp, keep static glow.

## 5. Components & states checklist
- Buttons: primary (accent fill, dark text), secondary (surface-2 + border), ghost. All with hover, active, focus-visible ring (`--accent`), disabled.
- Loading: skeletons that match the final layout (never spinners alone). AI analysis shows a 3-step progress ("Cleaning speech → Checking reasoning → Updating model").
- Empty: always content-bearing (upcoming items, a suggested action, a seeded example).
- Toasts: bottom-right, for "Offline mode — using built-in analyzer" and worksheet ready.
- Icons: lucide, 16px in UI, 20px in nav.

## 6. Change Log (Claude appends one entry per phase — user reviews here)
Format:
```
### Phase N — <title> — <date>
- Screens touched:
- What changed (UI/UX):
- Deviations from spec + why:
- Known issues / next:
```

<!-- entries below -->

### Phase 1 — Foundation — 2026-10-31
- Screens touched: app shell (all routes), `/`, `/student`, `/student/diagnostic`, `/student/practice`, `/student/review`, `/teacher`.
- What changed (UI/UX):
  - §1 tokens are CSS variables in `app/globals.css` with Tailwind utilities (`bg-surface`, `text-weak`, `rounded-panel`, …), plus a faint 32px grid on `--bg`.
  - Fonts: Space Grotesk / Inter / JetBrains Mono. `.tabular`, `.panel` and `.label-caps` helpers.
  - `masteryColor(m)` in `lib/utils.ts` is the one continuous colour ramp for 2D and 3D.
  - TopBar (56px): logo, role switcher (Student · Aarav / Teacher · Ms. Kulkarni, plus "Load demo profile ⇧D"), virtual date with "Day +N", ⏩ +3 days, offline chip, ⟲ reset.
  - SideNav (64px): icon tooltips, active rail, and a Review badge with the due count.
  - Every route renders real seed data: student concept map as mastery chips, chapter bars, plan and stats; question cards with difficulty dots and Elo; SM-2 review table; teacher KPIs, a roster with chapter mastery, and misconception prevalence.
- Deviations from spec + why:
  - shadcn now ships Base UI + the `cn` package. The DESIGN token names are unchanged, but shadcn's `bg-muted` maps to `--surface-2` (muted *text* is `text-muted-foreground`), and dropdown hover uses `--surface` instead of cyan.
  - Added `lib/types.ts` (shared learner-model types), `components/shared/MasteryBar.tsx` and `components/shell/StoreHydrator.tsx`. Persisted state rehydrates on the client to avoid SSR mismatches.
  - The shell wraps the landing page too, to meet the phase gate. Landing goes full-bleed galaxy in phase 7.
  - Shift+D / "Load demo profile" was wired now (cheap, and it makes every screen populated for review).
  - The student page uses a concept chip map until the 3D galaxy lands (phase 3). Diagnostic shows the 4 openers (one per chapter at difficulty 2); adaptive steps come with the engine (phase 2/5).
  - The teacher roster shows the 30 synthetic students; Aarav joins as #31 in phase 6. OfflineChip is hidden until an AI fallback actually fires.
- Seed data: 34 concepts (acyclic DAG), 17 misconceptions, and 84 MCQs (difficulty mix 14/25/26/14/5; every weight-3 concept has ≥ 3; all 17 misconceptions are wired to distractors). The class of 30 is mulberry32 seed 42: MC01 40%, MC03 30%, MC13 27%, Electricity weakest (.34 vs .50–.56), 11–39 attempts each.
- Known issues / next: no `npm run test` yet (vitest arrives with the engine in phase 2). 390px layout was checked by reasoning about the breakpoints, not by screenshot. Next: phase 2 engine.

### Phase 2 — Engine — 2026-10-31
- Screens touched: none visually. The Review badge and review table now use the engine's `dueConceptIds`, and the store's `pInit`/θ defaults come from the engine constants.
- What changed (UI/UX): no UI changes. New pure-TS modules in `lib/engine/`:
  - `confidence.ts`: §5.1 baseline from self-correction, hedge and filler markers, the AI blend, and human-readable reasons for the meter.
  - `bkt.ts`: posterior, confidence weighting, the arithmetic-slip half weight, `applyAttempt` (with history), and `inferUntested` for diagnostic estimates (§4.1).
  - `rootCause.ts`: prereq propagation, plus a root-cause path traced down the DAG.
  - `elo.ts`: expected score, the update rule, and target d = θ − 147.
  - `sm2.ts`: quality mapping, EF, 1/6/round(I·EF) intervals, and the due queue.
  - `selector.ts`: priority order due → root cause → weakest × weight → unexplored; ±150 Elo window; no repeats within 5 attempts; prefers misconception-targeting distractors; flags `needsGeneration`.
  - `mathEval.ts`: math.js with log₁₀ and ln, reading auto-pick within 2%, equivalence by evaluation, and LaTeX → math.js for MathLive edits.
  - 77 vitest tests across 7 files cover every formula, the §5.5 examples (10.477 / 9.937 / 81) and fast-forward scheduling.
- Deviations from spec + why:
  - "wait no" was added to the self-correction markers alongside "no wait". With it, the §8 demo transcript scores 3 self-corrections, 2 hedges and 1 filler, giving a baseline of 0.376 ≈ the scripted 0.38. (The script's "2 self-corrections" wording would give 0.53 offline; the AI count may differ.)
  - A sound correct answer clears a concept's `suspect` flag.
  - The selector only picks "weakest" for explored concepts below .60. Otherwise it moves to the unexplored frontier, preferring heavy concepts whose prereqs are explored.
  - Added a "requested" reason for `practice?concept=ID`.
  - `@types/node` was bumped 20 → 24 (vitest 5 peer requirement; the runtime is Node 24).
- Known issues / next: the engine is not yet wired into the flows (phase 5). Next: phase 3 Knowledge Galaxy.

### Phase 3 — Knowledge Galaxy — 2026-10-31
- Screens touched: `/student` (full §3.2 layout), `/student/practice` (MiniGalaxy panel).
- What changed (UI/UX):
  - Galaxy layout: a 3D galaxy (R3F + drei + postprocessing). Four chapter constellations sit on a 16°-tilted ring, each laid out by a seeded force layout (`lib/galaxy/layout.ts`) with prerequisite roots near the core and dependents further out, chapter nebula glows and floating cluster labels.
  - Nodes: size 0.18 + 0.08·weight, emissive colour from `masteryColor` (intensity 1.2–2.5). Estimated nodes are `--unknown` with a dashed billboard ring. Weak nodes (< .4) pulse every 1.6s, due reviews get a rotating `--accent` halo, and each active misconception adds an orbiting violet satellite. Mastery changes lerp the colour (~600ms) and fire a shockwave ring.
  - Edges: prerequisite lines in one draw call, plus 2 instanced particles per edge flowing toward the dependent, coloured by the prerequisite's mastery. Edges touching the selected node brighten.
  - Background and post: drei Stars, Bloom (threshold .2, intensity .9, mipmap blur) and Vignette.
  - Interaction:
    - Orbit with damping; slow auto-rotate after 3s idle.
    - Hover scales the node 1.15× and shows a label.
    - Clicking a node, a sheet chip, a plan row or a search result flies the camera there (800ms ease, orbit disabled mid-flight) and opens the side sheet. The projection shifts so the node stays clear of the sheet.
    - "Overview" flies back home; Esc closes the sheet.
  - Side sheet: id and chapter, a big mastery number with band, a history sparkline, the summary, "Root cause: likely …", clickable prerequisite/unlocks chips, linked misconceptions (active ones highlighted), next review / interval / EF, and "Practice this".
  - Student home: galaxy (~62%) with chapter + mastery legends and search, and a stats row (accuracy and confidence sparklines, attempts, streak, misconceptions). The right column holds Today's Plan (due reviews, weighted focus, root-cause pairs and the engine's "Next up" pick), Chapter mastery with 21-day trend sparklines and deltas, Active misconceptions (wrong → correct), and Recent attempts.
  - MiniGalaxy: the same scene with the camera locked on the focus node and its 1-hop neighbours, everything else dimmed, and no controls. It switches to `frameloop="demand"` 4s after the last change unless hovered.
  - The canvas loading state is a CSS shimmering starfield; `prefers-reduced-motion` stops rotation, pulses and particle flow and makes camera moves instant.
- Deviations from spec + why:
  - Canvases are `KnowledgeGalaxyCanvas.tsx` / `MiniGalaxyCanvas.tsx`, lazy-loaded through `components/galaxy/index.tsx` (`ssr: false`) instead of `KnowledgeGalaxy.tsx` / `MiniGalaxy.tsx`. Shared scene, camera and Starfield components are split out to stay under 250 lines.
  - Edges are straight lines; curved, dash-shaded edges are part of §4.1 (phase 3B).
  - three is pinned to `~0.186` because postprocessing 6.39 requires three < 0.187.
- Verified: real Edge on the Intel UHD iGPU (D3D11) at 1440×900. 144 fps in every state (display cap) with p95 frame 7.1ms; worst single frame 21ms during fly-to. Clicking a node at the screen centre opens its sheet, search fly-to and chip navigation work, 390px has no horizontal overflow, and there are no console errors. 6 new layout tests (83 total).
- Known issues / next: `THREE.Clock` deprecation warning comes from inside R3F (harmless). The practice page below the question is still sparse until phase 5 adds reasoning input + analysis. Streak reads 0d for the demo profile because its seeded attempts aren't on consecutive recent days. Next: phase 3B wow pack.
