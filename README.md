# Arrhythmia Animation Library

Short animated ECG lessons that show **how an arrhythmia works and what it looks like**. Each lesson keeps a simplified conduction schematic (atria, AV node, His-Purkinje, ventricles) in step with an ECG strip, with a caption, a playback timeline and a one-card **recognition summary**. Everything is native SVG; there is no video file. Built for revising cardiology (PPDS) but useful for any ECG learner.

> Illustrative teaching animations; interpret real ECGs in clinical context.

There are 29 lessons in ten groups: SVT, pre-excitation and aberrancy, atrial rhythms, sinus node disorders, AV block, bundle branch and fascicular block, escape rhythms, pacemakers, ventricular arrhythmias and electrolytes. The index is the home page (`#/`, also `#/library`). The original stand-alone "Heart block" page was merged into the five AV block lessons, so there is a single library and a single navigation entry.

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
| `npm test` | Vitest: the engine, every rhythm's clinical coherence, lesson timelines and caption synchronisation, and server-render of every lesson scene |

## Deploy to GitHub Pages

1. Create a GitHub repository and push this folder to its `main` branch.
2. In the repository go to **Settings > Pages** and set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` lints, tests, builds, and publishes `dist/`. The site appears at `https://<user>.github.io/<repo>/`.

`vite.config.ts` uses `base: './'`, so asset paths are relative and the repository name does not matter.

Other hosts (Vercel, Netlify, Cloudflare Pages): build command `npm run build`, output directory `dist`.

## Lessons

Every lesson is about 25-35 seconds with 5-7 scenes. Each scene has a synchronised caption, a conduction diagram and an ECG strip, and the last scene is a **rhythm recognition summary** (key line, defining features and the commonest look-alike).

