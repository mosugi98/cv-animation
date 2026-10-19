# ECG Heart Block Explainer: Design Spec

Date: 2026-10-19
Status: approved by user (design review), pending spec review

## 1. Goal

A lightweight, responsive web explainer that recreates the reference teaching video (32.8 s, 720x1280) as native web visuals: a simplified AV-conduction schematic synchronised with an ECG strip, walking through the four AV blocks (1st degree, Mobitz I, Mobitz II, complete) under the idea "Every P wave knocks. Not every one gets in."

Deliverable: an upload-ready project folder (zipped) that the user can push to a GitHub repository and deploy with GitHub Pages. No existing repo or framework was available, so the stack is chosen here.

## 2. Non-goals

- No embedded video, no video file in the build.
- No diagnostic tooling, patient data, analytics, accounts, secrets, or external services.
- No copy of the reference creator's handle or branding; neutral footer text only. Captions are original wording that carries the same teaching intent.
- No complex anatomical illustration; the diagram is a labelled simplified schematic.

## 3. Decisions

| Topic | Decision | Reason |
|---|---|---|
| Stack | Vite + React + TypeScript | User choice; typed reusable components, lint/type-check/tests available |
| Runtime deps | `react`, `react-dom` only | Keep bundle small |
| Dev deps | `vite`, `@vitejs/plugin-react`, `typescript`, `eslint` (+ TS/React plugins), `vitest` | Lint, type-check, unit tests |
| Rendering | Inline SVG for diagram and ECG | Crisp at any width |
| Time source | One `requestAnimationFrame` loop in `usePlayback` | Deterministic, no competing timers |
| Deploy | GitHub Pages via workflow; `base: './'` | Works under any repo name |

## 4. Architecture

```
src/
  main.tsx, App.tsx
  data/
    scenes.ts        scene timeline (copy, colour, block site, highlights)
    rhythms.ts       beat definitions per rhythm (P times, PR, conducted, escape)
  lib/
    waveform.ts      rhythm -> SVG path + markers (P dots, PR bars, QRS flags)
    timeline.ts      sceneAt(t), sceneProgress(t), clamp helpers (pure)
  hooks/
    usePlayback.ts   elapsed time, play/pause/seek/restart, reduced-motion
  components/
    StagePills.tsx        4 stage pills + active state
    ConductionDiagram.tsx atria / AV node / His-Purkinje / ventricles
    ECGStrip.tsx          grid, trace sweep, P/PR/QRS/T markers, labels
    SceneCaption.tsx      title line + coloured sub line
    RecapPanel.tsx        four stacked strips (dark card)
    EndCard.tsx           closing card
    TimelineControls.tsx  play/pause, restart, scrubber, scene buttons
  styles.css
tests/                    vitest specs for timeline.ts and waveform.ts
.github/workflows/deploy.yml
README.md
```

Boundaries: `data/` and `lib/` are pure TypeScript with no React, so they are unit-testable. Components receive `time` (seconds) and derived scene data as props; none own a timer.

## 4a. Playback model

`usePlayback(duration)` exposes `{ time, playing, play, pause, toggle, restart, seek }`.
- One rAF loop, started in an effect and cancelled on cleanup; elapsed time is computed from `performance.now()` deltas, so re-renders cannot create a second loop.
- At `duration` the clock stops and `playing` becomes false (no auto-loop).
- `prefers-reduced-motion: reduce`: no auto-play; the scrubber and scene buttons step between scenes, and each scene renders its final (fully revealed) state with no sweep or pulse.
- Everything visible (scene, caption, highlights, trace sweep) is a pure function of `time`.

## 5. Scene timeline (33 s)

Scenes are about 3 s each, matching the reference. Stage pills: 1 orange, 2 orange, 3 red, 4 purple.

| # | Time | Stage | Strip rhythm | Diagram state | Caption (original wording) |
|---|---|---|---|---|---|
| 0 | 0-3 | none | normal sinus, 5 beats | gate neutral, sinus dot idle | "Every P wave knocks. Not every one gets in." / "Watch where the gate fails." |
| 1 | 3-6 | 1st degree | long PR, all conduct | signal passes AV node slowly (dwell) | "Each P wave reaches the AV gate." / "1st degree: the gate opens slowly." |
| 2 | 6-9 | 1st degree | same | PR bars highlighted | "The PR is long, but every P gets a QRS." / "Slow, yet nothing is dropped." |
| 3 | 9-12 | Mobitz I | PR grows beat by beat | dwell at AV node increases each beat | "Mobitz I: the delay keeps growing." / "Longer PR, beat after beat." |
| 4 | 12-15 | Mobitz I | one P with no QRS, then reset | red bar at AV node, signal stops | "Then one P is not conducted." / "The cycle resets. Usually the block is in the AV node." |
| 5 | 15-18 | Mobitz II | constant PR | signal passes unchanged | "Mobitz II: the PR stays the same." / "No warning before the drop." |
| 6 | 18-21 | Mobitz II | sudden dropped QRS | red bar below the AV node (His-Purkinje) | "Then one P suddenly fails to conduct." / "Usually lower: below the AV node." |
| 7 | 21-24 | Complete | P marches, QRS unrelated | red bars at AV node and below; no signal passes | "Complete block: no P gets through." / "The P waves keep marching on." |
| 8 | 24-27 | Complete | wide escape QRS (purple) | purple escape pulse starts in ventricles | "The ventricles beat on their own." / "Escape rhythm: slower and unrelated to the P waves." |
| 9 | 27-30 | recap | four strips | all four stages shown | "Read the PR first." / "Then find the P that never gets in." |
| 10 | 30-33 | end | none | none | "Save this for your next strip." |

