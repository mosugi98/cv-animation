import {
  pWave,
  qrsDelta,
  qrsNarrow,
  qrsWide,
  sum,
  tWave,
  tWaveWide,
} from '../engine/morphology';
import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef, Tone } from '../engine/types';

export interface AssembleInput {
  id: string;
  label: string;
  description: string;
  window: number;
  beats: BeatEvent[];
  atrial: AtrialEvent[];
  marks: Mark[];
  pulses: Pulse[];
  /** Extra continuous components (flutter sawtooth, fibrillatory baseline). */
  extra?: Array<(t: number) => number>;
  /** Draw each atrial event as a P-like bump. False when a continuous component replaces them. */
  drawAtrial?: boolean;
  fibrillation?: boolean;
  isoelectric?: boolean;
  /** Replaces the normal narrow QRS, and the wide QRS of beats flagged `customQrs` (RBBB pattern, widened QRS). */
  qrs?: (t: number, q: number) => number;
  /** False when the caller draws T, U and ST components itself (through `extra`). */
  drawT?: boolean;
  /** T-wave shape for beats with R-R under 0.45 s, so a retrograde P wave in the ST segment stays distinguishable. */
  fastT?: { amp: number; delay: number };
}

/** QRS-to-T distance: shorter at fast rates so the T wave never lands on the next QRS. */
const tDelayFor = (rr: number): number => Math.min(0.32, 0.5 * rr);

export function assemble(i: AssembleInput): RhythmDef {
  const beats = [...i.beats].sort((a, b) => a.t - b.t);
  const parts: Array<(t: number) => number> = [...(i.extra ?? [])];

  if (i.drawAtrial !== false) for (const a of i.atrial) parts.push((t) => pWave(t, a.t, a.amp));

  beats.forEach((b, k) => {
    const rr = beats[k + 1] ? beats[k + 1].t - b.t : beats[k - 1] ? b.t - beats[k - 1].t : 1;
    const fast = i.fastT !== undefined && rr < 0.45;
    const tAmp = fast ? i.fastT!.amp : 0.3;
    const tDelay = fast ? i.fastT!.delay : tDelayFor(rr);
    // Fast wide-complex rhythms: shrink and advance the discordant T wave so it does not land on the next QRS.
    const squeeze = rr < 0.5 ? rr / 0.5 : 1;
    const drawT = i.drawT !== false;
    if (b.wide) {
      const wideQrs = b.customQrs && i.qrs ? i.qrs : qrsWide;
      parts.push((t) => wideQrs(t, b.t));
      if (drawT) parts.push((t) => tWaveWide(t, b.t, 0.4 * squeeze, -0.32 * squeeze, 0.06 * Math.max(squeeze, 0.7)));
    } else if (b.preexcited) {
      parts.push((t) => qrsDelta(t, b.t));
      if (drawT) parts.push((t) => tWave(t, b.t, tAmp, tDelay));
    } else {
      const qrs = i.qrs ?? qrsNarrow;
      parts.push((t) => qrs(t, b.t));
      if (drawT) parts.push((t) => tWave(t, b.t, tAmp, tDelay));
    }
  });

  return {
    id: i.id,
    label: i.label,
    description: i.description,
    window: i.window,
    signal: sum(parts),
    marks: i.marks,
    pulses: i.pulses,
    beats,
    atrial: [...i.atrial].sort((a, b) => a.t - b.t),
    fibrillation: i.fibrillation ?? false,
    isoelectric: i.isoelectric ?? true,
  };
}

/** Normal ventricular activation: His bundle then both bundle branches, ending at QRS onset + 0.07 s. */
export function ventricularDown(q: number, tone: Tone = 'blue'): Pulse[] {
  return [
    { type: 'travel', path: 'his', t0: q - 0.04, t1: q, tone },
    { type: 'travel', path: 'bb-left', t0: q, t1: q + 0.07, tone },
    { type: 'travel', path: 'bb-right', t0: q, t1: q + 0.07, tone },
  ];
}

