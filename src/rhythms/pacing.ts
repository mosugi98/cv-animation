import { noiseBurst, qrsBroad, qrsLbbb, spike } from '../engine/morphology';
import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef, Tone } from '../engine/types';
import { assemble, rrBars, ventricularDown, ventricularFocusPulses } from './helpers';

/** Programmed lower rate limit: 60 per minute. */
export const LRL = 1.0;
/** Programmed paced AV delay, and the sensed AV delay used when tracking a P wave. */
export const PACED_AV = 0.2;
export const SENSED_AV = 0.17;
/** Spike to atrial activation, and spike to QRS onset. */
export const ATRIAL_LAG = 0.02;
export const VENT_LAG = 0.02;
/** Time after a ventricular activation during which the ventricles cannot be activated again. */
export const REFRACTORY = 0.3;

/** P wave events. `t` is the P onset for AS and the spike time for AP. `pr` is P-onset-to-QRS for conducted beats. */
interface PAtrial {
  kind: 'AS' | 'AP';
  t: number;
  /** PR interval if the impulse conducts to the ventricles on its own, otherwise null. */
  pr: number | null;
  /** AS only: true when the device senses the P wave and uses it to time a ventricular output (tracking). */
  tracked?: boolean;
}

/** Ventricular events. VS = native conducted QRS, VP = paced QRS, VPX = spike with no capture, VE = ventricular escape. */
interface PVent {
  kind: 'VS' | 'VP' | 'VPX' | 'VE';
  /** Spike time for VP and VPX, QRS onset otherwise. */
  t: number;
}

export type PaceSite = 'rv' | 'biv' | 'his';

interface PaceSpec {
  id: string;
  label: string;
  description: string;
  window: number;
  atrial: PAtrial[];
  vent: PVent[];
  extraMarks?: Mark[];
  extra?: Array<(t: number) => number>;
  /** Paced QRS shape; defaults to the broad left-bundle-like complex of right-ventricular pacing. */
  qrs?: (t: number, q: number) => number;
  site?: PaceSite;
  /** Paced beats with a narrow QRS (conduction-system pacing). */
  narrow?: boolean;
  /** Hide the AV bars drawn between atrial and ventricular events. */
  noRrBars?: boolean;
  /** Expected-but-missing pacing spike times, shown as red dots. */
  missing?: number[];
}

const paceBeatQ = (v: PVent): number => v.t + VENT_LAG;

function ventPulses(v: PVent, site: PaceSite): Pulse[] {
  const s = v.t;
  const q = paceBeatQ(v);
  if (v.kind === 'VPX') {
    return [
      { type: 'flash', site: 'pace-v', t: s, tone: 'teal' },
      { type: 'travel', path: 'paced-l', t0: s, t1: s + 0.1, tone: 'red', stop: 0.12 },
    ];
  }
  if (site === 'biv') {
    return [
      { type: 'flash', site: 'pace-v', t: s, tone: 'teal' },
      { type: 'flash', site: 'pace-lv', t: s, tone: 'teal' },
      { type: 'travel', path: 'bv-r', t0: s + 0.01, t1: s + 0.08, tone: 'orange' },
      { type: 'travel', path: 'bv-l', t0: s + 0.01, t1: s + 0.08, tone: 'orange' },
    ];
  }
  if (site === 'his') {
    return [
      { type: 'flash', site: 'pace-his', t: s, tone: 'teal' },
      { type: 'travel', path: 'his-pace', t0: s, t1: s + 0.03, tone: 'teal' },
      ...ventricularDown(q + 0.02, 'blue').filter((p) => !(p.type === 'travel' && p.path === 'his')),
    ];
  }
  return [
    { type: 'flash', site: 'pace-v', t: s, tone: 'teal' },
    { type: 'travel', path: 'paced-l', t0: s + 0.01, t1: s + 0.17, tone: 'orange' },
  ];
}

