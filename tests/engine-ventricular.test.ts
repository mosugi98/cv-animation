import { describe, expect, it } from 'vitest';
import { PATHS, VIEW, frameAt } from '../src/engine/diagram';
import { peakedT, qrsBroad, qrsNarrow, qrsRbbb, sineWave, stDepression, tWave, torsadesWave, uWave, vfWave } from '../src/engine/morphology';

const sample = (fn: (t: number) => number, a: number, b: number, step = 0.005) => {
  const out: number[] = [];
  for (let t = a; t <= b; t += step) out.push(fn(t));
  return out;
};
const crossings = (xs: number[]) => xs.slice(1).filter((x, i) => Math.sign(x) !== Math.sign(xs[i]) && x !== 0).length;
const argmax = (xs: number[]) => xs.indexOf(Math.max(...xs));
/** Seconds (at 5 ms sampling) until the last sample whose magnitude exceeds 0.05. */
const lastActive = (xs: number[]) => {
  let last = 0;
  xs.forEach((x, i) => {
    if (Math.abs(x) > 0.05) last = i;
  });
  return last * 0.005;
};

describe('ventricular waveform primitives', () => {
  it('RBBB complex: small r, S, then a taller, later R′ that ends after a narrow QRS', () => {
    const v = sample((t) => qrsRbbb(t, 0), 0, 0.3);
    const r = v[Math.round(0.03 / 0.005)];
    const s = Math.min(...v);
    const rPrime = v[Math.round(0.15 / 0.005)];
    expect(r).toBeGreaterThan(0.1);
    expect(s).toBeLessThan(-0.25);
    expect(rPrime).toBeGreaterThan(0.6);
    expect(rPrime).toBeGreaterThan(r * 3);
    const narrowEnd = lastActive(sample((t) => qrsNarrow(t, 0), 0, 0.3));
    const rbbbEnd = lastActive(v);
    expect(rbbbEnd).toBeGreaterThan(0.12);
    expect(rbbbEnd).toBeGreaterThan(narrowEnd + 0.04);
  });

  it('peaked T is taller and narrower than a normal T', () => {
    const normal = sample((t) => tWave(t, 0, 0.3, 0.3), 0, 0.6);
    const peaked = sample((t) => peakedT(t, 0), 0, 0.6);
    const width = (xs: number[]) => xs.filter((x) => x > Math.max(...xs) / 2).length;
    expect(Math.max(...peaked)).toBeGreaterThan(2 * Math.max(...normal));
    expect(width(peaked)).toBeLessThan(width(normal));
  });

  it('U wave peaks after the T wave', () => {
    expect(argmax(sample((t) => uWave(t, 0), 0, 0.8))).toBeGreaterThan(argmax(sample((t) => tWave(t, 0), 0, 0.8)));
  });

  it('ST depression is negative between its limits and flat outside them', () => {
    expect(stDepression(0.18, 0, 0.1)).toBeLessThan(-0.08);
    expect(Math.abs(stDepression(0.02, 0, 0.1))).toBeLessThan(0.005);
    expect(Math.abs(stDepression(0.45, 0, 0.1))).toBeLessThan(0.005);
  });

  it('broad QRS gets wider without changing amplitude', () => {
    const width = (w: number) => lastActive(sample((t) => qrsBroad(t, 0, w), 0, 0.5));
    expect(width(2)).toBeGreaterThan(width(1) + 0.05);
    expect(Math.max(...sample((t) => qrsBroad(t, 0, 2), 0, 0.5))).toBeCloseTo(1, 1);
  });

  it('VF is zero before onset, bounded, chaotic and never repeats a cycle', () => {
    expect(vfWave(0.5, 1)).toBe(0);
    const v = sample((t) => vfWave(t, 0, 0.8), 0, 6);
    expect(v.every(Number.isFinite)).toBe(true);
    expect(Math.max(...v.map(Math.abs))).toBeLessThan(1.2);
    expect(Math.max(...v.map(Math.abs))).toBeGreaterThan(0.4);
    // 4-7 Hz: between 6 and 16 zero crossings per second.
    const perSecond = crossings(sample((t) => vfWave(t, 0, 0.8), 1, 5)) / 4;
    expect(perSecond).toBeGreaterThan(6);
    expect(perSecond).toBeLessThan(16);
    // No periodicity: the trace never matches a shifted copy of itself closely.
    const base = sample((t) => vfWave(t, 0, 0.8), 1, 3);
    for (let lag = 0.15; lag <= 1.5; lag += 0.05) {
      const shifted = sample((t) => vfWave(t + lag, 0, 0.8), 1, 3);
      const err = Math.sqrt(base.reduce((a, x, i) => a + (x - shifted[i]) ** 2, 0) / base.length);
      const rms = Math.sqrt(base.reduce((a, x) => a + x * x, 0) / base.length);
      expect(err / rms).toBeGreaterThan(0.35);
    }
  });

  it('fine VF scales down with amplitude', () => {
    const peak = (a: number) => Math.max(...sample((t) => vfWave(t, 0, a), 1, 5).map(Math.abs));
    expect(peak(0.15)).toBeLessThan(peak(0.8) / 4);
  });

  it('torsades twists: complexes at the set rate, amplitude passes through a node and polarity flips', () => {
    const f = (t: number) => torsadesWave(t, 1, 5, 220, 1.15);
    expect(f(0.5)).toBe(0);
    expect(f(5.5)).toBe(0);
    const v = sample(f, 1.2, 4.8);
    const cps = crossings(v) / 2 / 3.6; // complexes per second
    expect(cps * 60).toBeGreaterThan(190);
    expect(cps * 60).toBeLessThan(250);
    const peakIn = (a: number, b: number) => Math.max(...sample(f, a, b).map(Math.abs));
    const node = 1 + 1.15 / 2;
    expect(peakIn(node - 0.07, node + 0.07)).toBeLessThan(0.3 * peakIn(1.1, 1.45));
    // Upstrokes of the carrier (sin = +1) keep one sign before the node and the opposite sign after it.
    const f0 = 220 / 60;
    const upstroke = (n: number) => f(1 + (0.25 + n) / f0);
    expect(upstroke(1)).toBeGreaterThan(0.2);
    expect(upstroke(5)).toBeLessThan(-0.2);
  });

  it('sine wave is a smooth oscillation with the requested period', () => {
    const v = sample((t) => sineWave(t, 0, 0.5, 0.7), 1, 3);
    expect(crossings(v) / 2 / 2).toBeCloseTo(2, 0);
    expect(Math.max(...v)).toBeCloseTo(0.7, 1);
  });
});

