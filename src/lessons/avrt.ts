import { avrtInitiation, avrtSinus, avrtTachycardia } from '../rhythms/avrt';
import { sequence } from './sequence';
import type { Lesson } from './types';

export const avrtLesson: Lesson = {
  id: 'avrt',
  title: 'AVRT: a circuit through an accessory pathway',
  short: 'AVRT',
  blurb: 'A large circuit: down the AV node, up an accessory pathway, back through the atria. The P wave follows the QRS.',
  rate: '150–250 /min',
  diagram: { accessoryPathway: true, ectopicFocus: true },
  previewKey: 'tachycardia',
  legend: [
    { tone: 'blue', text: 'Normal conduction (AV node)' },
    { tone: 'orange', text: 'Delayed or pre-excited conduction' },
    { tone: 'purple', text: 'Backward through the accessory pathway' },
    { tone: 'red', text: 'Blocked impulse' },
  ],
  build: () => ({
    rhythms: {
      sinus: avrtSinus(),
      initiation: avrtInitiation(),
      tachycardia: avrtTachycardia(),
    },
    scenes: sequence([
      {
        id: 'sinus', dur: 5, chip: '1 · Baseline', rhythm: 'sinus', accent: 'orange',
        title: 'An accessory pathway is a second route into the ventricles.',
        sub: 'In sinus rhythm it pre-excites them: short PR and a delta wave.',
      },
      {
        id: 'trigger', dur: 5, chip: '2 · Trigger', rhythm: 'initiation', span: [0, 0.4], accent: 'red',
        title: 'A premature atrial beat reaches the accessory pathway.',
        sub: 'It is blocked there, because that pathway is still refractory.',
      },
      {
        id: 'circuit', dur: 6, chip: '3 · Circuit', rhythm: 'initiation', span: [0.4, 1], accent: 'purple',
        title: 'Down the AV node, then up the accessory pathway.',
        sub: 'The impulse returns to the atria and the circuit keeps running.',
      },
      {
        id: 'tachycardia', dur: 5, chip: '4 · Tachycardia', rhythm: 'tachycardia', accent: 'purple',
        title: 'Orthodromic AVRT: narrow, regular, about 180 per minute.',
        sub: 'The delta wave is gone, because the ventricles are entered only via the AV node.',
      },
      {
        id: 'retro-p', dur: 5, chip: '5 · P after QRS', rhythm: 'tachycardia', span: [0.3, 1], accent: 'purple',
        title: 'The atria are activated after the ventricles.',
        sub: 'A retrograde P wave follows each QRS, with RP shorter than half the R-R.',
      },
      {
        id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
        title: 'Regular narrow tachycardia, P wave after the QRS.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: 'Recognising orthodromic AVRT',
      rows: [
        { label: 'Rate', value: '150–250 per minute (about 180 here)' },
        { label: 'Rhythm', value: 'Regular, abrupt onset and offset' },
        { label: 'QRS', value: 'Narrow in orthodromic AVRT' },
        { label: 'P wave', value: 'Retrograde, visible after the QRS (RP 70 ms or more; a short-RP tachycardia, RP shorter than P-R)' },
        { label: 'Mechanism', value: 'Macro re-entry: AV node down, accessory pathway up, atria, back to the AV node' },
        { label: 'Sinus rhythm clue', value: 'Short PR and a delta wave if the pathway conducts forward (WPW); none if it is concealed' },
      ],
      keyline: 'Regular narrow tachycardia with a P wave sitting after the QRS.',
      pitfall:
        'AVNRT has no separate P wave (RP under 70 ms). In pre-excited atrial fibrillation, AV-nodal blockers can be dangerous because they favour conduction over the accessory pathway.',
    },
  }),
};
