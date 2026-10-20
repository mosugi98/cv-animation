import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, rrBars, ventricularDown } from './helpers';

/** Orthodromic AVRT cycle length: about 182 beats/min. */
export const AVRT_CL = 0.33;
/** QRS onset to retrograde P onset: clearly separate from the QRS (70 ms or more), under half the R-R. */
export const AVRT_RP = 0.1;

/**
 * One trip around the big circuit: down the AV node and His-Purkinje system, then back up the accessory
 * pathway. The atria are activated only after the ventricles, so the retrograde P wave follows the QRS.
 * `avStart` / `avTone` let the first beat (after a premature atrial beat) conduct slowly through the node.
 */
function orthodromic(
  q: number,
  avStart = q - 0.15,
  avTone: 'blue' | 'orange' = 'blue',
): { pulses: Pulse[]; beat: BeatEvent; retro: AtrialEvent } {
  return {
    pulses: [
      { type: 'travel', path: 'avn-direct', t0: avStart, t1: q - 0.03, tone: avTone },
      ...ventricularDown(q),
      { type: 'travel', path: 'ap', t0: q + 0.04, t1: q + 0.1, tone: 'purple', reverse: true },
      { type: 'travel', path: 'atria-ap', t0: q + 0.1, t1: q + 0.15, tone: 'purple' },
    ],
    beat: { t: q, wide: false, origin: 'tachy' },
    retro: { t: q + AVRT_RP, kind: 'retro', conducted: false, amp: -0.14 },
  };
}

/** A sinus beat that reaches the ventricles over both the AV node and the accessory pathway (pre-excitation). */
function preexcitedBeat(p: number): { pulses: Pulse[]; beat: BeatEvent; atrial: AtrialEvent; marks: Mark[] } {
  const q = p + 0.11;
  return {
    pulses: [
      { type: 'flash', site: 'sa', t: p, tone: 'blue' },
      { type: 'travel', path: 'atria-sa', t0: p, t1: p + 0.08, tone: 'blue' },
      { type: 'travel', path: 'ap', t0: p + 0.04, t1: q, tone: 'blue' },
      { type: 'travel', path: 'avn-direct', t0: p + 0.08, t1: p + 0.2, tone: 'orange' },
      { type: 'travel', path: 'his', t0: p + 0.2, t1: p + 0.23, tone: 'blue' },
      { type: 'travel', path: 'bb-left', t0: p + 0.23, t1: p + 0.29, tone: 'blue' },
      { type: 'travel', path: 'bb-right', t0: p + 0.23, t1: p + 0.29, tone: 'blue' },
    ],
    beat: { t: q, wide: false, origin: 'sinus', preexcited: true },
    atrial: { t: p, kind: 'sinus', conducted: true, amp: 0.15 },
    marks: [
      { kind: 'dot', t: p + 0.05, tone: 'blue' },
      { kind: 'bar', t0: p, t1: q, tone: 'orange' },
    ],
  };
}

const qTimes = (first: number, n: number): number[] => Array.from({ length: n }, (_, k) => first + k * AVRT_CL);

/** Sinus rhythm with a manifest accessory pathway: short PR and a delta wave. */
export function avrtSinus(): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];
  for (const p of [0.3, 1.2, 2.1, 3.0]) {
    const b = preexcitedBeat(p);
    beats.push(b.beat);
    atrial.push(b.atrial);
    pulses.push(...b.pulses);
    marks.push(...b.marks);
  }
  marks.push({ kind: 'tag', t: 0.41 + 0.03, text: 'DELTA WAVE', tone: 'orange' });
  return assemble({
    id: 'avrt-sinus',
    label: 'Sinus rhythm with pre-excitation',
    description:
      'Schematic sinus rhythm with a manifest accessory pathway: short PR interval and a slurred delta wave at the start of the QRS.',
    window: 4,
    beats,
    atrial,
    marks,
    pulses,
  });
}

/** A premature atrial beat finds the accessory pathway refractory, so it can only use the AV node. */
export function avrtInitiation(): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];

  for (const p of [0.3, 1.2]) {
    const b = preexcitedBeat(p);
    beats.push(b.beat);
    atrial.push(b.atrial);
    pulses.push(...b.pulses);
    marks.push(...b.marks);
  }

  const pac = 1.8;
  const q0 = 2.13;
  atrial.push({ t: pac, kind: 'ectopic', conducted: true, amp: 0.12 });
  pulses.push(
    { type: 'flash', site: 'ectopic', t: pac, tone: 'orange' },
    { type: 'travel', path: 'atria-ect', t0: pac, t1: pac + 0.07, tone: 'blue' },
    { type: 'travel', path: 'ap', t0: pac + 0.07, t1: pac + 0.15, tone: 'red', stop: 0.25 },
  );
  marks.push(
    { kind: 'dot', t: pac + 0.05, tone: 'orange' },
    { kind: 'bar', t0: pac, t1: q0, tone: 'orange' },
    { kind: 'tag', t: pac + 0.05, text: 'PAC', tone: 'red' },
  );

  const qs = qTimes(q0, 8);
  qs.forEach((q, k) => {
    const r = k === 0 ? orthodromic(q, pac + 0.07, 'orange') : orthodromic(q);
    pulses.push(...r.pulses);
    beats.push(k === 0 ? { ...r.beat, origin: 'pac' } : r.beat);
    atrial.push(r.retro);
  });
  marks.push(...rrBars(qs.slice(1), 'navy'));
  marks.push({ kind: 'tag', t: qs[2] + 0.05, text: 'AVRT', tone: 'red' });
  marks.push({ kind: 'note', t: qs[1] + 0.15, text: 'P after QRS', tone: 'purple' });

  return assemble({
    id: 'avrt-initiation',
    label: 'Orthodromic AVRT initiation',
    description:
      'Schematic: pre-excited sinus beats, then a premature atrial beat blocks in the accessory pathway, conducts over the AV node only, and returns up the accessory pathway to start a regular narrow-complex tachycardia.',
    window: 5,
    beats,
    atrial,
    marks,
    pulses,
    fastT: { amp: 0.18, delay: 0.23 },
  });
}

/** Steady orthodromic AVRT. */
export function avrtTachycardia(): RhythmDef {
  const qs = qTimes(0.3, 11);
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  for (const q of qs) {
    const r = orthodromic(q);
    pulses.push(...r.pulses);
    beats.push(r.beat);
    atrial.push(r.retro);
  }
  const marks: Mark[] = [
    ...rrBars(qs, 'navy'),
    { kind: 'tag', t: qs[1] + 0.05, text: 'AVRT', tone: 'red' },
    { kind: 'note', t: qs[2] + 0.15, text: 'P after QRS', tone: 'purple' },
  ];
  return assemble({
    id: 'avrt-tachycardia',
    label: 'Orthodromic AVRT',
    description:
      'Schematic orthodromic AVRT at about 180 per minute: regular, narrow QRS, with the retrograde P wave visible after the QRS (short RP interval).',
    window: 4,
    beats,
    atrial,
    marks,
    pulses,
    fastT: { amp: 0.18, delay: 0.23 },
  });
}
