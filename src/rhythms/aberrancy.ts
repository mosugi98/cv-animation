import { qrsRbbb } from '../engine/morphology';
import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, rrBars, sinusBeat, ventricularDown } from './helpers';

/** Cycle length of the supraventricular tachycardia: 150 per minute. */
export const ABERRANT_CL = 0.4;
export const ABERRANT_PAC = 1.9;
export const ABERRANT_Q0 = 2.27;
const WINDOW = 6;
const BEATS = 9;

/**
 * One lap of AVNRT whose ventricular beat runs down the left bundle only: the right bundle is still refractory
 * at this rate, so the right ventricle is activated late through muscle. The result is a wide RBBB-pattern QRS.
 */
function aberrantLap(q: number): { pulses: Pulse[]; beat: BeatEvent; retro: AtrialEvent } {
  const [his, left] = ventricularDown(q);
  return {
    pulses: [
      { type: 'travel', path: 'avn-slow', t0: q - 0.3, t1: q - 0.04, tone: 'orange' },
      { type: 'travel', path: 'avn-fast', t0: q - 0.04, t1: q + 0.035, tone: 'purple', reverse: true },
      his,
      left,
      { type: 'travel', path: 'bb-right', t0: q, t1: q + 0.06, tone: 'red', stop: 0.35 },
      { type: 'travel', path: 'vent-r', t0: q + 0.06, t1: q + 0.17, tone: 'orange' },
      { type: 'travel', path: 'atria-retro', t0: q + 0.035, t1: q + 0.085, tone: 'purple' },
    ],
    beat: { t: q, wide: true, origin: 'tachy', customQrs: true },
    retro: { t: q + 0.035, kind: 'retro', conducted: false, amp: -0.12 },
  };
}

/** AVNRT started by a premature atrial beat, with rate-related right bundle branch block (RBBB) aberrancy. */
export function aberrancyRhythm(): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];

  for (const p of [0.3, 1.2]) {
    const b = sinusBeat(p, 0.16, { avPath: 'avn-fast', tone: 'blue' });
    beats.push(b.beat);
    atrial.push(b.atrial);
    pulses.push(...b.pulses);
    marks.push(...b.marks);
  }

  atrial.push({ t: ABERRANT_PAC, kind: 'ectopic', conducted: true, amp: 0.12 });
  pulses.push(
    { type: 'flash', site: 'ectopic', t: ABERRANT_PAC, tone: 'orange' },
    { type: 'travel', path: 'atria-ect', t0: ABERRANT_PAC, t1: ABERRANT_PAC + 0.07, tone: 'blue' },
    { type: 'travel', path: 'avn-fast', t0: ABERRANT_PAC + 0.07, t1: ABERRANT_PAC + 0.15, tone: 'red', stop: 0.3 },
  );
  marks.push(
    { kind: 'dot', t: ABERRANT_PAC + 0.05, tone: 'orange' },
    { kind: 'bar', t0: ABERRANT_PAC, t1: ABERRANT_Q0, tone: 'orange' },
    { kind: 'tag', t: ABERRANT_PAC + 0.05, text: 'PAC', tone: 'red' },
  );

  const qs = Array.from({ length: BEATS }, (_, k) => ABERRANT_Q0 + k * ABERRANT_CL);
  qs.forEach((q, k) => {
    const lap = aberrantLap(q);
    pulses.push(...lap.pulses);
    beats.push(k === 0 ? { ...lap.beat, origin: 'pac' } : lap.beat);
    atrial.push(lap.retro);
  });
  marks.push(...rrBars(qs.slice(1), 'navy'));
  marks.push({ kind: 'tag', t: qs[2] + 0.05, text: 'SVT', tone: 'red' });
  marks.push({ kind: 'note', t: qs[1] + 0.1, text: "rSR′ (RBBB pattern)", tone: 'purple' });

  return assemble({
    id: 'svt-aberrancy',
    label: 'SVT with RBBB aberrancy',
    description:
      'Schematic: sinus rhythm with narrow QRS, then a premature atrial beat starts a regular supraventricular tachycardia in which every QRS is wide with a right bundle branch block (rSR′) pattern.',
    window: WINDOW,
    beats,
    atrial,
    marks,
    pulses,
    qrs: qrsRbbb,
  });
}
