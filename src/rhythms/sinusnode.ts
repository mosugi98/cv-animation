import { fibWavelets, mulberry32 } from '../engine/morphology';
import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, rrBars, ventricularDown } from './helpers';
import { escapeBeat } from './junctional';

export const SN_PR = 0.16;

/** Beat driven by a sinus-node impulse that fires at `f` and reaches the atrial muscle after the exit delay `d`. */
function nodeBeat(f: number, d: number): { pulses: Pulse[]; beat: BeatEvent; atrial: AtrialEvent; marks: Mark[] } {
  const p = f + d;
  const q = p + SN_PR;
  return {
    pulses: [
      { type: 'flash', site: 'sa', t: f, tone: 'blue' },
      { type: 'travel', path: 'atria-sa', t0: f, t1: p + 0.08, tone: d > 0.05 ? 'orange' : 'blue' },
      { type: 'travel', path: 'avn-direct', t0: p + 0.08, t1: q - 0.04, tone: 'blue' },
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

/** The node fires but the impulse never leaves it: no P wave, no QRS, no T wave. */
function exitBlock(f: number): { pulses: Pulse[]; marks: Mark[] } {
  return {
    pulses: [
      { type: 'flash', site: 'sa', t: f, tone: 'blue' },
      { type: 'travel', path: 'atria-sa', t0: f, t1: f + 0.08, tone: 'red', stop: 0.3 },
    ],
    marks: [{ kind: 'dot', t: f + 0.05, tone: 'red' }],
  };
}

export type SaBlockType = 'type1' | 'type2';

export const SA_BLOCK_OPTIONS: { id: SaBlockType; label: string }[] = [
  { id: 'type1', label: 'Type I (Wenckebach)' },
  { id: 'type2', label: 'Type II' },
];

/** Node firing interval, exit delays of one Wenckebach group (the last impulse is blocked), and the type II interval. */
export const SA_FIRE_I = 0.8;
export const SA_DELAYS_I = [0.1, 0.22, 0.3] as const;
export const SA_FIRE_II = 0.9;
const SA_FIRST = 0.3;

/** Indices of the node impulses that are blocked. */
export const saBlockedIndices = (type: SaBlockType): number[] => (type === 'type1' ? [3, 7] : [3, 6]);
export const saFireCount = (type: SaBlockType): number => (type === 'type1' ? 9 : 9);

export function saBlockRhythm(type: SaBlockType = 'type2'): RhythmDef {
  const fire = type === 'type1' ? SA_FIRE_I : SA_FIRE_II;
  const blocked = saBlockedIndices(type);
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];

  for (let k = 0; k < saFireCount(type); k++) {
    const f = SA_FIRST + k * fire;
    if (blocked.includes(k)) {
      const b = exitBlock(f);
      pulses.push(...b.pulses);
      marks.push(...b.marks);
      continue;
    }
    const d = type === 'type1' ? SA_DELAYS_I[k % 4] : 0;
    const b = nodeBeat(f, d);
    beats.push(b.beat);
    atrial.push(b.atrial);
    pulses.push(...b.pulses);
    marks.push(...b.marks);
  }

  const ps = atrial.map((a) => a.t);
  const firstBlocked = SA_FIRST + blocked[0] * fire;
  const before = ps.filter((t) => t < firstBlocked).at(-1)!;
  const after = ps.find((t) => t > firstBlocked)!;
  marks.push({ kind: 'bar', t0: before + 0.12, t1: after - 0.05, tone: 'red' });
  marks.push({ kind: 'tag', t: firstBlocked + 0.05, text: 'SA BLOCK', tone: 'red' });
  marks.push({
    kind: 'note',
    t: (before + after) / 2 + 0.1,
    text: type === 'type1' ? 'pause shorter than 2 × P-P' : 'pause = 2 × P-P',
    tone: 'purple',
  });

  return assemble({
    id: `sa-block-${type}`,
    label: type === 'type1' ? 'SA exit block, type I (Wenckebach)' : 'SA exit block, type II',
    description:
      type === 'type1'
        ? 'Schematic sinoatrial Wenckebach: the sinus node fires steadily but the exit delay grows, so P-P intervals shorten until one impulse is blocked, leaving a pause shorter than twice the shortest P-P interval.'
        : 'Schematic type II sinoatrial exit block: P-P intervals are constant, then a P wave is missing, and the pause equals exactly two P-P intervals because the node kept firing on time.',
    window: type === 'type1' ? 7.6 : 8.4,
    beats,
    atrial,
    marks,
    pulses,
  });
}

export type ArrestKind = 'pause' | 'escape';

export const ARREST_OPTIONS: { id: ArrestKind; label: string }[] = [
  { id: 'pause', label: 'Pause, then sinus' },
  { id: 'escape', label: 'Junctional escape' },
];

export const ARREST_PP = 0.9;
export const ARREST_PAUSE = 3.3;
/** Escape QRS onsets in the 'escape' strip. */
export const ARREST_ESCAPES = [3.8, 5.3] as const;
const ARREST_P = [0.3, 1.2, 2.1];

export function sinusArrestRhythm(kind: ArrestKind = 'pause'): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];
  const add = (b: ReturnType<typeof nodeBeat>) => {
    beats.push(b.beat);
    atrial.push(b.atrial);
    pulses.push(...b.pulses);
    marks.push(...b.marks);
  };

  for (const p of ARREST_P) add(nodeBeat(p, 0));
  const lastP = ARREST_P[ARREST_P.length - 1];
  const resume = kind === 'pause' ? lastP + ARREST_PAUSE : ARREST_ESCAPES[1] + 0.96;
  const resumed = [resume, resume + ARREST_PP, resume + 2 * ARREST_PP].filter((p) => p + 0.7 < 8.4);
  const lastQ = lastP + SN_PR;

  if (kind === 'escape') {
    for (const q of ARREST_ESCAPES) {
      const e = escapeBeat(q);
      beats.push(e.beat);
      atrial.push(e.retro);
      pulses.push(...e.pulses);
      marks.push(...e.marks);
    }
  }
  for (const p of resumed) add(nodeBeat(p, 0));

  marks.push({ kind: 'bar', t0: lastQ + 0.4, t1: (kind === 'pause' ? resume : ARREST_ESCAPES[0]) - 0.1, tone: 'red' });
  marks.push({ kind: 'tag', t: lastQ + 0.5, text: 'SINUS ARREST', tone: 'red' });
  marks.push({
    kind: 'note',
    t: lastQ + (kind === 'pause' ? 1.7 : 1.9),
    text: kind === 'pause' ? 'pause is not a multiple of P-P' : 'no P wave: junctional escape',
    tone: 'purple',
  });
  if (kind === 'escape') marks.push({ kind: 'tag', t: ARREST_ESCAPES[0] + 0.05, text: 'ESCAPE', tone: 'purple' });

  return assemble({
    id: `sinus-arrest-${kind}`,
    label: kind === 'pause' ? 'Sinus arrest' : 'Sinus arrest with junctional escape',
    description:
      kind === 'pause'
        ? 'Schematic sinus arrest: regular sinus rhythm, then the node stops firing for 3.3 seconds, a pause that is not a multiple of the P-P interval, then sinus rhythm resumes.'
        : 'Schematic sinus arrest: regular sinus rhythm, then the node stops firing. After a pause, narrow-complex junctional escape beats appear before the sinus node recovers.',
    window: 8.4,
    beats,
    atrial,
    marks,
    pulses,
  });
}

