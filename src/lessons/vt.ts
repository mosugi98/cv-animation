import { VT_OPTIONS, vtRhythm, type VtKind } from '../rhythms/vt';
import { sequence, type SceneSpec } from './sequence';
import type { Lesson, LessonBuild } from './types';

const isKind = (s: string | undefined): s is VtKind => VT_OPTIONS.some((o) => o.id === s);

function scenes(kind: VtKind, key: string): SceneSpec[] {
  const sustained = kind === 'sustained';
  const specs: SceneSpec[] = [
    {
      id: 'sinus', dur: 4, chip: '1 · Sinus rhythm', rhythm: key, span: [0, 0.3], accent: 'blue',
      title: 'Sinus rhythm: a P wave, then a narrow QRS.',
      sub: 'The ventricles follow the atria, one beat for each P wave.',
    },
    {
      id: 'onset', dur: 6, chip: '2 · Onset', rhythm: key, span: [0.3, 0.5], accent: 'orange',
      title: 'A circuit in the ventricular muscle takes over.',
      sub: 'It fires over and over on its own, much faster than the sinus node, and the QRS turns wide.',
    },
    sustained
      ? {
          id: 'regular', dur: 6, chip: '3 · Fast and regular', rhythm: key, span: [0.5, 0.72], accent: 'orange',
          title: 'Wide QRS, regular, about 170 per minute.',
          sub: 'Every complex looks the same because the same circuit drives each one.',
        }
      : {
          id: 'run', dur: 6, chip: '3 · A short run', rhythm: key, span: [0.5, 0.64], accent: 'orange',
          title: 'Six identical wide beats, 170 per minute.',
          sub: 'Three or more in a row at over 100 per minute is ventricular tachycardia.',
        },
    sustained
      ? {
          id: 'dissociation', dur: 6, chip: '4 · AV dissociation', rhythm: key, span: [0.72, 1], accent: 'red',
          title: 'The atria carry on at their own slower rate.',
          sub: 'P waves march through the QRS complexes with no fixed relationship. This is a strong clue to VT.',
        }
      : {
          id: 'stops', dur: 6, chip: '4 · Stops', rhythm: key, span: [0.64, 1], accent: 'blue',
          title: 'The run stops by itself in under 30 seconds.',
          sub: 'That makes it non-sustained VT. Sinus beats take over again.',
        },
    {
      id: 'summary', dur: 6, chip: '5 · Recognise it', rhythm: null, accent: 'navy',
      title: 'Regular wide-complex tachycardia, with AV dissociation.',
      sub: 'Schematic educational example.',
    },
  ];
  return specs;
}

function build(option: string | undefined): LessonBuild {
  const kind: VtKind = isKind(option) ? option : 'sustained';
  const key = `vt-${kind}`;
  const sustained = kind === 'sustained';
  return {
    rhythms: { [key]: vtRhythm(kind) },
    scenes: sequence(scenes(kind, key)),
    summary: {
      heading: sustained ? 'Recognising monomorphic ventricular tachycardia' : 'Recognising non-sustained VT',
      rows: [
        { label: 'Rate', value: 'Over 100 per minute; about 170 here' },
        { label: 'Rhythm', value: 'Regular, with every QRS the same shape (monomorphic)' },
        { label: 'QRS', value: 'Wide (over 120 ms)' },
        { label: 'P waves', value: 'Dissociated: slower, regular, and unrelated to the QRS' },
        { label: 'Duration', value: sustained ? 'Sustained: longer than 30 seconds, or needing treatment sooner' : 'Non-sustained: three or more beats, ending within 30 seconds' },
        { label: 'Mechanism', value: 'Re-entry (often around scar) or a focus in the ventricles' },
        {
          label: 'Clinical note',
          value: 'Can cause collapse or progress to ventricular fibrillation. Unstable (low pressure, chest pain, altered, heart failure): synchronised cardioversion; no pulse: treat as cardiac arrest.',
        },
      ],
      keyline: 'Regular, wide, fast, with P waves running independently.',
      pitfall:
        'Supraventricular tachycardia with aberrancy is also wide and regular, but its onset is usually a premature P wave and it lacks AV dissociation. If in doubt, treat a wide-complex tachycardia as VT.',
    },
  };
}

export const vtLesson: Lesson = {
  id: 'vt',
  title: 'Ventricular tachycardia (VT)',
  short: 'Ventricular tachycardia',
  blurb: 'A fast, regular, wide-complex rhythm from a circuit in the ventricles. The atria run on at their own pace.',
  rate: '140–250 /min',
  optionLabel: 'Duration',
  options: VT_OPTIONS,
  defaultOption: 'sustained',
  diagram: { ventricularFocus: true, ventricleCircuit: true },
  previewKey: 'vt-sustained',
  legend: [
    { tone: 'blue', text: 'Sinus impulse' },
    { tone: 'orange', text: 'Ventricular circuit and spread through muscle' },
    { tone: 'red', text: 'Sinus impulse blocked (ventricles busy)' },
  ],
  build,
};