/** Turns a script of atrial and ventricular events into a full rhythm definition. */
export function pacingRhythm(spec: PaceSpec): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];
  const parts: Array<(t: number) => number> = [...(spec.extra ?? [])];
  const site = spec.site ?? 'rv';

  for (const a of spec.atrial) {
    const p = a.kind === 'AP' ? a.t + ATRIAL_LAG : a.t;
    atrial.push({ t: p, kind: a.kind === 'AP' ? 'paced' : 'sinus', conducted: a.pr !== null, amp: 0.15 });
    if (a.kind === 'AP') {
      parts.push((t) => spike(t, a.t, 0.32));
      pulses.push(
        { type: 'flash', site: 'pace-a', t: a.t, tone: 'teal' },
        { type: 'travel', path: 'atria-pace', t0: p, t1: p + 0.07, tone: 'blue' },
      );
    } else {
      pulses.push(
        { type: 'flash', site: 'sa', t: p, tone: 'blue' },
        { type: 'travel', path: 'atria-sa', t0: p, t1: p + 0.08, tone: 'blue' },
      );
    }
    const reach = a.kind === 'AP' ? p + 0.07 : p + 0.08;
    if (a.pr !== null) {
      const q = p + a.pr;
      pulses.push({ type: 'travel', path: 'avn-direct', t0: reach, t1: q - 0.04, tone: a.pr > 0.2 ? 'orange' : 'blue' }, ...ventricularDown(q));
      beats.push({ t: q, wide: false, origin: a.kind === 'AP' ? 'paced' : 'sinus' });
    } else {
      pulses.push({ type: 'travel', path: 'avn-direct', t0: reach, t1: reach + 0.08, tone: 'red', stop: 0.3 });
    }
    const tone: Tone = a.kind === 'AP' ? 'teal' : a.pr !== null || a.tracked ? 'blue' : 'red';
    marks.push({ kind: 'dot', t: p + 0.05, tone });
    if (a.pr !== null) marks.push({ kind: 'bar', t0: p, t1: p + a.pr, tone: 'orange' });
  }

  for (const v of spec.vent) {
    if (v.kind === 'VS') {
      // Native QRS already created from its P wave above.
      continue;
    }
    parts.push((t) => spike(t, v.t, 0.6));
    if (v.kind === 'VE') {
      beats.push({ t: v.t, wide: true, origin: 'ventricular' });
      pulses.push(...ventricularFocusPulses(v.t, 'purple'));
      continue;
    }
    pulses.push(...ventPulses(v, site));
    if (v.kind === 'VP') {
      const q = paceBeatQ(v);
      beats.push(
        spec.narrow ? { t: q, wide: false, origin: 'paced' } : { t: q, wide: true, origin: 'paced', customQrs: true },
      );
      marks.push({ kind: 'seg', t0: v.t - 0.02, t1: q + (spec.narrow ? 0.12 : 0.2), tone: 'teal' });
    }
  }

  for (const m of spec.missing ?? []) marks.push({ kind: 'dot', t: m, tone: 'red' });
  if (!spec.noRrBars) marks.push(...rrBars(beats.map((b) => b.t).sort((a, b) => a - b), 'navy'));
  marks.push(...(spec.extraMarks ?? []));

  return assemble({
    id: spec.id,
    label: spec.label,
    description: spec.description,
    window: spec.window,
    beats,
    atrial,
    marks,
    pulses,
    extra: parts,
    qrs: spec.qrs ?? qrsLbbb,
  });
}

/** Atrial event shorthands. */
const as = (t: number, pr: number | null = 0.16, tracked = false): PAtrial => ({ kind: 'AS', t, pr, tracked });
const ap = (t: number, pr: number | null = 0.18): PAtrial => ({ kind: 'AP', t, pr });
const vp = (t: number): PVent => ({ kind: 'VP', t });

const tag = (t: number, text: string, tone: Tone = 'teal'): Mark => ({ kind: 'tag', t, text, tone });
const note = (t: number, text: string, tone: Tone = 'purple'): Mark => ({ kind: 'note', t, text, tone });

export type PaceMode = 'aai' | 'vvi' | 'voo' | 'vdd' | 'ddi';