| Lesson (URL) | What it shows | Options |
|---|---|---|
| AVNRT (`#/library/avnrt`) | Dual AV-node pathways. A premature atrial beat blocks in the fast pathway, goes down the slow one and returns up the fast one. Regular narrow tachycardia, P wave hidden in the QRS. | none |
| AVRT (`#/library/avrt`) | A macro-circuit: AV node down, accessory pathway up. Pre-excitation in sinus rhythm (short PR, delta wave), then orthodromic tachycardia with a retrograde P wave clearly after the QRS. | none |
| WPW (`#/library/wpw`) | Accessory pathway that bypasses the AV node. Short PR and delta wave in sinus rhythm; orthodromic AVRT (narrow); antidromic AVRT (wide, regular, mimics VT); pre-excited AF (irregular, wide, shortest R-R under 250 ms, avoid AV-nodal blockers). | Rhythm: sinus, orthodromic, antidromic, AF |
| SVT with aberrancy (`#/library/aberrancy`) | A premature atrial beat starts AVNRT, but the right bundle is still recovering: regular tachycardia with a wide rSR′ (RBBB) QRS, a look-alike for VT. | none |
| Atrial fibrillation (`#/library/af`) | Chaotic atrial wavelets, no P waves, fibrillatory baseline, an irregularly irregular ventricular response, with impulses blocked in the AV node. | none |
| Atrial flutter (`#/library/flutter`) | An organised right-atrial circuit at about 300/min with sawtooth waves and no flat baseline. | AV conduction pattern: 2:1, 4:1, variable |
| Atrial tachycardia (`#/library/at`) | Sinus rhythm, then a regular ectopic atrial focus with a different P wave and a flat baseline between waves. | AV conduction: 1:1, 2:1 |
| Sick sinus syndrome (`#/library/sss`) | A failing sinus node: AF that stops and leaves a long pause ended by a junctional escape (tachy-brady), or a slow rate with pauses. | Tachy-brady, bradycardia and pauses |
| SA block (`#/library/sinoblock`) | The node fires but the impulse cannot leave it. Type I: P-P shortens, then a pause under 2 × the shortest P-P. Type II: constant P-P, then a pause of exactly 2 × P-P. | Type I (Wenckebach), type II |
| Sinus arrest (`#/library/sinusarrest`) | The node stops. The pause is not a multiple of P-P, and may be ended by a late junctional escape. | Pause then sinus, junctional escape |
| First-degree AV block (`#/library/av1`) | PR 340 ms and constant; every P wave conducts. | none |
| Mobitz I, Wenckebach (`#/library/avm1`) | PR lengthens by shrinking steps, R-R shortens, then a P wave is dropped in the AV node (4:3). | none |
| Mobitz II (`#/library/avm2`) | Constant PR, then a sudden blocked P wave below the AV node; the pause is exactly 2 P-P intervals. | none |
| 2:1 and high-grade block (`#/library/avhigh`) | A fixed conduction ratio. 2:1 cannot be classed as Mobitz I or II from one strip; 3:1 is high-grade block. | 2:1, 3:1 |
| Complete heart block (`#/library/av3`) | Regular P waves, a slower regular escape, no relationship between them (AV dissociation). | Junctional (narrow) or ventricular (wide) escape |
| Left bundle branch block (`#/library/lbbb`) | Left bundle blocked, left ventricle activated late through muscle. Lead V6: broad notched R, no q, discordant T. | none |
| Right bundle branch block (`#/library/rbbb`) | Right bundle blocked, right ventricle late. Lead V1: rSR′ and an inverted T. | none |
| Fascicular blocks (`#/library/fascicular`) | The left bundle drawn as anterior and posterior fascicles. Block of one shifts the axis (rS in II or I) without widening the QRS; with RBBB it makes a bifascicular block. | LAFB, LPFB, bifascicular, bifascicular with long PR |
| Junctional escape (`#/library/junctional`) | Sinus node stops; after a pause the AV junction fires. Narrow QRS, retrograde P. | Escape beat or escape rhythm |
| Ventricular escape (`#/library/ventricular`) | AV block: P waves march on unconducted; after a long pause a wide-complex ventricular escape fires. | Escape beat or escape rhythm |
| Pacemaker modes (`#/library/pacemaker`) | AAI, VVI, VOO (magnet response), VDD, DDI and DDD (all four states: AS-VP, AP-VP, AP-VS, AS-VS). The summaries mention rate response and leadless devices. | AAI, VVI, VOO, VDD, DDI, DDD |
| Pacing sites (`#/library/pacing-physio`) | The same spike gives a different QRS: right ventricular apical (about 170 ms, LBBB pattern), biventricular (about 120 ms), conduction-system pacing (about 100 ms). | RV, biventricular, conduction system |
| Pacemaker malfunction (`#/library/pacing-fault`) | Failure to capture, undersensing, oversensing (noise inhibits the spike) and failure to output. | Four faults |
| PVC (`#/library/pvc`) | Early, wide, bizarre beat with no P wave and a discordant T wave; the sinus rhythm is not reset, so the pause is fully compensatory. | Single PVC, bigeminy, couplet |
| Ventricular tachycardia (`#/library/vt`) | A fast, regular, wide-complex rhythm from a ventricular circuit, with AV dissociation. | Sustained or non-sustained |
| Torsades de pointes (`#/library/torsades`) | Long QT, then short-long-short (PVC, pause, R-on-T PVC), then a twisting polymorphic VT. | Stops by itself, or degenerates to VF |
| Ventricular fibrillation (`#/library/vf`) | Fast ventricular rhythm breaks into chaos: no QRS, no output. | Coarse or fine |
| Hypokalaemia (`#/library/hypokalemia`) | A potassium meter falls while the ECG shows flat T, ST depression, U waves and PVCs. | none |
| Hyperkalaemia (`#/library/hyperkalemia`) | A potassium meter rises while the ECG goes through peaked T, flat P with long PR and wide QRS, then a sine wave. | none |

Options are selected on the lesson page and stored in the URL (`#/library/flutter?option=4%3A1`), so a link opens the same variant. Hash routes mean GitHub Pages needs no rewrite rules.

Everything on screen is labelled **schematic educational example, not a patient tracing**. Rates, intervals and morphology are simplified: for instance, flutter-wave polarity is not lead-specific, and the bundle and fascicular strips show one chosen lead (V6 for LBBB, V1 for RBBB, lead II or I for the fascicular blocks).

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

