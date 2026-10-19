import { describe, expect, it } from 'vitest';
import { FADE, PATHS, frameAt, pointAlong, slicePoints } from '../src/engine/diagram';
import { fibWavelets, flutterSaw, mulberry32, pWave, qrsNarrow, qrsWide } from '../src/engine/morphology';
import { STRIP, buildStrip, yAt } from '../src/engine/strip';
import { durationOf, sceneIndexIn, sceneProgressIn, stepSceneIn } from '../src/engine/timeline';
import type { RhythmDef } from '../src/engine/types';

const scenes = [
  { id: 'a', start: 0, end: 4 },
  { id: 'b', start: 4, end: 10 },
  { id: 'c', start: 10, end: 12 },
];

describe('generic timeline', () => {
  it('finds scenes and clamps out-of-range times', () => {
    expect(durationOf(scenes)).toBe(12);
    expect(sceneIndexIn(scenes, 0)).toBe(0);
    expect(sceneIndexIn(scenes, 3.99)).toBe(0);
    expect(sceneIndexIn(scenes, 4)).toBe(1);
    expect(sceneIndexIn(scenes, 12)).toBe(2);
    expect(sceneIndexIn(scenes, -3)).toBe(0);
    expect(sceneIndexIn(scenes, 99)).toBe(2);
  });

  it('reports progress and steps between scenes', () => {
    expect(sceneProgressIn(scenes, 7)).toBeCloseTo(0.5);
    expect(sceneProgressIn(scenes, 12)).toBe(1);
    expect(stepSceneIn(scenes, 1, 1)).toBe(4);
    expect(stepSceneIn(scenes, 11, 1)).toBe(10);
    expect(stepSceneIn(scenes, 6, -1)).toBe(4);
    expect(stepSceneIn(scenes, 4.1, -1)).toBe(0);
  });
});

describe('diagram geometry', () => {
  it('walks a polyline from start to end', () => {
    const pts = PATHS['avn-direct'];
    expect(pointAlong(pts, 0)).toEqual(pts[0]);
    expect(pointAlong(pts, 1)).toEqual(pts[pts.length - 1]);
    const mid = pointAlong(pts, 0.5);
    expect(mid[0]).toBe(190);
    expect(mid[1]).toBeCloseTo((58 + 108) / 2);
  });

  it('slices a polyline between two fractions, in either order, keeping inner vertices', () => {
    const pts = PATHS['avn-slow'];
    expect(slicePoints(pts, 0, 1)).toHaveLength(pts.length);
    expect(slicePoints(pts, 0, 1)[0]).toEqual(pts[0]);
    expect(slicePoints(pts, 1, 0)).toEqual(slicePoints(pts, 0, 1));
    const half = slicePoints(pts, 0, 0.5);
    expect(half[0]).toEqual(pts[0]);
    expect(half[half.length - 1]).toEqual(pointAlong(pts, 0.5));
    expect(half.length).toBeLessThan(pts.length);
    expect(slicePoints(pts, 0.3, 0.3)).toHaveLength(2);
  });

  it('trails cover only the part of the path already travelled, in the direction of travel', () => {
    const fwd = frameAt([{ type: 'travel', path: 'his', t0: 0, t1: 1, tone: 'blue' }], 0.25).trails[0];
    expect([fwd.from, fwd.to]).toEqual([0, 0.25]);
    const back = frameAt([{ type: 'travel', path: 'avn-fast', t0: 0, t1: 1, tone: 'purple', reverse: true }], 0.25).trails[0];
    expect([back.from, back.to]).toEqual([1, 0.75]);
    const blocked = frameAt([{ type: 'travel', path: 'ap', t0: 0, t1: 1, tone: 'red', stop: 0.3 }], 1).trails[0];
    expect(blocked.to).toBeCloseTo(0.3);
  });

  it('shows a travelling dot, fades it after arrival and hides it later', () => {
    const pulses = [{ type: 'travel', path: 'his', t0: 1, t1: 2, tone: 'blue' }] as const;
    expect(frameAt([...pulses], 0.5).dots).toHaveLength(0);
    const mid = frameAt([...pulses], 1.5);
    expect(mid.dots).toHaveLength(1);
    expect(mid.dots[0].opacity).toBe(1);
    expect(mid.dots[0].y).toBeCloseTo(118);
    const fading = frameAt([...pulses], 2 + FADE / 2);
    expect(fading.dots[0].opacity).toBeCloseTo(0.5);
    expect(frameAt([...pulses], 2 + FADE + 0.01).dots).toHaveLength(0);
  });

  it('runs a reverse pulse from the end of the path to its start', () => {
    const pulses = [{ type: 'travel', path: 'ap', t0: 0, t1: 1, tone: 'purple', reverse: true }] as const;
    expect(frameAt([...pulses], 0).dots[0].y).toBeCloseTo(140);
    expect(frameAt([...pulses], 1).dots[0].y).toBeCloseTo(56);
  });

  it('glows the chamber a pulse is activating', () => {
    const up = frameAt([{ type: 'travel', path: 'ap', t0: 0, t1: 1, tone: 'purple', reverse: true }], 1);
    expect(up.atria?.tone).toBe('purple');
    expect(up.ventricles).toBeNull();
    const down = frameAt([{ type: 'travel', path: 'bb-left', t0: 0, t1: 1, tone: 'blue' }], 1);
    expect(down.ventricles?.tone).toBe('blue');
    expect(down.atria).toBeNull();
  });

  it('expires flashes and sparks', () => {
    const f = frameAt(
      [
        { type: 'flash', site: 'ventricle', t: 1, tone: 'purple' },
        { type: 'spark', x: 100, y: 30, t: 1, tone: 'blue' },
      ],
      1.1,
    );
    expect(f.rings).toHaveLength(1);
    expect(f.dots).toHaveLength(1);
    const later = frameAt(
      [
        { type: 'flash', site: 'ventricle', t: 1, tone: 'purple' },
        { type: 'spark', x: 100, y: 30, t: 1, tone: 'blue' },
      ],
      2,
    );
    expect(later.rings).toHaveLength(0);
    expect(later.dots).toHaveLength(0);
  });

  it('rotates a loop dot around its closed path', () => {
    const loop = [{ type: 'loop', path: 'flutter-loop', t0: 0, t1: 2, period: 1, tone: 'red' }] as const;
    const a = frameAt([...loop], 0.25).dots[0];
    const b = frameAt([...loop], 1.25).dots[0];
    expect(a.x).toBeCloseTo(b.x);
    expect(a.y).toBeCloseTo(b.y);
  });
});

