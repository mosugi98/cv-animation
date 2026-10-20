import { POTASSIUM_LEVEL, potassiumRhythm } from '../rhythms/electrolytes';
import { sequence } from './sequence';
import type { Lesson } from './types';

export const hyperkalemiaLesson: Lesson = {
  id: 'hyperkalemia',
  title: 'Hyperkalaemia on the ECG',
  short: 'Hyperkalaemia',
  blurb: 'High potassium produces peaked T waves, then flat P waves and a wide QRS, ending in a sine wave.',
  rate: 'Normal to slow',
  diagram: {},
  previewKey: 'severe',
  legend: [
    { tone: 'blue', text: 'Sinus impulse' },
    { tone: 'orange', text: 'Slowed conduction' },
    { tone: 'red', text: 'Pre-arrest rhythm' },
  ],
  build: () => ({
    rhythms: {
      normal: potassiumRhythm('normal'),
      mild: potassiumRhythm('hyper-mild'),
      moderate: potassiumRhythm('hyper-moderate'),
      severe: potassiumRhythm('hyper-severe'),
    },
    scenes: sequence([
      {
        id: 'normal', dur: 4, chip: '1 · Normal K⁺', rhythm: 'normal', span: [0, 0.6], accent: 'blue', meter: POTASSIUM_LEVEL.normal,
        title: 'Normal potassium: a rounded T wave about a third of the QRS height.',
        sub: 'Reference for what follows.',
      },
      {
        id: 'mild', dur: 6, chip: '2 · Peaked T', rhythm: 'mild', accent: 'orange', meter: POTASSIUM_LEVEL['hyper-mild'],
        title: 'The T wave grows tall, narrow and pointed.',
        sub: 'Repolarisation speeds up. The PR and QRS are still normal.',
      },
      {
        id: 'moderate', dur: 7, chip: '3 · Slowed conduction', rhythm: 'moderate', accent: 'orange', meter: POTASSIUM_LEVEL['hyper-moderate'],
        title: 'The P wave flattens, the PR lengthens and the QRS widens.',
        sub: 'The cells are less able to conduct. The T waves stay peaked.',
      },
      {
        id: 'severe', dur: 7, chip: '4 · Sine wave', rhythm: 'severe', accent: 'red', meter: POTASSIUM_LEVEL['hyper-severe'],
        title: 'The QRS and T merge into a sine wave.',
        sub: 'This is a pre-arrest rhythm. Without treatment it ends in ventricular fibrillation or asystole.',
      },
      {
        id: 'summary', dur: 6, chip: '5 · Recognise it', rhythm: null, accent: 'navy',
        title: 'Peaked T, flat P, wide QRS, sine wave.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: 'Recognising hyperkalaemia',
      rows: [
        { label: 'Early', value: 'Tall, narrow-based, symmetric ("tented") T waves' },
        { label: 'Then', value: 'Flat or absent P waves, long PR and a wide QRS' },
        { label: 'Late', value: 'Sine wave; then ventricular fibrillation or asystole' },
        { label: 'Rhythm', value: 'Bradycardia, AV block, sinoventricular rhythm' },
        { label: 'Level', value: 'Above about 5.5 mmol/L; ECG changes more often appear above 6.5' },
        { label: 'Clinical note', value: 'ECG changes mean urgent treatment: IV calcium protects the heart, then shift potassium (insulin with glucose, salbutamol) and remove it' },
      ],
      keyline: 'Peaked T waves first; if the potassium keeps rising, the P wave goes, the QRS widens and a sine wave appears.',
      pitfall:
        'The ECG is insensitive: a normal ECG does not exclude dangerous hyperkalaemia. Tall T waves also occur in early myocardial infarction and in normal variants; look for the symmetric, narrow-based shape.',
    },
  }),
};