export const PACE_MODE_OPTIONS: { id: string; label: string }[] = [
  { id: 'aai', label: 'AAI' },
  { id: 'vvi', label: 'VVI' },
  { id: 'voo', label: 'VOO' },
  { id: 'vdd', label: 'VDD' },
  { id: 'ddi', label: 'DDI' },
  { id: 'ddd', label: 'DDD' },
];

/** AAI: the atrium is paced when the sinus node is too slow, and pacing is inhibited whenever a P wave is sensed. */
export function aaiScript() {
  const atrial = [as(0.3), as(1.2), as(2.1), ap(3.1), ap(4.1), ap(5.1), as(5.9), as(6.8), as(7.7)];
  return { atrial, vent: [] as PVent[] };
}

/** Ventricular events of the VVI strip: a P wave is conducted or blocked, and the pacer fires 1.0 s after the last QRS. */
export function vviScript() {
  const atrial = [
    as(0.3), as(1.2), // conducted: the pacer sees QRS complexes and stays quiet
    as(2.1, null), as(3.0, null), as(3.9, null), // AV block: P waves are not conducted
    as(4.8), as(5.7), as(6.6), as(7.5), // conduction returns: native QRS inhibits the pacer
  ];
  const vent: PVent[] = [vp(2.36), vp(3.36), vp(4.36)];
  return { atrial, vent };
}

/** Result of one stimulus meeting the ventricles. */
export interface VentricularOutcome {
  t: number;
  kind: 'native' | 'paced';
  captured: boolean;
}

/** Walks native and paced stimuli in time order. A stimulus within REFRACTORY of the last activation does not activate. */
export function interplay(native: number[], spikes: number[]): VentricularOutcome[] {
  const events = [
    ...native.map((t) => ({ t, kind: 'native' as const })),
    ...spikes.map((t) => ({ t: t + VENT_LAG, kind: 'paced' as const })),
  ].sort((a, b) => a.t - b.t);
  let last = -Infinity;
  return events.map((e) => {
    const captured = e.t - last >= REFRACTORY;
    if (captured) last = e.t;
    return { ...e, captured };
  });
}

export const VOO_PERIOD = 0.7;
export const VOO_NATIVE_PP = 0.97;
export const VOO_MAGNET = 1.7;
export const vooSpikeTimes = (): number[] => Array.from({ length: 9 }, (_, k) => 1.9 + k * VOO_PERIOD).filter((s) => s < 7.7);
export const vooNativeP = (): number[] => Array.from({ length: 8 }, (_, k) => 0.3 + k * VOO_NATIVE_PP);

export function vooScript() {
  const ps = vooNativeP();
  const spikes = vooSpikeTimes();
  const outcome = interplay(ps.map((p) => p + 0.16), spikes);
  const atrial: PAtrial[] = [];
  const vent: PVent[] = [];
  for (const p of ps) {
    const o = outcome.find((x) => x.kind === 'native' && Math.abs(x.t - (p + 0.16)) < 1e-9)!;
    atrial.push(as(p, o.captured ? 0.16 : null));
  }
  for (const s of spikes) {
    const o = outcome.find((x) => x.kind === 'paced' && Math.abs(x.t - (s + VENT_LAG)) < 1e-9)!;
    vent.push({ kind: o.captured ? 'VP' : 'VPX', t: s });
  }
  return { atrial, vent, outcome };
}

/** VDD: P waves are tracked (with the sensed AV delay) when they come before the lower rate limit, and ignored inside the post-ventricular atrial blanking window. */
export function vddScript() {
  const sensed = [0.3, 1.1, 1.9, 4.7, 5.6, 6.4, 7.2];
  const ignored = [3.3];
  const atrial = [...sensed.map((p) => as(p, null, true)), ...ignored.map((p) => as(p, null))].sort((a, b) => a.t - b.t);
  const vent = [0.3, 1.1, 1.9, 4.7, 5.6, 6.4, 7.2].map((p) => vp(p + SENSED_AV)).concat([vp(3.07), vp(4.07)]);
  return { atrial, vent: vent.sort((a, b) => a.t - b.t) };
}

