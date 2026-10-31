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

### Phase 3B — 3D wow pack — 2026-10-31
- Screens touched: Knowledge Galaxy (`/student`), MiniGalaxy (`/student/practice`), TopBar menu ("Replay galaxy ignition").
- What changed (UI/UX) — §4.1:
  - Node shader (`lib/shaders/node.glsl.ts`): fbm "plasma" surface, a soft white-hot core, and a fresnel rim in the mastery colour. Mastered nodes get a pulsing corona sprite; weak nodes flicker on top of the 1.6s pulse.
  - Chapter nebulae: billboarded additive planes with drifting two-octave fbm wisps, tinted per chapter.
  - Spiral dust: 7,000 twinkling points (custom points shader with size attenuation) in a warm core plus four logarithmic arms, each passing through its chapter cluster. It sways slowly (±0.12 rad) instead of spinning, so the arms stay under the constellations.
  - Edges: quadratic béziers lifted upward. A dash shader flows prereq → dependent with brightness = prereq mastery, and a spark travels along each curve. Still one draw call.
  - Post stack: Bloom (mipmap) → ACES tone mapping → chromatic aberration (0.0004, swelling to ~0.003 during fly-to) → film grain 0.03 → vignette.
  - Fly-to adds a 5° FOV punch.
- What changed (UI/UX) — §4.2 moments 1–3, driven by store events (`lib/fx.ts`, `fx` slice):
  - **Galaxy Ignition** (~4.2s, skippable by click or "Skip intro"): a lone star swells and collapses into a 1,800-particle big bang, the spiral dust swirls out of the core, then nodes ignite one by one in prerequisite order with a flash while light pulses draw each edge from prereq to dependent. Stars and nebulae fade in and the camera pulls back from the core to the overview. Fires on "Load demo profile" and `completeDiagnostic` (the diagnostic reveal), or from the menu.
  - **Misconception Strike**: a violet comet with a glowing trail curves in and accelerates into the node, then an impact ring and a ring burst; the new orbiting satellite pops in at impact. Clearing a misconception **shatters** the satellite into violet/white sparks. Works in both the full galaxy and the MiniGalaxy.
  - **Mastery Shockwave**: two expanding rings in the tilted galaxy plane in the new mastery colour, a ~600ms colour lerp, and a brief brightening of the concept and its dependents. Crossing .85 fires a supernova (160-particle sparkle + flash).
  - Triggering: automatic (`setMastery` → shockwave when Δ ≥ .005; `setStudentMisconceptions` → strike/shatter; demo profile / diagnostic → ignition), or explicit via `fx.ignite()`, `fx.strike(c, mc)`, `fx.shatter(c, mc)`, `fx.shockwave(c, from, to)` from `@/lib/store`. Canvases only play events that arrive while mounted, so nothing replays on navigation.
  - Reusable pieces: `components/fx/` holds Burst (GPU particles, zero per-frame CPU), MisconceptionStrike, MasteryShockwave, IgnitionDirector, FxLayer, PostStack and SceneSignals.
- Performance fallback: drei `PerformanceMonitor` (bounds 45 / 0.9×refresh, 3 flip-flops then lock). Low quality halves the dust, drops chromatic aberration and sets DPR to 1; `?lowfx` forces it. `prefers-reduced-motion` skips Ignition and the comet (satellite appears instantly) and freezes plasma, dust and dash flow.
- Deviations from spec + why:
  - Dust sways rather than rotating continuously, so the constellations stay on their arms.
  - Labels stay as drei `<Html>` (DOM) rather than `<Text>`; the §4.1 label item wasn't in this phase's scope.
  - Node emissive intensities were lowered from phase 3 so mastery hues survive ACES.
  - `?debug` (or a dev build) exposes `window.__samajh = { store, fx }` for rehearsal and testing.
- Verified: real Edge on the Intel UHD iGPU, 1440×900, production build. Idle and auto-rotate 144 fps, full Ignition 144 fps, fly-to 143 fps (worst frame 21ms), all five effects fired at once 144 fps (worst 14ms), MiniGalaxy strike 144 fps, forced-low 144 fps. On battery at 60 Hz in phase 3 it was a locked 60. Skip works; no console errors. 11 new tests (94 total).
- Known issues / next: at overview distance the four dust arms are present but read as a field around a bright core rather than crisp arms. Next: phase 4 AI layer.

