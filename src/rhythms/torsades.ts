import { gauss, mulberry32, tWave, tWaveWide, torsadesWave, vfWave } from '../engine/morphology';
import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, refractoryP, sinusBeat, ventricularFocusPulses } from './helpers';

export type TorsadesOutcome = 'selflimit' | 'vf';

export const TORSADES_OPTIONS: { id: TorsadesOutcome; label: string }[] = [
  { id: 'selflimit', label: 'Stops by itself' },
  { id: 'vf', label: 'Degenerates to VF' },
];

export const TORSADES_SINUS_PP = 0.9;
/** Rate of the twisting complexes: about 220 per minute. */
export const TORSADES_RATE = 220;
export const TORSADES_SPINDLE = 1.15;
/** The first PVC (short coupling), then the long compensatory pause. */
export const PVC1 = 1.86;
/** Post-pause sinus beat with the longest QT, and the R-on-T PVC that triggers torsades. */
export const POST_PAUSE_Q = 3.06;
export const R_ON_T = 3.44;
export const TDP_START = 3.5;
export const TDP_END: Record<TorsadesOutcome, number> = { selflimit: 6.7, vf: 5.5 };
const FIRST_P = 0.2;
const WINDOW = 8.2;
const VF_AMP = 0.7;

/**
 * Torsades de pointes: polymorphic VT in a long-QT setting, started by a short-long-short sequence (PVC, pause,
 * then a PVC that lands on the long T wave). The complexes twist around the baseline.
 */
export function torsadesRhythm(outcome: TorsadesOutcome = 'selflimit'): RhythmDef {
  const rnd = mulberry32(20261021);
  const end = TDP_END[outcome];
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];

  for (let p = FIRST_P; p < WINDOW - 0.3; p += TORSADES_SINUS_PP) {
    const q = p + 0.16;
    const conducts = q < PVC1 - 0.3 || (q > POST_PAUSE_Q - 0.05 && q < POST_PAUSE_Q + 0.05) || (outcome === 'selflimit' && q > end + 0.3);
    if (conducts) {
      const b = sinusBeat(p, 0.16);
      beats.push(b.beat);
      atrial.push(b.atrial);
      pulses.push(...b.pulses);
      marks.push(...b.marks);
    } else {
      const b = refractoryP(p);
      atrial.push(b.atrial);
      pulses.push(...b.pulses);
      marks.push(...b.marks);
    }
  }

  for (const v of [PVC1, R_ON_T]) {
    beats.push({ t: v, wide: true, origin: 'ventricular' });
    pulses.push(...ventricularFocusPulses(v));
  }

  // Chaotic-looking activation of the ventricles during the twisting run, and a circuit that speeds up and slows down.
  const third = (end - TDP_START) / 3;
  [0.34, 0.27, 0.36].forEach((period, i) => {
    pulses.push({ type: 'loop', path: 'vent-loop', t0: TDP_START + i * third, t1: TDP_START + (i + 1) * third, period, tone: 'orange' });
  });
  for (let i = 0; i < 160; i++) {
    pulses.push({
      type: 'spark',
      t: TDP_START + rnd() * (end - TDP_START),
      x: 92 + rnd() * 208,
      y: 146 + rnd() * 36,
      tone: 'orange',
    });
  }
  if (outcome === 'vf') {
    for (let i = 0; i < 160; i++) {
      pulses.push({ type: 'spark', t: end + rnd() * (WINDOW - end), x: 92 + rnd() * 208, y: 146 + rnd() * 36, tone: 'red' });
    }
  }

  marks.push(
    { kind: 'bar', t0: PVC1 + 0.14, t1: POST_PAUSE_Q - 0.02, tone: 'red' },
    { kind: 'note', t: (PVC1 + POST_PAUSE_Q) / 2, text: 'long pause', tone: 'red' },
    { kind: 'bar', t0: POST_PAUSE_Q, t1: POST_PAUSE_Q + 0.64, tone: 'orange' },
    { kind: 'note', t: POST_PAUSE_Q + 0.5, text: 'long QT', tone: 'orange' },
    { kind: 'tag', t: R_ON_T, text: 'R on T', tone: 'red' },
    { kind: 'tag', t: TDP_START + 1.1, text: 'TORSADES', tone: 'red' },
  );
  if (outcome === 'vf') marks.push({ kind: 'tag', t: end + 0.6, text: 'VF', tone: 'red' });

  // T waves are drawn here because the QT interval is deliberately long.
  const tParts: Array<(t: number) => number> = beats.map((b) => {
    if (b.t === R_ON_T) return () => 0;
    if (b.wide) return (t: number) => tWaveWide(t, b.t);
    if (Math.abs(b.t - POST_PAUSE_Q) < 0.01) return (t: number) => tWave(t, b.t, 0.42, 0.52) + gauss(t, b.t + 0.72, 0.05, 0.12);
    return (t: number) => tWave(t, b.t, 0.3, 0.4);
  });

  return assemble({
    id: `torsades-${outcome}`,
    label: outcome === 'selflimit' ? 'Torsades de pointes (self-terminating)' : 'Torsades de pointes degenerating to VF',
    description:
      'Schematic long-QT rhythm: a PVC, a long pause, then a PVC on the T wave starts torsades de pointes, a polymorphic VT whose complexes twist around the baseline' +
      (outcome === 'selflimit' ? ', then stops by itself and sinus rhythm returns.' : ', then degenerates into ventricular fibrillation.'),
    window: WINDOW,
    beats,
    atrial,
    marks,
    pulses,
    drawT: false,
    extra: [
      ...tParts,
      (t) => torsadesWave(t, TDP_START, end, TORSADES_RATE, TORSADES_SPINDLE, 0.85),
      (t) => (outcome === 'vf' ? vfWave(t, end, VF_AMP) : 0),
    ],
    isoelectric: true,
  });
}