/** DDI: no tracking. Atrial activity that is sensed inhibits atrial pacing, but the ventricle is paced on the lower rate limit timer. */
export function ddiScript() {
  const atrial = [as(0.3, null), as(1.0, null), as(1.7, null), as(2.4, null), as(3.1, null), ap(4.7, null), ap(5.7, null), ap(6.7, null)];
  const vent = [0.9, 1.9, 2.9, 3.9, 4.9, 5.9, 6.9].map(vp);
  return { atrial, vent };
}

export function pacemakerRhythm(mode: PaceMode): RhythmDef {
  switch (mode) {
    case 'aai': {
      const { atrial, vent } = aaiScript();
      return pacingRhythm({
        id: 'pace-aai',
        label: 'AAI pacing',
        description: 'Schematic AAI pacemaker: sinus rhythm inhibits the device, then sinus arrest lets it pace the atrium at 60 per minute with a conducted narrow QRS, until the sinus node recovers.',
        window: 8.6,
        atrial,
        vent,
        extraMarks: [
          tag(3.1, 'AP'),
          note(2.7, 'sinus stops: wait 1.0 s', 'red'),
          note(6.2, 'sinus sensed: pacing inhibited', 'teal'),
        ],
      });
    }
    case 'vvi': {
      const { atrial, vent } = vviScript();
      return pacingRhythm({
        id: 'pace-vvi',
        label: 'VVI pacing',
        description: 'Schematic VVI pacemaker: native conducted beats keep the device quiet; when AV block starts, it paces the ventricle at 60 per minute with wide QRS complexes; when conduction returns, native beats inhibit it again.',
        window: 8.6,
        atrial,
        vent,
        extraMarks: [
          tag(2.36, 'VP'),
          note(3.4, 'P waves unrelated: AV dissociation', 'red'),
          note(6.4, 'native QRS inhibits the pacer', 'teal'),
        ],
      });
    }
    case 'voo': {
      const { atrial, vent } = vooScript();
      return pacingRhythm({
        id: 'pace-voo',
        label: 'VOO (asynchronous) pacing',
        description: 'Schematic VOO pacing, as with a magnet over the device: after the magnet is applied, spikes fire at a fixed rate whatever the native rhythm does, so some capture and some fall inside native QRS complexes or the refractory period and do nothing.',
        window: 8.2,
        atrial,
        vent,
        extraMarks: [
          { kind: 'tag', t: VOO_MAGNET, text: 'MAGNET', tone: 'red' },
          note(5.9, 'ignores native beats', 'purple'),
        ],
      });
    }
    case 'vdd': {
      const { atrial, vent } = vddScript();
      return pacingRhythm({
        id: 'pace-vdd',
        label: 'VDD pacing',
        description: 'Schematic VDD pacemaker in AV block: each sensed P wave triggers a ventricular spike 170 ms later; when the sinus rate falls below 60 per minute, the ventricle is paced at the lower rate and no P wave is tracked.',
        window: 8.2,
        atrial,
        vent,
        extraMarks: [
          tag(0.47, 'AS → VP'),
          note(3.2, 'sinus too slow: paced at 60', 'red'),
          note(6.0, 'P waves tracked again', 'teal'),
        ],
      });
    }
    case 'ddi': {
      const { atrial, vent } = ddiScript();
      return pacingRhythm({
        id: 'pace-ddi',
        label: 'DDI pacing',
        description: 'Schematic DDI pacemaker in AV block: while the sinus node is fast, P waves are sensed but not tracked and the ventricle is paced at 60 per minute independently; when the sinus node slows, the atrium is paced and the ventricle follows 200 ms later.',
        window: 7.8,
        atrial,
        vent,
        extraMarks: [
          note(2.0, 'P waves sensed, not tracked', 'red'),
          tag(4.7, 'AP → VP'),
        ],
      });
    }
  }
}

