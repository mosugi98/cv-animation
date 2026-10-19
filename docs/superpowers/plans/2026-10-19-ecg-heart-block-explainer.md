# ECG Heart Block Explainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an upload-ready Vite + React + TypeScript web app that recreates the reference ECG teaching video (four AV blocks, 33 s, 11 scenes) as native SVG visuals with synchronized playback controls.

**Architecture:** Pure TypeScript data and logic (`data/`, `lib/`) drives everything from one elapsed-time value; React components only render derived state. One `requestAnimationFrame` loop in `usePlayback` is the single time source. ECG traces and the conduction schematic are inline SVG.

**Tech Stack:** Vite, React 19, TypeScript (strict), Vitest, ESLint 9 (flat config), GitHub Pages workflow.

Spec: `docs/superpowers/specs/2026-10-19-ecg-heart-block-explainer-design.md`

## Global Constraints

- Runtime dependencies: `react` and `react-dom` only. Everything else is a dev dependency.
- Vite `base: './'` so the repo name never matters.
- Node 22 in CI; npm scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`.
- Total timeline is 33 s; 11 scenes of 3 s each. All scene copy lives only in `src/data/scenes.ts`.
- Disclaimer text, verbatim: `Illustrative teaching animation; interpret real ECGs in clinical context.`
- Diagram is labelled `simplified schematic`; recap card is labelled `TEACHING DRAWING · NOT A PATIENT TRACING`.
- No embedded video, no analytics, no external services, no external fonts, no secrets.
- Do not use the reference creator's handle or branding; copy is original wording.
- Copy must avoid apostrophes and double quotes (keeps HTML escaping trivial in render tests).
- Accent meaning: orange = delay/PR, blue = P wave/signal, red = block/dropped beat, purple = escape/complete block.
- Playback is deterministic: scene, caption, highlights, and trace sweep are pure functions of elapsed time. No component owns a timer.
- Commit messages end with these two trailer lines (set `TRAILER` inline in each commit command):
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01BMeBiYj8aGmYgy2kH1iZXw`

## File Structure

```
index.html                      Vite entry
package.json, tsconfig.json, vite.config.ts, eslint.config.js, .gitignore
src/main.tsx                    mounts <App/>
src/App.tsx                     composes scene layout + controls
src/styles.css                  tokens + all component styles
src/data/scenes.ts              types, DURATION, PILLS, SCENES (all copy)
src/data/rhythms.ts             beat definitions for 5 rhythms
src/lib/timeline.ts             sceneIndexAt, sceneAt, sceneProgress, stepScene
src/lib/waveform.ts             rhythm -> SVG geometry (pure)
src/lib/signal.ts               rhythm + rhythm-time -> diagram signal state (pure)
src/hooks/usePlayback.ts        single rAF clock
src/hooks/usePrefersReducedMotion.ts
src/components/ECGStrip.tsx
src/components/ConductionDiagram.tsx
src/components/StagePills.tsx
src/components/SceneCaption.tsx
src/components/RecapPanel.tsx
src/components/EndCard.tsx
src/components/TimelineControls.tsx
tests/timeline.test.ts, tests/rhythms.test.ts, tests/waveform.test.ts,
tests/signal.test.ts, tests/render.test.tsx
.github/workflows/deploy.yml
README.md
```

---

### Task 1: Project scaffold and tooling

**Files:**
- Create: `package.json` (via npm), `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.gitignore`, `index.html`, `src/main.tsx` (placeholder)

**Interfaces:**
- Produces: working `npm run lint | typecheck | test | build | dev` scripts used by every later task.

- [ ] **Step 1: Initialise package and install dependencies**

```bash
cd /home/claude/ecg-heart-block-explainer
npm init -y >/dev/null
npm pkg set name=ecg-heart-block-explainer private=true version=1.0.0 type=module
npm pkg delete main keywords author license description scripts.test
npm pkg set scripts.dev=vite scripts.build="tsc --noEmit && vite build" scripts.preview="vite preview" scripts.lint=eslint scripts.typecheck="tsc --noEmit" scripts.test="vitest run"
npm install react react-dom
npm install -D vite @vitejs/plugin-react typescript vitest eslint @eslint/js typescript-eslint eslint-plugin-react-hooks globals @types/react @types/react-dom
```

Expected: installs succeed; `package.json` has only `react` and `react-dom` under `dependencies`.

- [ ] **Step 2: Write config files**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
```

`eslint.config.js`:
```js
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
]);
```

`.gitignore`:
```
node_modules
dist
*.log
.DS_Store
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Animated ECG explainer: how the four AV heart blocks differ, from 1st degree to complete block." />
    <meta name="theme-color" content="#f6f1e7" />
    <link rel="icon" href="data:," />
    <title>Heart block: where the gate fails</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx` (placeholder, replaced in Task 5):
```ts
const root = document.getElementById('root');
if (root) root.textContent = 'ECG explainer';
```

- [ ] **Step 3: Verify the toolchain**

Run: `npm run typecheck && npm run lint && npx vitest run --passWithNoTests && npm run build`
Expected: all four succeed (vitest reports no test files; build writes `dist/`). If `eslint-plugin-react-hooks` config shape differs in the installed version, adjust the `rules` line only.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -q -m "chore: scaffold Vite React TS project with lint and test tooling" -m "$TRAILER"
```

---

### Task 2: Scene data and timeline logic

**Files:**
- Create: `src/data/scenes.ts`, `src/lib/timeline.ts`
- Test: `tests/timeline.test.ts`

**Interfaces:**
- Produces from `src/data/scenes.ts`: types `Accent`, `Kind`, `PillId`, `RhythmId`, `BlockSite`, `Focus`, `Scene`; constants `DURATION: number`, `PILLS: {id: PillId; label: string; accent: Accent}[]`, `SCENES: Scene[]`.
- Produces from `src/lib/timeline.ts`: `clampTime(t)`, `sceneIndexAt(t): number`, `sceneAt(t): Scene`, `sceneProgress(t): number` (0..1 within scene), `stepScene(t, dir: 1 | -1): number`.

- [ ] **Step 1: Write the failing test** — `tests/timeline.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { DURATION, SCENES } from '../src/data/scenes';
import { sceneAt, sceneIndexAt, sceneProgress, stepScene } from '../src/lib/timeline';

describe('scene data', () => {
  it('is contiguous from 0 to DURATION with unique ids', () => {
    expect(SCENES[0].start).toBe(0);
    expect(SCENES[SCENES.length - 1].end).toBe(DURATION);
    SCENES.forEach((s, i) => {
      if (i > 0) expect(s.start).toBe(SCENES[i - 1].end);
      expect(s.end).toBeGreaterThan(s.start);
    });
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(SCENES.length);
    expect(DURATION).toBe(33);
    expect(SCENES).toHaveLength(11);
  });

  it('maps block sites to the right lesson scenes', () => {
    const byId = Object.fromEntries(SCENES.map((s) => [s.id, s]));
    expect(byId['mob1-b'].block).toBe('av-node');
    expect(byId['mob2-b'].block).toBe('infra-nodal');
    expect(byId['comp-a'].block).toBe('both');
    expect(byId['first-a'].block).toBe('none');
  });

  it('has copy in every scene and no apostrophes or quotes', () => {
    for (const s of SCENES) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(`${s.title}${s.sub}${s.note ?? ''}${s.noteSub ?? ''}`).not.toMatch(/['"]/);
    }
  });
});

describe('timeline', () => {
  it('finds the scene at boundaries and clamps out-of-range times', () => {
    expect(sceneAt(0).id).toBe('hook');
    expect(sceneAt(2.99).id).toBe('hook');
    expect(sceneAt(3).id).toBe('first-a');
    expect(sceneAt(32.99).id).toBe('end');
    expect(sceneAt(33).id).toBe('end');
    expect(sceneAt(-5).id).toBe('hook');
    expect(sceneAt(99).id).toBe('end');
    expect(sceneIndexAt(9)).toBe(3);
  });

  it('reports progress within the scene', () => {
    expect(sceneProgress(3)).toBe(0);
    expect(sceneProgress(4.5)).toBeCloseTo(0.5);
    expect(sceneProgress(33)).toBe(1);
    expect(sceneProgress(0)).toBe(0);
  });

  it('steps between scenes', () => {
    expect(stepScene(0, 1)).toBe(3);
    expect(stepScene(4.5, 1)).toBe(6);
    expect(stepScene(32, 1)).toBe(30);
    expect(stepScene(4.5, -1)).toBe(3);
    expect(stepScene(3.1, -1)).toBe(0);
    expect(stepScene(0, -1)).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/timeline.test.ts`
