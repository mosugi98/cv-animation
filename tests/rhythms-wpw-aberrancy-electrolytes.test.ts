import { describe, expect, it } from 'vitest';
import type { RhythmDef } from '../src/engine/types';
import { ABERRANT_CL, aberrancyRhythm } from '../src/rhythms/aberrancy';
import { ANTIDROMIC_CL, WPW_AF_WINDOW, wpwAf, wpwAfIntervals, wpwAntidromic } from '../src/rhythms/wpw';
import { K_SINUS_RR, POTASSIUM_LEVEL, SINE_PERIOD, SINE_START, potassiumRhythm, type PotassiumStage } from '../src/rhythms/electrolytes';

const gaps = (xs: number[]) => xs.slice(1).map((x, i) => x - xs[i]);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)));
const sample = (d: RhythmDef, a: number, b: number, step = 0.004) => {
  const out: number[] = [];
  for (let t = a; t <= b; t += step) out.push(d.signal(t));
  return out;
};
const peak = (d: RhythmDef, a: number, b: number) => Math.max(...sample(d, a, b));
const trough = (d: RhythmDef, a: number, b: number) => Math.min(...sample(d, a, b));

describe('antidromic AVRT', () => {
  const d = wpwAntidromic();
  it('is a regular, fast, wide-complex tachycardia with no conducted P waves', () => {
    expect(d.beats.length).toBeGreaterThanOrEqual(8);
    expect(d.beats.every((b) => b.wide)).toBe(true);
    const g = gaps(d.beats.map((b) => b.t));
    expect(sd(g)).toBeLessThan(1e-9);
    expect(mean(g)).toBeCloseTo(ANTIDROMIC_CL, 6);
    expect(60 / ANTIDROMIC_CL).toBeGreaterThan(150);
    expect(d.atrial.every((a) => a.kind === 'retro' && !a.conducted)).toBe(true);
  });
  it('is described as schematic', () => expect(d.description.toLowerCase()).toContain('schematic'));
});

describe('pre-excited atrial fibrillation', () => {
  const d = wpwAf();
  const rr = gaps(d.beats.map((b) => b.t));
  it('is irregular, fast, and contains an R-R interval under 250 ms', () => {
    expect(d.fibrillation).toBe(true);
    expect(d.atrial.length).toBe(0);
    expect(sd(rr) / mean(rr)).toBeGreaterThan(0.15);
    expect(Math.min(...rr)).toBeLessThan(0.25);
    expect(60 / mean(rr)).toBeGreaterThan(150);
  });
  it('has no repeating run of equal intervals and varied complexes', () => {
    for (let i = 1; i < rr.length; i++) expect(Math.abs(rr[i] - rr[i - 1])).toBeGreaterThan(0.03);
    expect(d.beats.some((b) => b.wide)).toBe(true);
    expect(d.beats.some((b) => b.preexcited)).toBe(true);
  });
  it('stays inside its window', () => {
    expect(Math.max(...d.beats.map((b) => b.t))).toBeLessThan(WPW_AF_WINDOW);
    expect(wpwAfIntervals().length).toBeGreaterThan(8);
  });
});

describe('SVT with rate-related RBBB aberrancy', () => {
  const d = aberrancyRhythm();
  const narrow = d.beats.filter((b) => !b.wide);
  const tachy = d.beats.filter((b) => b.origin === 'tachy');
  it('starts narrow in sinus rhythm and becomes a regular wide tachycardia', () => {
    expect(narrow.length).toBeGreaterThanOrEqual(2);
    expect(tachy.length).toBeGreaterThanOrEqual(8);
    expect(tachy.every((b) => b.wide && b.customQrs)).toBe(true);
    const g = gaps([d.beats.find((b) => b.origin === 'pac')!, ...tachy].map((b) => b.t));
    expect(sd(g)).toBeLessThan(1e-9);
    expect(mean(g)).toBeCloseTo(ABERRANT_CL, 6);
  });
  it('is triggered by a premature atrial beat that is blocked in the fast pathway', () => {
    const pac = d.atrial.find((a) => a.kind === 'ectopic')!;
    const lastSinus = d.beats.filter((b) => b.origin === 'sinus').at(-1)!;
    expect(pac.t - lastSinus.t).toBeLessThan(1.2);
    expect(d.pulses.some((p) => p.type === 'travel' && p.path === 'avn-fast' && p.tone === 'red')).toBe(true);
  });
  it('has a late secondary R wave (rSR′) in the wide beats', () => {
    const q = tachy[2].t;
    const r = peak(d, q + 0.02, q + 0.045);
    const s = trough(d, q + 0.05, q + 0.08);
    const rPrime = peak(d, q + 0.1, q + 0.15);
    expect(r).toBeGreaterThan(0.12);
    expect(s).toBeLessThan(-0.2);
    expect(rPrime).toBeGreaterThan(0.6);
    expect(rPrime).toBeGreaterThan(r);
  });
});

