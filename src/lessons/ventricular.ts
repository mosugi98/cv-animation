import type { EscapeKind } from '../rhythms/junctional';
import { ventricularRhythm } from '../rhythms/ventricular';
import { sequence } from './sequence';
import type { Lesson, LessonBuild } from './types';

const OPTIONS = [
  { id: 'beat', label: 'Escape beat' },
  { id: 'rhythm', label: 'Escape rhythm' },
];

function build(option: string | undefined): LessonBuild {
  const kind = (OPTIONS.find((o) => o.id === option)?.id ?? 'rhythm') as EscapeKind;
  const key = `ventricular-${kind}`;
  const isBeat = kind === 'beat';
  return {
    rhythms: { [key]: ventricularRhythm(kind) },
    scenes: sequence([
      {
        id: 'conducted', dur: 4, chip: '1 · Conducted', rhythm: key, span: [0, 0.22], accent: 'blue',
        title: 'At first, each P wave is followed by a QRS.',
        sub: 'Narrow complexes with a normal PR interval.',
      },
      {
        id: 'block', dur: 5, chip: '2 · AV block', rhythm: key, span: [0.22, 0.38], accent: 'red',
        title: 'Then the P waves keep coming, but none gets through.',
        sub: 'The atria beat on at their own rate. The ventricles receive nothing.',
      },
      {
        id: 'escape', dur: 6, chip: '3 · Escape', rhythm: key, span: [0.38, isBeat ? 0.55 : 0.7], accent: 'purple',
        title: 'After a long pause, a ventricular focus fires.',
        sub: 'The impulse spreads slowly through muscle, so the QRS is wide, with no P wave in front of it.',
      },
      isBeat
        ? {
            id: 'resume', dur: 6, chip: '4 · Conduction resumes', rhythm: key, span: [0.55, 1], accent: 'blue',
            title: 'One escape beat, then conduction returns.',
            sub: 'The P waves conduct again and narrow QRS complexes follow.',
          }
        : {
            id: 'rhythm', dur: 6, chip: '4 · Escape rhythm', rhythm: key, span: [0.7, 1], accent: 'purple',
            title: 'The ventricles keep their own slow rhythm.',
            sub: 'Wide QRS at about 30 per minute, unrelated to the P waves.',
          },
      {
        id: 'summary', dur: 6, chip: '5 · Recognise it', rhythm: null, accent: 'navy',
        title: 'Wide QRS after a long pause, with no related P wave.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: isBeat ? 'Recognising a ventricular escape beat' : 'Recognising a ventricular escape rhythm',
      rows: [
        { label: 'Timing', value: 'Late: it comes after a long pause, never early' },
        { label: 'Rate', value: isBeat ? 'A single beat' : '20–40 per minute, regular (about 30 here)' },
        { label: 'QRS', value: 'Wide (over 120 ms), often with a discordant T wave' },
        { label: 'P waves', value: 'Present in AV block, regular, with no fixed relationship to the QRS' },
        { label: 'Mechanism', value: 'Last-resort pacemaker in the ventricles when nothing above it conducts' },
        { label: 'Clinical note', value: 'Slow and unreliable, and it signals significant block: assess urgently for pacing, and do not suppress it with antiarrhythmic drugs' },
      ],
      keyline: 'Slow, wide QRS after a long pause, with P waves marching through unrelated.',
      pitfall:
        'A premature ventricular beat is also wide, but it comes early. An escape beat only ever comes late.',
    },
  };
}

export const ventricularLesson: Lesson = {
  id: 'ventricular',
  title: 'Ventricular escape: the last-resort pacemaker',
  short: 'Ventricular escape',
  blurb: 'When no impulse reaches the ventricles, they fire on their own: slow, wide complexes after a long pause.',
  rate: '20–40 /min',
  optionLabel: 'Escape type',
  options: OPTIONS,
  defaultOption: 'rhythm',
  diagram: {},
  previewKey: 'ventricular-rhythm',
  legend: [
    { tone: 'blue', text: 'Sinus impulse' },
    { tone: 'red', text: 'Sinus impulse blocked at the AV node' },
    { tone: 'purple', text: 'Ventricular escape impulse' },
  ],
  build,
};