export type DddState = 'as-vp' | 'ap-vp' | 'ap-vs' | 'as-vs';

export const DDD_STATES: DddState[] = ['as-vp', 'ap-vp', 'ap-vs', 'as-vs'];

export function dddScript(state: DddState) {
  const atrial: PAtrial[] = [];
  const vent: PVent[] = [];
  if (state === 'as-vp') {
    for (let k = 0; k < 5; k++) {
      const p = 0.3 + k * 0.85;
      atrial.push(as(p, null, true));
      vent.push(vp(p + SENSED_AV));
    }
  } else if (state === 'ap-vp') {
    for (let k = 0; k < 5; k++) {
      const s = 0.35 + k * LRL;
      atrial.push(ap(s, null));
      vent.push(vp(s + PACED_AV));
    }
  } else if (state === 'ap-vs') {
    for (let k = 0; k < 5; k++) atrial.push(ap(0.35 + k * LRL, 0.16));
  } else {
    for (let k = 0; k < 5; k++) atrial.push(as(0.3 + k * 0.85, 0.16));
  }
  return { atrial, vent };
}

const DDD_LABEL: Record<DddState, string> = {
  'as-vp': 'DDD: atrial sensed, ventricular paced',
  'ap-vp': 'DDD: atrial paced, ventricular paced',
  'ap-vs': 'DDD: atrial paced, ventricular sensed',
  'as-vs': 'DDD: atrial sensed, ventricular sensed',
};

export function dddRhythm(state: DddState): RhythmDef {
  const { atrial, vent } = dddScript(state);
  const last = atrial[atrial.length - 1].t;
  const extra: Record<DddState, Mark[]> = {
    'as-vp': [tag(0.47, 'AS → VP'), note(2.7, 'tracks each P wave', 'teal')],
    'ap-vp': [tag(0.35, 'AP → VP'), note(2.9, 'AV delay 200 ms', 'teal')],
    'ap-vs': [tag(0.35, 'AP → VS'), note(2.9, 'native QRS inhibits the ventricular output', 'teal')],
    'as-vs': [note(2.9, 'no spikes: device fully inhibited', 'teal')],
  };
  return pacingRhythm({
    id: `pace-ddd-${state}`,
    label: DDD_LABEL[state],
    description: `Schematic DDD pacemaker, ${DDD_LABEL[state].slice(5)}: ${
      state === 'as-vp'
        ? 'in AV block each sensed sinus P wave triggers a ventricular spike after a sensed AV delay of 170 ms.'
        : state === 'ap-vp'
          ? 'the sinus node is slow, so the atrium is paced at 60 per minute and the ventricle is paced 200 ms later.'
          : state === 'ap-vs'
            ? 'the atrium is paced, and the conducted native QRS arrives before the AV delay ends, so the ventricular spike is inhibited.'
            : 'the sinus node and AV conduction both work, so the device is inhibited and no spikes appear.'
    }`,
    window: Math.max(5.4, last + 1.1),
    atrial,
    vent,
    extraMarks: extra[state],
  });
}

export type PhysioKind = 'rv' | 'biv' | 'csp';

export const PHYSIO_OPTIONS: { id: PhysioKind; label: string }[] = [
  { id: 'rv', label: 'RV apical pacing' },
  { id: 'biv', label: 'Biventricular (CRT)' },
  { id: 'csp', label: 'Conduction-system pacing' },
];

export const PHYSIO_WINDOW = 6.2;

/** QRS shapes and widths (seconds) of the three ways of pacing the ventricle, each triggered by the P wave in AV block. */
export const physioQrs = {
  // Muscle-to-muscle spread from the apex: the LBBB-like complex, stretched by 20%.
  rv: { fn: (t: number, q: number) => qrsLbbb(q + (t - q) / 1.2, q), width: 0.17 },
  biv: { fn: (t: number, q: number) => qrsBroad(t, q, 1.35, 0.95), width: 0.12 },
  csp: { fn: (t: number, q: number) => qrsBroad(t, q, 1.1, 1), width: 0.1 },
} as const;

