import { fibWavelets, mulberry32 } from '../engine/morphology';
import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, rrBars, ventricularDown } from './helpers';

/** Antidromic AVRT cycle length: about 158 per minute. */
export const ANTIDROMIC_CL = 0.38;
const ANTIDROMIC_FIRST = 0.45;
const ANTIDROMIC_WINDOW = 4.4;

/**
 * Antidromic AVRT: the circuit runs the other way round. The impulse goes down the accessory pathway, so the
 * ventricles are entirely pre-excited and the QRS is wide, and returns up the His-Purkinje system and AV node.
 */
export function wpwAntidromic(): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];
  const qs: number[] = [];
  for (let q = ANTIDROMIC_FIRST; q + 0.7 <= ANTIDROMIC_WINDOW; q += ANTIDROMIC_CL) qs.push(q);

  for (const q of qs) {
    pulses.push(
      { type: 'travel', path: 'ap', t0: q - 0.1, t1: q, tone: 'orange' },
      { type: 'travel', path: 'vent-r', t0: q, t1: q + 0.06, tone: 'orange', reverse: true },
      { type: 'travel', path: 'vent-l', t0: q + 0.04, t1: q + 0.14, tone: 'orange' },
      // Back up through the conduction system (retrograde) to the atria.
      { type: 'travel', path: 'bb-right', t0: q + 0.07, t1: q + 0.13, tone: 'purple', reverse: true },
      { type: 'travel', path: 'his', t0: q + 0.13, t1: q + 0.16, tone: 'purple', reverse: true },
      { type: 'travel', path: 'avn-direct', t0: q + 0.16, t1: q + 0.23, tone: 'purple', reverse: true },
      { type: 'travel', path: 'atria-retro', t0: q + 0.23, t1: q + 0.27, tone: 'purple' },
    );
    beats.push({ t: q, wide: true, origin: 'tachy' });
    atrial.push({ t: q + 0.23, kind: 'retro', conducted: false, amp: -0.12 });
  }
  marks.push(...rrBars(qs, 'navy'));
  marks.push({ kind: 'tag', t: qs[1] + 0.05, text: 'ANTIDROMIC', tone: 'red' });
  marks.push({ kind: 'note', t: qs[3] + 0.1, text: 'wide and regular: mimics VT', tone: 'purple' });

  return assemble({
    id: 'wpw-antidromic',
    label: 'Antidromic AVRT',
    description:
      'Schematic antidromic AV re-entrant tachycardia: regular, fast, wide-complex tachycardia in which the impulse goes down the accessory pathway and back up the AV node.',
    window: ANTIDROMIC_WINDOW,
    beats,
    atrial,
    marks,
    pulses,
  });
}

export const WPW_AF_WINDOW = 5;
const WPW_AF_SEED = 20261022;

/**
 * R-R intervals of pre-excited atrial fibrillation: fast, irregular, never repeating, and with at least one very
 * short interval. A shortest pre-excited R-R under 250 ms marks a pathway that can conduct dangerously fast.
 */
export function wpwAfIntervals(): number[] {
  const rnd = mulberry32(WPW_AF_SEED);
  const rr: number[] = [];
  let total = 0.4;
  while (total < WPW_AF_WINDOW - 0.8) {
    let v = 0.2 + rnd() * 0.3;
    let guard = 0;
    while (rr.length > 0 && Math.abs(v - rr[rr.length - 1]) < 0.04 && guard++ < 100) v = 0.2 + rnd() * 0.3;
    rr.push(v);
    total += v;
  }
  rr[2] = 0.22; // guarantees a shortest interval under 250 ms
  if (Math.abs(rr[1] - rr[2]) < 0.04) rr[1] = 0.33;
  if (Math.abs(rr[3] - rr[2]) < 0.04) rr[3] = 0.36;
  return rr;
}

/** Atrial fibrillation conducted down an accessory pathway: irregular, very fast, wide complexes of varying shape. */
export function wpwAf(): RhythmDef {
  const rnd = mulberry32(WPW_AF_SEED + 1);
  const rr = wpwAfIntervals();
  const qs = [0.4];
  for (const v of rr) if (qs[qs.length - 1] + v + 0.65 <= WPW_AF_WINDOW) qs.push(qs[qs.length - 1] + v);

  const beats: BeatEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];

  qs.forEach((q, k) => {
    // Alternate between fully pre-excited (wide) and fused (delta wave plus some AV node conduction) beats.
    const fused = k % 3 === 1;
    beats.push(fused ? { t: q, wide: false, origin: 'conducted', preexcited: true } : { t: q, wide: true, origin: 'conducted' });
    pulses.push({ type: 'travel', path: 'ap', t0: q - 0.09, t1: q, tone: 'orange' });
    if (fused) {
      pulses.push(
        { type: 'travel', path: 'avn-direct', t0: q - 0.17, t1: q - 0.04, tone: 'blue' },
        ...ventricularDown(q),
      );
    } else {
      pulses.push(
        { type: 'travel', path: 'vent-r', t0: q, t1: q + 0.06, tone: 'orange', reverse: true },
        { type: 'travel', path: 'vent-l', t0: q + 0.04, t1: q + 0.14, tone: 'orange' },
      );
    }
    // The AV node blocks the impulses that arrive while it is refractory.
    pulses.push({ type: 'travel', path: 'avn-direct', t0: q + 0.1, t1: q + 0.18, tone: 'red', stop: 0.3 });
  });

  // Chaotic atrial wavelets.
  for (let i = 0; i < 220; i++) {
    pulses.push({ type: 'spark', t: rnd() * WPW_AF_WINDOW, x: 86 + rnd() * 214, y: 18 + rnd() * 34, tone: 'blue' });
  }

  marks.push(...rrBars(qs, 'navy'));
  const shortest = qs.slice(1).reduce((best, q, i) => (q - qs[i] < qs[best + 1] - qs[best] ? i : best), 0);
  marks.push({ kind: 'tag', t: qs[1] + 0.05, text: 'PRE-EXCITED AF', tone: 'red' });
  marks.push({ kind: 'note', t: (qs[shortest] + qs[shortest + 1]) / 2 + 0.2, text: 'R-R under 250 ms', tone: 'red' });

  return assemble({
    id: 'wpw-af',
    label: 'Pre-excited atrial fibrillation',
    description:
      'Schematic atrial fibrillation conducted over an accessory pathway: very fast, irregular wide complexes of varying shape, with some R-R intervals under 250 ms.',
    window: WPW_AF_WINDOW,
    beats,
    atrial: [],
    marks,
    pulses,
    extra: [(t) => fibWavelets(t, 0.05)],
    fibrillation: true,
    isoelectric: false,
  });
}
