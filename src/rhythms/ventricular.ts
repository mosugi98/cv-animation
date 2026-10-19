import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, blockedP, sinusBeat } from './helpers';
import type { EscapeKind } from './junctional';

/** Sinus P-P interval (67 per minute). */
export const VENT_PP = 0.9;
/** Escape-to-escape interval of the ventricular focus: 30 per minute. */
export const VENT_ESCAPE_RR = 2.0;
/** Last conducted QRS to first ventricular escape QRS. */
export const VENT_PAUSE = 2.04;
const WINDOW = 8;

const P0 = 0.2;
const pTimes = (): number[] => {
  const out: number[] = [];
  for (let p = P0; p < WINDOW - 0.4; p += VENT_PP) out.push(p);
  return out;
};

/** The ventricles fire on their own: wide QRS, no P wave in front of it, discordant T wave. */
function ventricularEscape(q: number): { pulses: Pulse[]; beat: BeatEvent; marks: Mark[] } {
  return {
    pulses: [
      { type: 'flash', site: 'ventricle', t: q - 0.04, tone: 'purple' },
      { type: 'flash', site: 'ventricle', t: q + 0.1, tone: 'purple' },
    ],
    beat: { t: q, wide: true, origin: 'ventricular' },
    marks: [{ kind: 'seg', t0: q - 0.02, t1: q + 0.62, tone: 'purple' }],
  };
}

/**
 * AV block leaves the ventricles unprotected: P waves keep marching, none gets through, and after a long pause
 * a slow ventricular focus fires. 'beat' = transient block, conduction resumes. 'rhythm' = block persists.
 */
export function ventricularRhythm(kind: EscapeKind = 'rhythm'): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];

  const lastConductedQ = P0 + VENT_PP + 0.16;
  const q0 = lastConductedQ + VENT_PAUSE;
  const escapes = kind === 'beat' ? [q0] : [q0, q0 + VENT_ESCAPE_RR, q0 + 2 * VENT_ESCAPE_RR];

  pTimes().forEach((p, k) => {
    const resumes = kind === 'beat' && p > q0 + 0.3;
    if (k < 2 || resumes) {
      const b = sinusBeat(p, 0.16);
      beats.push(b.beat);
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

  for (const q of escapes) {
    const e = ventricularEscape(q);
    beats.push(e.beat);
    pulses.push(...e.pulses);
    marks.push(...e.marks);
  }

  marks.push(
    { kind: 'bar', t0: lastConductedQ + 0.04, t1: q0 - 0.04, tone: 'red' },
    { kind: 'note', t: lastConductedQ + VENT_PAUSE / 2, text: 'pause', tone: 'red' },
    { kind: 'tag', t: q0 + 0.1, text: 'ESCAPE', tone: 'purple' },
  );

  return assemble({
    id: kind === 'beat' ? 'ventricular-beat' : 'ventricular-rhythm',
    label: kind === 'beat' ? 'Ventricular escape beat' : 'Ventricular escape rhythm',
    description:
      kind === 'beat'
        ? 'Schematic: two conducted beats, a period of AV block with P waves that do not conduct, one wide-complex ventricular escape beat after the pause, then conduction resumes.'
        : 'Schematic: P waves march on without conducting; after a long pause a slow regular wide-complex ventricular escape rhythm at about 30 per minute takes over, unrelated to the P waves.',
    window: WINDOW,
    beats,
    atrial,
    marks,
    pulses,
  });
}
