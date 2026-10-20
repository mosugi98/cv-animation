import {
  mulberry32,
  peakedT,
  qrsBroad,
  sineWave,
  stDepression,
  tWave,
  tWaveWide,
  uWave,
} from '../engine/morphology';
import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, refractoryP, rrBars, sinusBeat, ventricularFocusPulses } from './helpers';

export type PotassiumStage =
  | 'normal'
  | 'hypo-mild'
  | 'hypo-severe'
  | 'hyper-mild'
  | 'hyper-moderate'
  | 'hyper-severe';

/** Serum potassium (mmol/L) used for each schematic stage. */
export const POTASSIUM_LEVEL: Record<PotassiumStage, number> = {
  normal: 4.2,
  'hypo-mild': 3.0,
  'hypo-severe': 2.4,
  'hyper-mild': 6.4,
  'hyper-moderate': 7.8,
  'hyper-severe': 9.2,
};

export const K_SINUS_RR = 0.85;
const FIRST_P = 0.3;
const WINDOW = 5.4;
/** Hypokalaemia: the PVC falls after the third sinus beat. */
export const HYPOK_PVC_COUPLING = 0.55;

const sinusPs = (): number[] => Array.from({ length: 6 }, (_, k) => FIRST_P + k * K_SINUS_RR);

function normalRhythm(): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];
  for (const p of sinusPs()) {
    const b = sinusBeat(p, 0.16);
    beats.push(b.beat);
    atrial.push(b.atrial);
    pulses.push(...b.pulses);
    marks.push(...b.marks);
  }
  marks.push({ kind: 'tag', t: beats[1].t + 0.22, text: 'T', tone: 'blue' });
  return assemble({
    id: 'k-normal',
    label: 'Normal potassium',
    description: 'Schematic sinus rhythm at normal potassium: upright T wave, flat ST segment, no visible U wave.',
    window: WINDOW,
    beats,
    atrial,
    marks,
    pulses,
  });
}

/**
 * Hypokalaemia. Mild: flat T wave, ST depression and a U wave. Severe: the T wave almost disappears, the U wave
 * is larger than the T wave, and ventricular ectopy appears.
 */
function hypokalemiaRhythm(severe: boolean): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];
  const parts: Array<(t: number) => number> = [];

  const ps = sinusPs();
  const pvc = severe ? ps[2] + 0.16 + HYPOK_PVC_COUPLING : null;
  const tAmp = severe ? 0.04 : 0.12;
  const uAmp = severe ? 0.26 : 0.13;
  const stDepth = severe ? 0.16 : 0.09;

  for (const p of ps) {
    const q = p + 0.16;
    const refractory = pvc !== null && pvc > q - 0.32 && pvc < q + 0.02;
    if (refractory) {
      const b = refractoryP(p);
      atrial.push(b.atrial);
      pulses.push(...b.pulses);
      marks.push(...b.marks);
      continue;
    }
    const b = sinusBeat(p, 0.16);
    beats.push(b.beat);
    atrial.push(b.atrial);
    pulses.push(...b.pulses);
    marks.push(...b.marks);
    parts.push(
      (t) => stDepression(t, q, stDepth, 0.1, 0.3),
      (t) => tWave(t, q, tAmp, 0.34),
      (t) => uWave(t, q, uAmp, 0.54),
    );
  }

  if (pvc !== null) {
    beats.push({ t: pvc, wide: true, origin: 'ventricular' });
    pulses.push(...ventricularFocusPulses(pvc));
    marks.push({ kind: 'seg', t0: pvc - 0.02, t1: pvc + 0.62, tone: 'orange' });
    marks.push({ kind: 'tag', t: pvc + 0.05, text: 'PVC', tone: 'red' });
    parts.push((t) => tWaveWide(t, pvc, 0.4, -0.32, 0.06));
  }

  const qs = beats.map((b) => b.t).sort((a, b) => a - b);
  marks.push(...rrBars(qs, 'navy'));
  const ref = qs[1];
  marks.push({ kind: 'tag', t: ref + 0.54, text: 'U', tone: 'orange' });
  marks.push({ kind: 'note', t: ref + 0.2, text: severe ? 'U larger than T' : 'flat T + U wave', tone: 'purple' });

  return assemble({
    id: severe ? 'hypok-severe' : 'hypok-mild',
    label: severe ? 'Severe hypokalaemia' : 'Mild hypokalaemia',
    description: severe
      ? 'Schematic ECG in severe hypokalaemia: ST depression, almost no T wave, a prominent U wave and a premature ventricular beat.'
      : 'Schematic ECG in mild hypokalaemia: ST depression, a flat T wave and a small U wave.',
    window: WINDOW,
    beats,
    atrial,
    marks,
    pulses,
    extra: parts,
    drawT: false,
  });
}

/** Wide, low-amplitude QRS of advanced hyperkalaemia. */
const hyperQrs = (t: number, q: number): number => qrsBroad(t, q, 1.9, 0.8);

/** Time at which the sine wave begins in the severe stage. */
export const SINE_START = 2.1;
export const SINE_PERIOD = 0.55;

/**
 * Hyperkalaemia in three stages. Mild: tall, narrow, peaked T waves. Moderate: P wave flattens, PR lengthens and
 * the QRS widens. Severe: QRS and T merge into a sine wave.
 */