export function physioRhythm(kind: PhysioKind): RhythmDef {
  const atrial: PAtrial[] = [];
  const vent: PVent[] = [];
  for (let k = 0; k < 6; k++) {
    const p = 0.3 + k * 0.85;
    atrial.push(as(p, null, true));
    vent.push(vp(p + SENSED_AV));
  }
  const labels: Record<PhysioKind, string> = {
    rv: 'Right ventricular apical pacing',
    biv: 'Biventricular pacing (CRT)',
    csp: 'Conduction-system pacing',
  };
  const descriptions: Record<PhysioKind, string> = {
    rv: 'Schematic right ventricular apical pacing: each sensed P wave triggers a spike, the impulse spreads slowly through muscle from the apex, and the QRS is wide (about 170 ms) with a left bundle branch block pattern.',
    biv: 'Schematic biventricular pacing: both ventricles are paced together, the two wavefronts meet in the middle, and the QRS is narrower (about 120 ms) than with right ventricular pacing alone.',
    csp: 'Schematic conduction-system pacing: the lead is placed at the His bundle or left bundle branch area, so the impulse uses the normal fast pathway and the QRS is narrow, close to native.',
  };
  return pacingRhythm({
    id: `pace-physio-${kind}`,
    label: labels[kind],
    description: descriptions[kind],
    window: PHYSIO_WINDOW,
    atrial,
    vent,
    site: kind === 'rv' ? 'rv' : kind === 'biv' ? 'biv' : 'his',
    qrs: physioQrs[kind].fn,
    narrow: kind === 'csp',
    extraMarks: [
      tag(0.47, kind === 'rv' ? 'RV' : kind === 'biv' ? 'BiV' : 'CSP'),
      { kind: 'bar', t0: 1.32 + 0.0, t1: 1.32 + physioQrs[kind].width, tone: 'teal' },
      note(3.9, `QRS about ${Math.round(physioQrs[kind].width * 1000)} ms`, 'teal'),
    ],
  });
}

export type FaultKind = 'capture' | 'undersensing' | 'oversensing' | 'output';

export const FAULT_OPTIONS: { id: FaultKind; label: string }[] = [
  { id: 'capture', label: 'Failure to capture' },
  { id: 'undersensing', label: 'Undersensing' },
  { id: 'oversensing', label: 'Oversensing' },
  { id: 'output', label: 'Failure to output' },
];

export const FAULT_WINDOW = 8.4;
/** Failure to capture: spike times and whether each one captures. */
export const CAPTURE_SPIKES: { t: number; ok: boolean }[] = [
  { t: 0.5, ok: true }, { t: 1.5, ok: true }, { t: 2.5, ok: false }, { t: 3.5, ok: false },
  { t: 4.5, ok: true }, { t: 5.5, ok: true }, { t: 6.5, ok: false }, { t: 7.5, ok: true },
];
/** Undersensing: native beats that the pacemaker fails to see, and the spikes it delivers anyway every 1.0 s. */
export const UNDERSENSE_PP = 0.9;
export const UNDERSENSE_SPIKES = [1.35, 2.35, 3.35, 4.35, 5.35, 6.35, 7.35];
/** Oversensing: regular pacing, two episodes of noise sensed as a heartbeat, which inhibit the next spike. */
export const OVERSENSE_NOISE = [2.2, 6.0];
export const OVERSENSE_SPIKES = [0.4, 1.4, 3.2, 4.2, 5.2, 7.0, 8.0];
/** Failure to output: spikes that should appear every 1.0 s, with a stretch of silence and slow escape beats. */
export const OUTPUT_SPIKES = [0.5, 1.5, 2.5, 7.0, 8.0];
export const OUTPUT_MISSING = [3.5, 4.5, 5.5, 6.5];
export const OUTPUT_ESCAPES = [5.0];

function pWaves(first: number, pp: number, until: number): PAtrial[] {
  const out: PAtrial[] = [];
  for (let p = first; p < until; p += pp) out.push(as(p, null));
  return out;
}

