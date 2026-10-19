import { fibWavelets, mulberry32 } from '../engine/morphology';
import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, rrBars, ventricularDown } from './helpers';

const WINDOW = 6;
const SEED = 20261019;

/**
 * Ventricular response of AF: R-R intervals drawn from a seeded generator. No interval is allowed to sit within
 * 0.06 s of the previous one, so the rhythm is "irregularly irregular" and never settles into a pattern.
 */
export function afIntervals(seed = SEED): number[] {
  const rnd = mulberry32(seed);
  const rr: number[] = [];
  let total = 0.35;
  while (total < 5.0) {
    let v = 0.38 + rnd() * 0.58;
    let guard = 0;
    while (rr.length > 0 && Math.abs(v - rr[rr.length - 1]) < 0.06 && guard++ < 100) v = 0.38 + rnd() * 0.58;
    rr.push(v);
    total += v;
  }
  return rr;
}

export function afRhythm(): RhythmDef {
  const rnd = mulberry32(SEED + 1);
  const rr = afIntervals();
  const qs = [0.35];
  for (const v of rr) if (qs[qs.length - 1] + v < 5.35) qs.push(qs[qs.length - 1] + v);

  const beats: BeatEvent[] = qs.map((t) => ({ t, wide: false, origin: 'conducted' }));
  const atrial: AtrialEvent[] = []; // no organised atrial deflections
  const pulses: Pulse[] = [];

  // Chaotic atrial wavelets: many tiny activations at random places and times.
  for (let i = 0; i < 260; i++) {
    pulses.push({
      type: 'spark',
      t: rnd() * WINDOW,
      x: 86 + rnd() * 214,
      y: 20 + rnd() * 30,
      tone: 'blue',
    });
  }

  // The AV node lets only some impulses through, at irregular times.
  qs.forEach((q, k) => {
    pulses.push({ type: 'travel', path: 'avn-direct', t0: q - 0.12, t1: q - 0.03, tone: 'blue' }, ...ventricularDown(q));
    const next = qs[k + 1];
    if (next !== undefined && next - q > 0.45) {
      for (let j = 0; j < 2; j++) {
        const t = q + 0.15 + rnd() * (next - q - 0.4);
        pulses.push({ type: 'travel', path: 'avn-direct', t0: t, t1: t + 0.08, tone: 'red', stop: 0.3 });
      }
    }
  });

  const marks: Mark[] = [
    ...rrBars(qs, 'orange'),
    { kind: 'tag', t: qs[1] + 0.05, text: 'AF', tone: 'red' },
    { kind: 'note', t: qs[0] - 0.2, text: 'no P waves', tone: 'purple' },
  ];

  return assemble({
    id: 'af',
    label: 'Atrial fibrillation',
    description:
      'Schematic atrial fibrillation: fibrillatory baseline with no P waves, narrow QRS complexes at irregularly irregular intervals.',
    window: WINDOW,
    beats,
    atrial,
    marks,
    pulses,
    extra: [(t) => fibWavelets(t)],
    fibrillation: true,
    isoelectric: false,
  });
}
