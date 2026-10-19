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