### Pacemakers, fascicles and the diagram

- **Colour code:** blue is sinus or normal conduction, orange is delay or slow spread through muscle, red is block or danger, purple is an escape or retrograde impulse, navy is R-R bars, and **teal is pacemaker output**.
- **Pacing events:** `src/rhythms/pacing.ts` turns a script of atrial events (AS, AP) and ventricular events (VS, VP, a spike that fails to capture, an escape beat) into a rhythm. It uses a 60/min lower rate (1.0 s), a 200 ms paced and 170 ms sensed AV delay and a 300 ms refractory period, so spikes, captured beats and wasted spikes follow from the rules rather than from hand-placed beats.
- **Diagram options:** `DiagramConfig` can draw the left bundle as two fascicles (`fascicles`) and a pacemaker generator with any of an atrial, right ventricular, left ventricular or His lead (`pacemaker`). A lesson whose drawing depends on the option sets `diagramFor(option)`, so VVI draws one lead, DDD two, biventricular pacing the right and left ventricular leads, and a ventricular escape (but not a junctional one) shows its focus.

### Level meter
A scene may set `meter` (serum potassium in mmol/L); `LessonPlayer` then shows a `LevelMeter` above the diagram, with the normal range (3.5-5.0) shaded and a text alternative that gives the value and whether it is low, normal or high. Only the two electrolyte lessons use it.

### Add a lesson

1. Write a rhythm builder in `src/rhythms/` that returns `assemble({...})`. Give every variant a **unique `id`** (it is a cache key) and make the description say "schematic".
2. Add `src/lessons/<name>.ts` exporting a `Lesson` (copy `af.ts` for the smallest example). Use `sequence([...])` for scenes (`secs(window, from, to)` writes a span in seconds of the strip) and end with a scene whose `rhythm` is `null`: that is the summary.
3. Register it in `src/lessons/index.ts` (`LESSONS`, `GROUPS`) and add its id to `LessonId` in `src/lessons/types.ts`.
4. Add the rhythm's defining properties to a rhythm test (`tests/rhythms-*.test.ts`) and a synchronisation test to `tests/lessons.test.ts`. The generic lesson and render tests pick the new lesson up automatically (timeline, captions, summary, render of every scene), and update the lesson count in `tests/lessons.test.ts` and the group count in `tests/library-render.test.tsx`.

### Tests that guard the medicine

`tests/rhythms-library.test.ts` asserts the defining features of each rhythm, so a data change that breaks the clinical pattern fails the build. Examples: AVNRT uses slow-forward and fast-backward pathways with retrograde P under 70 ms and no accessory pathway; AVRT uses the accessory pathway backwards with RP of at least 70 ms but under half the R-R; AF has no organised atrial events and R-R intervals that never repeat; flutter keeps a constant 200 ms cycle and a fixed flutter-to-QRS interval for 2:1, 4:1 and variable conduction; junctional and ventricular escapes always arrive later than the preceding cycle, never earlier. For the ventricular and electrolyte lessons: a PVC is early, wide, has no conducted P and is followed by a full compensatory pause; VT is regular and wide with sinus P waves dissociated from it; torsades starts with short-long-short and R-on-T, has a long QT and a twisting envelope; VF has no QRS and never repeats; antidromic AVRT is regular and wide; pre-excited AF is irregular with a shortest R-R under 250 ms; aberrancy has an rSR′ complex; hypokalaemia shows a flat T, ST depression and a U wave that grows with severity; hyperkalaemia moves from a peaked T to flat P, long PR and wide QRS, then a sine wave.