function hyperkalemiaRhythm(stage: 'hyper-mild' | 'hyper-moderate' | 'hyper-severe'): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];
  const parts: Array<(t: number) => number> = [];
  const rnd = mulberry32(5150);

  const mild = stage === 'hyper-mild';
  const pr = mild ? 0.17 : 0.3;
  const pAmp = mild ? 0.15 : 0.05;
  const ps = sinusPs().filter((p) => stage !== 'hyper-severe' || p + pr < SINE_START - 0.2);

  for (const p of ps) {
    const q = p + pr;
    if (mild) {
      const b = sinusBeat(p, pr);
      beats.push(b.beat);
      atrial.push(b.atrial);
      pulses.push(...b.pulses);
      marks.push(...b.marks);
      parts.push((t) => peakedT(t, q, 0.8, 0.2));
    } else {
      const dur = 0.13;
      pulses.push(
        { type: 'flash', site: 'sa', t: p, tone: 'blue' },
        { type: 'travel', path: 'atria-sa', t0: p, t1: p + 0.1, tone: 'orange' },
        { type: 'travel', path: 'avn-direct', t0: p + 0.1, t1: q - 0.04, tone: 'orange' },
        { type: 'travel', path: 'his', t0: q - 0.04, t1: q, tone: 'orange' },
        { type: 'travel', path: 'bb-left', t0: q, t1: q + dur, tone: 'orange' },
        { type: 'travel', path: 'bb-right', t0: q, t1: q + dur, tone: 'orange' },
      );
      beats.push({ t: q, wide: true, origin: 'sinus', customQrs: true });
      atrial.push({ t: p, kind: 'sinus', conducted: true, amp: pAmp });
      marks.push({ kind: 'dot', t: p + 0.05, tone: 'blue' }, { kind: 'bar', t0: p, t1: q, tone: 'orange' });
      parts.push((t) => peakedT(t, q, 0.5, 0.26));
    }
  }

  if (stage === 'hyper-severe') {
    parts.push((t) => sineWave(t, SINE_START, SINE_PERIOD, 0.75));
    // Slow, wide, merged ventricular depolarisation and repolarisation.
    for (let i = 0; i < 160; i++) {
      pulses.push({ type: 'spark', t: SINE_START + rnd() * (WINDOW - SINE_START), x: 110 + rnd() * 180, y: 142 + rnd() * 34, tone: 'red' });
    }
    pulses.push({ type: 'loop', path: 'vent-loop', t0: SINE_START, t1: WINDOW, period: SINE_PERIOD, tone: 'red' });
    marks.push({ kind: 'seg', t0: SINE_START, t1: WINDOW - 0.1, tone: 'red' });
    marks.push({ kind: 'tag', t: SINE_START + 0.5, text: 'SINE WAVE', tone: 'red' });
    marks.push({ kind: 'note', t: SINE_START + 1.4, text: 'QRS and T merged: pre-arrest', tone: 'red' });
  }

  const qs = beats.map((b) => b.t);
  marks.push(...rrBars(qs, 'navy'));
  if (mild) {
    marks.push({ kind: 'tag', t: qs[1] + 0.2, text: 'PEAKED T', tone: 'orange' });
    marks.push({ kind: 'note', t: qs[2] + 0.12, text: 'tall, narrow, symmetric', tone: 'purple' });
  } else if (stage === 'hyper-moderate') {
    marks.push({ kind: 'tag', t: qs[1] - 0.15, text: 'P flat', tone: 'orange' });
    marks.push({ kind: 'note', t: qs[2] + 0.1, text: 'PR long, QRS wide', tone: 'purple' });
  }

  const labels: Record<typeof stage, string> = {
    'hyper-mild': 'Mild hyperkalaemia',
    'hyper-moderate': 'Moderate hyperkalaemia',
    'hyper-severe': 'Severe hyperkalaemia',
  };
  const text: Record<typeof stage, string> = {
    'hyper-mild': 'Schematic ECG in mild hyperkalaemia: tall, narrow, symmetric peaked T waves with a normal PR and QRS.',
    'hyper-moderate': 'Schematic ECG in moderate hyperkalaemia: flattened P waves, a long PR interval, a widened QRS and peaked T waves.',
    'hyper-severe': 'Schematic ECG in severe hyperkalaemia: widened complexes merge into a sine wave.',
  };
  return assemble({
    id: stage === 'hyper-mild' ? 'hyperk-mild' : stage === 'hyper-moderate' ? 'hyperk-moderate' : 'hyperk-severe',
    label: labels[stage],
    description: text[stage],
    window: WINDOW,
    beats,
    atrial,
    marks,
    pulses,
    extra: parts,
    drawT: false,
    qrs: mild ? undefined : hyperQrs,
  });
}

export const potassiumRhythm = (stage: PotassiumStage): RhythmDef => {
  switch (stage) {
    case 'normal':
      return normalRhythm();
    case 'hypo-mild':
      return hypokalemiaRhythm(false);
    case 'hypo-severe':
      return hypokalemiaRhythm(true);
    default:
      return hyperkalemiaRhythm(stage);
  }
};

