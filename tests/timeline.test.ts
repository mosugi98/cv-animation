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
