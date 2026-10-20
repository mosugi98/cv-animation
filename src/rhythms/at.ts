import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, rrBars, sinusBeat, ventricularDown } from './helpers';

export type AtConduction = '1:1' | '2:1';

export const AT_CONDUCTIONS: { id: AtConduction; label: string }[] = [
  { id: '1:1', label: '1:1' },
  { id: '2:1', label: '2:1' },
];

/** Atrial tachycardia cycle length: 150 atrial beats per minute. */
export const AT_CYCLE = 0.4;
/** Ectopic P wave onset to QRS onset for a conducted beat. */
export const AT_PR = 0.16;
const FIRST_AT = 2.0;
const WINDOW = 5;

/** Two sinus beats, then a focus in the atria takes over with its own P wave shape. */
export function atRhythm(conduction: AtConduction = '1:1'): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];

  for (const p of [0.3, 1.2]) {
    const b = sinusBeat(p, 0.16);
    beats.push(b.beat);
    atrial.push(b.atrial);
    pulses.push(...b.pulses);
    marks.push(...b.marks);
  }

  const ectopicTimes: number[] = [];
  for (let t = FIRST_AT; t < WINDOW - 0.3; t += AT_CYCLE) ectopicTimes.push(t);

  ectopicTimes.forEach((p, k) => {
    const isConducted = conduction === '1:1' || k % 2 === 0;
    atrial.push({ t: p, kind: 'ectopic', conducted: isConducted, amp: -0.14 });
    marks.push({ kind: 'dot', t: p + 0.05, tone: isConducted ? 'orange' : 'red' });
    pulses.push(
      { type: 'flash', site: 'ectopic', t: p, tone: 'orange' },
      { type: 'travel', path: 'atria-ect', t0: p, t1: p + 0.08, tone: 'orange' },
    );
    if (isConducted) {
      const q = p + AT_PR;
      if (q + 0.4 < WINDOW) {
        beats.push({ t: q, wide: false, origin: 'conducted' });
        pulses.push({ type: 'travel', path: 'avn-direct', t0: p + 0.08, t1: q - 0.04, tone: 'blue' }, ...ventricularDown(q));
        marks.push({ kind: 'bar', t0: p, t1: q, tone: 'orange' });
      }
    } else {
      pulses.push({ type: 'travel', path: 'avn-direct', t0: p + 0.08, t1: p + 0.16, tone: 'red', stop: 0.3 });
    }
  });

  const atQs = beats.filter((b) => b.t > FIRST_AT).map((b) => b.t);
  marks.push(...rrBars(atQs, 'navy'));
  marks.push({ kind: 'tag', t: ectopicTimes[1] + 0.05, text: 'AT', tone: 'red' });

  return assemble({
    id: conduction === '1:1' ? 'at-1to1' : 'at-2to1',
    label: `Atrial tachycardia, ${conduction} conduction`,
    description:
      'Schematic atrial tachycardia: a regular run of P waves with a different shape from the sinus P wave, a flat baseline between them, and the AV node conducting each or every second one.',
    window: WINDOW,
    beats,
    atrial,
    marks,
    pulses,
    isoelectric: true,
  });
}
