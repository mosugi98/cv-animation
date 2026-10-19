import { POTASSIUM_LEVEL, potassiumRhythm } from '../rhythms/electrolytes';
import { sequence } from './sequence';
import type { Lesson } from './types';

export const hypokalemiaLesson: Lesson = {
  id: 'hypokalemia',
  title: 'Hypokalaemia on the ECG',
  short: 'Hypokalaemia',
  blurb: 'Low potassium flattens the T wave, depresses the ST segment and raises a U wave. Ectopy follows as it falls.',
  rate: 'Usually normal',
  diagram: {},
  previewKey: 'severe',
  legend: [
    { tone: 'blue', text: 'Sinus impulse' },
    { tone: 'orange', text: 'Delayed repolarisation and ventricular ectopy' },
    { tone: 'red', text: 'Sinus impulse blocked (ventricles refractory)' },
  ],
  build: () => ({
    rhythms: {
      normal: potassiumRhythm('normal'),
      mild: potassiumRhythm('hypo-mild'),
      severe: potassiumRhythm('hypo-severe'),
    },
    scenes: sequence([
      {
        id: 'normal', dur: 5, chip: '1 · Normal K⁺', rhythm: 'normal', accent: 'blue', meter: POTASSIUM_LEVEL.normal,
        title: 'With normal potassium, the T wave is upright and clear.',
        sub: 'The ST segment is flat. No U wave is seen.',
      },
      {
        id: 'mild', dur: 7, chip: '2 · Low K⁺', rhythm: 'mild', accent: 'orange', meter: POTASSIUM_LEVEL['hypo-mild'],
        title: 'Potassium falls and the T wave flattens.',
        sub: 'The ST segment sags, and a small U wave appears after the T wave.',
      },
      {
        id: 'severe', dur: 6, chip: '3 · Very low K⁺', rhythm: 'severe', span: [0, 0.45], accent: 'red', meter: POTASSIUM_LEVEL['hypo-severe'],
        title: 'The U wave becomes larger than the T wave.',
        sub: 'The ST segment sags further and the T wave nearly disappears.',
      },
      {
        id: 'ectopy', dur: 5, chip: '4 · Ectopy', rhythm: 'severe', span: [0.45, 1], accent: 'red', meter: POTASSIUM_LEVEL['hypo-severe'],
        title: 'The ventricles become irritable and PVCs appear.',
        sub: 'Torsades de pointes and ventricular fibrillation can follow, especially if magnesium is low.',
      },
      {
        id: 'summary', dur: 6, chip: '5 · Recognise it', rhythm: null, accent: 'navy',
        title: 'Flat T, ST depression, prominent U.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: 'Recognising hypokalaemia',
      rows: [
        { label: 'T wave', value: 'Flat or low, later inverted' },
        { label: 'ST segment', value: 'Depressed' },
        { label: 'U wave', value: 'Prominent: a wave after the T wave; in severe cases larger than the T wave' },
        { label: 'QT', value: 'Looks long but is really a QT-U fusion: measure carefully' },
        { label: 'Rhythm', value: 'PVCs, atrial fibrillation or tachycardia; torsades de pointes and VF in severe cases' },
        { label: 'Level', value: 'Below 3.5 mmol/L; the ECG changes become more likely below about 3.0' },
        { label: 'Clinical note', value: 'Replace potassium and check magnesium; low magnesium makes it resistant and adds arrhythmia risk. Digoxin makes it more dangerous.' },
      ],
      keyline: 'Flat T wave, sagging ST segment, and a U wave that stands up.',
      pitfall:
        'ECG changes track the potassium level poorly, so a normal ECG does not exclude a low level. A tall U wave also occurs with some drugs, bradycardia and a raised intracranial pressure.',
    },
  }),
};