describe('ventricular diagram geometry', () => {
  it('keeps all new paths inside the ventricle area of the view', () => {
    for (const id of ['vent-loop', 'vent-l', 'vent-r'] as const) {
      for (const [x, y] of PATHS[id]) {
        expect(x).toBeGreaterThanOrEqual(70);
        expect(x).toBeLessThanOrEqual(310);
        expect(y).toBeGreaterThanOrEqual(140);
        expect(y).toBeLessThanOrEqual(VIEW.height - 8);
      }
    }
  });

  it('lights the ventricles, not the atria, for ventricular spread, loops and sparks', () => {
    const spread = frameAt([{ type: 'travel', path: 'vent-l', t0: 0, t1: 1, tone: 'orange' }], 0.6);
    expect(spread.ventricles).not.toBeNull();
    expect(spread.atria).toBeNull();
    const loop = frameAt([{ type: 'loop', path: 'vent-loop', t0: 0, t1: 2, period: 0.35, tone: 'orange' }], 0.5);
    expect(loop.ventricles).not.toBeNull();
    expect(loop.atria).toBeNull();
    const spark = frameAt([{ type: 'spark', x: 150, y: 165, t: 0, tone: 'red' }], 0.05);
    expect(spark.ventricles).not.toBeNull();
    expect(spark.atria).toBeNull();
    const atrialSpark = frameAt([{ type: 'spark', x: 150, y: 30, t: 0, tone: 'blue' }], 0.05);
    expect(atrialSpark.atria).not.toBeNull();
    expect(atrialSpark.ventricles).toBeNull();
  });
});