`tests/rhythms-conduction.test.ts` does the same for the conduction and pacing rhythms. AV block: first-degree PR is constant at 340 ms; Wenckebach PR lengthens by shrinking steps and the pause is under two shortest R-R intervals; Mobitz II keeps a constant PR with a pause of exactly two P-P intervals, blocked below the node; 2:1 and 3:1 keep a fixed ratio; complete block has regular P waves and a slower regular escape (narrow if junctional, wide if ventricular) with a changing PR. Sinus node: type II SA block pauses for exactly 2 × P-P, type I shortens P-P with a pause under 2 × the shortest, sinus arrest is not a multiple of P-P, tachy-brady has an irregular fast AF run followed by a pause and an escape. Bundles: LBBB and RBBB are 120 ms or more with discordant T, LBBB has no q and a notch, RBBB has rSR′, LAFB and LPFB stay under 120 ms with an rS pattern. Pacing: AAI inhibits on a sensed P, VVI spikes are exactly 1.0 s apart and never fire within 1.0 s of a native QRS, VOO spikes ignore the rhythm and some land in refractory tissue, VDD tracks after 170 ms and ignores a P wave in the refractory period, DDI never tracks, the four DDD states each show their defining pattern, RV pacing is wider than biventricular pacing, which is wider than conduction-system pacing, and each malfunction shows what it names. `tests/lessons.test.ts` checks that every caption scene contains the beat it describes and that no rhythm id is reused for a different rhythm.

## Project layout

```
src/Root.tsx            router shell: navigation + library index / lesson pages
src/engine/             types, morphology (waveform primitives), strip + diagram geometry, timeline
src/rhythms/            rhythm builders: SVT, WPW, aberrancy, atrial, escapes, ventricular, potassium,
                        avblock, sinusnode (SA block, arrest, SSS), bundle (BBB, fascicles), pacing
src/lessons/            lessons (copy, scenes, options, summaries) and the registry
src/components/library/ ActivationDiagram, SignalStrip, LessonPlayer, LessonView,
                        LibraryIndex, RecognitionSummary, SiteNav, LevelMeter (K+ scale)
src/components/         SceneCaption, TimelineControls
src/lib/route.ts        hash router
src/hooks/              single requestAnimationFrame clock, reduced-motion hook
src/styles.css          design tokens and styles
tests/                  Vitest specs
```

## Editing

- **Wording and timing:** the lesson file in `src/lessons/`. Scene times come from `sequence()`, so change a duration and the rest shift; keep the total between 24 and 40 s.
- **Rhythms:** the builder in `src/rhythms/`. Times are seconds; the rhythm tests guard the clinical pattern.
- **Colours:** CSS variables at the top of `src/styles.css`, and the colour code listed above.

## Controls and accessibility

Play/pause, restart, a timeline scrubber, and numbered scene buttons are native elements with visible focus rings. Scene, caption, diagram, and strip are all derived from one elapsed-time value, so scrubbing stays in sync. With `prefers-reduced-motion` (or the "Reduce motion" checkbox) nothing auto-plays: strips are fully drawn and you step with Previous/Next scene.

The library uses the same controls and adds: option pickers that are real radio groups (arrow keys move the selection), playback controls pinned to the bottom of the screen on phones, and automated checks with axe-core (WCAG 2 A/AA plus best practices) across every lesson, scene type and both phone and desktop widths.

## Clinical notes

- **AV block:** first degree is a long constant PR; Wenckebach (Mobitz I) has a lengthening PR with the block in the node; Mobitz II has a constant PR with a sudden drop and the block below the node, and needs a pacemaker; 2:1 cannot be classed as Mobitz I or II from the ratio alone; in complete block the escape rate and QRS width depend on where the escape focus sits.
- **Sinus node:** SA block is told from sinus arrest by the pause: a multiple of P-P in type II, shorter than twice the shortest P-P in type I, unrelated to P-P in arrest.
- **Bundles and fascicles:** a bundle branch block widens the QRS to 120 ms or more, a fascicular block changes the axis but not the width.
- **Pacemakers:** the lessons show the standard NBG behaviours (inhibit, trigger, track). A magnet makes a pacemaker pace asynchronously; over an ICD it only suspends tachycardia therapy. Leadless pacemakers give the same ECG as a transvenous right ventricular device. Rate response (the letter R) is described but not drawn.
- The conduction diagram is a simplified schematic, and every strip is a teaching drawing, not a patient tracing.
