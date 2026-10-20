import { qrsLbbb, qrsRbbb, qrsRs } from '../engine/morphology';
import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, sinusBeat } from './helpers';

export const BUNDLE_PP = 0.85;
export const BUNDLE_PR = 0.16;
export const BUNDLE_WINDOW = 6.4;
export const LONG_PR = 0.28;
const FIRST_P = 0.3;
const BEAT_COUNT = 6;

const pTimes = (): number[] => Array.from({ length: BEAT_COUNT }, (_, k) => FIRST_P + k * BUNDLE_PP);

/** Down both bundles: the normal route, ending 70 ms after QRS onset. */
function conducted(p: number, pr: number, opts: { slowTone?: boolean } = {}) {
  return sinusBeat(p, pr, opts.slowTone ? { tone: 'orange' } : {});
}

/** One beat with the left (or right) bundle blocked. The other bundle conducts, and the blocked side is activated late through muscle. */
function bundleBeat(p: number, side: 'left' | 'right') {
  const b = sinusBeat(p, BUNDLE_PR);
  const q = b.beat.t;
  const pulses: Pulse[] = b.pulses.filter((x) => !(x.type === 'travel' && (x.path === 'bb-left' || x.path === 'bb-right')));
  const open = side === 'left' ? 'bb-right' : 'bb-left';
  const shut = side === 'left' ? 'bb-left' : 'bb-right';
  pulses.push(
    { type: 'travel', path: open, t0: q, t1: q + 0.07, tone: 'blue' },
    { type: 'travel', path: shut, t0: q, t1: q + 0.07, tone: 'red', stop: 0.35 },
    { type: 'travel', path: side === 'left' ? 'cross-l' : 'cross-r', t0: q + 0.05, t1: q + 0.17, tone: 'orange' },
  );
  return { ...b, pulses, beat: { ...b.beat, wide: true, customQrs: true } as BeatEvent };
}

export type BundleKind = 'normal' | 'lbbb' | 'rbbb';

export function bundleRhythm(kind: BundleKind): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];
  for (const p of pTimes()) {
    const b = kind === 'normal' ? conducted(p, BUNDLE_PR) : bundleBeat(p, kind === 'lbbb' ? 'left' : 'right');
    beats.push(b.beat);
    atrial.push(b.atrial);
    pulses.push(...b.pulses);
    marks.push(...b.marks);
  }
  const q1 = beats[1].t;
  if (kind === 'normal') {
    marks.push({ kind: 'tag', t: q1 + 0.02, text: 'QRS 90 ms', tone: 'blue' });
    marks.push({ kind: 'bar', t0: q1, t1: q1 + 0.09, tone: 'blue' });
  } else {
    marks.push({ kind: 'bar', t0: q1, t1: q1 + 0.15, tone: 'red' });
    marks.push({ kind: 'bar', t0: beats[3].t, t1: beats[3].t + 0.15, tone: 'red' });
    marks.push({ kind: 'tag', t: q1 + 0.05, text: kind === 'lbbb' ? 'LBBB · V6' : 'RBBB · V1', tone: 'red' });
    marks.push({
      kind: 'note',
      t: beats[3].t + 0.3,
      text: kind === 'lbbb' ? 'QRS 150 ms, notched R, no q' : "QRS 150 ms, rSR′",
      tone: 'purple',
    });
  }
  return assemble({
    id: `bundle-${kind}`,
    label: kind === 'normal' ? 'Normal conduction' : kind === 'lbbb' ? 'Left bundle branch block' : 'Right bundle branch block',
    description:
      kind === 'normal'
        ? 'Schematic sinus rhythm with normal intraventricular conduction: both bundles conduct together and the QRS is narrow, about 90 ms.'
        : kind === 'lbbb'
          ? 'Schematic left bundle branch block as seen in lead V6: sinus rhythm with a wide QRS of about 150 ms, a broad notched R wave without a q wave, and a T wave pointing the opposite way.'
          : 'Schematic right bundle branch block as seen in lead V1: sinus rhythm with a wide QRS of about 150 ms, an rSR prime pattern, and an inverted T wave.',
    window: BUNDLE_WINDOW,
    beats,
    atrial,
    marks,
    pulses,
    qrs: kind === 'lbbb' ? qrsLbbb : kind === 'rbbb' ? qrsRbbb : undefined,
  });
}

export type FascicularKind = 'normal-ii' | 'normal-i' | 'lafb' | 'lpfb' | 'bifascicular' | 'bifascicular-pr';

interface Blocks {
  ant?: boolean;
  post?: boolean;
  right?: boolean;
  slowPost?: boolean;
}

