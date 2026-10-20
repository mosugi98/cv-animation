import { AT_CONDUCTIONS, atRhythm, type AtConduction } from '../rhythms/at';
import { sequence } from './sequence';
import type { Lesson, LessonBuild } from './types';

function build(option: string | undefined): LessonBuild {
  const c = (AT_CONDUCTIONS.find((o) => o.id === option)?.id ?? '1:1') as AtConduction;
  const key = `at-${c}`;
  const oneToOne = c === '1:1';
  return {
    rhythms: { [key]: atRhythm(c) },
    scenes: sequence([
      {
        id: 'sinus', dur: 5, chip: '1 · Sinus', rhythm: key, span: [0, 0.4], accent: 'blue',
        title: 'Sinus rhythm starts at the sinus node.',
        sub: 'Each beat has the normal, upright sinus P wave.',
      },
      {
        id: 'focus', dur: 5, chip: '2 · New focus', rhythm: key, span: [0.4, 0.6], accent: 'orange',
        title: 'A focus elsewhere in the atria takes over.',
        sub: 'It fires faster than the sinus node, so it sets the pace.',
      },
      {
        id: 'organised', dur: 6, chip: '3 · Organised', rhythm: key, span: [0.6, 1], accent: 'orange',
        title: 'Regular P waves with a different shape.',
        sub: 'A new activation direction changes the P wave, and the baseline stays flat between waves.',
      },
      {
        id: 'conduction', dur: 6, chip: `4 · ${c}`, rhythm: key, span: [0.4, 1], accent: oneToOne ? 'blue' : 'red',
        title: oneToOne ? 'The AV node conducts every P wave.' : 'The AV node conducts every second P wave.',
        sub: oneToOne
          ? 'The ventricular rate matches the atrial rate, about 150 per minute.'
          : 'The ventricular rate is half the atrial rate, about 75 per minute.',
      },
      {
        id: 'summary', dur: 6, chip: '5 · Recognise it', rhythm: null, accent: 'navy',
        title: 'Regular P′ waves that do not look like sinus P waves.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: `Recognising atrial tachycardia (${c} conduction)`,
      rows: [
        { label: 'Atrial rate', value: '100–250 per minute (150 here), regular' },
        { label: 'P wave', value: 'Present, different from the sinus P wave (inverted in this schematic)' },
        { label: 'Baseline', value: 'Flat between P waves' },
        { label: 'Ventricular rate', value: oneToOne ? 'Same as atrial rate (1:1)' : 'Half the atrial rate (2:1 AV block)' },
        { label: 'QRS', value: 'Narrow' },
        { label: 'Mechanism', value: 'A focal atrial source or small atrial circuit, independent of the AV node' },
      ],
      keyline: 'Organised, regular non-sinus P waves with a flat baseline between them.',
      pitfall:
        'AVNRT and AVRT need the AV node, so adenosine usually ends them. In atrial tachycardia it only produces transient AV block that unmasks the P waves.',
    },
  };
}

export const atLesson: Lesson = {
  id: 'at',
  title: 'Atrial tachycardia: a fast focus in the atria',
  short: 'Atrial tachycardia',
  blurb: 'An atrial focus other than the sinus node fires regularly and fast. P waves are organised but look different.',
  rate: '100–250 /min',
  optionLabel: 'AV conduction',
  options: AT_CONDUCTIONS.map((o) => ({ id: o.id, label: o.label })),
  defaultOption: '1:1',
  diagram: { ectopicFocus: true },
  previewKey: 'at-1:1',
  legend: [
    { tone: 'blue', text: 'Sinus impulse' },
    { tone: 'orange', text: 'Ectopic atrial impulse (conducted)' },
    { tone: 'red', text: 'Impulse blocked in the AV node' },
  ],
  build,
};