/** A sinus-driven, normally conducted beat. Returns pulses and ECG events. */
export function sinusBeat(
  p: number,
  pr: number,
  opts: { avPath?: 'avn-direct' | 'avn-fast'; tone?: Tone } = {},
): { pulses: Pulse[]; beat: BeatEvent; atrial: AtrialEvent; marks: Mark[] } {
  const q = p + pr;
  const avTone = opts.tone ?? (pr > 0.2 ? 'orange' : 'blue');
  return {
    pulses: [
      { type: 'flash', site: 'sa', t: p, tone: 'blue' },
      { type: 'travel', path: 'atria-sa', t0: p, t1: p + 0.08, tone: 'blue' },
      { type: 'travel', path: opts.avPath ?? 'avn-direct', t0: p + 0.08, t1: q - 0.04, tone: avTone },
      ...ventricularDown(q),
    ],
    beat: { t: q, wide: false, origin: 'sinus' },
    atrial: { t: p, kind: 'sinus', conducted: true, amp: 0.15 },
    marks: [
      { kind: 'dot', t: p + 0.05, tone: 'blue' },
      { kind: 'bar', t0: p, t1: q, tone: 'orange' },
    ],
  };
}

/** A sinus P wave that is not conducted (AV block, or blocked while the AV node is refractory). */
export function blockedP(p: number): { pulses: Pulse[]; atrial: AtrialEvent; marks: Mark[] } {
  return {
    pulses: [
      { type: 'flash', site: 'sa', t: p, tone: 'blue' },
      { type: 'travel', path: 'atria-sa', t0: p, t1: p + 0.08, tone: 'blue' },
      { type: 'travel', path: 'avn-direct', t0: p + 0.08, t1: p + 0.16, tone: 'red', stop: 0.3 },
    ],
    atrial: { t: p, kind: 'sinus', conducted: false, amp: 0.15 },
    marks: [{ kind: 'dot', t: p + 0.05, tone: 'red' }],
  };
}

/** Evenly spaced bars between consecutive QRS onsets: equal bars = regular, unequal = irregular. */
export function rrBars(times: number[], tone: Tone = 'orange'): Mark[] {
  const out: Mark[] = [];
  for (let k = 0; k + 1 < times.length; k++) out.push({ kind: 'bar', t0: times[k] + 0.02, t1: times[k + 1] - 0.02, tone });
  return out;
}

export const rate = (interval: number): number => 60 / interval;

/**
 * A beat that starts in the ventricular muscle: a focus flashes and the wave spreads slowly through muscle in both
 * directions, which is why the QRS is wide.
 */
export function ventricularFocusPulses(q: number, tone: Tone = 'orange'): Pulse[] {
  return [
    { type: 'flash', site: 'ventricle', t: q - 0.02, tone },
    { type: 'travel', path: 'vent-l', t0: q, t1: q + 0.14, tone },
    { type: 'travel', path: 'vent-r', t0: q, t1: q + 0.1, tone },
  ];
}

/** A sinus P wave that reaches the His bundle but finds the ventricles still refractory. */
export function refractoryP(p: number): { pulses: Pulse[]; atrial: AtrialEvent; marks: Mark[] } {
  return {
    pulses: [
      { type: 'flash', site: 'sa', t: p, tone: 'blue' },
      { type: 'travel', path: 'atria-sa', t0: p, t1: p + 0.08, tone: 'blue' },
      { type: 'travel', path: 'avn-direct', t0: p + 0.08, t1: p + 0.16, tone: 'blue' },
      { type: 'travel', path: 'his', t0: p + 0.16, t1: p + 0.22, tone: 'red', stop: 0.5 },
    ],
    atrial: { t: p, kind: 'sinus', conducted: false, amp: 0.15 },
    marks: [{ kind: 'dot', t: p + 0.05, tone: 'red' }],
  };
}
