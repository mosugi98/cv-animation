# Heart block: where the gate fails

An animated ECG explainer that walks through the four AV blocks (1st degree, Mobitz I, Mobitz II, complete) around one idea: **every P wave knocks, not every one gets in.** A simplified conduction schematic (atria, AV node, His-Purkinje, ventricles) stays synchronised with an ECG strip across 11 scenes (33 s). Everything is native SVG; there is no video file.

> Illustrative teaching animation; interpret real ECGs in clinical context.

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
| `npm test` | Vitest (timeline, rhythm, waveform, signal logic, render of every scene) |

## Deploy to GitHub Pages

1. Create a GitHub repository and push this folder to its `main` branch.
2. In the repository go to **Settings > Pages** and set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` lints, tests, builds, and publishes `dist/`. The site appears at `https://<user>.github.io/<repo>/`.

`vite.config.ts` uses `base: './'`, so asset paths are relative and the repository name does not matter.

Other hosts (Vercel, Netlify, Cloudflare Pages): build command `npm run build`, output directory `dist`.

## Project layout

```
src/data/scenes.ts      scene timeline and ALL on-screen copy
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

## Clinical notes

- **1st degree:** one long, constant PR; every P conducts.
- **Mobitz I (Wenckebach):** PR lengthens beat by beat until one P is not conducted, then resets. Usually the block is at the AV node.
- **Mobitz II:** constant PR, then a sudden non-conducted P. Usually the block is below the AV node.
- **Complete:** P waves march on at their own rate and none conducts; a slower escape rhythm drives the ventricles. Its rate and QRS width depend on where the escape focus sits.
- A 2:1 AV block is deliberately not shown: from the ratio alone it cannot be classed as Mobitz I or II.
- The conduction diagram is a simplified schematic, and the recap strips are teaching drawings, not patient tracings.
