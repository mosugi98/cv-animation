import type { Tone } from '../engine/types';
import type { LessonScene } from './types';

export interface SceneSpec {
  id: string;
  /** Seconds the scene lasts. */
  dur: number;
  chip: string;
  title: string;
  sub: string;
  accent: Tone;
  /** Rhythm key, or null for the recognition-summary scene. */
  rhythm: string | null;
  span?: readonly [number, number];
  meter?: number;
}

/** Lays scene specs end to end so the timeline is contiguous by construction. */
export function sequence(specs: SceneSpec[]): LessonScene[] {
  let t = 0;
  return specs.map((s) => {
    const scene: LessonScene = {
      id: s.id,
      start: t,
      end: t + s.dur,
      chip: s.chip,
      title: s.title,
      sub: s.sub,
      accent: s.accent,
      view: s.rhythm === null ? 'summary' : 'play',
      rhythm: s.rhythm,
      span: s.span ?? [0, 1],
      ...(s.meter !== undefined ? { meter: s.meter } : {}),
    };
    t += s.dur;
    return scene;
  });
}

/** Rhythm time (seconds) at a given progress through a scene. */
export function rhythmTime(window: number, span: readonly [number, number], progress: number): number {
  return (span[0] + (span[1] - span[0]) * progress) * window;
}

/** A scene span written in seconds of rhythm time instead of fractions of the strip. */
export const secs = (window: number, from: number, to: number): readonly [number, number] => [from / window, to / window];
