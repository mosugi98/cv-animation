import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, blockedP, rrBars, sinusBeat, ventricularFocusPulses } from './helpers';

export type VtKind = 'sustained' | 'nsvt';

export const VT_OPTIONS: { id: VtKind; label: string }[] = [
  { id: 'sustained', label: 'Sustained VT' },
  { id: 'nsvt', label: 'Non-sustained VT' },
];

/** VT cycle length: about 171 per minute. */
export const VT_CL = 0.35;
/** Sinus P-P interval: 67 per minute, slower than the VT, and unaffected by it. */
export const VT_SINUS_PP = 0.9;
export const VT_START = 2.0;
const FIRST_P = 0.3;
const WINDOW = 6.2;
const NSVT_BEATS = 6;

export const vtBeatTimes = (kind: VtKind): number[] => {
  const n = kind === 'nsvt' ? NSVT_BEATS : Math.floor((WINDOW - 0.7 - VT_START) / VT_CL) + 1;
  return Array.from({ length: n }, (_, k) => VT_START + k * VT_CL);
};

/**
 * Monomorphic ventricular tachycardia: a re-entry circuit in the ventricular muscle drives regular wide QRS
 * complexes while the sinus node keeps its own slower rhythm (AV dissociation).
 */
export function vtRhythm(kind: VtKind = 'sustained'): RhythmDef {
  const vt = vtBeatTimes(kind);
  const vtEnd = vt[vt.length - 1];
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];

  for (let p = FIRST_P; p < WINDOW - 0.3; p += VT_SINUS_PP) {
    const q = p + 0.16;
    // Sustained VT carries on past the end of the strip, so no later P wave can conduct either.
    const inVt = q > VT_START - 0.05 && (kind === 'sustained' || q < vtEnd + 0.2);
    if (inVt) {
      // The ventricles are busy with the tachycardia: this P wave cannot be conducted.
      const b = blockedP(p);
      atrial.push(b.atrial);
      pulses.push(...b.pulses);
      marks.push(...b.marks);
    } else {
      const b = sinusBeat(p, 0.16);
      beats.push(b.beat);
      atrial.push(b.atrial);
      pulses.push(...b.pulses);
      marks.push(...b.marks);
    }
  }

  for (const q of vt) {
    beats.push({ t: q, wide: true, origin: 'ventricular' });
    pulses.push(...ventricularFocusPulses(q));
  }
  pulses.push({ type: 'loop', path: 'vent-loop', t0: VT_START - 0.05, t1: vtEnd + 0.2, period: VT_CL, tone: 'orange' });

  marks.push(...rrBars(vt, 'navy'));
  marks.push({ kind: 'tag', t: vt[1] + 0.05, text: kind === 'nsvt' ? 'NSVT' : 'VT', tone: 'red' });
  marks.push({ kind: 'note', t: vt[Math.min(4, vt.length - 1)] + 0.1, text: 'P waves march through', tone: 'purple' });

  return assemble({
    id: `vt-${kind}`,
    label: kind === 'nsvt' ? 'Non-sustained ventricular tachycardia' : 'Monomorphic ventricular tachycardia',
    description:
      kind === 'nsvt'
        ? 'Schematic sinus rhythm interrupted by a short run of six fast, regular, wide-complex beats (non-sustained VT) with independent P waves, then sinus rhythm resumes.'
        : 'Schematic monomorphic ventricular tachycardia at about 170 per minute: regular wide QRS complexes with P waves that keep their own slower rhythm (AV dissociation).',
    window: WINDOW,
    beats,
    atrial,
    marks,
    pulses,
  });
}
