import { junctionalRhythm, type EscapeKind } from '../rhythms/junctional';
import { sequence } from './sequence';
import type { Lesson, LessonBuild } from './types';

const OPTIONS = [
  { id: 'beat', label: 'Escape beat' },
  { id: 'rhythm', label: 'Escape rhythm' },
];

function build(option: string | undefined): LessonBuild {
  const kind = (OPTIONS.find((o) => o.id === option)?.id ?? 'rhythm') as EscapeKind;
  const key = `junctional-${kind}`;
  const isBeat = kind === 'beat';
  return {
    rhythms: { [key]: junctionalRhythm(kind) },
    scenes: sequence([
      {
        id: 'sinus', dur: 5, chip: '1 · Sinus', rhythm: key, span: [0, 0.33], accent: 'blue',
        title: 'Sinus rhythm conducts normally.',
        sub: 'P wave, narrow QRS, about 75 per minute.',
      },
      {
        id: 'pause', dur: 5, chip: '2 · Pause', rhythm: key, span: [0.33, isBeat ? 0.46 : 0.5], accent: 'red',
        title: 'The sinus node stops firing.',
        sub: 'No P wave and no QRS. The next beat is late, not early.',
      },
      {
        id: 'escape', dur: 6, chip: '3 · Escape', rhythm: key, span: [isBeat ? 0.46 : 0.5, isBeat ? 0.6 : 0.72], accent: 'purple',
        title: 'The AV junction fires after the pause.',
        sub: 'The backup pacemaker takes over. The QRS is narrow, with a small inverted P wave after it.',
      },
      isBeat
        ? {
            id: 'resume', dur: 6, chip: '4 · Sinus resumes', rhythm: key, span: [0.6, 1], accent: 'blue',
            title: 'One escape beat, then the sinus node recovers.',
            sub: 'Sinus P waves return and conduct normally.',
          }
        : {
            id: 'rhythm', dur: 6, chip: '4 · Escape rhythm', rhythm: key, span: [0.72, 1], accent: 'purple',
            title: 'The junction keeps firing at its own slow rate.',
            sub: 'Regular, narrow, about 44 per minute.',
          },
      {
        id: 'summary', dur: 6, chip: '5 · Recognise it', rhythm: null, accent: 'navy',
        title: 'A narrow-complex beat that comes after a pause.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: isBeat ? 'Recognising a junctional escape beat' : 'Recognising a junctional escape rhythm',
      rows: [
        { label: 'Timing', value: 'Late: it comes after a pause longer than the normal cycle, never early' },
        { label: 'Rate', value: isBeat ? 'A single beat' : '40–60 per minute, regular (about 44 here)' },
        { label: 'QRS', value: 'Narrow, as in sinus rhythm' },
        { label: 'P wave', value: 'Absent, or retrograde (inverted in II, III, aVF) just before, within or after the QRS' },
        { label: 'Mechanism', value: 'Backup pacemaker in the AV junction when the sinus node or AV conduction fails' },
        { label: 'Common causes', value: 'Sinus arrest or bradycardia, high-grade AV block, high vagal tone, drugs such as beta-blockers or digoxin' },
      ],
      keyline: 'Narrow QRS that arrives after a pause, without a normal P wave.',
      pitfall:
        'A premature junctional beat has the same narrow QRS but comes early. An escape beat only ever comes late.',
    },
  };
}

export const junctionalLesson: Lesson = {
  id: 'junctional',
  title: 'Junctional escape: the first backup pacemaker',
  short: 'Junctional escape',
  blurb: 'When the sinus node stalls, the AV junction can take over with a narrow QRS, after a pause.',
  rate: '40–60 /min',
  optionLabel: 'Escape type',
  options: OPTIONS,
  defaultOption: 'rhythm',
  diagram: {},
  previewKey: 'junctional-rhythm',
  legend: [
    { tone: 'blue', text: 'Sinus impulse' },
    { tone: 'purple', text: 'Junctional escape impulse' },
    { tone: 'red', text: 'Pause with no activation' },
  ],
  build,
};