Copy lives only in `data/scenes.ts`.

## 6. Rhythm and waveform model

Strip window: 6 s of rhythm, P-P interval 1.0 s (about five P waves per strip), drawn as a left-to-right sweep over the scene's 3 s (sweep position = scene progress). Paired scenes (1-2, 3-4, 5-6, 7-8) share one rhythm: each scene re-sweeps the same full strip, with a different highlight (e.g. scene 3 emphasises the growing PR bars, scene 4 the dropped P). Rhythms defined in `data/rhythms.ts` as lists of beats `{ pTime, pr?: number, conducted: boolean }` plus optional independent `escape` beats.

| Rhythm | Definition (seconds) | Teaching point |
|---|---|---|
| Normal sinus | PR 0.16, all conduct | baseline |
| 1st degree | PR 0.32 constant, all conduct | PR > 0.20 s, nothing dropped |
| Mobitz I | PR 0.16, 0.26, 0.32, then P4 not conducted, P5 PR 0.16 (increments shrink) | progressive PR lengthening, then a dropped QRS and reset |
| Mobitz II | PR 0.16 for conducted beats, P4 not conducted, P5 PR 0.16 | constant PR, sudden drop |
| Complete | P-P 1.0 s regular; wide escape QRS every ~1.6 s, independent of P | AV dissociation |

Trace parts: P wave (small bump), PR segment, QRS (narrow; wide and purple for escape), T wave. Markers: blue dot on each P wave (red when not conducted), orange PR bar under conducted beats, "no QRS" label on the dropped P, a dashed vertical line and stage tag at the key moment.

Rhythm strips are a teaching drawing, not patient tracing. The recap card carries the label "Teaching drawing, not a patient tracing".

## 7. Conduction diagram states

Static layers: atria pill (with "sinus" label and dot), AV node circle, His-Purkinje stem with bundle branches, ventricles pill, row labels. State derived from scene and time:
- **signal position:** blue dot travels atria -> AV node -> His-Purkinje -> ventricles in step with each conducted P/QRS pair; dwell time at the AV node equals that beat's PR.
- **block:** `none | av-node | infra-nodal | both`, drawn as a red bar at the relevant level; the signal stops there on non-conducted beats.
- **escape:** purple pulse and "escape" tag inside the ventricles.
- Label under the diagram: "Simplified schematic".

## 8. Visual design

Warm ivory page background, white rounded cards with subtle border and shadow, navy text. Accents with fixed meaning: orange = delay/PR, blue = P wave/signal, red = block/dropped beat, purple = escape/complete block. 9:16 composition (max width about 420 px, centred) on mobile; on wide screens the same column is centred with the controls beneath. Font: system UI stack (no external font loading).

## 9. Controls and accessibility

- Play/pause (single toggle button), Restart, scrubber (`<input type="range">` with `aria-label`, step 0.1 s, `aria-valuetext` showing scene title), and 11 scene buttons or a compact scene list.
- All controls are native elements, keyboard operable, with visible focus rings.
- Caption region uses `aria-live="polite"`, updated on scene change only.
- SVGs have `role="img"` with descriptive `aria-label`s that change with the scene.
- Contrast: text and key marks meet WCAG AA against their backgrounds.
- Reduced motion handled as in section 4a.
- Disclaimer shown below the controls: "Illustrative teaching animation; interpret real ECGs in clinical context."

## 10. Testing and verification

Vitest unit tests:
- `sceneAt` returns the correct scene at boundaries (0, 2.99, 3, 32.99, 33, out-of-range clamp).
- Mobitz I: conducted PR values strictly increase, then one non-conducted P, then PR resets to the first value.
- Mobitz II: all conducted PR values equal; exactly one non-conducted P in the window.
- 1st degree: every P conducted; all PR > 0.20 s.
- Complete: no QRS time is a fixed offset from a P time; QRS interval is regular and differs from the P-P interval.
- Waveform path generation is deterministic (same input, same output).

Checks run before delivery: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Then render at phone width (about 390 px) and desktop width in a headless browser, step through each scene, check for horizontal overflow and console errors, and view screenshots of every stage.

## 11. Deployment

`.github/workflows/deploy.yml` builds with Node 22 and publishes `dist/` to GitHub Pages using the official Pages actions. Owner steps: push the folder to a repository, then in Settings > Pages set Source to "GitHub Actions". Vite `base: './'` keeps asset paths relative, so the repository name does not matter.

## 12. Assumptions and risks

- The reference video was inspected by sampled frames (every 3 s), so exact sub-second timings are approximated; the 3 s scene grid follows the visible caption changes.
- The text in small labels was read from downscaled frames; copy is original and clinically conservative ("usually").
- Complete block escape rhythm: the video shows a wide ventricular escape; the explainer notes that the real rate and QRS width depend on the escape site.
- The sandbox has no GitHub access, so deployment is not exercised here; the workflow is standard but unverified until pushed.