/** Fascicular conduction pulses for one beat. Blocked fascicles stop red; the other fascicle spreads through muscle to cover them. */
export function fascicularDown(q: number, b: Blocks): Pulse[] {
  const out: Pulse[] = [
    { type: 'travel', path: 'his', t0: q - 0.04, t1: q, tone: 'blue' },
    { type: 'travel', path: 'lbb-trunk', t0: q, t1: q + 0.025, tone: 'blue' },
  ];
  out.push(
    b.ant
      ? { type: 'travel', path: 'fasc-ant', t0: q + 0.025, t1: q + 0.07, tone: 'red', stop: 0.4 }
      : { type: 'travel', path: 'fasc-ant', t0: q + 0.025, t1: q + 0.07, tone: 'blue' },
    b.post
      ? { type: 'travel', path: 'fasc-post', t0: q + 0.025, t1: q + 0.07, tone: 'red', stop: 0.4 }
      : { type: 'travel', path: 'fasc-post', t0: q + 0.025, t1: q + 0.07, tone: b.slowPost ? 'orange' : 'blue' },
  );
  if (b.ant) out.push({ type: 'travel', path: 'fasc-link', t0: q + 0.07, t1: q + 0.14, tone: 'orange' });
  if (b.post) out.push({ type: 'travel', path: 'fasc-link', t0: q + 0.07, t1: q + 0.14, tone: 'orange', reverse: true });
  if (b.right) {
    out.push(
      { type: 'travel', path: 'bb-right', t0: q, t1: q + 0.07, tone: 'red', stop: 0.35 },
      { type: 'travel', path: 'cross-r', t0: q + 0.06, t1: q + 0.17, tone: 'orange' },
    );
  } else {
    out.push({ type: 'travel', path: 'bb-right', t0: q, t1: q + 0.07, tone: 'blue' });
  }
  return out;
}

const FASC_DESCRIPTION: Record<FascicularKind, string> = {
  'normal-ii': 'Schematic sinus rhythm in lead II with normal conduction: upright QRS of about 90 ms.',
  'normal-i': 'Schematic sinus rhythm in lead I with normal conduction: upright QRS of about 90 ms.',
  lafb: 'Schematic left anterior fascicular block in lead II: the QRS stays narrow, but its main deflection is now a deep S wave (rS pattern), reflecting left axis deviation.',
  lpfb: 'Schematic left posterior fascicular block in lead I: the QRS stays narrow, but its main deflection is now a deep S wave (rS pattern), reflecting right axis deviation.',
  bifascicular: 'Schematic bifascicular block (right bundle branch block plus left anterior fascicular block) in lead V1: sinus rhythm with a wide QRS and an rSR prime pattern.',
  'bifascicular-pr': 'Schematic bifascicular block with a prolonged PR interval of 280 ms, in lead V1: wide QRS with an rSR prime pattern, and slowed conduction through the remaining pathway.',
};

export function fascicularRhythm(kind: FascicularKind): RhythmDef {
  const beats: BeatEvent[] = [];
  const atrial: AtrialEvent[] = [];
  const pulses: Pulse[] = [];
  const marks: Mark[] = [];
  const bifasc = kind === 'bifascicular' || kind === 'bifascicular-pr';
  const pr = kind === 'bifascicular-pr' ? LONG_PR : BUNDLE_PR;
  const blocks: Blocks =
    kind === 'lafb' ? { ant: true } : kind === 'lpfb' ? { post: true } : bifasc ? { ant: true, right: true, slowPost: kind === 'bifascicular-pr' } : {};

  for (const p of pTimes()) {
    const b = sinusBeat(p, pr, kind === 'bifascicular-pr' ? { tone: 'orange' } : {});
    const q = b.beat.t;
    const keep = b.pulses.filter((x) => !(x.type === 'travel' && ['his', 'bb-left', 'bb-right'].includes(x.path)));
    pulses.push(...keep, ...fascicularDown(q, blocks));
    beats.push(bifasc ? { ...b.beat, wide: true, customQrs: true } : b.beat);
    atrial.push(b.atrial);
    marks.push(...b.marks);
  }

  const q1 = beats[1].t;
  switch (kind) {
    case 'normal-ii':
    case 'normal-i':
      marks.push({ kind: 'tag', t: q1 + 0.02, text: kind === 'normal-ii' ? 'LEAD II' : 'LEAD I', tone: 'blue' });
      marks.push({ kind: 'note', t: beats[3].t + 0.35, text: 'QRS mostly upright', tone: 'purple' });
      break;
    case 'lafb':
    case 'lpfb':
      marks.push({ kind: 'tag', t: q1 + 0.02, text: kind === 'lafb' ? 'LAFB · II' : 'LPFB · I', tone: 'red' });
      marks.push({ kind: 'note', t: beats[3].t + 0.35, text: 'rS: QRS still under 120 ms', tone: 'purple' });
      break;
    default:
      marks.push({ kind: 'bar', t0: q1, t1: q1 + 0.15, tone: 'red' });
      marks.push({ kind: 'tag', t: q1 + 0.05, text: 'RBBB + LAFB · V1', tone: 'red' });
      marks.push({
        kind: 'note',
        t: beats[3].t + 0.3,
        text: kind === 'bifascicular' ? "rSR′ + left axis" : 'PR 280 ms: watch for block',
        tone: 'purple',
      });
  }

  return assemble({
    id: `fascicular-${kind}`,
    label:
      kind === 'normal-ii' || kind === 'normal-i'
        ? 'Normal conduction'
        : kind === 'lafb'
          ? 'Left anterior fascicular block'
          : kind === 'lpfb'
            ? 'Left posterior fascicular block'
            : kind === 'bifascicular'
              ? 'Bifascicular block'
              : 'Bifascicular block with long PR',
    description: FASC_DESCRIPTION[kind],
    window: BUNDLE_WINDOW,
    beats,
    atrial,
    marks,
    pulses,
    qrs: kind === 'lafb' || kind === 'lpfb' ? (t, q) => qrsRs(t, q) : bifasc ? qrsRbbb : undefined,
  });
}
