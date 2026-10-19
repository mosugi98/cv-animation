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