### Phase 4 — AI layer — 2026-10-31
- Screens touched: none directly. TopBar's existing offline chip is now wired to real fallbacks. The phase 5 flows will call these routes.
- What was built:
  - **Three routes**, `POST /api/analyze-reasoning`, `/api/generate-question`, `/api/remedial-worksheet`. Each validates its body with zod (400 on bad input) and answers `{ source: "ai" | "offline", reason?, data }`.
  - **Model call** (`lib/ai/client.ts`): `claude-haiku-5-5`, strict-JSON prompts (`lib/ai/prompts.ts`), reply validated by zod (`lib/ai/schemas.ts`). 8s timeout per attempt, one retry on any failure (timeout, API error, bad JSON, schema mismatch, rejected content). Any remaining failure falls back. The key is read from `ANTHROPIC_API_KEY` (`.env.local`) on the server only.
  - **Speech-to-math (§5.5)**: `equations` (spoken, latex, mathjs, meaning, `alternatives`, `spokenResult`) and `normalizedTerms`. Code evaluates every reading with math.js and adds `values`, `pickedIndex` (reading within 2% of the spoken result) and `needsChoice` (→ the one-tap "Did you mean A or B?"). `log` is base 10. LaTeX is rebuilt from math.js if the model's is missing.
  - **Physics vocabulary** (`lib/ai/physicsVocab.ts`): mis-heard terms, spoken operators, number words, symbols, known relations (Ohm's law, lens/mirror formula …) and the prompt glossary.
  - **Code enforces what the model must not decide** (`lib/ai/postprocess.ts`): the verdict must match the tapped option; the misconception id must be a candidate; `evidenceQuote` must be verbatim from the raw transcript (re-snapped, else the misconception is dropped); confidence = 0.6·AI + 0.4·baseline; a spoken answer that differs from the tapped option feeds `answerMismatch`. Also returns `calculationSlip` for right relation + wrong arithmetic (BKT weight halving is applied in phase 5).
  - **Offline fallbacks**
    - Analyzer (`offlineAnalyzer.ts` + `spokenMath.ts`): cue matching against `misconception.cues`, the confidence baseline, filler removal, last-self-correction-wins cleaning, the seeded explanation, and a spoken-math parser. It returns both groupings for ambiguous speech, e.g. "log 6 plus one by three log three plus three squared" → 10.477 and 9.937.
    - Question: nearest seeded question by Elo, preferring one whose distractor targets the misconception, skipping `avoidStems`.
    - Worksheet: seeded questions + each misconception's `correctIdea`, with teacher notes from the class stats.
  - **Generated questions are verified**: duplicate options, repeated stems, bad distractor maps, and a numeric self-check (`check.mathjs` re-evaluated in code and compared with the correct option) are all rejected → retry → fallback.
  - **OfflineChip**: `lib/ai/api.ts` (browser callers) sets `settings.offline` from each response. If the route is unreachable the same fallback runs locally. An empty explanation is not a failure and does not show the chip.
- Deviations from spec + why:
  - Added `mathjs`, `alternatives`, `spokenResult` to `equations`, plus `calculationSlip`, `confidenceDetail` and an optional `questionId` in the request. They are needed by §5.5 and don't change the §6.1 fields.
  - The timeout is 8s per attempt, so the worst case is ~16s before falling back. The browser gives up at 20s.
  - A transcript under 3 words skips the model call entirely and uses the deterministic analyzer.
  - `temperature` is not sent (the SDK rejects it for this model).
  - `window.__samajh.ai` joins `store` and `fx` under `?debug` for testing.
- Verified:
  - 132 tests pass (38 new in `lib/ai/__tests__`), lint and build clean.
  - Each route is tested without a key (offline, SDK never called) and with a key against a mocked SDK: success, fenced JSON, one retry, schema/API failure, and timeout (fake timers: 8s, retry, fallback). Rejection paths for generated questions and 400s are covered.
  - Real production server without a key, and with an invalid key against the real SDK: all three routes fell back with 200, ~1.8s including the retry.
  - Real Edge: the chip appears after a fallback and when the route is unreachable, and hides on an empty explanation.
  - **Not verified: a live call with a valid Anthropic key.** None was available in this environment, so the real model's replies and the prompts have not been exercised end to end.
- Known issues / next:
  - Add a key to `.env.local` and run a smoke test before relying on live output.
  - Offline analysis only recognises relations in the vocabulary file.
  - Offline cleaned text is an excerpt, not a rewrite.
  - Next: phase 5, the student flows.

### Phase 5 — Student flows — 2026-10-31
- Screens touched: Diagnostic, Practice, Review (all rebuilt); MiniGalaxy and Knowledge Galaxy (small fixes).
- What changed (UI/UX)
  - **Diagnostic** (`/student/diagnostic`):
    - 12-step rail in chapter colours with ✓/✗ per answered step.
    - Adaptive questions: one difficulty-2 opener per chapter, then per chapter correct → harder dependent concept, wrong → easier prerequisite.
    - Reasoning is optional ("Skip reasoning →"); if given, it's analysed. A "Why this question" panel explains each pick, and a "Load demo profile" shortcut is in the side column.
    - End screen: a full-height Galaxy Ignition reveal (fired once the canvas has mounted), then a summary column fading in after ~3s: score, θ, strongest and weakest chapter, chapter bars, detected misconceptions, "Start your plan".
  - **Practice** (`/student/practice`, with `?concept=ID`, `?mode=review`, or auto):
    - Question card, then the Wispr Flow textarea. It has a mono font, a live word count, and a flowing accent border with waveform bars and "Listening for Wispr Flow…" on focus. ⏎ submits, ⇧⏎ adds a new line. A browser-mic backup button appears only where the Web Speech API exists.
    - Submit shows a 3-step progress ("Cleaning speech → Checking reasoning → Updating model").
    - **"Did you mean?"** bar (when equations or terms are detected) runs before grading:
      - spoken maths as KaTeX chips (spoken phrase above, computed value beside), each with ✓ / ✎;
      - ✎ opens an inline MathLive field with the virtual keyboard and a live KaTeX + math.js preview;
      - ambiguous expressions become an A/B choice with each reading's value and a "matches what you said" tag on the auto-pick;
      - normalized terms (resisters → resistors) get ✓ / ✎;
      - "✓ all" confirms everything. Edits are stored on the attempt.
    - **Analysis panel**, staggered reveal:
      - Transcript diff: raw with fillers struck, self-corrections as amber pills, retracted text struck in amber, hedges dotted, evidence underlined violet. The cleaned version shows claim bullets and equation chips, plus a legend.
      - Confidence gauge with its reasons.
      - Verdict card with feedback.
      - Misconception card: what you believed → what really happens, plus the verbatim quote.
      - "Why did I get this?" and "Next question" / "Probe C1".
    - Right column (sticky, so it stays visible while reading the analysis):
      - MiniGalaxy;
      - mastery delta (`.08 → .09`, θ before → after, next review, SM-2 EF and interval, "Root cause: likely C1");
      - session stats plus the per-concept verdict history.
    - **3D moments on the MiniGalaxy:** a Mastery Shockwave on the practised node at grading. If the misconception lives elsewhere, the camera then flies to that concept (~1.1s) and the Misconception Strike lands there. A re-detected misconception still strikes. Two sound answers in a row on its concept clear it, and the satellite shatters.
  - **Review** (`/student/review`):
    - Header with the virtual date, "Fast-forward 3 days" and "Start review (n)".
    - KPI tiles: due, overdue, due in 3 days, scheduled.
    - Table with an overdue chip, the misconception tag on the concept, EF, interval, reps, and Start / Review early, which runs practice in review mode (next goes to the next due concept).
    - Nothing due → the next 5 upcoming reviews are shown.
  - Shift+D (load demo profile) and ⏩ +3 days in the top bar were already present and are unchanged.
- Engine and data:
  - `lib/engine/attempt.ts` (pure, tested) turns one graded answer into the whole update: BKT (half weight for calculation slips), prerequisite propagation, the misconception (from the analyzer, else the tapped distractor), the misconception's concept marked suspect, Elo and question calibration, SM-2, clearing (2 sound in a row), and root cause (the misconception's concept first, else weak/suspect prerequisites).
  - `lib/engine/diagnostic.ts`: the adaptive diagnostic.
  - The store gains `applyOutcome`, `applyDiagnostic`, `generated` questions and `questionElo`.
  - When no seeded question is within ±150 Elo, practice requests `/api/generate-question` and swaps the generated question in if the student hasn't answered yet.
  - New seeded question **C6-4** (series bulbs, MC01 distractors). It is the demo's "series-circuit question" at the right Elo for Aarav.
