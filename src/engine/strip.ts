import type { RhythmDef, Tone } from './types';

export const STRIP = { width: 300, height: 100, baseline: 58, scale: 34 } as const;
export const DT = 0.005;
/** Row positions inside the 300 x 100 strip viewBox. */
export const ROWS = { dots: 15, bars: 78, notes: 90 } as const;

export interface StripGeometry {
  window: number;
  pxPerSec: number;
  trace: string;
  segments: { d: string; tone: Tone }[];
  samples: number[];
  dots: { x: number; y: number; tone: Tone }[];
  bars: { x1: number; x2: number; y: number; tone: Tone }[];
  tags: { x: number; text: string; tone: Tone }[];
  notes: { x: number; y: number; text: string; tone: Tone }[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function pathOf(samples: number[], pxPerSec: number, from: number, to: number): string {
  let d = '';
  for (let i = from; i <= to; i++) d += `${i === from ? 'M' : 'L'}${r1(i * DT * pxPerSec)} ${r1(samples[i])}`;
  return d;
}

function compute(def: RhythmDef): StripGeometry {
  const pxPerSec = STRIP.width / def.window;
  const n = Math.round(def.window / DT) + 1;
  const samples: number[] = [];
  for (let i = 0; i < n; i++) samples.push(STRIP.baseline - def.signal(i * DT) * STRIP.scale);

  const idx = (t: number) => Math.min(Math.max(Math.round(t / DT), 0), n - 1);
  const geo: StripGeometry = {
    window: def.window,
    pxPerSec,
    trace: pathOf(samples, pxPerSec, 0, n - 1),
    segments: [],
    samples,
    dots: [],
    bars: [],
    tags: [],
    notes: [],
  };

  for (const m of def.marks) {
    switch (m.kind) {
      case 'dot':
        geo.dots.push({ x: m.t * pxPerSec, y: ROWS.dots, tone: m.tone });
        break;
      case 'bar':
        geo.bars.push({ x1: m.t0 * pxPerSec, x2: m.t1 * pxPerSec, y: ROWS.bars, tone: m.tone });
        break;
      case 'tag':
        geo.tags.push({ x: m.t * pxPerSec, text: m.text, tone: m.tone });
        break;
      case 'note':
        geo.notes.push({ x: m.t * pxPerSec, y: ROWS.notes, text: m.text, tone: m.tone });
        break;
      case 'seg':
        geo.segments.push({ d: pathOf(samples, pxPerSec, idx(m.t0), idx(m.t1)), tone: m.tone });
        break;
    }
  }
  return geo;
}

const cache = new Map<string, StripGeometry>();

export function buildStrip(def: RhythmDef): StripGeometry {
  let g = cache.get(def.id);
  if (!g) {
    g = compute(def);
    cache.set(def.id, g);
  }
  return g;
}

/** SVG y of the trace at rhythm time rt. */
export function yAt(g: StripGeometry, rt: number): number {
  const i = Math.min(Math.max(Math.round(rt / DT), 0), g.samples.length - 1);
  return g.samples[i];
}
