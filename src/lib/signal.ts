import type { Rhythm } from '../data/rhythms';

export interface SignalState {
  /** 0 atria, 0.3 AV node, 0.6 His-Purkinje, 1 ventricles; null = no signal. */
  s: number | null;
  fade: number;
  stall: 'none' | 'av-node' | 'infra-nodal';
  /** 0..1 strength of the ventricular escape pulse. */
  escape: number;
}

const NODE = 0.3;
const HIS = 0.6;
const ARRIVE = 0.1; // rhythm seconds for the impulse to reach the AV node
const LEAVE_BEFORE_QRS = 0.06; // rhythm seconds from AV node exit to QRS onset

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

export function signalAt(r: Rhythm, rt: number): SignalState {
  const state: SignalState = { s: null, fade: 0, stall: 'none', escape: 0 };

  let beat: Rhythm['beats'][number] | null = null;
  for (const b of r.beats) if (b.pOnset <= rt) beat = b;

  if (beat) {
    const dt = rt - beat.pOnset;
    if (beat.pr !== null) {
      const leave = beat.pr - LEAVE_BEFORE_QRS;
      if (dt < ARRIVE) state.s = NODE * (dt / ARRIVE);
      else if (dt < leave) state.s = NODE;
      else if (dt < beat.pr) state.s = NODE + (1 - NODE) * ((dt - leave) / LEAVE_BEFORE_QRS);
      else state.s = 1;
      state.fade = dt < beat.pr ? 1 : 1 - clamp01((dt - beat.pr) / 0.8);
    } else {
      const infra = r.dropSite === 'infra-nodal';
      const stopAt = infra ? HIS : NODE;
      const arrivedAt = infra ? 2 * ARRIVE : ARRIVE;
      if (dt < ARRIVE) state.s = NODE * (dt / ARRIVE);
      else if (infra && dt < arrivedAt) state.s = NODE + (HIS - NODE) * ((dt - ARRIVE) / ARRIVE);
      else state.s = stopAt;
      if (dt >= arrivedAt) state.stall = infra ? 'infra-nodal' : 'av-node';
      state.fade = 1 - clamp01((dt - 0.3) / 0.7);
    }
    if (state.fade <= 0) {
      state.s = null;
      state.stall = 'none';
    }
  }

  let last: number | null = null;
  for (const e of r.escapes) if (e <= rt) last = e;
  if (last !== null) state.escape = 1 - clamp01((rt - last) / 0.9);

  return state;
}
