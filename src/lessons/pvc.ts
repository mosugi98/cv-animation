import { PVC_PATTERNS, pvcRhythm, type PvcPattern } from '../rhythms/pvc';
import { sequence, type SceneSpec } from './sequence';
import type { Lesson, LessonBuild } from './types';

const isPattern = (s: string | undefined): s is PvcPattern => PVC_PATTERNS.some((p) => p.id === s);

/** Scene spans (fractions of the 6.6 s window) chosen so each step shows the beat it talks about. */
function scenes(kind: PvcPattern, key: string): SceneSpec[] {
  const summary: SceneSpec = {
    id: 'summary', dur: 6, chip: '5 · Recognise it', rhythm: null, accent: 'navy',
    title: 'An early, wide beat with no P wave, then a pause.',
    sub: 'Schematic educational example.',
  };
  const early: SceneSpec = {
    id: 'early', dur: 6, chip: '2 · Early beat', rhythm: key, accent: 'orange',
    span: kind === 'bigeminy' ? [0.1, 0.28] : [0.3, 0.46],
    title: 'A ventricular focus fires before the next sinus beat is due.',
    sub: 'The impulse spreads slowly through muscle, so the QRS is wide. No P wave leads into it, and the T wave points the other way.',
  };
  if (kind === 'bigeminy') {
    return [
      {
        id: 'baseline', dur: 5, chip: '1 · Sinus beat', rhythm: key, span: [0, 0.1], accent: 'blue',
        title: 'Underneath, the sinus node keeps its steady rhythm.',
        sub: 'A normal beat has a P wave, a narrow QRS and an upright T wave.',
      },
      early,
      {
        id: 'pause', dur: 6, chip: '3 · Pause', rhythm: key, span: [0.28, 0.5], accent: 'purple',
        title: 'The next sinus P wave arrives while the ventricles are still recovering.',
        sub: 'It cannot conduct, so there is a pause before the next normal beat.',
      },
      {
        id: 'pattern', dur: 6, chip: '4 · Bigeminy', rhythm: key, span: [0.5, 1], accent: 'orange',
        title: 'Every second beat is a PVC: ventricular bigeminy.',
        sub: 'Normal beat, early wide beat, normal beat, early wide beat.',
      },
      summary,
    ];
  }
  const second = kind === 'couplet';
  return [
    {
      id: 'baseline', dur: 5, chip: '1 · Sinus rhythm', rhythm: key, span: [0, 0.3], accent: 'blue',
      title: 'Sinus rhythm: a P wave, then a narrow QRS, about 75 per minute.',
      sub: 'The sinus node keeps firing at its own steady pace throughout.',
    },
    early,
    {
      id: 'pause', dur: 6, chip: '3 · Pause', rhythm: key, span: second ? [0.46, 0.72] : [0.46, 0.7], accent: 'purple',
      title: second ? 'Two PVCs in a row, then a pause.' : 'The sinus P wave that follows lands on refractory ventricles.',
      sub: second
        ? 'A couplet. The next sinus beat is again blocked by recovery, and the pause is long.'
        : 'It cannot conduct, so the pause is long.',
    },
    {
      id: 'compensatory', dur: 5, chip: '4 · Compensatory pause', rhythm: key, span: second ? [0.72, 1] : [0.7, 1], accent: 'purple',
      title: 'The beat before and the beat after are two normal cycles apart.',
      sub: 'The sinus node was not reset, so the pause is "fully compensatory".',
    },
    summary,
  ];
}

function build(option: string | undefined): LessonBuild {
  const kind: PvcPattern = isPattern(option) ? option : 'single';
  const key = `pvc-${kind}`;
  const titles: Record<PvcPattern, string> = {
    single: 'Recognising a premature ventricular contraction (PVC)',
    bigeminy: 'Recognising ventricular bigeminy',
    couplet: 'Recognising a PVC couplet',
  };
  return {
    rhythms: { [key]: pvcRhythm(kind) },
    scenes: sequence(scenes(kind, key)),
    summary: {
      heading: titles[kind],
      rows: [
        { label: 'Timing', value: 'Early: it comes before the next sinus beat is due' },
        { label: 'QRS', value: 'Wide (over 120 ms) and bizarre, with a discordant T wave' },
        { label: 'P wave', value: 'None leads into it; the sinus P wave on or just after it is not conducted' },
        { label: 'Pause', value: 'Usually fully compensatory: the sinus rhythm is not reset' },
        { label: 'Mechanism', value: 'A focus (or small circuit) in the ventricular muscle fires early' },
        {
          label: 'Patterns',
          value: 'Bigeminy = every second beat; couplet = two in a row; three or more in a row = ventricular tachycardia',
        },
      ],
      keyline: 'An early, wide, bizarre beat with no P wave, followed by a pause.',
      pitfall:
        'A ventricular escape beat is also wide, but it comes late after a pause, not early. A premature atrial beat with aberrancy is early and wide too, but a premature P wave usually sits in front of it.',
    },
  };
}

export const pvcLesson: Lesson = {
  id: 'pvc',
  title: 'Premature ventricular contraction (PVC)',
  short: 'PVC',
  blurb: 'An extra beat from the ventricles: early, wide and bizarre, with no P wave and a pause afterwards.',
  rate: 'Single beats',
  optionLabel: 'Pattern',
  options: PVC_PATTERNS,
  defaultOption: 'single',
  diagram: { ventricularFocus: true },
  previewKey: 'pvc-single',
  legend: [
    { tone: 'blue', text: 'Sinus impulse' },
    { tone: 'orange', text: 'Ventricular focus, slow spread through muscle' },
    { tone: 'red', text: 'Sinus impulse blocked (ventricles refractory)' },
  ],
  build,
};
