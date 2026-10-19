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
