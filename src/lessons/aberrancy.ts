import { aberrancyRhythm } from '../rhythms/aberrancy';
import { sequence } from './sequence';
import type { Lesson } from './types';

export const aberrancyLesson: Lesson = {
  id: 'aberrancy',
  title: 'SVT with aberrancy',
  short: 'SVT with aberrancy',
  blurb: 'A supraventricular tachycardia with a wide QRS, because one bundle branch cannot keep up with the rate.',
  rate: '150–250 /min',
  diagram: { dualPathways: true, ectopicFocus: true, bundleLabels: true },
  previewKey: 'svt-aberrancy',
  legend: [
    { tone: 'blue', text: 'Normal conduction' },
    { tone: 'orange', text: 'Delayed conduction, or slow spread through muscle' },
    { tone: 'purple', text: 'Backward through the fast pathway' },
    { tone: 'red', text: 'Blocked impulse' },
  ],
  build: () => ({
    rhythms: { 'svt-aberrancy': aberrancyRhythm() },
    scenes: sequence([
      {
        id: 'sinus', dur: 4, chip: '1 · Narrow QRS', rhythm: 'svt-aberrancy', span: [0, 0.28], accent: 'blue',
        title: 'In sinus rhythm the QRS is narrow.',
        sub: 'Both bundle branches conduct normally, so the ventricles are activated together.',
      },
      {
        id: 'trigger', dur: 6, chip: '2 · Trigger', rhythm: 'svt-aberrancy', span: [0.28, 0.47], accent: 'red',
        title: 'A premature atrial beat starts a re-entry circuit in the AV node.',
        sub: 'It meets the fast pathway still refractory, goes down the slow one and comes back up the fast one.',
      },
      {
        id: 'aberrancy', dur: 7, chip: '3 · Right bundle blocked', rhythm: 'svt-aberrancy', span: [0.47, 0.76], accent: 'red',
        title: 'At this fast rate, the right bundle branch is still recovering.',
        sub: 'The impulse goes down the left bundle only. The right ventricle is activated late, through muscle, so the QRS is wide.',
      },
      {
        id: 'pattern', dur: 6, chip: '4 · Looks like VT', rhythm: 'svt-aberrancy', span: [0.76, 1], accent: 'orange',
        title: 'A wide, regular, fast rhythm, though the circuit is above the ventricles.',
        sub: 'The rSR′ shape of a right bundle block is the clue; the rhythm is called SVT with aberrancy.',
      },
      {
        id: 'summary', dur: 6, chip: '5 · Recognise it', rhythm: null, accent: 'navy',
        title: 'Wide regular tachycardia that is supraventricular in origin.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: 'Recognising SVT with aberrancy',
      rows: [
        { label: 'Rate', value: '150–250 per minute (about 150 here)' },
        { label: 'Rhythm', value: 'Regular, with abrupt onset, often after a premature atrial beat' },
        { label: 'QRS', value: 'Wide, with a typical bundle-branch pattern: rSR′ (RBBB) in V1 and a slurred S in V6' },
        { label: 'Mechanism', value: 'Normal supraventricular circuit, but one bundle branch is refractory at that rate' },
        { label: 'Clues for SVT', value: 'Typical RBBB or LBBB shape, same shape as the baseline bundle block, initiating P wave, response to vagal manoeuvres or adenosine' },
        { label: 'Clues for VT', value: 'AV dissociation, capture or fusion beats, very wide QRS (over 160 ms), concordant chest leads, history of heart disease' },
      ],
      keyline: 'Wide and regular, but the shape is a textbook bundle branch block.',
      pitfall:
        'Treat a wide-complex tachycardia as VT unless SVT is certain. Treating VT as SVT (for example with verapamil or diltiazem) can cause collapse, while cardioverting SVT does little harm.',
    },
  }),
};