export type SssKind = 'tachybrady' | 'brady';

export const SSS_OPTIONS: { id: SssKind; label: string }[] = [
  { id: 'tachybrady', label: 'Tachy-brady' },
  { id: 'brady', label: 'Bradycardia and pauses' },
];

export const SSS_WINDOW = 8.8;
/** Atrial fibrillation run of the tachy-brady strip, and the pause that follows it. */
export const SSS_AF = { start: 1.9, end: 4.0 } as const;
export const SSS_RESUME = 7.4;
const SSS_SEED = 20261023;
/** Sinus bradycardia strip: P-P interval (about 43 per minute). */
export const SSS_BRADY_PP = 1.4;

function afBeatTimes(): number[] {
  const rnd = mulberry32(SSS_SEED);
  const out: number[] = [];
  let q = SSS_AF.start + 0.2;
  let prev = 0;
  while (q < SSS_AF.end - 0.2) {
    out.push(q);
    let rr = 0.3 + rnd() * 0.25;
    while (Math.abs(rr - prev) < 0.04) rr = 0.3 + rnd() * 0.25;
    prev = rr;
    q += rr;
  }
  return out;
}

export const sssAfBeats = afBeatTimes;

function tachyBrady(): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];
  const rnd = mulberry32(SSS_SEED + 1);
  const add = (b: ReturnType<typeof nodeBeat>) => {
    beats.push(b.beat);
    atrial.push(b.atrial);
    pulses.push(...b.pulses);
    marks.push(...b.marks);
  };

  for (const p of [0.3, 1.1]) add(nodeBeat(p, 0));
  const afQ = afBeatTimes();
  for (const q of afQ) {
    beats.push({ t: q, wide: false, origin: 'conducted' });
    pulses.push({ type: 'travel', path: 'avn-direct', t0: q - 0.12, t1: q - 0.04, tone: 'blue' }, ...ventricularDown(q));
  }
  for (let i = 0; i < 140; i++) {
    pulses.push({ type: 'spark', t: SSS_AF.start + rnd() * (SSS_AF.end - SSS_AF.start), x: 86 + rnd() * 214, y: 18 + rnd() * 34, tone: 'orange' });
  }
  const lastAf = afQ[afQ.length - 1];
  // After the tachycardia stops, the suppressed node is slow to restart and a junctional escape arrives first.
  const esc = escapeBeat(lastAf + 2.1);
  beats.push(esc.beat);
  atrial.push(esc.retro);
  pulses.push(...esc.pulses);
  marks.push(...esc.marks);
  for (const p of [SSS_RESUME, SSS_RESUME + 1.2].filter((x) => x + 0.6 < SSS_WINDOW)) add(nodeBeat(p, 0));

  marks.push(...rrBars(afQ, 'navy'));
  marks.push({ kind: 'tag', t: SSS_AF.start + 0.25, text: 'AF', tone: 'orange' });
  marks.push({ kind: 'bar', t0: lastAf + 0.35, t1: lastAf + 2.0, tone: 'red' });
  marks.push({ kind: 'note', t: lastAf + 1.25, text: 'post-tachycardia pause', tone: 'red' });
  marks.push({ kind: 'tag', t: lastAf + 2.15, text: 'ESCAPE', tone: 'purple' });

  const fibrillating = (t: number): number => {
    const fade = Math.min(Math.max((t - SSS_AF.start) / 0.15, 0), Math.min(Math.max((SSS_AF.end - t) / 0.15, 0), 1), 1);
    return fibWavelets(t, 0.07) * fade;
  };

  return assemble({
    id: 'sss-tachybrady',
    label: 'Tachy-brady syndrome',
    description:
      'Schematic sick sinus syndrome of the tachy-brady type: sinus rhythm, a run of atrial fibrillation, then a long pause and a junctional escape beat when it stops, before the sinus node restarts slowly.',
    window: SSS_WINDOW,
    beats,
    atrial,
    marks,
    pulses,
    extra: [fibrillating],
  });
}

