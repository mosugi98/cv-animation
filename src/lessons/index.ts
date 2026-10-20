import { aberrancyLesson } from './aberrancy';
import { afLesson } from './af';
import { atLesson } from './at';
import { avCompleteLesson, avFirstLesson, avHighLesson, avMobitz1Lesson, avMobitz2Lesson } from './avblock';
import { avnrtLesson } from './avnrt';
import { avrtLesson } from './avrt';
import { fascicularLesson, lbbbLesson, rbbbLesson } from './bundle';
import { flutterLesson } from './flutter';
import { hyperkalemiaLesson } from './hyperkalemia';
import { hypokalemiaLesson } from './hypokalemia';
import { junctionalLesson } from './junctional';
import { faultLesson, pacemakerLesson, physioLesson } from './pacemaker';
import { pvcLesson } from './pvc';
import { saBlockLesson, sinusArrestLesson, sssLesson } from './sinusnode';
import { torsadesLesson } from './torsades';
import type { DiagramConfig, Lesson, LessonBuild, LessonGroup, LessonId } from './types';
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
  sssLesson,
  saBlockLesson,
  sinusArrestLesson,
  avFirstLesson,
  avMobitz1Lesson,
  avMobitz2Lesson,
  avHighLesson,
  avCompleteLesson,
  lbbbLesson,
  rbbbLesson,
  fascicularLesson,
  junctionalLesson,
  ventricularLesson,
  pacemakerLesson,
  physioLesson,
  faultLesson,
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
    id: 'sinus-node',
    title: 'Sinus node disorders',
    blurb: 'The natural pacemaker fires too slowly, fails to exit, or stops: from sick sinus syndrome to sinoatrial block and arrest.',
    lessons: ['sss', 'sinoblock', 'sinusarrest'],
  },
  {
    id: 'av-block',
    title: 'AV block',
    blurb: 'Delay or failure of conduction between the atria and ventricles, from a long PR interval to complete dissociation.',
    lessons: ['av1', 'avm1', 'avm2', 'avhigh', 'av3'],
  },
  {
    id: 'bundle-branch',
    title: 'Bundle branch and fascicular block',
    blurb: 'Block below the His bundle: the QRS widens, or its axis shifts, while the atria and AV node carry on as usual.',
    lessons: ['lbbb', 'rbbb', 'fascicular'],
  },
  {
    id: 'escape',
    title: 'Escape rhythms',
    blurb: 'Backup pacemakers that take over after a pause. They arrive late, never early.',
    lessons: ['junctional', 'ventricular'],
  },
  {
    id: 'pacemakers',
    title: 'Pacemakers',
    blurb: 'What each pacing mode, pacing site and device fault looks like on the ECG.',
    lessons: ['pacemaker', 'pacing-physio', 'pacing-fault'],
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

/** The conduction diagram to draw for a lesson option. */
export function diagramOf(lesson: Lesson, option?: string | null): DiagramConfig {
  return lesson.diagramFor ? lesson.diagramFor(resolveOption(lesson, option)) : lesson.diagram;
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
