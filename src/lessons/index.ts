import { afLesson } from './af';
import { atLesson } from './at';
import { avnrtLesson } from './avnrt';
import { avrtLesson } from './avrt';
import { flutterLesson } from './flutter';
import { junctionalLesson } from './junctional';
import type { Lesson, LessonBuild, LessonGroup, LessonId } from './types';
import { ventricularLesson } from './ventricular';

export const LESSONS: Lesson[] = [
  avnrtLesson,
  avrtLesson,
  afLesson,
  flutterLesson,
  atLesson,
  junctionalLesson,
  ventricularLesson,
];

export const GROUPS: LessonGroup[] = [
  {
    id: 'svt',
    title: 'Supraventricular tachycardia (SVT)',
    blurb:
      'A regular, fast, narrow-complex tachycardia that depends on tissue above the ventricles. Two common re-entry types, with different circuits.',
    lessons: ['avnrt', 'avrt'],
  },
  {
    id: 'atrial',
    title: 'Atrial rhythms',
    blurb: 'Rhythms that start in the atria: disorganised, circuit-driven or focal.',
    lessons: ['af', 'flutter', 'at'],
  },
  {
    id: 'escape',
    title: 'Escape rhythms',
    blurb: 'Backup pacemakers that take over after a pause. They arrive late, never early.',
    lessons: ['junctional', 'ventricular'],
  },
];

export const isLessonId = (s: string): s is LessonId => LESSONS.some((l) => l.id === s);

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

/** Resolves an option id, falling back to the lesson default (or undefined for lessons without options). */
export function resolveOption(lesson: Lesson, option: string | null | undefined): string | undefined {
  if (!lesson.options) return undefined;
  return lesson.options.some((o) => o.id === option) ? (option as string) : lesson.defaultOption;
}

const cache = new Map<string, LessonBuild>();

/** Builds (once) the scenes, rhythms and summary for a lesson and option. */
export function buildLesson(lesson: Lesson, option?: string | null): LessonBuild {
  const opt = resolveOption(lesson, option);
  const key = `${lesson.id}:${opt ?? ''}`;
  let b = cache.get(key);
  if (!b) {
    b = lesson.build(opt);
    cache.set(key, b);
  }
  return b;
}

export type { Lesson, LessonBuild, LessonGroup, LessonId } from './types';
