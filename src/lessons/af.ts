import { afRhythm } from '../rhythms/af';
import { sequence } from './sequence';
import type { Lesson } from './types';

export const afLesson: Lesson = {
  id: 'af',
  title: 'Atrial fibrillation: chaos above, irregular below',
  short: 'Atrial fibrillation',
  blurb: 'Many small wavelets replace the organised atrial beat. The AV node lets through an irregularly irregular response.',
  rate: 'Atrial 350–600 · ventricular variable',
  diagram: {},
  previewKey: 'af',
  legend: [
    { tone: 'blue', text: 'Chaotic atrial wavelets' },
    { tone: 'orange', text: 'Impulse conducted through the AV node' },
    { tone: 'red', text: 'Impulse blocked by the AV node' },
  ],
  build: () => ({
    rhythms: { af: afRhythm() },
    scenes: sequence([
      {
        id: 'chaos', dur: 6, chip: '1 · Atria', rhythm: 'af', span: [0, 0.5], accent: 'blue',
        title: 'No single pacemaker. Many wavelets wander through the atria.',
        sub: 'The atria quiver rather than contract in a coordinated way.',
      },
      {
        id: 'no-p', dur: 5, chip: '2 · No P waves', rhythm: 'af', span: [0.3, 0.7], accent: 'purple',
        title: 'No organised atrial wave means no P wave.',
        sub: 'The baseline is replaced by a fine, uneven fibrillatory quiver.',
      },
      {
        id: 'filter', dur: 6, chip: '3 · AV node', rhythm: 'af', span: [0.5, 1], accent: 'red',
        title: 'The AV node cannot take them all.',
        sub: 'Most impulses are blocked. A few get through at unpredictable moments.',
      },
      {
        id: 'response', dur: 7, chip: '4 · Response', rhythm: 'af', accent: 'orange',
        title: 'The R-R intervals have no pattern.',
        sub: 'Irregularly irregular, with narrow QRS complexes.',
      },
      {
        id: 'summary', dur: 6, chip: '5 · Recognise it', rhythm: null, accent: 'navy',
        title: 'No P waves, no pattern in the R-R intervals.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: 'Recognising atrial fibrillation',
      rows: [
        { label: 'Atrial activity', value: 'Fibrillatory, 350–600 per minute, no discrete P waves' },
        { label: 'Ventricular rhythm', value: 'Irregularly irregular' },
        { label: 'Ventricular rate', value: 'Variable; roughly 90–170 per minute when untreated' },
        { label: 'QRS', value: 'Narrow unless there is bundle branch block or aberrancy' },
        { label: 'Mechanism', value: 'Multiple wavelets and rapid atrial triggers; the AV node filters the impulses' },
        { label: 'Clinical note', value: 'Raises stroke risk, so anticoagulation needs assessing' },
      ],
      keyline: 'Irregularly irregular R-R intervals with no P waves.',
      pitfall:
        'Atrial flutter with variable block can also be irregular, but it shows regular sawtooth flutter waves and a repeating pattern in the R-R intervals.',
    },
  }),
};