describe('morphology', () => {
  it('is deterministic', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(fibWavelets(1.234)).toBe(fibWavelets(1.234));
  });

  it('draws a narrow QRS narrower than a wide one', () => {
    const width = (fn: (t: number) => number) => {
      let first = -1;
      let last = -1;
      for (let t = 0; t < 0.5; t += 0.002) {
        if (Math.abs(fn(t)) > 0.1) {
          if (first < 0) first = t;
          last = t;
        }
      }
      return last - first;
    };
    expect(width((t) => qrsNarrow(t, 0.1))).toBeLessThan(0.12);
    expect(width((t) => qrsWide(t, 0.1))).toBeGreaterThan(0.12);
  });

  it('flutter sawtooth repeats every cycle and never sits on a flat baseline', () => {
    expect(flutterSaw(0.3, 0, 0.2)).toBeCloseTo(flutterSaw(0.5, 0, 0.2));
    const nearZero = (fn: (t: number) => number) => {
      let n = 0;
      let all = 0;
      for (let t = 0; t < 1; t += 0.005, all++) if (Math.abs(fn(t)) < 0.02) n++;
      return n / all;
    };
    // A flutter sawtooth only passes through zero; an isoelectric trace sits on it.
    expect(nearZero((t) => flutterSaw(t, 0, 0.2))).toBeLessThan(0.2);
    expect(nearZero((t) => pWave(t, 0.3))).toBeGreaterThan(0.8);
  });

  it('fibrillatory baseline has no repeating cycle', () => {
    const at = (t: number) => Math.round(fibWavelets(t) * 1e4);
    const seen = new Set<number>();
    for (let t = 0; t < 2; t += 0.25) seen.add(at(t));
    expect(seen.size).toBeGreaterThan(6);
  });
});

describe('strip geometry', () => {
  const def: RhythmDef = {
    id: 'test-strip',
    label: 'test',
    description: 'test',
    window: 4,
    signal: (t) => qrsNarrow(t, 1),
    marks: [
      { kind: 'dot', t: 0.5, tone: 'blue' },
      { kind: 'bar', t0: 1, t1: 1.2, tone: 'orange' },
      { kind: 'tag', t: 2, text: 'TAG', tone: 'red' },
      { kind: 'note', t: 3, text: 'note', tone: 'purple' },
      { kind: 'seg', t0: 0.9, t1: 1.2, tone: 'purple' },
    ],
    pulses: [],
    beats: [],
    atrial: [],
    fibrillation: false,
    isoelectric: true,
  };

  it('scales time to the strip width and caches by id', () => {
    const g = buildStrip(def);
    expect(g.pxPerSec).toBeCloseTo(75);
    expect(g.dots[0].x).toBeCloseTo(37.5);
    expect(g.bars[0].x2 - g.bars[0].x1).toBeCloseTo(15);
    expect(g.tags[0].x).toBeCloseTo(150);
    expect(g.segments[0].d.startsWith('M')).toBe(true);
    expect(buildStrip(def)).toBe(g);
    expect(g.samples).toHaveLength(801);
  });

  it('puts the R wave above the baseline and the flat part on it', () => {
    const g = buildStrip(def);
    expect(yAt(g, 0.2)).toBeCloseTo(STRIP.baseline);
    expect(yAt(g, 1.05)).toBeLessThan(STRIP.baseline - 25);
  });
});
