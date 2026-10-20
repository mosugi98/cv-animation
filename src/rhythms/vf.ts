import { mulberry32, vfWave } from '../engine/morphology';
import type { BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, rrBars, ventricularFocusPulses } from './helpers';

export type VfAmplitude = 'coarse' | 'fine';

export const VF_OPTIONS: { id: VfAmplitude; label: string }[] = [
  { id: 'coarse', label: 'Coarse VF' },
  { id: 'fine', label: 'Fine VF' },
];

/** Fast VT before it degenerates: 200 per minute. */
export const VF_VT_CL = 0.3;
export const VF_START = 2.1;
const FIRST_VT = 0.35;
const WINDOW = 6;
export const VF_AMPLITUDE: Record<VfAmplitude, number> = { coarse: 0.8, fine: 0.16 };

/** Fast ventricular tachycardia degenerates into ventricular fibrillation: no QRS complexes, no cardiac output. */
export function vfRhythm(amplitude: VfAmplitude = 'coarse'): RhythmDef {
  const rnd = mulberry32(20261020);
  const beats: BeatEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];

  const vt: number[] = [];
  for (let q = FIRST_VT; q < VF_START - 0.1; q += VF_VT_CL) vt.push(q);
  for (const q of vt) {
    beats.push({ t: q, wide: true, origin: 'ventricular' });
    pulses.push(...ventricularFocusPulses(q));
  }
  pulses.push({ type: 'loop', path: 'vent-loop', t0: FIRST_VT - 0.05, t1: VF_START, period: VF_VT_CL, tone: 'orange' });

  // Chaotic wavelets everywhere in the ventricles.
  for (let i = 0; i < 420; i++) {
    pulses.push({
      type: 'spark',
      t: VF_START + rnd() * (WINDOW - VF_START),
      x: 92 + rnd() * 208,
      y: 146 + rnd() * 36,
      tone: 'red',
    });
  }

  marks.push(...rrBars(vt, 'navy'));
  marks.push({ kind: 'tag', t: vt[1] + 0.05, text: 'VT', tone: 'red' });
  marks.push({ kind: 'seg', t0: VF_START, t1: WINDOW, tone: 'red' });
  marks.push({ kind: 'tag', t: VF_START + 0.9, text: 'VF', tone: 'red' });
  marks.push({ kind: 'note', t: VF_START + 2.0, text: 'no organised QRS', tone: 'red' });

  return assemble({
    id: `vf-${amplitude}`,
    label: amplitude === 'coarse' ? 'Ventricular fibrillation (coarse)' : 'Ventricular fibrillation (fine)',
    description:
      'Schematic fast ventricular tachycardia that degenerates into ventricular fibrillation: chaotic undulations with no QRS complexes' +
      (amplitude === 'fine' ? ', here of low amplitude (fine VF).' : ', here of high amplitude (coarse VF).'),
    window: WINDOW,
    beats,
    atrial: [],
    marks,
    pulses,
    extra: [(t) => vfWave(t, VF_START, VF_AMPLITUDE[amplitude])],
    isoelectric: false,
  });
}
