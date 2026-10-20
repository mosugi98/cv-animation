import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, blockedP, refractoryP, rrBars, sinusBeat, ventricularDown, ventricularFocusPulses } from './helpers';

export type AvBlockKind = 'first' | 'mobitz1' | 'mobitz2' | '2to1' | '3to1' | 'junctional' | 'ventricular';

/** Sinus P-P interval (70 per minute) for the lower-rate blocks; faster for 2:1 and 3:1 so the ventricular rate is plausible. */
export const AV_PP = 0.85;
export const AV_PP_FAST = 0.6;
export const FIRST_DEGREE_PR = 0.34;
/** PR intervals of one Wenckebach cycle (4:3): the increment shrinks each beat, and the last P is dropped. */
export const WENCKEBACH_PR = [0.16, 0.28, 0.34] as const;
export const MOBITZ2_PR = 0.16;
export const BLOCK_PR = 0.18;
/** Escape cycle lengths: junctional about 43 per minute, ventricular about 30 per minute. */
export const ESCAPE_CYCLE = { junctional: 1.4, ventricular: 2.0 } as const;
export const AV_WINDOW = 7.4;

const pTimes = (pp: number, first = 0.3, window = AV_WINDOW): number[] => {
  const out: number[] = [];
  for (let p = first; p + 0.45 < window; p += pp) out.push(p);
  return out;
};

/** Which P waves are conducted, and with what PR (null = blocked). */
export function avPatterns(kind: AvBlockKind): { pp: number; prs: (number | null)[] } {
  switch (kind) {
    case 'first':
      return { pp: AV_PP, prs: pTimes(AV_PP).map(() => FIRST_DEGREE_PR) };
    case 'mobitz1':
      return { pp: AV_PP, prs: pTimes(AV_PP).map((_, i) => (i % 4 === 3 ? null : WENCKEBACH_PR[i % 4])) };
    case 'mobitz2':
      return { pp: AV_PP, prs: pTimes(AV_PP).map((_, i) => (i % 4 === 3 ? null : MOBITZ2_PR)) };
    case '2to1':
      return { pp: AV_PP_FAST, prs: pTimes(AV_PP_FAST).map((_, i) => (i % 2 === 1 ? null : BLOCK_PR)) };
    case '3to1':
      return { pp: AV_PP_FAST, prs: pTimes(AV_PP_FAST).map((_, i) => (i % 3 === 0 ? BLOCK_PR : null)) };
    default:
      return { pp: AV_PP, prs: pTimes(AV_PP).map(() => null) };
  }
}

const LABEL: Record<AvBlockKind, string> = {
  first: 'First-degree AV block',
  mobitz1: 'Mobitz I (Wenckebach)',
  mobitz2: 'Mobitz II',
  '2to1': '2:1 AV block',
  '3to1': 'High-grade AV block (3:1)',
  junctional: 'Complete AV block, junctional escape',
  ventricular: 'Complete AV block, ventricular escape',
};

const DESCRIPTION: Record<AvBlockKind, string> = {
  first: 'Schematic sinus rhythm in which every P wave is conducted, but with a long, constant PR interval of 340 ms.',
  mobitz1: 'Schematic Mobitz I (Wenckebach): the PR interval lengthens beat by beat until a P wave is not conducted, then resets. Groups of four P waves and three QRS complexes.',
  mobitz2: 'Schematic Mobitz II: the PR interval is constant, then a P wave is suddenly not conducted, with no warning.',
  '2to1': 'Schematic 2:1 AV block: every second P wave is blocked, and the PR interval of the conducted beats is constant.',
  '3to1': 'Schematic high-grade AV block: only every third P wave is conducted, giving a slow ventricular rate.',
  junctional: 'Schematic complete AV block: P waves march on regularly at their own rate, none is conducted, and a junctional escape rhythm with a narrow QRS drives the ventricles at about 43 per minute.',
  ventricular: 'Schematic complete AV block: P waves march on regularly, none is conducted, and a ventricular escape rhythm with a wide QRS drives the ventricles at about 30 per minute.',
};

/** QRS onset times of the escape rhythm in complete block. */
export function escapeTimes(kind: 'junctional' | 'ventricular'): number[] {
  const cycle = ESCAPE_CYCLE[kind];
  const out: number[] = [];
  for (let q = 0.75; q + 0.6 < AV_WINDOW; q += cycle) out.push(q);
  return out;
}

