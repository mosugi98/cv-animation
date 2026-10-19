import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, rrBars, sinusBeat, ventricularDown } from './helpers';

/** AVNRT cycle length: about 171 beats/min. */
export const AVNRT_CL = 0.35;

/**
 * One trip around the circuit inside the AV node, expressed from the QRS onset q:
 * down the slow pathway, out through the His bundle (ventricles) and back up the fast pathway (atria).
 * Atria and ventricles are activated almost together, so the retrograde P wave hides in the QRS.
 */
function reentry(q: number): { pulses: Pulse[]; beat: BeatEvent; retro: AtrialEvent } {
  return {
    pulses: [
      { type: 'travel', path: 'avn-slow', t0: q - 0.3, t1: q - 0.04, tone: 'orange' },
      { type: 'travel', path: 'avn-fast', t0: q - 0.04, t1: q + 0.035, tone: 'purple', reverse: true },
      ...ventricularDown(q),
      { type: 'travel', path: 'atria-retro', t0: q + 0.035, t1: q + 0.085, tone: 'purple' },
    ],
    beat: { t: q, wide: false, origin: 'tachy' },
    retro: { t: q + 0.035, kind: 'retro', conducted: false, amp: -0.12 },
  };
}

const qTimes = (first: number, n: number): number[] => Array.from({ length: n }, (_, k) => first + k * AVNRT_CL);

/** Normal sinus rhythm in a patient with a dual AV node: the fast pathway carries every beat. */
export function avnrtSinus(): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];
  for (const p of [0.35, 1.25, 2.15, 3.05]) {
    const b = sinusBeat(p, 0.16, { avPath: 'avn-fast', tone: 'blue' });
    beats.push(b.beat);
    atrial.push(b.atrial);
    pulses.push(...b.pulses);
    marks.push(...b.marks);
  }
  return assemble({
    id: 'avnrt-sinus',
    label: 'Sinus rhythm with dual AV node pathways',
    description: 'Schematic sinus rhythm. The fast pathway conducts every beat with a normal PR interval.',
    window: 4,
    beats,
    atrial,
    marks,
    pulses,
  });
}

/** A premature atrial beat blocks in the fast pathway, crawls down the slow pathway and starts the circuit. */
export function avnrtInitiation(): RhythmDef {
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

  // Premature atrial complex.
  const pac = 1.8;
  const q0 = 2.17;
  atrial.push({ t: pac, kind: 'ectopic', conducted: true, amp: 0.12 });
  pulses.push(
    { type: 'flash', site: 'ectopic', t: pac, tone: 'orange' },
    { type: 'travel', path: 'atria-ect', t0: pac, t1: pac + 0.07, tone: 'blue' },
    { type: 'travel', path: 'avn-fast', t0: pac + 0.07, t1: pac + 0.15, tone: 'red', stop: 0.3 },
  );
  marks.push(
    { kind: 'dot', t: pac + 0.05, tone: 'orange' },
    { kind: 'bar', t0: pac, t1: q0, tone: 'orange' },
    { kind: 'tag', t: pac + 0.05, text: 'PAC', tone: 'red' },
  );

  const qs = qTimes(q0, 8);
  qs.forEach((q, k) => {
    const r = reentry(q);
    pulses.push(...r.pulses);
    beats.push(k === 0 ? { ...r.beat, origin: 'pac' } : r.beat);
    atrial.push(r.retro);
  });
  marks.push(...rrBars(qs.slice(1), 'navy'));
  marks.push({ kind: 'tag', t: qs[2] + 0.05, text: 'AVNRT', tone: 'red' });
  marks.push({ kind: 'note', t: qs[1] + 0.085, text: 'P hidden in QRS', tone: 'purple' });

  return assemble({
    id: 'avnrt-initiation',
    label: 'AVNRT initiation',
    description:
      'Schematic: two sinus beats, then a premature atrial beat conducts slowly down the slow pathway and starts a regular narrow-complex tachycardia.',
    window: 5,
    beats,
    atrial,
    marks,
    pulses,
  });
}

/** Steady AVNRT. */
export function avnrtTachycardia(): RhythmDef {
  const qs = qTimes(0.4, 10);
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  for (const q of qs) {
    const r = reentry(q);
    pulses.push(...r.pulses);
    beats.push(r.beat);
    atrial.push(r.retro);
  }
  const marks: Mark[] = [
    ...rrBars(qs, 'navy'),
    { kind: 'tag', t: qs[1] + 0.05, text: 'AVNRT', tone: 'red' },
    { kind: 'note', t: qs[2] + 0.085, text: 'P hidden in QRS', tone: 'purple' },
  ];
  return assemble({
    id: 'avnrt-tachycardia',
    label: 'AVNRT',
    description:
      'Schematic AVNRT at about 170 per minute: regular, narrow QRS, retrograde P wave hidden in or just after the QRS.',
    window: 4,
    beats,
    atrial,
    marks,
    pulses,
  });
}
