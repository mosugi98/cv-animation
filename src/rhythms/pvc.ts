import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, refractoryP, rrBars, sinusBeat, ventricularFocusPulses } from './helpers';

export type PvcPattern = 'single' | 'bigeminy' | 'couplet';

export const PVC_PATTERNS: { id: PvcPattern; label: string }[] = [
  { id: 'single', label: 'Single PVC' },
  { id: 'bigeminy', label: 'Bigeminy' },
  { id: 'couplet', label: 'Couplet' },
];

/** Sinus cycle (75 per minute) and PR interval. */
export const PVC_SINUS_RR = 0.8;
export const PVC_PR = 0.16;
/** Last sinus QRS to the PVC. Shorter than the sinus cycle, so the PVC is premature. */
export const PVC_COUPLING = 0.5;
const FIRST_P = 0.3;
const WINDOW = 6.6;

/** P-wave onsets of the unbroken sinus rhythm: the sinus node does not notice the PVC. */
export const sinusP = (): number[] => Array.from({ length: 8 }, (_, k) => FIRST_P + k * PVC_SINUS_RR);

/** QRS onsets of the PVCs for each pattern. */
export function pvcTimes(pattern: PvcPattern): number[] {
  const q = (k: number) => FIRST_P + k * PVC_SINUS_RR + PVC_PR;
  switch (pattern) {
    case 'single':
      return [q(2) + PVC_COUPLING];
    case 'couplet':
      return [q(2) + PVC_COUPLING, q(2) + PVC_COUPLING + 0.38];
    case 'bigeminy':
      return [0, 2, 4, 6].map((k) => q(k) + PVC_COUPLING).filter((t) => t < 6);
  }
}

/** Sinus beats that are conducted; every other P wave lands while the ventricles are refractory after a PVC. */
const conductedP = (p: number, pvcs: number[]): boolean => {
  const q = p + PVC_PR;
  // Refractory: a PVC began within the 0.32 s before this P would reach the ventricles, or is about to.
  return !pvcs.some((v) => v > q - 0.32 && v < q + 0.02);
};

export function pvcRhythm(pattern: PvcPattern = 'single'): RhythmDef {
  const pvcs = pvcTimes(pattern);
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];

  for (const p of sinusP()) {
    if (conductedP(p, pvcs)) {
      const b = sinusBeat(p, PVC_PR);
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

  for (const v of pvcs) {
    beats.push({ t: v, wide: true, origin: 'ventricular' });
    pulses.push(...ventricularFocusPulses(v));
    marks.push({ kind: 'seg', t0: v - 0.02, t1: v + 0.62, tone: 'orange' });
  }

  const qs = beats.map((b) => b.t).sort((a, b) => a - b);
  marks.push(...rrBars(qs, 'navy'));
  marks.push({ kind: 'tag', t: pvcs[0] + 0.05, text: 'PVC', tone: 'red' });
  const before = qs.filter((t) => t < pvcs[0]).at(-1)!;
  const after = qs.find((t) => t > pvcs[pvcs.length - 1])!;
  marks.push({ kind: 'note', t: (before + after) / 2 + 0.1, text: 'full compensatory pause', tone: 'purple' });

  const labels: Record<PvcPattern, string> = {
    single: 'Premature ventricular contraction',
    bigeminy: 'Ventricular bigeminy',
    couplet: 'Couplet of PVCs',
  };
  return assemble({
    id: `pvc-${pattern}`,
    label: labels[pattern],
    description:
      pattern === 'single'
        ? 'Schematic sinus rhythm with one early wide-complex beat with no preceding P wave, followed by a full compensatory pause.'
        : pattern === 'bigeminy'
          ? 'Schematic ventricular bigeminy: every sinus beat is followed by an early wide-complex beat.'
          : 'Schematic sinus rhythm with two consecutive early wide-complex beats (a couplet), then sinus rhythm.',
    window: WINDOW,
    beats,
    atrial,
    marks,
    pulses,
  });
}
