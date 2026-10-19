import { TORSADES_OPTIONS, torsadesRhythm, type TorsadesOutcome } from '../rhythms/torsades';
import { sequence } from './sequence';
import type { Lesson, LessonBuild } from './types';

const isOutcome = (s: string | undefined): s is TorsadesOutcome => TORSADES_OPTIONS.some((o) => o.id === s);

function build(option: string | undefined): LessonBuild {
  const outcome: TorsadesOutcome = isOutcome(option) ? option : 'selflimit';
  const key = `torsades-${outcome}`;
  const vf = outcome === 'vf';
  return {
    rhythms: { [key]: torsadesRhythm(outcome) },
    scenes: sequence([
      {
        id: 'long-qt', dur: 5, chip: '1 · Long QT', rhythm: key, span: [0, 0.2], accent: 'orange',
        title: 'The heart is slow to recover after each beat.',
        sub: 'The QT interval is prolonged. Causes include some drugs, low potassium or magnesium, and inherited conditions.',
      },
      {
        id: 'trigger', dur: 7, chip: '2 · Short-long-short', rhythm: key, span: [0.2, 0.45], accent: 'red',
        title: 'A PVC, a long pause, then a PVC on top of the T wave.',
        sub: 'The pause lengthens the next QT even more. The second PVC lands in that vulnerable window (R on T).',
      },
      {
        id: 'twisting', dur: 7, chip: '3 · Twisting', rhythm: key, span: vf ? [0.43, 0.67] : [0.43, 0.8], accent: 'red',
        title: 'Torsades de pointes: the complexes twist around the baseline.',
        sub: 'About 200–250 per minute. They grow, shrink and flip, because the circuit keeps changing its path.',
      },
      vf
        ? {
            id: 'vf', dur: 6, chip: '4 · To VF', rhythm: key, span: [0.67, 1], accent: 'red',
            title: 'Here it degenerates into ventricular fibrillation.',
            sub: 'The pattern collapses into chaos and the person has no pulse. This needs defibrillation.',
          }
        : {
            id: 'stops', dur: 6, chip: '4 · Stops', rhythm: key, span: [0.8, 1], accent: 'blue',
            title: 'This run stops by itself and sinus rhythm returns.',
            sub: 'Short runs can end alone, but they often come back or turn into VF.',
          },
      {
        id: 'summary', dur: 6, chip: '5 · Recognise it', rhythm: null, accent: 'navy',
        title: 'Twisting polymorphic VT in a long-QT setting.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: 'Recognising torsades de pointes',
      rows: [
        { label: 'Rate', value: '200–250 per minute; about 220 here' },
        { label: 'QRS', value: 'Wide, with changing height and direction (polymorphic): the points twist around the baseline' },
        { label: 'Setting', value: 'Long QT interval (corrected QT over about 500 ms is high risk)' },
        { label: 'Trigger', value: 'Short-long-short: PVC, pause, then a PVC on the T wave' },
        { label: 'Causes', value: 'QT-prolonging drugs, low potassium or magnesium, slow heart rate, inherited long QT' },
        { label: 'Course', value: 'Often stops alone, but can degenerate to VF' },
        {
          label: 'Clinical note',
          value: 'Give IV magnesium, correct potassium, stop QT-prolonging drugs and raise the heart rate if needed. Unstable or pulseless: defibrillate.',
        },
      ],
      keyline: 'Twisting wide complexes with a long QT behind them.',
      pitfall:
        'Ordinary monomorphic VT has identical complexes and is not tied to a long QT. Many VT drugs (such as amiodarone and procainamide) prolong the QT further, so make the distinction before treating.',
    },
  };
}

export const torsadesLesson: Lesson = {
  id: 'torsades',
  title: 'Torsades de pointes',
  short: 'Torsades de pointes',
  blurb: 'A twisting polymorphic VT in a long-QT setting, started by a short-long-short sequence.',
  rate: '200–250 /min',
  optionLabel: 'Outcome',
  options: TORSADES_OPTIONS,
  defaultOption: 'selflimit',
  diagram: { ventricularFocus: true, ventricleCircuit: true },
  previewKey: 'torsades-selflimit',
  legend: [
    { tone: 'blue', text: 'Sinus impulse' },
    { tone: 'orange', text: 'Ventricular activation' },
    { tone: 'red', text: 'Sinus impulse blocked, or chaotic activation' },
  ],
  build,
};