describe('potassium stages', () => {
  const stage = (s: PotassiumStage) => potassiumRhythm(s);
  const q1 = (d: RhythmDef) => d.beats[1].t;

  it('uses distinct ids and schematic descriptions', () => {
    const ids = (['normal', 'hypo-mild', 'hypo-severe', 'hyper-mild', 'hyper-moderate', 'hyper-severe'] as const).map((s) => stage(s));
    expect(new Set(ids.map((d) => d.id)).size).toBe(ids.length);
    for (const d of ids) expect(d.description.toLowerCase()).toContain('schematic');
  });
  it('orders the schematic serum levels from low to high', () => {
    const v = POTASSIUM_LEVEL;
    expect(v['hypo-severe']).toBeLessThan(v['hypo-mild']);
    expect(v['hypo-mild']).toBeLessThan(3.5);
    expect(v.normal).toBeGreaterThan(3.5);
    expect(v.normal).toBeLessThan(5.0);
    expect(v['hyper-mild']).toBeGreaterThan(5.5);
    expect(v['hyper-moderate']).toBeGreaterThan(v['hyper-mild']);
    expect(v['hyper-severe']).toBeGreaterThan(v['hyper-moderate']);
  });

  it('normal: upright T wave larger than any U wave', () => {
    const d = stage('normal');
    expect(peak(d, q1(d) + 0.25, q1(d) + 0.4)).toBeGreaterThan(0.2);
  });

  it('hypokalaemia: flat T, ST depression and a U wave that grows with severity', () => {
    const n = stage('normal');
    const mild = stage('hypo-mild');
    const sev = stage('hypo-severe');
    const t = (d: RhythmDef) => peak(d, q1(d) + 0.28, q1(d) + 0.4);
    const u = (d: RhythmDef) => peak(d, q1(d) + 0.48, q1(d) + 0.62);
    const st = (d: RhythmDef) => trough(d, q1(d) + 0.16, q1(d) + 0.24);
    expect(t(mild)).toBeLessThan(t(n) * 0.6);
    expect(st(mild)).toBeLessThan(-0.05);
    expect(u(mild)).toBeGreaterThan(0.06);
    expect(u(sev)).toBeGreaterThan(u(mild));
    expect(u(sev)).toBeGreaterThan(t(sev));
    expect(st(sev)).toBeLessThan(st(mild));
  });
  it('severe hypokalaemia: a PVC with a full compensatory pause; mild has none', () => {
    const sev = stage('hypo-severe');
    expect(sev.beats.some((b) => b.origin === 'ventricular' && b.wide)).toBe(true);
    expect(stage('hypo-mild').beats.every((b) => b.origin === 'sinus')).toBe(true);
    const sinusP = sev.atrial.map((a) => a.t);
    expect(sd(gaps(sinusP))).toBeLessThan(1e-9);
    expect(mean(gaps(sinusP))).toBeCloseTo(K_SINUS_RR, 6);
  });

  it('hyperkalaemia mild: peaked T larger than normal, narrow QRS and normal PR', () => {
    const n = stage('normal');
    const d = stage('hyper-mild');
    expect(peak(d, q1(d) + 0.14, q1(d) + 0.3)).toBeGreaterThan(peak(n, q1(n) + 0.25, q1(n) + 0.4) * 2);
    expect(d.beats.every((b) => !b.wide)).toBe(true);
    expect(d.atrial.every((a) => a.amp > 0.1)).toBe(true);
  });
  it('hyperkalaemia moderate: flat P, long PR, wide QRS', () => {
    const d = stage('hyper-moderate');
    expect(d.beats.every((b) => b.wide)).toBe(true);
    expect(d.atrial.every((a) => a.amp < 0.08)).toBe(true);
    const pr = d.beats[1].t - d.atrial[1].t;
    expect(pr).toBeGreaterThan(0.2);
  });
  it('hyperkalaemia severe: complexes give way to a smooth sine wave', () => {
    const d = stage('hyper-severe');
    expect(d.beats.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...d.beats.map((b) => b.t))).toBeLessThan(SINE_START);
    const seg = sample(d, SINE_START + 0.6, SINE_START + 0.6 + 3 * SINE_PERIOD, 0.002);
    const crossings = seg.slice(1).filter((x, i) => Math.sign(x) !== Math.sign(seg[i]) && x !== 0).length;
    expect(crossings).toBeGreaterThanOrEqual(5);
    expect(crossings).toBeLessThanOrEqual(7);
    expect(Math.max(...seg)).toBeGreaterThan(0.5);
  });
});
