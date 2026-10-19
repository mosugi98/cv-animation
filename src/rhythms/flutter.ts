import { flutterSaw } from '../engine/morphology';
import type { AtrialEvent, BeatEvent, Mark, Pulse, RhythmDef } from '../engine/types';
import { assemble, rrBars, ventricularDown } from './helpers';

export type FlutterPattern = '2:1' | '4:1' | 'variable';

export const FLUTTER_PATTERNS: { id: FlutterPattern; label: string }[] = [
  { id: '2:1', label: '2:1' },
  { id: '4:1', label: '4:1' },
  { id: 'variable', label: 'Variable' },
];

/** Flutter cycle length: 300 flutter waves per minute. */
export const FLUTTER_CYCLE = 0.2;
/** Flutter wave onset to QRS onset for a conducted wave. */
export const FLUTTER_TO_QRS = 0.14;
const FIRST = 0.05;
const WINDOW = 5;

/** Number of flutter waves per conducted QRS, repeated. */
export const RATIOS: Record<FlutterPattern, number[]> = {
  '2:1': [2],
  '4:1': [4],
  variable: [2, 4, 2, 2, 4, 2, 4],
};

export function flutterRhythm(pattern: FlutterPattern = '2:1'): RhythmDef {
  const ratios = RATIOS[pattern];
  const waveCount = Math.floor((WINDOW - FIRST) / FLUTTER_CYCLE);
  const f = (k: number) => FIRST + k * FLUTTER_CYCLE;

  // Which flutter waves get through the AV node.
  const conducted = new Set<number>();
  let idx = 2;
  let n = 0;
  while (f(idx) + FLUTTER_TO_QRS + 0.4 < WINDOW) {
    conducted.add(idx);
    idx += ratios[n % ratios.length];
    n++;
  }

  const atrial: AtrialEvent[] = [];
  const beats: BeatEvent[] = [];
  const pulses: Pulse[] = [
    { type: 'loop', path: 'flutter-loop', t0: 0, t1: WINDOW, period: FLUTTER_CYCLE, tone: 'blue' },
  ];
  const marks: Mark[] = [];

  for (let k = 0; k < waveCount; k++) {
    const t = f(k);
    const isConducted = conducted.has(k);
    atrial.push({ t, kind: 'flutter', conducted: isConducted, amp: 0.17 });
    marks.push({ kind: 'dot', t, tone: isConducted ? 'orange' : 'blue' });
    if (isConducted) {
      const q = t + FLUTTER_TO_QRS;
      beats.push({ t: q, wide: false, origin: 'conducted' });
      pulses.push({ type: 'travel', path: 'avn-direct', t0: t + 0.02, t1: q - 0.04, tone: 'blue' }, ...ventricularDown(q));
    } else {
      pulses.push({ type: 'travel', path: 'avn-direct', t0: t + 0.02, t1: t + 0.1, tone: 'red', stop: 0.3 });
    }
  }

  const qs = beats.map((b) => b.t);
  marks.push(...rrBars(qs, 'navy'));
  marks.push({ kind: 'tag', t: qs[1] + 0.05, text: pattern === 'variable' ? 'VARIABLE' : pattern, tone: 'red' });

  const ids: Record<FlutterPattern, string> = { '2:1': 'flutter-2to1', '4:1': 'flutter-4to1', variable: 'flutter-variable' };
  return assemble({
    id: ids[pattern],
    label: `Atrial flutter, ${pattern === 'variable' ? 'variable' : pattern} conduction`,
    description:
      'Schematic atrial flutter: continuous sawtooth flutter waves at about 300 per minute from a circuit in the atria, with the AV node conducting only some of them.',
    window: WINDOW,
    beats,
    atrial,
    marks,
    pulses,
    extra: [(t) => flutterSaw(t, FIRST, FLUTTER_CYCLE)],
    drawAtrial: false,
    isoelectric: false,
  });
}