- Deviations from spec + why:
  - The analysis sits in the left column instead of full width, with a sticky right column, so the MiniGalaxy Strike and the mastery delta stay on screen during the analysis.
  - The analyzer runs first and the confirm bar gates *committing* the grade. Edits are stored and re-evaluated with math.js, but the AI is not re-called. This avoids a second round-trip.
  - After a wrong answer, very low mastery can still rise slightly (`.08 → .09`) because the spec's learning transition adds `0.5·pT`. Kept as specified.
  - `log` is now rendered as log₁₀ in KaTeX (math.js's default TeX printed `ln`), with redundant parentheses dropped.
  - The selected node's label is now one always-mounted scene-level `<Html>`. Swapping per-node labels when the MiniGalaxy refocused threw `removeChild`.
- Verified: an end-to-end run in real Edge on the production build with no API key (offline analyzer):
  - Demo step 1: landing → Student → ⇧D → Ignition.
  - Step 2: C6 practice picks C6-4. Tap "Dimmer" and dictate the demo transcript.
  - Step 3: confidence .38, 3 self-corrections, 2 hedges, MC01 with a verbatim quote, Incorrect, C6 delta, MiniGalaxy flies to C1, Strike fires, "Root cause: likely C1".
  - Step 4: "Probe C1" picks C1-2 (an MC01 distractor within ±150 Elo). Correct and confident → C1 .18 → .52 (amber) with a shockwave.
  - Step 5: +3 days → the review queue grows to 18 including C6 and C1. Start runs review mode.
  - Diagnostic: 12 unique questions, reasoning on one detects MC01, the Ignition reveal plays, 22 concepts are estimated.
  - Confirm bar: KaTeX chips, MathLive field, A/B choice (10.477 vs 9.9372); choosing B is stored as an edit.
  - No horizontal scroll at 390px on practice, diagnostic or review. No console errors.
  - 147 tests (15 new), lint and build clean.
- Known issues / next:
  - The MiniGalaxy's framing of C1 is wide because its neighbour M2 sits in the Magnetism cluster.
  - The live Claude path is still untested without a key.
  - "See it in 3D" on misconception cards arrives in phase 6B.
  - Next: phase 6, Teacher.

### Phase 6 — Teacher Class X-ray — 2026-10-31
- Screens touched: Teacher (`/teacher`, rebuilt). Small fixes to the MiniGalaxy.
- What changed (UI/UX)
  - **KPI strip:** class mastery with a 21-day sparkline and Δ vs 7 days ago, students at risk (< .40), top misconception (click → filters the heatmap), reviews overdue with how many students they span.
  - **Mastery heatmap:** 31 students × 34 concepts, grouped by chapter with chapter-coloured group headers and a sticky name column and header.
    - Sorting: a dropdown (weakest first, name, most misconceptions, weakest per chapter), plus clicking any concept ID or chapter header sorts by it.
    - A single shared hover tooltip (student, concept, mastery and band, last attempt, active misconception) keeps ~1,000 cells cheap. Rows are memoised.
    - Estimated cells render dimmed; the legend shows the weak → mastered gradient.
    - Clicking a row opens the student drawer.
  - **Misconception leaderboard:** ranked bars with % and count. Clicking one filters the heatmap: holders move to the top, the rest dim, and that misconception's concept column is outlined, with a banner and "Clear". It also filters from the KPI tile and from the weakest-concepts chips.
  - **Weakest concepts:** the 8 lowest by class mean, each with students below .40, the likely root-cause prerequisite (the engine's `rootCauseOf` run on the class-mean model), the misconceptions held there and a "Worksheet" button. Hovering highlights the concept's heatmap column.
  - **Student drawer** (side sheet; Esc or ✕ closes): stats tiles, a MiniGalaxy focused on their weakest concept (clickable; chips re-focus it), the root cause for the focused concept, chapter bars, misconception cards, and recent attempts.
  - **Remedial worksheet dialog:** prefilled from the concept, the misconceptions present and the class stats; it calls `/api/remedial-worksheet`. It shows a 3-step loading state, a light-theme printable layout (title, name/date line, lettered sections, answer key toggle, teacher notes) and a **Print** button (`window.print()`). `@media print` hides everything except the sheet. A note says whether it was written by Claude or assembled from the seeded bank, and the top-bar offline chip lights up on fallback.
  - Also: class chapter bars with "n students below .40".
- Data: the 30 synthetic students plus the live student (Aarav, from the store) make the 31 rows. Aarav's practice shows up here immediately. Before a diagnostic or demo profile, his row is all "estimated". All aggregates are in `lib/teacher/stats.ts`, with 5 tests (planted MC01 12/30, MC03 9/30, MC13 8/30; Electricity weakest; class-level root causes; KPIs and fast-forward effect; sorts and filter).
- Deviations from spec + why:
  - Plain HTML bars are used for the leaderboard, instead of recharts (not installed).
  - Dialog and drawer use `@base-ui/react` Dialog via a small `components/ui/dialog.tsx`.
  - The MiniGalaxy no longer renders DOM labels. drei `<Html>` threw `removeChild` when a whole canvas unmounted (closing the drawer). Labels remain in the full galaxy.
- Verified (real Edge, production build, no API key): 31 rows × 34 cells; sort by weakest / name / concept C6; MC01 filter shows 12 bright + 19 dimmed and clears; tooltip; drawer with a WebGL mini galaxy opens and closes on Esc; worksheet opens from the weakest concept (offline fallback, chip on), print emulation hides the top bar and no-print controls, and a PDF was produced; no horizontal scroll at 390px; no console errors. 152 tests, lint and build clean.
- Known issues / next:
  - Reviews overdue reads 486 (≈16 per student). That is the seeded SM-2 data, higher than the spec's illustrative "52"; tune the seed if it looks implausible.
  - The 31st row (Aarav) is dark until a profile is loaded (⇧D).
  - The live Claude worksheet path is untested without a key.
  - Next: phase 6B (Misconception Lab + Class Constellation) or 7 (polish).

### Phase 6B — Misconception Lab, route warp, Class Constellation — 2026-10-31
- **Misconception Lab** (`components/lab/`):
  - Shared split view ("What you said" vs "What really happens"): two R3F canvases with one synchronized orbit camera (`CameraSync`: whichever side you drag drives the other) and a "Reset view" control. Labels are canvas-texture sprites (no DOM, no font download).
  - Four sims, each under 200 lines, driven by tested physics in `lib/lab/physics.ts`:
    - **MC01 series circuit** (built first): flowing charges, three ammeters (said 0.50/0.30/0.10 A vs real 0.50 everywhere), bulb 2 dim vs equally bright, and energy sparks leaving the bulbs.
    - **MC11 refraction**: an angle-of-incidence slider drives both; Snell's law with n = 1.5 vs bending away; angle arcs; light pulses bunch up in glass (v = c/n).
    - **MC16 field around a wire**: radial spokes vs concentric rings; 36 compass needles swing to the field; a current-direction toggle flips them (right-hand thumb rule).
    - **MC14 blue sky**: a sun-height slider; Rayleigh-scattered RGB photons (∝ 1/λ⁴) vs "sea reflections"; the arriving sunlight and the sky turn orange at sunset only in the real view.
  - "See it in 3D" appears on the matching misconception cards: practice analysis, the student home's Active misconceptions, the teacher student drawer and the diagnostic reveal. The lab chunk loads on first open.
- **Route warp**: a 500ms 2D-canvas star-streak overlay when navigating Student ↔ Teacher; skipped under reduced motion.
- **Class Constellation**: a 2D Heatmap ⇄ 3D Constellation toggle on `/teacher`.
  - The galaxy is coloured by class-mean mastery. Violet pillars show the % of students holding a misconception on each concept, and swirling violet storm clouds with lightning flickers sit over the top 3 (C1, C7, E3).
  - It has a legend and a click-for-detail card (class mean, % misconception, count below .40, root cause). The leaderboard filter and weakest-list hover focus a concept.
- Verified: in dev, all four labs open with 2 canvases at 115–144 fps on the iGPU; camera sync confirmed (dragging one view moved both); the slider and toggle work. 164 tests (12 new), lint and build clean.
- Follow-up (same phase): all galaxy labels (cluster names, the selected label, hover labels, Constellation %) are now canvas-texture sprites at a constant on-screen size, instead of drei `<Html>`. The DOM labels threw `removeChild` whenever a full galaxy canvas unmounted (Student → Teacher navigation, 3D → 2D toggle).
- Verified on the production build in real Edge:
  - Route warp plays on Student → Teacher and clears after ~500ms.
  - The Constellation runs at 144 fps, with pillars, 3 storm clouds (C1, C7, E3), and the MC01 filter flying to C1 with the detail card (class mean .34, 39% misconception, 18/31 below .40).
  - The lab opens and closes cleanly. React's "synchronously unmount a root" warning appears in dev only, not in production.
  - The phase 5 flows re-run with no errors.
- Known issues: the labels no longer get the DOM backdrop blur; they use a dark rounded-rect texture instead.

### Phase 7 — Polish — 2026-10-31
- **Landing (`/`):**
  - A full-bleed, auto-rotating Knowledge Galaxy behind a left-aligned hero: "The tutor that listens to how you think.", the sub-line, "Take the 4-minute diagnostic" and "Load demo profile ⇧D".
  - Two role cards with **live** stats:
    - Student: mastery, attempts, reviews due, active misconceptions. These are the student's own once they have data, else Aarav's demo, labelled "(demo)".
    - Teacher: class mean, at risk, top misconception, from the seeded roster.
  - A "How it works" strip with three illustrated examples (marked-up transcript, MC01 card with root cause, a glowing C1 node .18 → .52).
- **Empty and loading states:**
  - Review with nothing scheduled shows an SM-2 interval ladder plus a dimmed **sample** of Aarav's queue and two CTAs, instead of an empty table.
  - Practice shows a "Before you answer" row under the question: misconceptions we'll listen for, prerequisites with their mastery, and example spoken reasoning.
  - The landing stats show skeleton pulses until hydration. The existing page skeletons (practice, teacher, diagnostic, galaxy starfield) were checked.
- **Focus and motion:** a global `:focus-visible` fallback ring, and `MotionConfig reducedMotion="user"` so every framer-motion animation follows the OS setting (on top of the CSS rule and the 3D reduced-motion paths).
- **390px fixes:** the landing role cards were clipped (grid min-content) and are now fixed. With the offline chip showing, the top bar overflowed by 21px; the chip is now icon-only below `sm`. There is no horizontal scroll on any page at 390px in either state.
- **Docs:** README (pitch, features, demo script, run, architecture, deploy) and VOICE_LOG.md (the project was built by dictating every phase prompt with Wispr Flow; includes the prompts). `.env.example` added and un-ignored.
- **Verified** (production build, real Edge, no API key):
  - Audit of 6 pages × {1440×900, 390} × {fresh, demo} plus reduced motion: no console errors, no horizontal scroll.
  - The full PROJECT.md §8 demo script, steps 1–6, run **twice** in fresh browsers. Both runs passed every step: Ignition; MC01 at .38 with a Strike on C1 and "Root cause: likely C1"; the 3D lab opens; Probe C1 → .52 amber; +3 days → 18 due; teacher MC01 filter → worksheet with Print → 3D Constellation. Zero console errors.
  - 164 tests, lint and build clean.
- **Deviations:**
  - The landing lives inside the app shell, with the side nav and top bar kept for navigation, rather than a separate chrome-less page.
  - The live Claude path is still untested without a key.