export function avBlockRhythm(kind: AvBlockKind): RhythmDef {
  const { pp, prs } = avPatterns(kind);
  const ps = pTimes(pp);
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];
  const complete = kind === 'junctional' || kind === 'ventricular';

  ps.forEach((p, i) => {
    const pr = prs[i];
    if (pr !== null) {
      const b = sinusBeat(p, pr);
      beats.push(b.beat);
      atrial.push(b.atrial);
      pulses.push(...b.pulses);
      marks.push(...b.marks);
    } else if (kind === 'mobitz2') {
      // The block is below the AV node: the impulse crosses the node and stops in the His-Purkinje system.
      const b = refractoryP(p);
      atrial.push(b.atrial);
      pulses.push(...b.pulses);
      marks.push(...b.marks);
    } else {
      const b = blockedP(p);
      atrial.push(b.atrial);
      pulses.push(...b.pulses);
      marks.push(...b.marks);
    }
  });

  if (complete) {
    for (const q of escapeTimes(kind)) {
      if (kind === 'junctional') {
        beats.push({ t: q, wide: false, origin: 'junctional' });
        pulses.push({ type: 'flash', site: 'junction', t: q - 0.05, tone: 'purple' }, ...ventricularDown(q, 'purple'));
      } else {
        beats.push({ t: q, wide: true, origin: 'ventricular' });
        pulses.push(...ventricularFocusPulses(q, 'purple'));
      }
    }
  }

  const qs = beats.map((b) => b.t).sort((a, b) => a - b);
  marks.push(...rrBars(qs, 'navy'));

  const second = beats[1]?.t ?? qs[1];
  switch (kind) {
    case 'first':
      marks.push({ kind: 'tag', t: ps[1] + 0.02, text: 'PR 340 ms', tone: 'orange' });
      marks.push({ kind: 'note', t: ps[3] + 0.25, text: 'long and constant', tone: 'purple' });
      break;
    case 'mobitz1':
      marks.push({ kind: 'tag', t: ps[3] + 0.02, text: 'DROPPED P', tone: 'red' });
      marks.push({ kind: 'note', t: ps[1] + 0.3, text: 'PR gets longer', tone: 'purple' });
      break;
    case 'mobitz2':
      marks.push({ kind: 'tag', t: ps[3] + 0.02, text: 'DROPPED P', tone: 'red' });
      marks.push({ kind: 'note', t: ps[1] + 0.3, text: 'PR stays the same', tone: 'purple' });
      break;
    case '2to1':
      marks.push({ kind: 'tag', t: ps[1] + 0.02, text: '2:1', tone: 'red' });
      marks.push({ kind: 'note', t: ps[4] + 0.1, text: 'every second P blocked', tone: 'purple' });
      break;
    case '3to1':
      marks.push({ kind: 'tag', t: ps[1] + 0.02, text: '3:1', tone: 'red' });
      marks.push({ kind: 'note', t: ps[5] + 0.1, text: 'two P waves in a row blocked', tone: 'purple' });
      break;
    default:
      marks.push({ kind: 'tag', t: second + 0.05, text: 'COMPLETE', tone: 'purple' });
      marks.push({ kind: 'note', t: ps[ps.length - 3] + 0.2, text: 'P waves and QRS unrelated', tone: 'purple' });
  }

  return assemble({
    id: `av-${kind}`,
    label: LABEL[kind],
    description: DESCRIPTION[kind],
    window: AV_WINDOW,
    beats,
    atrial,
    marks,
    pulses,
  });
}

/** Sinus rhythm with normal conduction, used as the baseline in the AV block lessons. */
export function avNormalRhythm(): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];
  for (const p of pTimes(AV_PP).slice(0, 6)) {
    const b = sinusBeat(p, 0.16);
    beats.push(b.beat);
    atrial.push(b.atrial);
    pulses.push(...b.pulses);
    marks.push(...b.marks);
  }
  marks.push({ kind: 'tag', t: beats[1].t - 0.12, text: 'PR 160 ms', tone: 'blue' });
  return assemble({
    id: 'av-normal',
    label: 'Normal sinus rhythm',
    description: 'Schematic sinus rhythm: every P wave is followed by a QRS with a normal PR interval of 160 ms.',
    window: AV_WINDOW,
    beats,
    atrial,
    marks,
    pulses,
  });
}
