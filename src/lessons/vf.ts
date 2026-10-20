import { VF_OPTIONS, vfRhythm, type VfAmplitude } from '../rhythms/vf';
import { sequence } from './sequence';
import type { Lesson, LessonBuild } from './types';

const isAmp = (s: string | undefined): s is VfAmplitude => VF_OPTIONS.some((o) => o.id === s);

function build(option: string | undefined): LessonBuild {
  const amp: VfAmplitude = isAmp(option) ? option : 'coarse';
  const key = `vf-${amp}`;
  const fine = amp === 'fine';
  return {
    rhythms: { [key]: vfRhythm(amp) },
    scenes: sequence([
      {
        id: 'vt', dur: 5, chip: '1 · Fast and wide', rhythm: key, span: [0, 0.33], accent: 'orange',
        title: 'It often starts as a fast ventricular rhythm.',
        sub: 'Sinus beats first, then a fast wide-complex tachycardia.',
      },
      {
        id: 'break', dur: 5, chip: '2 · Breakdown', rhythm: key, span: [0.33, 0.55], accent: 'red',
        title: 'The organised circuit breaks into many.',
        sub: 'Many small waves wander through the ventricles at once. They no longer contract together.',
      },
      {
        id: 'vf', dur: 6, chip: '3 · Ventricular fibrillation', rhythm: key, span: [0.55, 0.78], accent: 'red',
        title: fine ? 'Fine VF: the line quivers with small, irregular waves.' : 'Coarse VF: large, irregular waves with no QRS complexes.',
        sub: 'No two waves are alike and nothing is regular.',
      },
      {
        id: 'no-output', dur: 5, chip: '4 · No pumping', rhythm: key, span: [0.78, 1], accent: 'red',
        title: 'The ventricles quiver and pump no blood.',
        sub: 'There is no pulse and no blood pressure. Without a shock the person dies within minutes.',
      },
      {
        id: 'summary', dur: 6, chip: '5 · Recognise it', rhythm: null, accent: 'navy',
        title: 'Chaotic baseline, no QRS, no pulse.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: fine ? 'Recognising fine ventricular fibrillation' : 'Recognising coarse ventricular fibrillation',
      rows: [
        { label: 'Rhythm', value: 'Chaotic and irregular, never repeating' },
        { label: 'QRS', value: 'None: no identifiable QRS, ST or T wave' },
        { label: 'Amplitude', value: fine ? 'Fine: small waves, easily mistaken for asystole' : 'Coarse: large waves, easily seen' },
        { label: 'Output', value: 'No effective pumping: the person collapses with no pulse' },
        { label: 'Mechanism', value: 'Many wandering wavefronts in the ventricular muscle' },
        { label: 'Clinical note', value: 'A shockable cardiac arrest rhythm. Start CPR and defibrillate as soon as possible.' },
      ],
      keyline: 'A wandering, chaotic line with no QRS complexes in a person with no pulse.',
      pitfall: fine
        ? 'Fine VF can look like asystole, and a loose electrode or movement artefact can mimic VF. Check the person, not just the monitor.'
        : 'Torsades de pointes twists in a regular pattern and starts in a long-QT setting. Artefact looks like VF in a person with a pulse and normal awareness.',
    },
  };
}

export const vfLesson: Lesson = {
  id: 'vf',
  title: 'Ventricular fibrillation (VF)',
  short: 'Ventricular fibrillation',
  blurb: 'Chaotic quivering of the ventricles: no QRS, no pulse. A shockable cardiac arrest rhythm.',
  rate: 'No effective rate',
  optionLabel: 'Amplitude',
  options: VF_OPTIONS,
  defaultOption: 'coarse',
  diagram: {},
  previewKey: 'vf-coarse',
  legend: [
    { tone: 'blue', text: 'Sinus impulse' },
    { tone: 'orange', text: 'Fast ventricular rhythm' },
    { tone: 'red', text: 'Chaotic ventricular activation' },
  ],
  build,
};
