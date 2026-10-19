import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, sinusBeat, ventricularDown } from './helpers';

export type EscapeKind = 'beat' | 'rhythm';

/** Sinus cycle before the pause (75 per minute). */
export const JUNCTIONAL_SINUS_RR = 0.8;
/** Escape-to-escape interval of the junctional focus: about 44 per minute. */
export const JUNCTIONAL_RR = 1.35;
/** Last sinus QRS to the first escape QRS. The pause is longer than the escape interval: the focus waits, then fires. */
export const JUNCTIONAL_PAUSE = 1.6;
const WINDOW = 7.2;

/** The AV junction fires on its own after a pause; its impulse also travels backwards into the atria. */
function escapeBeat(q: number): { pulses: Pulse[]; beat: BeatEvent; retro: AtrialEvent; marks: Mark[] } {
  return {
    pulses: [
      { type: 'flash', site: 'junction', t: q - 0.06, tone: 'purple' },
      ...ventricularDown(q, 'purple'),
      { type: 'travel', path: 'avn-direct', t0: q, t1: q + 0.09, tone: 'purple', reverse: true },
      { type: 'travel', path: 'atria-retro', t0: q + 0.1, t1: q + 0.15, tone: 'purple' },
    ],
    beat: { t: q, wide: false, origin: 'junctional' },
    retro: { t: q + 0.1, kind: 'retro', conducted: false, amp: -0.12 },
    marks: [
      { kind: 'seg', t0: q - 0.02, t1: q + 0.55, tone: 'purple' },
      { kind: 'dot', t: q + 0.15, tone: 'purple' },
    ],
  };
}

export function junctionalRhythm(kind: EscapeKind = 'rhythm'): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];

  const add = (b: { pulses: Pulse[]; beat: BeatEvent; atrial: AtrialEvent; marks: Mark[] }) => {
    beats.push(b.beat);
    atrial.push(b.atrial);
    pulses.push(...b.pulses);
    marks.push(...b.marks);
  };

  // Sinus rhythm, then the sinus node stops.
  for (const p of [0.3, 1.1, 1.9]) add(sinusBeat(p, 0.16));
  const lastSinusQ = 1.9 + 0.16;
  const q0 = lastSinusQ + JUNCTIONAL_PAUSE;

  const escapes = kind === 'beat' ? [q0] : [q0, q0 + JUNCTIONAL_RR, q0 + 2 * JUNCTIONAL_RR];
  for (const q of escapes) {
    const e = escapeBeat(q);
    beats.push(e.beat);
    atrial.push(e.retro);
    pulses.push(...e.pulses);
    marks.push(...e.marks);
  }

  if (kind === 'beat') {
    // The sinus node recovers and takes over again.
    for (const p of [q0 + 0.74, q0 + 1.54]) add(sinusBeat(p, 0.16));
  }

  marks.push(
    { kind: 'bar', t0: lastSinusQ + 0.04, t1: q0 - 0.04, tone: 'red' },
    { kind: 'note', t: lastSinusQ + JUNCTIONAL_PAUSE / 2, text: 'pause', tone: 'red' },
    { kind: 'tag', t: q0 + 0.05, text: 'ESCAPE', tone: 'purple' },
  );

  return assemble({
    id: kind === 'beat' ? 'junctional-beat' : 'junctional-rhythm',
    label: kind === 'beat' ? 'Junctional escape beat' : 'Junctional escape rhythm',
    description:
      kind === 'beat'
        ? 'Schematic: sinus rhythm, a pause, one narrow-complex junctional escape beat after the pause, then sinus rhythm resumes.'
        : 'Schematic: sinus rhythm, a pause, then a slow regular narrow-complex junctional escape rhythm at about 45 per minute.',
    window: WINDOW,
    beats,
    atrial,
    marks,
    pulses,
  });
}
