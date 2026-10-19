import type { Accent, BlockSite, RhythmId } from './scenes';

export interface Beat {
  /** P wave onset, seconds. */
  pOnset: number;
  /** PR interval (P onset to QRS onset) in seconds; null = P not conducted. */
  pr: number | null;
}

export interface Rhythm {
  id: RhythmId;
  label: string;
  description: string;
  /** Length of the strip window in seconds. */
  window: number;
  beats: Beat[];
  /** Onset times of independent (escape) ventricular beats. */
  escapes: number[];
  /** Where a non-conducted impulse stops, for the schematic. */
  dropSite: BlockSite;
  tag: { time: number; text: string; accent: Accent } | null;
}

const P_ONSETS = [0.5, 1.5, 2.5, 3.5, 4.5];
const beats = (prs: (number | null)[]): Beat[] => prs.map((pr, i) => ({ pOnset: P_ONSETS[i], pr }));

export const RHYTHMS: Record<RhythmId, Rhythm> = {
  sinus: {
    id: 'sinus', label: 'Normal sinus rhythm',
    description: 'Every P wave is followed by a QRS with a normal PR interval.',
    window: 6, beats: beats([0.16, 0.16, 0.16, 0.16, 0.16]), escapes: [], dropSite: 'none', tag: null,
  },
  first: {
    id: 'first', label: '1st degree AV block',
    description: 'Every P wave is followed by a QRS, with a long constant PR interval.',
    window: 6, beats: beats([0.32, 0.32, 0.32, 0.32, 0.32]), escapes: [], dropSite: 'none', tag: null,
  },
  mobitz1: {
    id: 'mobitz1', label: 'Mobitz I (Wenckebach)',
    description: 'The PR interval lengthens beat by beat until one P wave is not conducted, then resets.',
    window: 6, beats: beats([0.16, 0.26, 0.32, null, 0.16]), escapes: [], dropSite: 'av-node',
    tag: { time: 3.55, text: 'MOBITZ I', accent: 'orange' },
  },
  mobitz2: {
    id: 'mobitz2', label: 'Mobitz II',
    description: 'The PR interval stays constant, then one P wave is suddenly not conducted.',
    window: 6, beats: beats([0.16, 0.16, 0.16, null, 0.16]), escapes: [], dropSite: 'infra-nodal',
    tag: { time: 3.55, text: 'MOBITZ II', accent: 'red' },
  },
  complete: {
    id: 'complete', label: 'Complete (3rd degree) AV block',
    description: 'P waves march at their own rate and no P wave conducts. A slower escape rhythm drives the ventricles.',
    window: 6, beats: beats([null, null, null, null, null]), escapes: [1.3, 3.1, 4.9], dropSite: 'av-node',
    tag: { time: 3.0, text: 'COMPLETE', accent: 'purple' },
  },
};

export const conductedPRs = (r: Rhythm): number[] =>
  r.beats.flatMap((b) => (b.pr === null ? [] : [b.pr]));

export const droppedCount = (r: Rhythm): number => r.beats.filter((b) => b.pr === null).length;
