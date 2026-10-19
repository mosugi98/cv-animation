import { aberrancyLesson } from './aberrancy';
import { afLesson } from './af';
import { atLesson } from './at';
import { avnrtLesson } from './avnrt';
import { avrtLesson } from './avrt';
import { flutterLesson } from './flutter';
import { hyperkalemiaLesson } from './hyperkalemia';
import { hypokalemiaLesson } from './hypokalemia';
import { junctionalLesson } from './junctional';
import { pvcLesson } from './pvc';
import { torsadesLesson } from './torsades';
import type { Lesson, LessonBuild, LessonGroup, LessonId } from './types';
import { ventricularLesson } from './ventricular';
import { vfLesson } from './vf';
import { vtLesson } from './vt';
import { wpwLesson } from './wpw';

export const LESSONS: Lesson[] = [
  avnrtLesson,
  avrtLesson,
  wpwLesson,
  aberrancyLesson,
  afLesson,
  flutterLesson,
  atLesson,
  junctionalLesson,
  ventricularLesson,
  pvcLesson,
  vtLesson,
  torsadesLesson,
  vfLesson,
  hypokalemiaLesson,
  hyperkalemiaLesson,
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
    id: 'preexcitation',
    title: 'Pre-excitation and aberrancy',
    blurb: 'Wide-complex look-alikes: an extra pathway that bypasses the AV node, and a bundle branch that cannot keep up.',
    lessons: ['wpw', 'aberrancy'],
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
  {
    id: 'ventricular-arrhythmias',
    title: 'Ventricular arrhythmias',
    blurb: 'Rhythms that start in the ventricles, from a single early beat to a cardiac arrest rhythm. Recognise them early.',
    lessons: ['pvc', 'vt', 'torsades', 'vf'],
  },
  {
    id: 'electrolytes',
    title: 'Electrolytes',
    blurb: 'Potassium changes how heart cells recharge and conduct, and the ECG shows it.',
    lessons: ['hypokalemia', 'hyperkalemia'],
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
