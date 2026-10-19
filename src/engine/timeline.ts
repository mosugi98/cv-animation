/** Scene lookup that works for any list of contiguous scenes (each lesson has its own). */

export interface TimedScene {
  id: string;
  start: number;
  end: number;
}

export const durationOf = (scenes: TimedScene[]): number => scenes[scenes.length - 1].end;

const clampTo = (scenes: TimedScene[], t: number): number => Math.min(Math.max(t, 0), durationOf(scenes));

export function sceneIndexIn(scenes: TimedScene[], t: number): number {
  const c = clampTo(scenes, t);
  const i = scenes.findIndex((s) => c >= s.start && c < s.end);
  return i === -1 ? scenes.length - 1 : i;
}

/** 0..1 position inside the scene that contains t. */
export function sceneProgressIn(scenes: TimedScene[], t: number): number {
  const s = scenes[sceneIndexIn(scenes, t)];
  const p = (clampTo(scenes, t) - s.start) / (s.end - s.start);
  return Math.min(Math.max(p, 0), 1);
}

/** Start time of the next scene (dir 1) or of the current/previous scene (dir -1). */
export function stepSceneIn(scenes: TimedScene[], t: number, dir: 1 | -1): number {
  const i = sceneIndexIn(scenes, t);
  if (dir === 1) return scenes[Math.min(i + 1, scenes.length - 1)].start;
  return clampTo(scenes, t) - scenes[i].start > 0.3 ? scenes[i].start : scenes[Math.max(i - 1, 0)].start;
}