export function faultRhythm(kind: FaultKind): RhythmDef {
  switch (kind) {
    case 'capture': {
      const vent: PVent[] = CAPTURE_SPIKES.map((s) => ({ kind: s.ok ? 'VP' : 'VPX', t: s.t }));
      return pacingRhythm({
        id: 'fault-capture',
        label: 'Failure to capture',
        description: 'Schematic failure to capture: pacing spikes are delivered on time at 60 per minute, but some are not followed by a QRS complex, so the ventricular rate falls and pauses appear.',
        window: FAULT_WINDOW,
        atrial: pWaves(0.15, 0.85, 8.0),
        vent,
        extraMarks: [
          { kind: 'tag', t: 2.5, text: 'NO CAPTURE', tone: 'red' },
          note(3.0, 'spike, no QRS', 'red'),
        ],
      });
    }
    case 'undersensing': {
      const ps = Array.from({ length: 8 }, (_, k) => 0.2 + k * UNDERSENSE_PP);
      const spikes = UNDERSENSE_SPIKES;
      const out = interplay(ps.map((p) => p + 0.16), spikes);
      const atrial = ps.map((p) => {
        const o = out.find((x) => x.kind === 'native' && Math.abs(x.t - (p + 0.16)) < 1e-9)!;
        return as(p, o.captured ? 0.16 : null);
      });
      const vent: PVent[] = spikes.map((s) => {
        const o = out.find((x) => x.kind === 'paced' && Math.abs(x.t - (s + VENT_LAG)) < 1e-9)!;
        return { kind: o.captured ? 'VP' : 'VPX', t: s };
      });
      return pacingRhythm({
        id: 'fault-undersensing',
        label: 'Undersensing',
        description: 'Schematic undersensing: the pacemaker does not see the native QRS complexes, so it keeps firing at 60 per minute on its own timer, producing spikes that fall after native beats or on the T wave, some capturing and some not.',
        window: FAULT_WINDOW,
        atrial,
        vent,
        extraMarks: [
          { kind: 'tag', t: 1.35, text: 'UNSENSED', tone: 'red' },
          note(4.9, 'spikes ignore native beats', 'red'),
        ],
      });
    }
    case 'oversensing': {
      const vent: PVent[] = OVERSENSE_SPIKES.map(vp);
      return pacingRhythm({
        id: 'fault-oversensing',
        label: 'Oversensing',
        description: 'Schematic oversensing: muscle noise is mistaken for a heartbeat, so the pacemaker is inhibited and the next spike is delayed, producing pauses of nearly 2 seconds.',
        window: FAULT_WINDOW,
        atrial: pWaves(0.15, 0.85, 8.0),
        vent,
        extra: OVERSENSE_NOISE.map((t0) => (t: number) => noiseBurst(t, t0)),
        extraMarks: [
          { kind: 'tag', t: OVERSENSE_NOISE[0], text: 'NOISE', tone: 'red' },
          note(3.55, 'sensed as a beat: spike withheld', 'red'),
        ],
        missing: [2.4, 6.2],
      });
    }
    case 'output': {
      const vent: PVent[] = [...OUTPUT_SPIKES.map(vp), ...OUTPUT_ESCAPES.map((t): PVent => ({ kind: 'VE', t }))];
      return pacingRhythm({
        id: 'fault-output',
        label: 'Failure to output',
        description: 'Schematic failure to output: pacing spikes stop although the pacemaker should be firing every second, leaving a long pause with only a slow ventricular escape beat, before output returns.',
        window: FAULT_WINDOW + 0.8,
        atrial: pWaves(0.15, 0.85, 8.6),
        vent,
        missing: OUTPUT_MISSING,
        extraMarks: [
          { kind: 'tag', t: 3.5, text: 'NO SPIKES', tone: 'red' },
          note(4.3, 'expected spikes missing', 'red'),
          { kind: 'tag', t: OUTPUT_ESCAPES[0] + 0.05, text: 'ESCAPE', tone: 'purple' },
        ],
      });
    }
  }
}
