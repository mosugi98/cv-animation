# Heart block: where the gate fails

An animated ECG explainer that walks through the four AV blocks (1st degree, Mobitz I, Mobitz II, complete) around one idea: **every P wave knocks, not every one gets in.** A simplified conduction schematic (atria, AV node, His-Purkinje, ventricles) stays synchronised with an ECG strip across 11 scenes (33 s). Everything is native SVG; there is no video file.

> Illustrative teaching animation; interpret real ECGs in clinical context.

The site has two parts, switched from the top navigation:

- **Heart block** (`#/`): the original 33-second explainer described above.
- **Arrhythmia library** (`#/library`): fifteen short animated lessons built on a reusable engine. See [Arrhythmia Animation Library](#arrhythmia-animation-library).

## Run locally

Requires Node 20 or newer (CI uses Node 22).

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check, then production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest: heart-block logic and scenes, plus the library engine, every rhythm's clinical coherence, lesson timelines and server-render of every lesson scene |

## Deploy to GitHub Pages

1. Create a GitHub repository and push this folder to its `main` branch.
2. In the repository go to **Settings > Pages** and set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` lints, tests, builds, and publishes `dist/`. The site appears at `https://<user>.github.io/<repo>/`.

`vite.config.ts` uses `base: './'`, so asset paths are relative and the repository name does not matter.

Other hosts (Vercel, Netlify, Cloudflare Pages): build command `npm run build`, output directory `dist`.

## Arrhythmia Animation Library

Open it from the navigation bar, or go straight to `#/library`. Every lesson is about 25-35 seconds with 5-7 scenes. Lessons are grouped on the index by topic: SVT, pre-excitation and aberrancy, atrial rhythms, escape rhythms, ventricular arrhythmias and electrolytes. Each scene has a synchronised caption, a conduction diagram and an ECG strip, and the last scene is a **rhythm recognition summary** (key line, defining features and the commonest look-alike).

| Lesson (URL) | What it shows | Options |
|---|---|---|
| AVNRT (`#/library/avnrt`) | Dual AV-node pathways. A premature atrial beat blocks in the fast pathway, goes down the slow one and returns up the fast one. Regular narrow tachycardia, P wave hidden in the QRS. | none |
| AVRT (`#/library/avrt`) | A macro-circuit: AV node down, accessory pathway up. Pre-excitation in sinus rhythm (short PR, delta wave), then orthodromic tachycardia with a retrograde P wave clearly after the QRS. | none |
| WPW (`#/library/wpw`) | Accessory pathway that bypasses the AV node. Short PR and delta wave in sinus rhythm; orthodromic AVRT (narrow); antidromic AVRT (wide, regular, mimics VT); pre-excited AF (irregular, wide, shortest R-R under 250 ms, avoid AV-nodal blockers). | Rhythm: sinus, orthodromic, antidromic, AF |
| SVT with aberrancy (`#/library/aberrancy`) | A premature atrial beat starts AVNRT, but the right bundle is still recovering: regular tachycardia with a wide rSR′ (RBBB) QRS, a look-alike for VT. | none |
| Atrial fibrillation (`#/library/af`) | Chaotic atrial wavelets, no P waves, fibrillatory baseline, an irregularly irregular ventricular response, with impulses blocked in the AV node. | none |
| Atrial flutter (`#/library/flutter`) | An organised right-atrial circuit at about 300/min with sawtooth waves and no flat baseline. | AV conduction pattern: 2:1, 4:1, variable |
| Atrial tachycardia (`#/library/at`) | Sinus rhythm, then a regular ectopic atrial focus with a different P wave and a flat baseline between waves. | AV conduction: 1:1, 2:1 |
| Junctional escape (`#/library/junctional`) | Sinus node stops; after a pause the AV junction fires. Narrow QRS, retrograde P. | Escape beat or escape rhythm |
| Ventricular escape (`#/library/ventricular`) | AV block: P waves march on unconducted; after a long pause a wide-complex ventricular escape fires. | Escape beat or escape rhythm |
| PVC (`#/library/pvc`) | Early, wide, bizarre beat with no P wave and a discordant T wave; the sinus rhythm is not reset, so the pause is fully compensatory. | Single PVC, bigeminy, couplet |
| Ventricular tachycardia (`#/library/vt`) | A fast, regular, wide-complex rhythm from a ventricular circuit, with AV dissociation. | Sustained or non-sustained |
| Torsades de pointes (`#/library/torsades`) | Long QT, then short-long-short (PVC, pause, R-on-T PVC), then a twisting polymorphic VT. | Stops by itself, or degenerates to VF |
| Ventricular fibrillation (`#/library/vf`) | Fast ventricular rhythm breaks into chaos: no QRS, no output. | Coarse or fine |
| Hypokalaemia (`#/library/hypokalemia`) | A potassium meter falls while the ECG shows flat T, ST depression, U waves and PVCs. | none |
| Hyperkalaemia (`#/library/hyperkalemia`) | A potassium meter rises while the ECG goes through peaked T, flat P with long PR and wide QRS, then a sine wave. | none |

Options are selected on the lesson page and stored in the URL (`#/library/flutter?option=4%3A1`), so a link opens the same variant. Hash routes mean GitHub Pages needs no rewrite rules.

Everything on screen is labelled **schematic educational example, not a patient tracing**. Rates, intervals and morphology are simplified: for instance, flutter-wave polarity is not lead-specific.

### How the engine works

```
rhythm builder  ->  RhythmDef { signal(t), marks, pulses, beats, atrial events }
                         |                     |
                  buildStrip(): SVG path   frameAt(pulses, t): diagram frame
                         \                     /
                   LessonPlayer: ONE clock decides scene, strip sweep, diagram and caption
```

- A **rhythm** is data plus a pure `signal(t)` function (`src/rhythms/*.ts`, assembled from waveform primitives in `src/engine/morphology.ts`). It also lists `pulses` (what travels where on the diagram) and `marks` (dots, bars, tags and notes on the strip).
- The **diagram frame** is a pure function of `(pulses, rhythm time)`. Pulses can travel along a path (forwards or in reverse, optionally stopping part-way to show a block), flash a site, spark in the atria, or loop around a circuit.
- A **lesson** (`src/lessons/*.ts`) is only copy and configuration: scenes, which rhythm and which part of it (`span`) each scene plays, legend, diagram options and the recognition summary. Scenes are laid out end to end by `sequence()`, so timelines are contiguous by construction.
- `LessonPlayer` derives everything from one elapsed-time value, so scrubbing, restarting and scene jumps cannot drift out of sync.

### Level meter
A scene may set `meter` (serum potassium in mmol/L); `LessonPlayer` then shows a `LevelMeter` above the diagram, with the normal range (3.5-5.0) shaded and a text alternative that gives the value and whether it is low, normal or high. Only the two electrolyte lessons use it.

### Add a lesson

1. Write a rhythm builder in `src/rhythms/` that returns `assemble({...})`. Give every variant a **unique `id`** (it is a cache key) and make the description say "schematic".
2. Add `src/lessons/<name>.ts` exporting a `Lesson` (copy `af.ts` for the smallest example). Use `sequence([...])` for scenes and end with a scene whose `rhythm` is `null`: that is the summary.
3. Register it in `src/lessons/index.ts` (`LESSONS`, `GROUPS`) and add its id to `LessonId` in `src/lessons/types.ts`.
4. Add the rhythm's defining properties to `tests/rhythms-library.test.ts`. `tests/lessons.test.ts` and `tests/library-render.test.ts` pick the new lesson up automatically (timeline, captions, summary, render of every scene).

### Tests that guard the medicine

`tests/rhythms-library.test.ts` asserts the defining features of each rhythm, so a data change that breaks the clinical pattern fails the build. Examples: AVNRT uses slow-forward and fast-backward pathways with retrograde P under 70 ms and no accessory pathway; AVRT uses the accessory pathway backwards with RP of at least 70 ms but under half the R-R; AF has no organised atrial events and R-R intervals that never repeat; flutter keeps a constant 200 ms cycle and a fixed flutter-to-QRS interval for 2:1, 4:1 and variable conduction; junctional and ventricular escapes always arrive later than the preceding cycle, never earlier. For the ventricular and electrolyte lessons: a PVC is early, wide, has no conducted P and is followed by a full compensatory pause; VT is regular and wide with sinus P waves dissociated from it; torsades starts with short-long-short and R-on-T, has a long QT and a twisting envelope; VF has no QRS and never repeats; antidromic AVRT is regular and wide; pre-excited AF is irregular with a shortest R-R under 250 ms; aberrancy has an rSR′ complex; hypokalaemia shows a flat T, ST depression and a U wave that grows with severity; hyperkalaemia moves from a peaked T to flat P, long PR and wide QRS, then a sine wave.

## Project layout

```
src/Root.tsx            router shell: navigation + heart block / library / lesson pages
src/engine/             library engine: types, morphology, strip + diagram geometry, timeline
src/rhythms/            library rhythm builders (AVNRT, AVRT, WPW, aberrancy, AF, flutter, AT, escapes,
                        PVC, VT, torsades, VF, potassium stages)
src/lessons/            library lessons (copy, scenes, options, summaries) and registry
src/components/library/ ActivationDiagram, SignalStrip, LessonPlayer, LessonView,
                        LibraryIndex, RecognitionSummary, SiteNav, LevelMeter (K+ scale)
src/lib/route.ts        hash router
src/data/scenes.ts      heart-block scene timeline and ALL its on-screen copy
src/data/rhythms.ts     beat definitions (P onsets, PR intervals, escape beats)
src/lib/timeline.ts     which scene is active at time t
src/lib/waveform.ts     rhythm -> SVG ECG geometry
src/lib/signal.ts       rhythm time -> signal position in the schematic
src/hooks/              single requestAnimationFrame clock, reduced-motion hook
src/components/         ECGStrip, ConductionDiagram, StagePills, SceneCaption,
                        RecapPanel, EndCard, TimelineControls
src/styles.css          design tokens and styles
tests/                  Vitest specs
```

## Editing

- **Wording and timing:** `src/data/scenes.ts`. Scenes are contiguous; change `start`/`end` together and keep `DURATION` equal to the last `end`.
- **Rhythms:** `src/data/rhythms.ts`. Times are seconds; `pr` is P-wave onset to QRS onset and `null` means the P wave is not conducted. The tests in `tests/rhythms.test.ts` guard the clinical patterns.
- **Colours:** CSS variables at the top of `src/styles.css`. Orange means delay/PR, blue means P wave/signal, red means block/dropped beat, purple means escape/complete block.

## Controls and accessibility

Play/pause, restart, a timeline scrubber, and numbered scene buttons are native elements with visible focus rings. Scene, caption, diagram, and strip are all derived from one elapsed-time value, so scrubbing stays in sync. With `prefers-reduced-motion` (or the "Reduce motion" checkbox) nothing auto-plays: strips are fully drawn and you step with Previous/Next scene.

The library uses the same controls and adds: option pickers that are real radio groups (arrow keys move the selection), playback controls pinned to the bottom of the screen on phones, and automated checks with axe-core (WCAG 2 A/AA plus best practices) across every lesson, scene type and both phone and desktop widths.

## Clinical notes (heart block)

- **1st degree:** one long, constant PR; every P conducts.
- **Mobitz I (Wenckebach):** PR lengthens beat by beat until one P is not conducted, then resets. Usually the block is at the AV node.
- **Mobitz II:** constant PR, then a sudden non-conducted P. Usually the block is below the AV node.
- **Complete:** P waves march on at their own rate and none conducts; a slower escape rhythm drives the ventricles. Its rate and QRS width depend on where the escape focus sits.
- A 2:1 AV block is deliberately not shown: from the ratio alone it cannot be classed as Mobitz I or II.
- The conduction diagram is a simplified schematic, and the recap strips are teaching drawings, not patient tracings.