Expected: FAIL (cannot resolve `../src/data/scenes`).

- [ ] **Step 3: Write `src/data/scenes.ts`**

```ts
export type Accent = 'navy' | 'orange' | 'blue' | 'red' | 'purple';
export type Kind = 'hook' | 'lesson' | 'recap' | 'end';
export type PillId = 'first' | 'mobitz1' | 'mobitz2' | 'complete';
export type RhythmId = 'sinus' | 'first' | 'mobitz1' | 'mobitz2' | 'complete';
export type BlockSite = 'none' | 'av-node' | 'infra-nodal' | 'both';
export type Focus = 'none' | 'pr' | 'dropped' | 'escape';

export interface Scene {
  id: string;
  start: number;
  end: number;
  kind: Kind;
  activePills: PillId[];
  rhythm: RhythmId | null;
  block: BlockSite;
  focus: Focus;
  title: string;
  sub: string;
  accent: Accent;
  note?: string;
  noteSub?: string;
}

export const DURATION = 33;

export const PILLS: { id: PillId; label: string; accent: Accent }[] = [
  { id: 'first', label: '1 · 1st degree', accent: 'orange' },
  { id: 'mobitz1', label: '2 · Mobitz I', accent: 'orange' },
  { id: 'mobitz2', label: '3 · Mobitz II', accent: 'red' },
  { id: 'complete', label: '4 · Complete', accent: 'purple' },
];

const ALL: PillId[] = ['first', 'mobitz1', 'mobitz2', 'complete'];

export const SCENES: Scene[] = [
  {
    id: 'hook', start: 0, end: 3, kind: 'hook', activePills: [], rhythm: 'sinus',
    block: 'none', focus: 'none', accent: 'red',
    title: 'Every P wave knocks.', sub: 'Not every one gets in.',
    note: 'Watch where the gate fails.', noteSub: 'Four degrees of AV block, one gate.',
  },
  {
    id: 'first-a', start: 3, end: 6, kind: 'lesson', activePills: ['first'], rhythm: 'first',
    block: 'none', focus: 'none', accent: 'orange',
    title: 'Each P wave reaches the AV gate.', sub: '1st degree: the gate opens slowly.',
  },
  {
    id: 'first-b', start: 6, end: 9, kind: 'lesson', activePills: ['first'], rhythm: 'first',
    block: 'none', focus: 'pr', accent: 'blue',
    title: 'The PR is long, but every P gets a QRS.', sub: 'Slow, yet nothing is dropped.',
  },
  {
    id: 'mob1-a', start: 9, end: 12, kind: 'lesson', activePills: ['mobitz1'], rhythm: 'mobitz1',
    block: 'none', focus: 'pr', accent: 'orange',
    title: 'Mobitz I: the delay keeps growing.', sub: 'Longer PR, beat after beat.',
  },
  {
    id: 'mob1-b', start: 12, end: 15, kind: 'lesson', activePills: ['mobitz1'], rhythm: 'mobitz1',
    block: 'av-node', focus: 'dropped', accent: 'red',
    title: 'Then one P is not conducted.', sub: 'The cycle resets. Usually the block is in the AV node.',
  },
  {
    id: 'mob2-a', start: 15, end: 18, kind: 'lesson', activePills: ['mobitz2'], rhythm: 'mobitz2',
    block: 'none', focus: 'pr', accent: 'blue',
    title: 'Mobitz II: the PR stays the same.', sub: 'No warning before the drop.',
  },
  {
    id: 'mob2-b', start: 18, end: 21, kind: 'lesson', activePills: ['mobitz2'], rhythm: 'mobitz2',
    block: 'infra-nodal', focus: 'dropped', accent: 'red',
    title: 'Then one P suddenly fails to conduct.', sub: 'Usually lower: below the AV node.',
  },
  {
    id: 'comp-a', start: 21, end: 24, kind: 'lesson', activePills: ['complete'], rhythm: 'complete',
    block: 'both', focus: 'dropped', accent: 'red',
    title: 'Complete block: no P gets through.', sub: 'The P waves keep marching on.',
  },
  {
    id: 'comp-b', start: 24, end: 27, kind: 'lesson', activePills: ['complete'], rhythm: 'complete',
    block: 'both', focus: 'escape', accent: 'purple',
    title: 'The ventricles beat on their own.', sub: 'Escape rhythm: slower, and unrelated to the P waves.',
  },
  {
    id: 'recap', start: 27, end: 30, kind: 'recap', activePills: ALL, rhythm: null,
    block: 'none', focus: 'none', accent: 'red',
    title: 'Read the PR first.', sub: 'Then find the P that never gets in.',
  },
  {
    id: 'end', start: 30, end: 33, kind: 'end', activePills: [], rhythm: null,
    block: 'none', focus: 'none', accent: 'blue',
    title: 'Save this for your next strip.', sub: 'Share it with someone learning to read ECGs.',
  },
];
```

- [ ] **Step 4: Write `src/lib/timeline.ts`**

```ts
import { DURATION, SCENES, type Scene } from '../data/scenes';

export function clampTime(t: number): number {
  return Math.min(Math.max(t, 0), DURATION);
}

export function sceneIndexAt(t: number): number {
  const c = clampTime(t);
  const i = SCENES.findIndex((s) => c >= s.start && c < s.end);
  return i === -1 ? SCENES.length - 1 : i;
}

export function sceneAt(t: number): Scene {
  return SCENES[sceneIndexAt(t)];
}

/** 0..1 position inside the current scene. */
export function sceneProgress(t: number): number {
  const s = sceneAt(t);
  const p = (clampTime(t) - s.start) / (s.end - s.start);
  return Math.min(Math.max(p, 0), 1);
}

/** Start time of the next scene (dir 1) or of the current/previous scene (dir -1). */
export function stepScene(t: number, dir: 1 | -1): number {
  const i = sceneIndexAt(t);
  if (dir === 1) return SCENES[Math.min(i + 1, SCENES.length - 1)].start;
  return clampTime(t) - SCENES[i].start > 0.3 ? SCENES[i].start : SCENES[Math.max(i - 1, 0)].start;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/timeline.test.ts && npm run typecheck`
Expected: PASS (7 tests), typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -q -m "feat: add scene timeline data and lookup logic" -m "$TRAILER"
```

---

### Task 3: Rhythm model, ECG geometry, and conduction signal

**Files:**
- Create: `src/data/rhythms.ts`, `src/lib/waveform.ts`, `src/lib/signal.ts`
- Test: `tests/rhythms.test.ts`, `tests/waveform.test.ts`, `tests/signal.test.ts`

**Interfaces:**
- Consumes: types `Accent`, `BlockSite`, `RhythmId` from `src/data/scenes.ts`.
- Produces from `rhythms.ts`: `Beat {pOnset: number; pr: number | null}`, `Rhythm {id; label; description; window; beats; escapes: number[]; dropSite: BlockSite; tag: {time; text; accent} | null}`, `RHYTHMS: Record<RhythmId, Rhythm>`, `conductedPRs(r): number[]`, `droppedCount(r): number`. All times in seconds; `pr` is P onset to QRS onset; `null` means not conducted.
- Produces from `waveform.ts`: `STRIP {width:300,height:100,baseline:56,scale:38,pxPerSec:50}`, `StripGeometry`, `buildStrip(r): StripGeometry` (cached per rhythm id), `yAt(g, rt): number`.
- Produces from `signal.ts`: `SignalState {s: number | null; fade: number; stall: 'none'|'av-node'|'infra-nodal'; escape: number}`, `signalAt(r, rt): SignalState`. `s` runs 0 (atria) → 0.3 (AV node) → 0.6 (His) → 1 (ventricles).

- [ ] **Step 1: Write failing tests**

`tests/rhythms.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { RHYTHMS, conductedPRs, droppedCount } from '../src/data/rhythms';

