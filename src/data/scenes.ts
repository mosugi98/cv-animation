export type Accent = 'navy' | 'orange' | 'blue' | 'red' | 'purple';
export type Kind = 'hook' | 'lesson' | 'recap' | 'end';
export type PillId = 'first' | 'mobitz1' | 'mobitz2' | 'complete';
export type RhythmId = 'sinus' | 'first' | 'mobitz1' | 'mobitz2' | 'complete';
export type BlockSite = 'none' | 'av-node' | 'infra-nodal' | 'both';
export type Focus = 'none' | 'pr' | 'dropped' | 'escape';

export interface Scene {
  id: string;
  start: number;
  end: number;
  kind: Kind;
  activePills: PillId[];
  rhythm: RhythmId | null;
  block: BlockSite;
  focus: Focus;
  title: string;
  sub: string;
  accent: Accent;
  note?: string;
  noteSub?: string;
}

export const DURATION = 33;

export const PILLS: { id: PillId; label: string; accent: Accent }[] = [
  { id: 'first', label: '1 · 1st degree', accent: 'orange' },
  { id: 'mobitz1', label: '2 · Mobitz I', accent: 'orange' },
  { id: 'mobitz2', label: '3 · Mobitz II', accent: 'red' },
  { id: 'complete', label: '4 · Complete', accent: 'purple' },
];

const ALL: PillId[] = ['first', 'mobitz1', 'mobitz2', 'complete'];

export const SCENES: Scene[] = [
  {
    id: 'hook', start: 0, end: 3, kind: 'hook', activePills: [], rhythm: 'sinus',
    block: 'none', focus: 'none', accent: 'red',
    title: 'Every P wave knocks.', sub: 'Not every one gets in.',
    note: 'Watch where the gate fails.', noteSub: 'Four degrees of AV block, one gate.',
  },
  {
    id: 'first-a', start: 3, end: 6, kind: 'lesson', activePills: ['first'], rhythm: 'first',
    block: 'none', focus: 'none', accent: 'orange',
    title: 'Each P wave reaches the AV gate.', sub: '1st degree: the gate opens slowly.',
  },
  {
    id: 'first-b', start: 6, end: 9, kind: 'lesson', activePills: ['first'], rhythm: 'first',
    block: 'none', focus: 'pr', accent: 'blue',
    title: 'The PR is long, but every P gets a QRS.', sub: 'Slow, yet nothing is dropped.',
  },
  {
    id: 'mob1-a', start: 9, end: 12, kind: 'lesson', activePills: ['mobitz1'], rhythm: 'mobitz1',
    block: 'none', focus: 'pr', accent: 'orange',
    title: 'Mobitz I: the delay keeps growing.', sub: 'Longer PR, beat after beat.',
  },
  {
    id: 'mob1-b', start: 12, end: 15, kind: 'lesson', activePills: ['mobitz1'], rhythm: 'mobitz1',
    block: 'av-node', focus: 'dropped', accent: 'red',
    title: 'Then one P is not conducted.', sub: 'The cycle resets. Usually the block is in the AV node.',
  },
  {
    id: 'mob2-a', start: 15, end: 18, kind: 'lesson', activePills: ['mobitz2'], rhythm: 'mobitz2',
    block: 'none', focus: 'pr', accent: 'blue',
    title: 'Mobitz II: the PR stays the same.', sub: 'No warning before the drop.',
  },
  {
    id: 'mob2-b', start: 18, end: 21, kind: 'lesson', activePills: ['mobitz2'], rhythm: 'mobitz2',
    block: 'infra-nodal', focus: 'dropped', accent: 'red',
    title: 'Then one P suddenly fails to conduct.', sub: 'Usually lower: below the AV node.',
  },
  {
    id: 'comp-a', start: 21, end: 24, kind: 'lesson', activePills: ['complete'], rhythm: 'complete',
    block: 'both', focus: 'dropped', accent: 'red',
    title: 'Complete block: no P gets through.', sub: 'The P waves keep marching on.',
  },
  {
    id: 'comp-b', start: 24, end: 27, kind: 'lesson', activePills: ['complete'], rhythm: 'complete',
    block: 'both', focus: 'escape', accent: 'purple',
    title: 'The ventricles beat on their own.', sub: 'Escape rhythm: slower, and unrelated to the P waves.',
  },
  {
    id: 'recap', start: 27, end: 30, kind: 'recap', activePills: ALL, rhythm: null,
    block: 'none', focus: 'none', accent: 'red',
    title: 'Read the PR first.', sub: 'Then find the P that never gets in.',
  },
  {
    id: 'end', start: 30, end: 33, kind: 'end', activePills: [], rhythm: null,
    block: 'none', focus: 'none', accent: 'blue',
    title: 'Save this for your next strip.', sub: 'Share it with someone learning to read ECGs.',
  },
];