function sinusBradycardia(): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];
  const add = (b: ReturnType<typeof nodeBeat>) => {
    beats.push(b.beat);
    atrial.push(b.atrial);
    pulses.push(...b.pulses);
    marks.push(...b.marks);
  };
  const ps = [0.3, 0.3 + SSS_BRADY_PP, 0.3 + 2 * SSS_BRADY_PP];
  for (const p of ps) add(nodeBeat(p, 0));
  const lastQ = ps[2] + SN_PR;
  // Long pause: the node pauses (exit block) and a junctional escape beat comes first.
  const esc = escapeBeat(lastQ + 2.1);
  beats.push(esc.beat);
  atrial.push(esc.retro);
  pulses.push(...esc.pulses);
  marks.push(...esc.marks);
  const resume = esc.beat.t + 1.5;
  for (const p of [resume, resume + 1.3].filter((x) => x + 0.6 < SSS_WINDOW)) add(nodeBeat(p, 0));

  marks.push({ kind: 'tag', t: ps[1] + 0.05, text: '43 /min', tone: 'orange' });
  marks.push({ kind: 'bar', t0: lastQ + 0.35, t1: esc.beat.t - 0.1, tone: 'red' });
  marks.push({ kind: 'note', t: lastQ + 1.2, text: 'pause', tone: 'red' });
  marks.push({ kind: 'tag', t: esc.beat.t + 0.05, text: 'ESCAPE', tone: 'purple' });
  return assemble({
    id: 'sss-brady',
    label: 'Sinus bradycardia with pause',
    description:
      'Schematic sick sinus syndrome of the bradycardia type: persistent sinus bradycardia at about 43 per minute, then a long pause ended by a junctional escape beat before the sinus node recovers.',
    window: SSS_WINDOW,
    beats,
    atrial,
    marks,
    pulses,
  });
}

export const sssRhythm = (kind: SssKind = 'tachybrady'): RhythmDef => (kind === 'tachybrady' ? tachyBrady() : sinusBradycardia());

/** Sinus rhythm at 67 per minute used as the baseline strip. */
export function sinusBaselineRhythm(): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];
  for (let k = 0; k < 7; k++) {
    const b = nodeBeat(0.3 + k * ARREST_PP, 0);
    beats.push(b.beat);
    atrial.push(b.atrial);
    pulses.push(...b.pulses);
    marks.push(...b.marks);
  }
  marks.push(...rrBars(beats.map((b) => b.t), 'navy'));
  return assemble({
    id: 'sn-baseline',
    label: 'Normal sinus rhythm',
    description: 'Schematic normal sinus rhythm: steady P-P and R-R intervals of 900 ms (67 per minute).',
    window: 8.4,
    beats,
    atrial,
    marks,
    pulses,
  });
}