describe('rhythm definitions are clinically coherent', () => {
  it('1st degree: every P conducts and PR is above 0.20 s', () => {
    const r = RHYTHMS.first;
    expect(droppedCount(r)).toBe(0);
    expect(conductedPRs(r).every((p) => p > 0.2)).toBe(true);
    expect(new Set(conductedPRs(r)).size).toBe(1);
  });

  it('Mobitz I: PR lengthens (shrinking increments), one drop, then resets', () => {
    const prs = RHYTHMS.mobitz1.beats.map((b) => b.pr);
    const drop = prs.indexOf(null);
    const before = prs.slice(0, drop) as number[];
    expect(droppedCount(RHYTHMS.mobitz1)).toBe(1);
    expect(before.length).toBeGreaterThanOrEqual(3);
    expect(before.every((p, i) => i === 0 || p > before[i - 1])).toBe(true);
    expect(before[2] - before[1]).toBeLessThan(before[1] - before[0]);
    expect(prs[drop + 1]).toBe(before[0]);
  });

  it('Mobitz I: the pause is shorter than two P-P intervals', () => {
    const r = RHYTHMS.mobitz1;
    const q = r.beats.filter((b) => b.pr !== null).map((b) => b.pOnset + (b.pr as number));
    const pp = r.beats[1].pOnset - r.beats[0].pOnset;
    expect(q[3] - q[2]).toBeLessThan(2 * pp);
  });

  it('Mobitz II: constant PR, exactly one drop, pause equals two P-P intervals', () => {
    const r = RHYTHMS.mobitz2;
    expect(new Set(conductedPRs(r)).size).toBe(1);
    expect(droppedCount(r)).toBe(1);
    const q = r.beats.filter((b) => b.pr !== null).map((b) => b.pOnset + (b.pr as number));
    const pp = r.beats[1].pOnset - r.beats[0].pOnset;
    expect(q[3] - q[2]).toBeCloseTo(2 * pp);
  });

  it('Complete: no P conducts; escape rhythm is regular and unrelated to P', () => {
    const r = RHYTHMS.complete;
    expect(conductedPRs(r)).toHaveLength(0);
    expect(droppedCount(r)).toBe(r.beats.length);
    const gaps = r.escapes.slice(1).map((e, i) => e - r.escapes[i]);
    expect(new Set(gaps.map((g) => g.toFixed(2))).size).toBe(1);
    const pp = r.beats[1].pOnset - r.beats[0].pOnset;
    expect(gaps[0]).not.toBeCloseTo(pp);
    const offsets = r.escapes.map((e) => e - Math.max(...r.beats.map((b) => b.pOnset).filter((p) => p <= e)));
    expect(new Set(offsets.map((o) => o.toFixed(2))).size).toBe(offsets.length);
  });

  it('keeps every wave inside the strip window', () => {
    for (const r of Object.values(RHYTHMS)) {
      for (const b of r.beats) expect(b.pOnset + (b.pr ?? 0) + 0.6).toBeLessThanOrEqual(r.window);
      for (const e of r.escapes) expect(e + 0.6).toBeLessThanOrEqual(r.window);
    }
  });
});
```

`tests/waveform.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { RHYTHMS } from '../src/data/rhythms';
import { STRIP, buildStrip, yAt } from '../src/lib/waveform';

describe('buildStrip', () => {
  it('is deterministic and cached', () => {
    const a = buildStrip(RHYTHMS.mobitz1);
    const b = buildStrip(RHYTHMS.mobitz1);
    expect(a.trace).toBe(b.trace);
    expect(a.trace.startsWith('M')).toBe(true);
    expect(a.samples).toHaveLength(1201);
  });

  it('Mobitz I: five P dots (one red), growing PR bars, one no-QRS label', () => {
    const g = buildStrip(RHYTHMS.mobitz1);
    expect(g.pDots.map((d) => d.conducted)).toEqual([true, true, true, false, true]);
    const widths = g.prBars.map((b) => Math.round((b.x2 - b.x1) * 10) / 10);
    expect(widths).toEqual([8, 13, 16, 8]);
    expect(g.noQrs).toHaveLength(1);
    expect(g.noQrs[0].x).toBeCloseTo((3.5 + 0.05) * STRIP.pxPerSec);
    expect(g.tag?.text).toBe('MOBITZ I');
  });

  it('Mobitz II: equal PR bars, QRS onsets show a double-length pause', () => {
    const g = buildStrip(RHYTHMS.mobitz2);
    const widths = g.prBars.map((b) => b.x2 - b.x1);
    expect(new Set(widths.map((w) => w.toFixed(2))).size).toBe(1);
    expect(g.qrsOnsets).toHaveLength(4);
    expect(g.qrsOnsets[3] - g.qrsOnsets[2]).toBeCloseTo(2);
    expect(g.qrsOnsets[2] - g.qrsOnsets[1]).toBeCloseTo(1);
  });

  it('1st degree: every PR bar is the same long width', () => {
    const g = buildStrip(RHYTHMS.first);
    expect(g.prBars).toHaveLength(5);
    g.prBars.forEach((b) => expect(b.x2 - b.x1).toBeCloseTo(0.32 * STRIP.pxPerSec));
  });

  it('Complete: all P dots red, no PR bars, three escape segments', () => {
    const g = buildStrip(RHYTHMS.complete);
    expect(g.pDots.every((d) => !d.conducted)).toBe(true);
    expect(g.prBars).toHaveLength(0);
    expect(g.noQrs).toHaveLength(0);
    expect(g.escapeSegments).toHaveLength(3);
  });

  it('draws a tall R wave at the QRS and stays near baseline at the start', () => {
    const g = buildStrip(RHYTHMS.mobitz2);
    expect(yAt(g, 0)).toBeGreaterThan(STRIP.baseline - 1);
    expect(yAt(g, 0.5 + 0.16 + 0.05)).toBeLessThan(STRIP.baseline - 30);
  });
});
```

`tests/signal.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { RHYTHMS } from '../src/data/rhythms';
import { signalAt } from '../src/lib/signal';

