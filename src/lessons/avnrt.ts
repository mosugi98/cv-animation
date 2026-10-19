import { avnrtInitiation, avnrtSinus, avnrtTachycardia } from '../rhythms/avnrt';
import { sequence } from './sequence';
import type { Lesson } from './types';

export const avnrtLesson: Lesson = {
  id: 'avnrt',
  title: 'AVNRT: re-entry inside the AV node',
  short: 'AVNRT',
  blurb: 'Two pathways in the AV node form a circuit. The atria and ventricles are activated almost together.',
  rate: '150–250 /min',
  diagram: { dualPathways: true, ectopicFocus: true },
  previewKey: 'tachycardia',
  legend: [
    { tone: 'blue', text: 'Normal conduction (fast pathway)' },
    { tone: 'orange', text: 'Slow pathway, forward' },
    { tone: 'purple', text: 'Fast pathway, backward' },
    { tone: 'red', text: 'Blocked impulse' },
  ],
  build: () => ({
    rhythms: {
      sinus: avnrtSinus(),
      initiation: avnrtInitiation(),
      tachycardia: avnrtTachycardia(),
    },
    scenes: sequence([
      {
        id: 'sinus', dur: 5, chip: '1 · Baseline', rhythm: 'sinus', accent: 'blue',
        title: 'Sinus rhythm uses the fast pathway.',
        sub: 'Normal PR interval. The slow pathway is silent.',
      },
      {
        id: 'trigger', dur: 5, chip: '2 · Trigger', rhythm: 'initiation', span: [0, 0.4], accent: 'red',
        title: 'A premature atrial beat arrives early.',
        sub: 'The fast pathway is still recovering, so the impulse is blocked there.',
      },
      {
        id: 'circuit', dur: 6, chip: '3 · Circuit', rhythm: 'initiation', span: [0.4, 1], accent: 'orange',
        title: 'It creeps down the slow pathway, then climbs back up the fast one.',
        sub: 'The re-entry circuit is now running inside the AV node.',
      },
      {
        id: 'tachycardia', dur: 5, chip: '4 · Tachycardia', rhythm: 'tachycardia', accent: 'purple',
        title: 'Every lap activates the ventricles.',
        sub: 'Regular, narrow-complex, about 170 per minute.',
      },
      {
        id: 'retro-p', dur: 5, chip: '5 · Hidden P wave', rhythm: 'tachycardia', span: [0.4, 1], accent: 'purple',
        title: 'The atria are activated at the same moment.',
        sub: 'The P wave hides in, or just after, the QRS.',
      },
      {
        id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
        title: 'Regular narrow tachycardia, no visible P wave.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: 'Recognising AVNRT',
      rows: [
        { label: 'Rate', value: '150–250 per minute (about 170 here)' },
        { label: 'Rhythm', value: 'Regular, abrupt onset and offset' },
        { label: 'QRS', value: 'Narrow (unless aberrant conduction)' },
        { label: 'P wave', value: 'Hidden in the QRS, or a pseudo-S / pseudo-R′ just after it (RP under 70 ms)' },
        { label: 'Mechanism', value: 'Re-entry within the AV node: slow pathway down, fast pathway up' },
        { label: 'AV node role', value: 'Essential to the circuit, so vagal manoeuvres or adenosine can terminate it' },
      ],
      keyline: 'Regular narrow tachycardia with no clear P wave.',
      pitfall: 'AVRT is also a regular narrow tachycardia, but its P wave sits clearly after the QRS (RP 70 ms or more).',
    },
  }),
};
