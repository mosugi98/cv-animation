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