describe('signalAt', () => {
  it('shows nothing before the first P wave', () => {
    expect(signalAt(RHYTHMS.sinus, 0.2).s).toBeNull();
  });

  it('travels from atria toward the AV node, then reaches the ventricles at the QRS', () => {
    const mid = signalAt(RHYTHMS.sinus, 0.5 + 0.05);
    expect(mid.s).toBeCloseTo(0.15);
    const arrived = signalAt(RHYTHMS.sinus, 0.5 + 0.16);
    expect(arrived.s).toBe(1);
  });

  it('dwells at the AV node when the PR is long', () => {
    const dwell = signalAt(RHYTHMS.first, 0.5 + 0.2);
    expect(dwell.s).toBeCloseTo(0.3);
    expect(dwell.stall).toBe('none');
  });

  it('stalls a Mobitz I drop at the AV node', () => {
    const st = signalAt(RHYTHMS.mobitz1, 3.5 + 0.15);
    expect(st.s).toBeCloseTo(0.3);
    expect(st.stall).toBe('av-node');
  });

  it('stalls a Mobitz II drop below the AV node', () => {
    const st = signalAt(RHYTHMS.mobitz2, 3.5 + 0.25);
    expect(st.s).toBeCloseTo(0.6);
    expect(st.stall).toBe('infra-nodal');
  });

  it('fires the escape pulse in complete block and fades it', () => {
    expect(signalAt(RHYTHMS.complete, 1.3 + 0.1).escape).toBeGreaterThan(0.8);
    expect(signalAt(RHYTHMS.complete, 1.3 + 1.0).escape).toBe(0);
    expect(signalAt(RHYTHMS.mobitz2, 3).escape).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rhythms.test.ts tests/waveform.test.ts tests/signal.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write `src/data/rhythms.ts`**

```ts
import type { Accent, BlockSite, RhythmId } from './scenes';

export interface Beat {
  /** P wave onset, seconds. */
  pOnset: number;
  /** PR interval (P onset to QRS onset) in seconds; null = P not conducted. */
  pr: number | null;
}

export interface Rhythm {
  id: RhythmId;
  label: string;
  description: string;
  /** Length of the strip window in seconds. */
  window: number;
  beats: Beat[];
  /** Onset times of independent (escape) ventricular beats. */
  escapes: number[];
  /** Where a non-conducted impulse stops, for the schematic. */
  dropSite: BlockSite;
  tag: { time: number; text: string; accent: Accent } | null;
}

const P_ONSETS = [0.5, 1.5, 2.5, 3.5, 4.5];
const beats = (prs: (number | null)[]): Beat[] => prs.map((pr, i) => ({ pOnset: P_ONSETS[i], pr }));

export const RHYTHMS: Record<RhythmId, Rhythm> = {
  sinus: {
    id: 'sinus', label: 'Normal sinus rhythm',
    description: 'Every P wave is followed by a QRS with a normal PR interval.',
    window: 6, beats: beats([0.16, 0.16, 0.16, 0.16, 0.16]), escapes: [], dropSite: 'none', tag: null,
  },
  first: {
    id: 'first', label: '1st degree AV block',
    description: 'Every P wave is followed by a QRS, with a long constant PR interval.',
    window: 6, beats: beats([0.32, 0.32, 0.32, 0.32, 0.32]), escapes: [], dropSite: 'none', tag: null,
  },
  mobitz1: {
    id: 'mobitz1', label: 'Mobitz I (Wenckebach)',
    description: 'The PR interval lengthens beat by beat until one P wave is not conducted, then resets.',
    window: 6, beats: beats([0.16, 0.26, 0.32, null, 0.16]), escapes: [], dropSite: 'av-node',
    tag: { time: 3.55, text: 'MOBITZ I', accent: 'orange' },
  },
  mobitz2: {
    id: 'mobitz2', label: 'Mobitz II',
    description: 'The PR interval stays constant, then one P wave is suddenly not conducted.',
    window: 6, beats: beats([0.16, 0.16, 0.16, null, 0.16]), escapes: [], dropSite: 'infra-nodal',
    tag: { time: 3.55, text: 'MOBITZ II', accent: 'red' },
  },
  complete: {
    id: 'complete', label: 'Complete (3rd degree) AV block',
    description: 'P waves march at their own rate and no P wave conducts. A slower escape rhythm drives the ventricles.',
    window: 6, beats: beats([null, null, null, null, null]), escapes: [1.3, 3.1, 4.9], dropSite: 'av-node',
    tag: { time: 3.0, text: 'COMPLETE', accent: 'purple' },
  },
};

export const conductedPRs = (r: Rhythm): number[] =>
  r.beats.flatMap((b) => (b.pr === null ? [] : [b.pr]));

export const droppedCount = (r: Rhythm): number => r.beats.filter((b) => b.pr === null).length;
```

- [ ] **Step 4: Write `src/lib/waveform.ts`**

```ts
import type { Accent } from '../data/scenes';
import type { Rhythm } from '../data/rhythms';

export const STRIP = { width: 300, height: 100, baseline: 56, scale: 38, pxPerSec: 50 } as const;

const DT = 0.005;

const gauss = (t: number, c: number, sigma: number, amp: number) =>
  amp * Math.exp(-0.5 * ((t - c) / sigma) ** 2);

/** Signal in units of R-wave height (positive is up). */
function conductedOrBlocked(t: number, pOnset: number, pr: number | null): number {
  let v = gauss(t, pOnset + 0.05, 0.022, 0.15); // P wave
  if (pr !== null) {
    const q = pOnset + pr; // QRS onset
    v += gauss(t, q + 0.015, 0.008, -0.12); // Q
    v += gauss(t, q + 0.05, 0.011, 1); // R
    v += gauss(t, q + 0.085, 0.01, -0.22); // S
    v += gauss(t, q + 0.32, 0.045, 0.3); // T
  }
  return v;
}

function escapeBeat(t: number, onset: number): number {
  return (
    gauss(t, onset + 0.07, 0.03, 0.85) +
    gauss(t, onset + 0.15, 0.028, -0.5) +
    gauss(t, onset + 0.4, 0.06, -0.32)
  );
}

export interface StripGeometry {
  trace: string;
  escapeSegments: string[];
  /** SVG y at every DT seconds. */
  samples: number[];
  pDots: { x: number; y: number; conducted: boolean }[];
  prBars: { x1: number; x2: number; y: number }[];
  noQrs: { x: number; y: number }[];
  tag: { x: number; text: string; accent: Accent } | null;
  escapeTags: { x: number; y: number }[];
  /** QRS onset times in seconds, conducted beats only. */
  qrsOnsets: number[];
}

const toX = (t: number) => t * STRIP.pxPerSec;
const toY = (v: number) => STRIP.baseline - v * STRIP.scale;
const r1 = (n: number) => Math.round(n * 10) / 10;

function pathOf(samples: number[], from: number, to: number): string {
  let d = '';
  for (let i = from; i <= to; i++) {
    d += `${i === from ? 'M' : 'L'}${r1(toX(i * DT))} ${r1(samples[i])}`;
  }
  return d;
}

function compute(r: Rhythm): StripGeometry {
  const n = Math.round(r.window / DT) + 1;
  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i * DT;
    let v = 0;
    for (const b of r.beats) v += conductedOrBlocked(t, b.pOnset, b.pr);
    for (const e of r.escapes) v += escapeBeat(t, e);
    samples.push(toY(v));
  }

  const escapeSegments = r.escapes.map((e) =>
    pathOf(samples, Math.max(0, Math.floor((e - 0.03) / DT)), Math.min(n - 1, Math.ceil((e + 0.6) / DT))),
  );

  const conducted = r.beats.filter((b) => b.pr !== null);
  return {
    trace: pathOf(samples, 0, n - 1),
    escapeSegments,
    samples,
    pDots: r.beats.map((b) => ({
      x: toX(b.pOnset + 0.05),
      y: toY(0.15) - 9,
      conducted: b.pr !== null,
    })),
    prBars: conducted.map((b) => ({
      x1: toX(b.pOnset),
      x2: toX(b.pOnset + (b.pr as number)),
      y: STRIP.baseline + 14,
    })),
    noQrs:
      r.id === 'complete'
        ? []
        : r.beats
            .filter((b) => b.pr === null)
            .map((b) => ({ x: toX(b.pOnset + 0.05), y: STRIP.baseline + 30 })),
    tag: r.tag ? { x: toX(r.tag.time), text: r.tag.text, accent: r.tag.accent } : null,
    escapeTags: r.escapes.slice(0, 1).map((e) => ({ x: toX(e + 0.1), y: 4 })),
    qrsOnsets: conducted.map((b) => b.pOnset + (b.pr as number)),
  };
}

const cache = new Map<string, StripGeometry>();

export function buildStrip(r: Rhythm): StripGeometry {
  let g = cache.get(r.id);
  if (!g) {
    g = compute(r);
    cache.set(r.id, g);
  }
  return g;
}

/** SVG y of the trace at rhythm time rt (seconds). */
export function yAt(g: StripGeometry, rt: number): number {
  const i = Math.min(Math.max(Math.round(rt / DT), 0), g.samples.length - 1);
  return g.samples[i];
}
```

- [ ] **Step 5: Write `src/lib/signal.ts`**

```ts
import type { Rhythm } from '../data/rhythms';

export interface SignalState {
  /** 0 atria, 0.3 AV node, 0.6 His-Purkinje, 1 ventricles; null = no signal. */
  s: number | null;
  fade: number;
  stall: 'none' | 'av-node' | 'infra-nodal';
  /** 0..1 strength of the ventricular escape pulse. */
  escape: number;
}

const NODE = 0.3;
const HIS = 0.6;
const ARRIVE = 0.1; // rhythm seconds for the impulse to reach the AV node
const LEAVE_BEFORE_QRS = 0.06; // rhythm seconds from AV node exit to QRS onset

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

export function signalAt(r: Rhythm, rt: number): SignalState {
  const state: SignalState = { s: null, fade: 0, stall: 'none', escape: 0 };

  let beat: Rhythm['beats'][number] | null = null;
  for (const b of r.beats) if (b.pOnset <= rt) beat = b;

  if (beat) {
    const dt = rt - beat.pOnset;
    if (beat.pr !== null) {
      const leave = beat.pr - LEAVE_BEFORE_QRS;
      if (dt < ARRIVE) state.s = NODE * (dt / ARRIVE);
      else if (dt < leave) state.s = NODE;
      else if (dt < beat.pr) state.s = NODE + (1 - NODE) * ((dt - leave) / LEAVE_BEFORE_QRS);
      else state.s = 1;
      state.fade = dt < beat.pr ? 1 : 1 - clamp01((dt - beat.pr) / 0.8);
    } else {
      const infra = r.dropSite === 'infra-nodal';
      const stopAt = infra ? HIS : NODE;
      const arrivedAt = infra ? 2 * ARRIVE : ARRIVE;
      if (dt < ARRIVE) state.s = NODE * (dt / ARRIVE);
      else if (infra && dt < arrivedAt) state.s = NODE + (HIS - NODE) * ((dt - ARRIVE) / ARRIVE);
      else state.s = stopAt;
      if (dt >= arrivedAt) state.stall = infra ? 'infra-nodal' : 'av-node';
      state.fade = 1 - clamp01((dt - 0.3) / 0.7);
    }
    if (state.fade <= 0) {
      state.s = null;
      state.stall = 'none';
    }
  }

  let last: number | null = null;
  for (const e of r.escapes) if (e <= rt) last = e;
  if (last !== null) state.escape = 1 - clamp01((rt - last) / 0.9);

  return state;
}
```

- [ ] **Step 6: Run to verify they pass**

Run: `npx vitest run && npm run typecheck && npm run lint`
Expected: all tests PASS (timeline, rhythms, waveform, signal); typecheck and lint clean.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -q -m "feat: add rhythm model, ECG geometry and conduction signal logic" -m "$TRAILER"
```

---

### Task 4: Playback and reduced-motion hooks

**Files:**
- Create: `src/hooks/usePlayback.ts`, `src/hooks/usePrefersReducedMotion.ts`

**Interfaces:**
- Produces: `usePlayback(duration: number, enabled: boolean, initialTime?: number): Playback` where `Playback = { time: number; playing: boolean; play(): void; pause(): void; toggle(): void; restart(): void; seek(t: number): void }`. `playing` is already `false` whenever `enabled` is false. `usePrefersReducedMotion(): boolean`.

- [ ] **Step 1: Write `src/hooks/usePrefersReducedMotion.ts`**

```ts
import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;
const getServerSnapshot = () => false;

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

- [ ] **Step 2: Write `src/hooks/usePlayback.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Playback {
  time: number;
  playing: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  restart: () => void;
  seek: (t: number) => void;
}

const MAX_STEP = 0.1; // seconds; avoids a jump after the tab was hidden

/** Single elapsed-time source. Exactly one rAF loop exists while playing. */
export function usePlayback(duration: number, enabled: boolean, initialTime = 0): Playback {
  const [time, setTime] = useState(initialTime);
  const [wantsPlay, setWantsPlay] = useState(enabled && initialTime === 0);
  const timeRef = useRef(initialTime);
  const playing = wantsPlay && enabled;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const step = Math.min((now - last) / 1000, MAX_STEP);
      last = now;
      const next = Math.min(timeRef.current + step, duration);
      timeRef.current = next;
      setTime(next);
      if (next >= duration) {
        setWantsPlay(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration]);

  const seek = useCallback(
    (t: number) => {
      const c = Math.min(Math.max(t, 0), duration);
      timeRef.current = c;
      setTime(c);
    },
    [duration],
  );

  const play = useCallback(() => {
    if (timeRef.current >= duration) seek(0);
    setWantsPlay(true);
  }, [duration, seek]);

  const pause = useCallback(() => setWantsPlay(false), []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);
  const restart = useCallback(() => {
    seek(0);
    setWantsPlay(true);
  }, [seek]);

  return { time, playing, play, pause, toggle, restart, seek };
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean. (If the installed `react-hooks` plugin flags the `useRef` write inside the effect callback or `setWantsPlay` inside `tick`, they are legitimate event-loop updates, not render-time writes; restructure only if the rule truly fires.)

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -q -m "feat: add single-clock playback and reduced-motion hooks" -m "$TRAILER"
```

---

### Task 5: Components, styles, app shell, and render tests

**Files:**
- Create: `src/components/ECGStrip.tsx`, `ConductionDiagram.tsx`, `StagePills.tsx`, `SceneCaption.tsx`, `RecapPanel.tsx`, `EndCard.tsx`, `TimelineControls.tsx`, `src/App.tsx`, `src/styles.css`
- Modify: `src/main.tsx` (replace placeholder)
- Test: `tests/render.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 2-4.
- Produces: `default export App({ initialTime?: number; forceReduced?: boolean })`.

- [ ] **Step 1: Write the failing render test** — `tests/render.test.tsx`

```tsx
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import App from '../src/App';
import { SCENES } from '../src/data/scenes';

const DISCLAIMER = 'Illustrative teaching animation; interpret real ECGs in clinical context.';

describe('App renders every scene', () => {
  for (const scene of SCENES) {
    it(`scene ${scene.id}`, () => {
      const html = renderToString(<App initialTime={scene.start + 1.5} />);
      expect(html).toContain(scene.kind === 'end' ? 'Save this' : scene.title);
      expect(html).toContain(DISCLAIMER);
      expect(html).not.toMatch(/undefined|NaN/);
    });
  }

  it('shows the schematic label and the recap label', () => {
    expect(renderToString(<App initialTime={4} />)).toContain('simplified schematic');
    expect(renderToString(<App initialTime={28} />)).toContain('TEACHING DRAWING');
  });

  it('offers step buttons instead of play in reduced-motion mode', () => {
    const html = renderToString(<App initialTime={4} forceReduced />);
    expect(html).toContain('Next scene');
    expect(html).not.toContain('>Play<');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/render.test.tsx`
Expected: FAIL (cannot resolve `../src/App`).

- [ ] **Step 3: Write `src/components/ECGStrip.tsx`**

```tsx
import { useId } from 'react';
import type { Rhythm } from '../data/rhythms';
import type { Focus } from '../data/scenes';
import { STRIP, buildStrip, yAt } from '../lib/waveform';

interface Props {
  rhythm: Rhythm;
  /** 0..1 sweep position of the trace. */
  progress: number;
  focus?: Focus;
  compact?: boolean;
}

export function ECGStrip({ rhythm, progress, focus = 'none', compact = false }: Props) {
  const uid = useId().replace(/:/g, '');
  const geo = buildStrip(rhythm);
  const p = Math.min(Math.max(progress, 0), 1);
  const sweepX = p * STRIP.width;
  const seen = (x: number) => x <= sweepX;
  const viewBox = compact ? `0 12 ${STRIP.width} 68` : `0 0 ${STRIP.width} ${STRIP.height}`;
  const prWidth = focus === 'pr' ? 3.6 : 2.4;

  return (
    <svg className="strip" viewBox={viewBox} role="img" aria-label={`${rhythm.label}. ${rhythm.description}`}>
      <defs>
        <pattern id={`grid-${uid}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path className="grid-line" d="M10 0H0V10" fill="none" strokeWidth="0.6" />
        </pattern>
        <clipPath id={`clip-${uid}`}>
          <rect x="0" y="0" width={sweepX} height={STRIP.height} />
        </clipPath>
      </defs>
      <rect x="0" y="0" width={STRIP.width} height={STRIP.height} fill={`url(#grid-${uid})`} />

      <g clipPath={`url(#clip-${uid})`}>
        <path className="trace" d={geo.trace} />
        {geo.escapeSegments.map((d, i) => (
          <path key={i} className="trace trace--escape" d={d} />
        ))}
      </g>

      {geo.prBars
        .filter((b) => seen(b.x2))
        .map((b, i) => (
          <line key={i} className="prbar" x1={b.x1} x2={b.x2} y1={b.y} y2={b.y} strokeWidth={prWidth} />
        ))}

      {geo.pDots
        .filter((d) => seen(d.x))
        .map((d, i) => (
          <circle
            key={i}
            className={d.conducted ? 'pdot pdot--ok' : 'pdot pdot--drop'}
            cx={d.x}
            cy={d.y}
            r={!d.conducted && focus === 'dropped' ? 3.6 : 2.6}
          />
        ))}

      {!compact &&
        geo.noQrs
          .filter((n) => seen(n.x))
          .map((n, i) => (
            <g key={i}>
              <rect className="badge badge--red" x={n.x - 16} y={n.y - 7} width="32" height="11" rx="5.5" />
              <text className="badge-text" x={n.x} y={n.y + 1.2}>
                no QRS
              </text>
            </g>
          ))}

      {!compact && geo.tag && seen(geo.tag.x) && (
        <g>
          <line className="tag-line" x1={geo.tag.x} x2={geo.tag.x} y1="15" y2={STRIP.height - 6} strokeDasharray="2 2" />
          <rect className={`badge badge--${geo.tag.accent}`} x={geo.tag.x - 22} y="4" width="44" height="11" rx="5.5" />
          <text className="badge-text" x={geo.tag.x} y="11.8">
            {geo.tag.text}
          </text>
        </g>
      )}

      {!compact &&
        geo.escapeTags
          .filter((t) => seen(t.x))
          .map((t, i) => (
            <g key={i}>
              <rect className="badge badge--purple" x={t.x - 14} y={t.y} width="28" height="11" rx="5.5" />
              <text className="badge-text" x={t.x} y={t.y + 7.8}>
                escape
              </text>
            </g>
          ))}

      {!compact && p > 0 && p < 1 && (
        <circle className="head" cx={sweepX} cy={yAt(geo, p * rhythm.window)} r="3" />
      )}
    </svg>
  );
}
```

- [ ] **Step 4: Write `src/components/ConductionDiagram.tsx`**

```tsx
import type { Rhythm } from '../data/rhythms';
import type { BlockSite, Focus } from '../data/scenes';
import { signalAt, type SignalState } from '../lib/signal';

const AXIS = 190;
const STOPS: [number, number][] = [[0, 34], [0.3, 84], [0.6, 122], [1, 158]];

function yAtS(s: number): number {
  for (let i = 1; i < STOPS.length; i++) {
    const [s0, y0] = STOPS[i - 1];
    const [s1, y1] = STOPS[i];
    if (s <= s1) return y0 + (y1 - y0) * ((s - s0) / (s1 - s0));
  }
  return STOPS[STOPS.length - 1][1];
}

const IDLE: SignalState = { s: null, fade: 0, stall: 'none', escape: 0 };

const DESCRIPTIONS: Record<BlockSite, string> = {
  none: 'The impulse travels from the atria through the AV node and His-Purkinje system to the ventricles.',
  'av-node': 'Conduction is blocked at the AV node.',
  'infra-nodal': 'Conduction is blocked below the AV node.',
  both: 'No atrial impulse reaches the ventricles; the ventricles beat from an escape focus.',
};

interface Props {
  rhythm: Rhythm | null;
  progress: number;
  block: BlockSite;
  focus: Focus;
  animate: boolean;
}

export function ConductionDiagram({ rhythm, progress, block, focus, animate }: Props) {
  const sig = rhythm && animate ? signalAt(rhythm, progress * rhythm.window) : IDLE;
  const escape = animate ? sig.escape : focus === 'escape' ? 1 : 0;
  const avBar = block === 'av-node' || block === 'both';
  const infraBar = block === 'infra-nodal' || block === 'both';
  const avOpacity = avBar ? 1 : sig.stall === 'av-node' ? sig.fade : 0;
  const infraOpacity = infraBar ? 1 : sig.stall === 'infra-nodal' ? sig.fade : 0;

  return (
    <svg className="diagram" viewBox="0 0 320 190" role="img" aria-label={`Simplified conduction schematic. ${DESCRIPTIONS[block]}`}>
      <text className="dg-row" x="8" y="38">Atria</text>
      <text className="dg-row" x="8" y="87">AV node</text>
      <text className="dg-row" x="8" y="125">His-Purkinje</text>
      <text className="dg-row" x="8" y="164">Ventricles</text>

      <rect className="dg-atria" x="70" y="12" width="240" height="44" rx="14" />
      <circle className="dg-sinus" cx="86" cy="26" r="3.5" />
      <text className="dg-sinus-label" x="94" y="29">sinus</text>

      <rect className="dg-vent" x="70" y="140" width="240" height="40" rx="14" />
      <rect className="dg-vent-escape" x="70" y="140" width="240" height="40" rx="14" opacity={escape * 0.35} />

      <line className="dg-path" x1={AXIS} y1="56" x2={AXIS} y2="128" />
      <line className="dg-path" x1={AXIS} y1="128" x2="130" y2="160" />
      <line className="dg-path" x1={AXIS} y1="128" x2="250" y2="160" />

      <circle className="dg-node" cx={AXIS} cy="84" r="8" />
      <circle className="dg-node-dot" cx={AXIS} cy="84" r="3.6" />

      {sig.s !== null && <circle className="dg-signal" cx={AXIS} cy={yAtS(sig.s)} r="5" opacity={sig.fade} />}

      <g opacity={avOpacity}>
        <circle className="dg-block-ring" cx={AXIS} cy="84" r="11" />
        <line className="dg-block-bar" x1="178" x2="202" y1="84" y2="84" />
      </g>

      <g opacity={infraOpacity}>
        <line className="dg-block-bar dg-block-bar--thick" x1="174" x2="206" y1="122" y2="122" />
      </g>
      {block === 'infra-nodal' && (
        <g>
          <rect className="badge badge--red" x="214" y="114" width="90" height="16" rx="8" />
          <text className="badge-text" x="259" y="125">below the AV node</text>
        </g>
      )}

      <g opacity={escape}>
        <circle className="dg-escape" cx="232" cy="160" r="5" />
        <rect className="badge badge--purple" x="242" y="152" width="38" height="16" rx="8" />
        <text className="badge-text" x="261" y="163">escape</text>
      </g>

      <text className="dg-note" x="312" y="188">simplified schematic</text>
    </svg>
  );
}
```

- [ ] **Step 5: Write the small components**

`src/components/StagePills.tsx`:
```tsx
import { PILLS, type PillId } from '../data/scenes';

export function StagePills({ active }: { active: PillId[] }) {
  return (
    <ol className="pills" aria-label="Heart block stages">
      {PILLS.map((p) => (
        <li
          key={p.id}
          className={`pill pill--${p.accent}${active.includes(p.id) ? ' is-active' : ''}`}
          aria-current={active.length === 1 && active[0] === p.id ? 'step' : undefined}
        >
          {p.label}
        </li>
      ))}
    </ol>
  );
}
```

`src/components/SceneCaption.tsx`:
```tsx
import type { Accent } from '../data/scenes';

interface Props {
  title: string;
  sub: string;
  accent: Accent;
  live: boolean;
}

export function SceneCaption({ title, sub, accent, live }: Props) {
  return (
    <div className="caption" aria-live={live ? 'polite' : 'off'}>
      <p className="caption__title">{title}</p>
      <p className={`caption__sub accent-${accent}`}>{sub}</p>
    </div>
  );
}
```

`src/components/RecapPanel.tsx`:
```tsx
import { RHYTHMS } from '../data/rhythms';
import type { Accent, PillId } from '../data/scenes';
import { ECGStrip } from './ECGStrip';

const ROWS: { id: PillId; label: string; note: string; accent: Accent }[] = [
  { id: 'first', label: '1 · 1st degree', note: 'long PR · every P conducts', accent: 'orange' },
  { id: 'mobitz1', label: '2 · Mobitz I', note: 'PR grows → one P dropped', accent: 'orange' },
  { id: 'mobitz2', label: '3 · Mobitz II', note: 'same PR → sudden drop', accent: 'red' },
  { id: 'complete', label: '4 · Complete', note: 'P and QRS unrelated', accent: 'purple' },
];

export function RecapPanel() {
  return (
    <section className="recap" aria-label="Summary of the four AV block patterns">
      <p className="recap__badge">TEACHING DRAWING · NOT A PATIENT TRACING</p>
      {ROWS.map((row) => (
        <div className="recap__row" key={row.id}>
          <div className="recap__head">
            <span className={`recap__label accent-${row.accent}`}>{row.label}</span>
            <span className="recap__note">{row.note}</span>
          </div>
          <ECGStrip rhythm={RHYTHMS[row.id]} progress={1} compact />
        </div>
      ))}
    </section>
  );
}
```

`src/components/EndCard.tsx`:
```tsx
export function EndCard() {
  return (
    <section className="card endcard" aria-label="Closing card">
      <svg className="endcard__icon" viewBox="0 0 24 32" role="img" aria-label="Bookmark">
        <path d="M2 2h20v28l-10-7-10 7z" />
      </svg>
      <p className="endcard__title">Save this</p>
      <p className="endcard__sub">for your next strip.</p>
      <p className="endcard__note">Share it with someone learning to read ECGs.</p>
    </section>
  );
}
```

`src/components/TimelineControls.tsx`:
```tsx
import { SCENES } from '../data/scenes';

interface Props {
  time: number;
  duration: number;
  playing: boolean;
  reduced: boolean;
  sceneIndex: number;
  onToggle: () => void;
  onRestart: () => void;
  onSeek: (t: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

const fmt = (s: number) => `${s.toFixed(1)} s`;

export function TimelineControls(p: Props) {
  const scene = SCENES[p.sceneIndex];
  return (
    <section className="controls" aria-label="Playback controls">
      <div className="controls__row">
        {p.reduced ? (
          <>
            <button type="button" className="btn" onClick={p.onPrev}>Previous scene</button>
            <button type="button" className="btn btn--primary" onClick={p.onNext}>Next scene</button>
          </>
        ) : (
          <button type="button" className="btn btn--primary" onClick={p.onToggle} aria-label={p.playing ? 'Pause' : 'Play'}>
            {p.playing ? 'Pause' : 'Play'}
          </button>
        )}
        <button type="button" className="btn" onClick={p.onRestart}>Restart</button>
        <span className="controls__time" aria-hidden="true">{fmt(p.time)} / {fmt(p.duration)}</span>
      </div>

      <input
        className="scrubber"
        type="range"
        min={0}
        max={p.duration}
        step={0.1}
        value={p.time}
        onChange={(e) => p.onSeek(Number(e.target.value))}
        aria-label="Timeline"
        aria-valuetext={`Scene ${p.sceneIndex + 1} of ${SCENES.length}: ${scene.title}`}
      />

      <ol className="scene-nav" aria-label="Scenes">
        {SCENES.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className={`scene-btn${i === p.sceneIndex ? ' is-current' : ''}`}
              aria-label={`Go to scene ${i + 1}: ${s.title}`}
              aria-current={i === p.sceneIndex ? 'step' : undefined}
              onClick={() => p.onSeek(s.start)}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 6: Write `src/App.tsx`**

```tsx
import { useState } from 'react';
import { ConductionDiagram } from './components/ConductionDiagram';
import { ECGStrip } from './components/ECGStrip';
import { EndCard } from './components/EndCard';
import { RecapPanel } from './components/RecapPanel';
import { SceneCaption } from './components/SceneCaption';
import { StagePills } from './components/StagePills';
import { TimelineControls } from './components/TimelineControls';
import { RHYTHMS } from './data/rhythms';
import { DURATION, SCENES } from './data/scenes';
import { usePlayback } from './hooks/usePlayback';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { sceneIndexAt, sceneProgress, stepScene } from './lib/timeline';

interface Props {
  initialTime?: number;
  forceReduced?: boolean;
}

export default function App({ initialTime = 0, forceReduced = false }: Props) {
  const osReduced = usePrefersReducedMotion();
  const [manualReduced, setManualReduced] = useState(forceReduced);
  const reduced = osReduced || manualReduced;

  const { time, playing, toggle, restart, seek } = usePlayback(DURATION, !reduced, initialTime);

  const index = sceneIndexAt(time);
  const scene = SCENES[index];
  const progress = reduced ? 1 : sceneProgress(time);
  const rhythm = scene.rhythm ? RHYTHMS[scene.rhythm] : null;
  const showCards = scene.kind === 'hook' || scene.kind === 'lesson';

  return (
    <div className={`page${reduced ? ' is-reduced' : ''}`}>
      <h1 className="sr-only">ECG explainer: heart block, where the gate fails</h1>

      <main className={`stage stage--${scene.kind}`} aria-label="Heart block animation">
        {scene.kind === 'hook' && (
          <p className="headline">
            {scene.title}
            <br />
            <span className="accent-red">{scene.sub}</span>
          </p>
        )}
        {scene.kind === 'end' && (
          <p className="headline headline--ghost" aria-hidden="true">
            Every P wave knocks.
            <br />
            Not every one gets in.
          </p>
        )}
        {(scene.kind === 'lesson' || scene.kind === 'recap') && (
          <>
            <p className="lesson-title">Heart block: where the gate fails</p>
            <StagePills active={scene.activePills} />
          </>
        )}

        {showCards && rhythm && (
          <>
            <div className="card card--diagram">
              <ConductionDiagram rhythm={rhythm} progress={progress} block={scene.block} focus={scene.focus} animate={!reduced} />
            </div>
            <div className="card card--strip">
              <ECGStrip rhythm={rhythm} progress={progress} focus={scene.focus} />
            </div>
          </>
        )}
        {scene.kind === 'recap' && <RecapPanel />}
        {scene.kind === 'end' && <EndCard />}

        {scene.kind === 'hook' && (
          <div className="card note">
            <p className="note__main">{scene.note}</p>
            <p className="note__sub">{scene.noteSub}</p>
          </div>
        )}
        {(scene.kind === 'lesson' || scene.kind === 'recap') && (
          <SceneCaption key={scene.id} title={scene.title} sub={scene.sub} accent={scene.accent} live={!playing} />
        )}
      </main>

      <TimelineControls
        time={time}
        duration={DURATION}
        playing={playing}
        reduced={reduced}
        sceneIndex={index}
        onToggle={toggle}
        onRestart={() => (reduced ? seek(0) : restart())}
        onSeek={seek}
        onPrev={() => seek(stepScene(time, -1))}
        onNext={() => seek(stepScene(time, 1))}
      />

      <footer className="footer">
        <label className="toggle">
          <input type="checkbox" checked={reduced} disabled={osReduced} onChange={(e) => setManualReduced(e.target.checked)} />
          Reduce motion{osReduced ? ' (set by your system)' : ''}
        </label>
        <p className="disclaimer">Illustrative teaching animation; interpret real ECGs in clinical context.</p>
      </footer>
    </div>
  );
}
```

- [ ] **Step 7: Replace `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 8: Write `src/styles.css`**

```css
:root {
  --bg: #f6f1e7;
  --card: #ffffff;
  --line: #e4dccb;
  --navy: #1b2236;
  --soft: #566074;
  --orange: #c2570c;
  --blue: #1d4ed8;
  --red: #c62828;
  --purple: #6d28d9;
  --orange-l: #fb923c;
  --blue-l: #60a5fa;
  --red-l: #f87171;
  --purple-l: #a78bfa;
  --atria: #dfe3ee;
  --vent: #f0e8d8;
  --anatomy: #cbbfa8;
  --dark: #161b2b;
}

* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: var(--navy);
  background: var(--bg);
  min-height: 100vh;
}
.sr-only {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

.accent-navy { color: var(--navy); }
.accent-orange { color: var(--orange); }
.accent-blue { color: var(--blue); }
.accent-red { color: var(--red); }
.accent-purple { color: var(--purple); }

.page { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 14px 12px 32px; }

/* Stage: 9:16 composition */
.stage {
  width: min(100%, 420px);
  aspect-ratio: 9 / 16;
  display: flex; flex-direction: column; gap: 10px;
  padding: 6px 2px;
}
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(27, 34, 54, 0.06);
  padding: 8px 10px;
}
.stage--hook, .stage--end { justify-content: flex-start; }

.headline { margin: 18px 2px 8px; font-size: clamp(26px, 8vw, 34px); line-height: 1.15; font-weight: 700; }
.headline--ghost { opacity: 0.18; }

.lesson-title {
  align-self: center; margin: 12px 0 0; padding: 7px 16px;
  background: var(--navy); color: #fff; border-radius: 999px;
  font-size: 15px; font-weight: 650;
}

/* Stage pills */
.pills { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; list-style: none; margin: 0; padding: 0; }
.pill {
  text-align: center; padding: 6px 2px; border-radius: 999px;
  font-size: 11px; font-weight: 650; white-space: nowrap;
  background: #ece4d3; color: var(--soft);
}
.pill.is-active { color: #fff; }
.pill--orange.is-active { background: var(--orange); }
.pill--red.is-active { background: var(--red); }
.pill--purple.is-active { background: var(--purple); }

/* Diagram */
.diagram, .strip { display: block; width: 100%; height: auto; }
.dg-row { font-size: 10.5px; fill: var(--navy); }
.dg-atria { fill: var(--atria); stroke: var(--anatomy); stroke-width: 1.5; }
.dg-vent { fill: var(--vent); stroke: var(--anatomy); stroke-width: 1.5; }
.dg-vent-escape { fill: var(--purple); }
.dg-path { stroke: var(--anatomy); stroke-width: 2; stroke-linecap: round; }
.dg-node { fill: #fff; stroke: var(--anatomy); stroke-width: 2.5; }
.dg-node-dot { fill: var(--blue); }
.dg-sinus { fill: var(--blue); }
.dg-sinus-label { font-size: 8.5px; fill: var(--soft); }
.dg-signal { fill: var(--blue); stroke: #fff; stroke-width: 1.5; }
.dg-block-ring { fill: none; stroke: var(--red); stroke-width: 2; }
.dg-block-bar { stroke: var(--red); stroke-width: 3; stroke-linecap: round; }
.dg-block-bar--thick { stroke-width: 4; }
.dg-escape { fill: var(--purple); stroke: #fff; stroke-width: 1.5; }
.dg-note { font-size: 7.5px; fill: var(--soft); text-anchor: end; }

/* ECG strip */
.grid-line { stroke: #eee6d6; }
.trace { fill: none; stroke: var(--navy); stroke-width: 1.3; stroke-linejoin: round; stroke-linecap: round; }
.trace--escape { stroke: var(--purple); stroke-width: 1.6; }
.prbar { stroke: var(--orange); stroke-linecap: round; }
.pdot--ok { fill: var(--blue); }
.pdot--drop { fill: var(--red); }
.head { fill: var(--navy); opacity: 0.85; }
.tag-line { stroke: var(--anatomy); stroke-width: 0.8; }
.badge--orange { fill: var(--orange); }
.badge--red { fill: var(--red); }
.badge--purple { fill: var(--purple); }
.badge--blue { fill: var(--blue); }
.badge-text { fill: #fff; font-size: 7px; font-weight: 700; text-anchor: middle; }

/* Caption */
.caption { text-align: center; padding: 6px 8px; animation: rise 0.35s ease-out; }
.caption__title { margin: 0; font-size: clamp(17px, 5vw, 21px); font-weight: 700; line-height: 1.25; }
.caption__sub { margin: 6px 0 0; font-size: clamp(14px, 4vw, 16px); font-weight: 600; line-height: 1.3; }
@keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

.note { text-align: center; }
.note__main { margin: 4px 0; font-size: 20px; font-weight: 700; color: var(--red); }
.note__sub { margin: 0 0 4px; font-size: 14px; }

/* Recap (dark) */
.recap { background: var(--dark); border-radius: 18px; padding: 12px; color: #e8edf5; }
.recap__badge {
  margin: 0 auto 10px; width: fit-content; padding: 4px 10px; border-radius: 999px;
  border: 1px solid #38405a; font-size: 9.5px; letter-spacing: 0.04em; color: #c7cfe0;
}
.recap__row { margin-bottom: 6px; }
.recap__head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.recap__label { font-size: 12px; font-weight: 700; }
.recap__note { font-size: 10.5px; color: #c7cfe0; }
.recap .accent-orange { color: var(--orange-l); }
.recap .accent-red { color: var(--red-l); }
.recap .accent-purple { color: var(--purple-l); }
.recap .trace { stroke: #e8edf5; }
.recap .trace--escape { stroke: var(--purple-l); }
.recap .grid-line { stroke: #232a3f; }
.recap .pdot--ok { fill: var(--blue-l); }
.recap .pdot--drop { fill: var(--red-l); }
.recap .prbar { stroke: var(--orange-l); }

/* End card */
.endcard { text-align: center; padding: 40px 20px; margin-top: 24px; }
.endcard__icon { width: 34px; height: 44px; fill: var(--red); }
.endcard__title { margin: 10px 0 0; font-size: 32px; font-weight: 700; }
.endcard__sub { margin: 4px 0 14px; font-size: 20px; font-weight: 600; color: var(--blue); }
.endcard__note { margin: 0; font-size: 14px; color: var(--soft); }

/* Controls */
.controls { width: min(100%, 420px); display: flex; flex-direction: column; gap: 10px; }
.controls__row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.controls__time { margin-left: auto; font-variant-numeric: tabular-nums; font-size: 13px; color: var(--soft); }
.btn {
  min-height: 44px; padding: 0 16px; border-radius: 12px; cursor: pointer;
  border: 1px solid var(--line); background: #fff; color: var(--navy);
  font: inherit; font-weight: 650;
}
.btn--primary { background: var(--navy); border-color: var(--navy); color: #fff; }
.scrubber { width: 100%; height: 28px; accent-color: var(--navy); }
.scene-nav { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; margin: 0; padding: 0; }
.scene-btn {
  min-width: 36px; min-height: 36px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--line); background: #fff; color: var(--navy); font: inherit; font-size: 13px; font-weight: 650;
}
.scene-btn.is-current { background: var(--navy); color: #fff; border-color: var(--navy); }
.btn:focus-visible, .scene-btn:focus-visible, .scrubber:focus-visible, .toggle input:focus-visible {
  outline: 3px solid var(--blue); outline-offset: 2px;
}

.footer { width: min(100%, 420px); display: flex; flex-direction: column; gap: 8px; }
.toggle { display: flex; align-items: center; gap: 8px; font-size: 14px; min-height: 32px; }
.toggle input { width: 18px; height: 18px; }
.disclaimer { margin: 0; font-size: 12px; color: var(--soft); }

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
.is-reduced * { animation: none !important; transition: none !important; }
```

- [ ] **Step 9: Run tests, type-check, lint, build**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build`
Expected: every test PASS (including 14 render tests), typecheck/lint clean, build succeeds. Fix any failure before continuing; do not weaken tests.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -q -m "feat: add explainer components, styles, app shell and render tests" -m "$TRAILER"
```

---

### Task 6: Browser verification and visual fixes

**Files:**
- Modify: `src/styles.css`, `src/data/rhythms.ts`, components, as findings require.

- [ ] **Step 1: Serve the production build**

Run: `npm run build && (npx vite preview --port 4173 --strictPort > /tmp/preview.log 2>&1 &)` then `curl -sf http://localhost:4173/ | head -5`
Expected: HTML returned.

- [ ] **Step 2: Capture screenshots at phone and desktop widths**

Use any headless Chromium available in the sandbox (check `which chromium chromium-browser google-chrome`; otherwise install Playwright Chromium through the allowed package registries). For widths 390x844 and 1280x800, load `http://localhost:4173/`, pause, seek to each scene start + 2.5 s via the scene buttons, screenshot each, and record `document.documentElement.scrollWidth <= window.innerWidth` and console errors. If no browser can run, record that as a limitation and rely on the render tests.

- [ ] **Step 3: Inspect each stage visually**

Check: no horizontal overflow; labels readable; PR bars grow in Mobitz I; dropped P is red with "no QRS"; block bars sit at the correct level; complete-block escape T waves do not obscure P waves (if they do, shift `escapes` in `rhythms.ts` and re-run `tests/rhythms.test.ts`); stage content fits inside the 9:16 frame; recap panel strips are not cramped.

- [ ] **Step 4: Verify behaviours**

Check play/pause stops the clock, Restart returns to 0, scrubbing updates scene and caption together, Tab order reaches every control with a visible focus ring, and with `prefers-reduced-motion: reduce` emulated the page shows Previous/Next scene and fully drawn strips.

- [ ] **Step 5: Fix issues, re-run `npx vitest run && npm run typecheck && npm run lint && npm run build`, commit**

```bash
git add -A && git commit -q -m "fix: visual and behaviour fixes from browser verification" -m "$TRAILER"
```

---

### Task 7: README, deploy workflow, final checks, and packaging

**Files:**
- Create: `README.md`, `.github/workflows/deploy.yml`

- [ ] **Step 1: Write `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Write `README.md`**

Sections, in order: what it is (one paragraph, name the four blocks, note it is an illustrative teaching animation); Run locally (`npm install`, `npm run dev`); Scripts table (`dev`, `build`, `preview`, `lint`, `typecheck`, `test`); Project layout (copy the File Structure tree above); Editing content (all copy in `src/data/scenes.ts`, rhythm beats in `src/data/rhythms.ts`, tokens in `src/styles.css`); Deploy to GitHub Pages (create a repo, push the folder to `main`, in Settings > Pages set Source to "GitHub Actions", the workflow publishes `dist/` and the site appears at `https://<user>.github.io/<repo>/`; because `base` is `./` no config change is needed); Other hosts (Vercel/Netlify: build `npm run build`, output `dist`); Clinical notes (the four patterns and what each strip shows, 2:1 is not included, escape rate and QRS width depend on site); Disclaimer line verbatim.

- [ ] **Step 3: Full verification from a clean install**

Run: `rm -rf node_modules dist && npm ci && npm run lint && npm run typecheck && npm test && npm run build`
Expected: every command exits 0; test output shows all suites passing.

- [ ] **Step 4: Package**

Run: `cd .. && zip -qr ecg-heart-block-explainer.zip ecg-heart-block-explainer -x "ecg-heart-block-explainer/node_modules/*" "ecg-heart-block-explainer/dist/*" && ls -la ecg-heart-block-explainer.zip`
Expected: zip exists, excludes `node_modules` and `dist`, includes `.git` history.

- [ ] **Step 5: Commit, then send the zip with SendUserFile**

```bash
git add -A && git commit -q -m "docs: add README and GitHub Pages workflow" -m "$TRAILER"
```

---

## Self-Review

**Spec coverage:** scene timeline (Task 2), rhythm definitions and clinical rules (Task 3), waveform and sweep (Tasks 3, 5), diagram states and signal sync (Tasks 3, 5), single rAF clock and reduced motion (Task 4, 5), controls and accessibility (Task 5), visual design tokens (Task 5), tests (Tasks 2, 3, 5), verification (Task 6), deploy and README (Task 7). The spec's separate `EndCard`, `RecapPanel`, `StagePills` components are all covered.

**Placeholder scan:** none; Task 7 Step 2 lists the README sections explicitly because its content is documentation, not code.

**Type consistency:** `Rhythm.beats[].pOnset/pr`, `StripGeometry` fields, `SignalState` fields, `usePlayback(duration, enabled, initialTime)` and the `Props` of each component match between definition and use. The spec table named PR "from P onset"; the code follows that.
