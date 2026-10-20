import { AV_WINDOW, avBlockRhythm, type AvBlockKind } from '../rhythms/avblock';
import { secs, sequence } from './sequence';
import type { Lesson, LessonBuild, LegendItem } from './types';

const W = AV_WINDOW;

const nodeLegend: LegendItem[] = [
  { tone: 'blue', text: 'Normal conduction' },
  { tone: 'orange', text: 'Slowed conduction (long PR)' },
  { tone: 'red', text: 'Blocked impulse' },
];

/* ---------- First-degree AV block ---------- */

function buildFirst(): LessonBuild {
  const key = 'av-first';
  return {
    rhythms: { [key]: avBlockRhythm('first') },
    scenes: sequence([
      {
        id: 'conducts', dur: 5, chip: '1 · Every P conducts', rhythm: key, span: secs(W, 0, 1.6), accent: 'blue',
        title: 'Every P wave is followed by a QRS.',
        sub: 'Nothing is dropped: the conduction ratio is 1:1.',
      },
      {
        id: 'measure', dur: 6, chip: '2 · Measure the PR', rhythm: key, span: secs(W, 0.2, 1.7), accent: 'orange',
        title: 'The PR interval is 340 ms.',
        sub: 'From the start of the P wave to the start of the QRS. Normal is 120–200 ms.',
      },
      {
        id: 'delay', dur: 6, chip: '3 · The AV node is slow', rhythm: key, span: secs(W, 1.0, 2.7), accent: 'orange',
        title: 'The impulse crawls through the AV node.',
        sub: 'It arrives, but late. The delay is usually in the AV node itself.',
      },
      {
        id: 'constant', dur: 6, chip: '4 · Constant', rhythm: key, span: secs(W, 2.6, 5.0), accent: 'navy',
        title: 'The PR is the same on every beat.',
        sub: 'A fixed, long delay. No beat is ever dropped.',
      },
      {
        id: 'meaning', dur: 5, chip: '5 · A delay, not a block', rhythm: key, span: secs(W, 4.8, 7.4), accent: 'blue',
        title: 'Every impulse still reaches the ventricles.',
        sub: 'It is a conduction delay, so it is usually harmless on its own.',
      },
      {
        id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
        title: 'A long, constant PR and no dropped beats.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: 'Recognising first-degree AV block',
      rows: [
        { label: 'PR interval', value: 'Longer than 200 ms and constant (340 ms here)' },
        { label: 'Conduction', value: '1:1. Every P wave is followed by a QRS, none is dropped' },
        { label: 'QRS', value: 'Usually narrow: the delay is in the AV node. A wide QRS suggests disease lower down' },
        { label: 'Causes', value: 'High vagal tone and athletes, inferior MI, ageing fibrosis, myocarditis (including Lyme carditis), drugs: beta-blockers, diltiazem, verapamil, digoxin, amiodarone' },
        { label: 'Management', value: 'Usually none. Review slowing drugs. Be careful when adding more AV-nodal blockers. Marked PR (above 300 ms) can cause symptoms because the atria contract against closed valves' },
      ],
      keyline: 'PR longer than 200 ms, the same on every beat, and every P wave conducts.',
      pitfall:
        'With a very long PR the P wave can sit on the previous T wave and look like a junctional rhythm. March out the P waves to find them.',
    },
  };
}

export const avFirstLesson: Lesson = {
  id: 'av1',
  title: 'First-degree AV block: the slow but certain conduction',
  short: 'First-degree AV block',
  blurb: 'Every impulse gets through, but late. The PR interval is long and fixed.',
  rate: 'PR > 200 ms',
  diagram: {},
  previewKey: 'av-first',
  legend: nodeLegend,
  build: buildFirst,
};

/* ---------- Second-degree, Mobitz I (Wenckebach) ---------- */

function buildMobitz1(): LessonBuild {
  const key = 'av-mobitz1';
  return {
    rhythms: { [key]: avBlockRhythm('mobitz1') },
    scenes: sequence([
      {
        id: 'start', dur: 5, chip: '1 · A fresh cycle', rhythm: key, span: secs(W, 0, 1.3), accent: 'blue',
        title: 'The cycle starts with a normal PR.',
        sub: 'The first beat after the pause conducts quickly: PR 160 ms.',
      },
      {
        id: 'lengthen', dur: 6, chip: '2 · PR lengthens', rhythm: key, span: secs(W, 1.0, 2.7), accent: 'orange',
        title: 'Each PR is longer than the one before.',
        sub: 'PR 160, 280, 340 ms. The increases get smaller, so the R-R intervals shorten.',
      },
      {
        id: 'drop', dur: 6, chip: '3 · Dropped beat', rhythm: key, span: secs(W, 2.6, 3.9), accent: 'red',
        title: 'The AV node tires and one P wave is blocked.',
        sub: 'A P wave with no QRS after it. The block is in the AV node, so the QRS stays narrow.',
      },
      {
        id: 'reset', dur: 5, chip: '4 · Reset', rhythm: key, span: secs(W, 3.7, 5.0), accent: 'blue',
        title: 'The pause lets the node recover.',
        sub: 'The PR after the dropped beat is the shortest of the cycle, and the pattern starts again.',
      },
      {
        id: 'pattern', dur: 6, chip: '5 · Grouped beating', rhythm: key, span: secs(W, 4.8, 7.4), accent: 'navy',
        title: 'Groups of beats, each ending in a pause.',
        sub: 'Here 4 P waves for 3 QRS complexes (4:3). The pause is shorter than two normal R-R intervals.',
      },
      {
        id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
        title: 'Progressive PR lengthening, then a dropped beat.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: 'Recognising Mobitz I (Wenckebach) block',
      rows: [
        { label: 'PR interval', value: 'Lengthens beat by beat until a P wave fails to conduct' },
        { label: 'After the drop', value: 'The first PR of the next cycle is the shortest' },
        { label: 'R-R interval', value: 'Shortens through the group, then a pause shorter than two normal cycles' },
        { label: 'Site', value: 'Almost always the AV node, so the QRS is usually narrow' },
        { label: 'Causes', value: 'Inferior MI, high vagal tone (sleep, athletes), drugs that slow the AV node' },
        { label: 'Management', value: 'Usually benign when asymptomatic. Treat the cause, stop offending drugs, atropine if symptomatic. Pacing is rarely needed' },
      ],
      keyline: 'The PR gets longer and longer, then a P wave is dropped.',
      pitfall:
        'In Mobitz II the PR does not change before the dropped beat. Compare the PR just before and just after the pause.',
    },
  };
}

export const avMobitz1Lesson: Lesson = {
  id: 'avm1',
  title: 'Mobitz I (Wenckebach): the tiring AV node',
  short: 'Mobitz I (Wenckebach)',
  blurb: 'The PR stretches with each beat until one P wave is dropped, then the cycle restarts.',
  rate: 'Grouped beating',
  diagram: {},
  previewKey: 'av-mobitz1',
  legend: nodeLegend,
  build: buildMobitz1,
};

/* ---------- Second-degree, Mobitz II ---------- */

function buildMobitz2(): LessonBuild {
  const key = 'av-mobitz2';
  return {
    rhythms: { [key]: avBlockRhythm('mobitz2') },
    scenes: sequence([
      {
        id: 'steady', dur: 5, chip: '1 · A steady PR', rhythm: key, span: secs(W, 0, 1.8), accent: 'blue',
        title: 'The PR interval is normal and the same each beat.',
        sub: 'PR 160 ms on every conducted beat.',
      },
      {
        id: 'drop', dur: 6, chip: '2 · Sudden drop', rhythm: key, span: secs(W, 1.7, 3.2), accent: 'red',
        title: 'A P wave is blocked with no warning.',
        sub: 'The impulse crosses the AV node but stops below it, in the His-Purkinje system.',
      },
      {
        id: 'pause', dur: 6, chip: '3 · The pause', rhythm: key, span: secs(W, 2.0, 4.0), accent: 'navy',
        title: 'The pause equals exactly two P-P intervals.',
        sub: 'The sinus node never missed a beat. One QRS is simply missing.',
      },
      {
        id: 'same', dur: 6, chip: '4 · Same PR again', rhythm: key, span: secs(W, 3.6, 5.8), accent: 'blue',
        title: 'The PR after the pause is unchanged.',
        sub: 'No lengthening before the block and no shortening after it. This separates it from Wenckebach.',
      },
      {
        id: 'danger', dur: 5, chip: '5 · Why it matters', rhythm: key, span: secs(W, 5.0, 7.4), accent: 'red',
        title: 'The block is below the AV node and unstable.',
        sub: 'It can suddenly become complete heart block. It needs a pacemaker.',
      },
      {
        id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
        title: 'A constant PR with sudden dropped beats.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: 'Recognising Mobitz II block',
      rows: [
        { label: 'PR interval', value: 'Constant before and after the dropped beat (160 ms here), often normal' },
        { label: 'Dropped beat', value: 'Sudden: a P wave with no QRS and no warning' },
        { label: 'Pause', value: 'Exactly two P-P intervals, because the sinus rate is regular' },
        { label: 'Site', value: 'Below the AV node (His bundle or bundle branches). The QRS is often wide when it involves the bundle branches' },
        { label: 'Causes', value: 'Anteroseptal MI, fibrosis of the conduction system, cardiac surgery, infiltrative disease' },
        { label: 'Management', value: 'Permanent pacemaker. Atropine often fails because the block is below the node. Avoid drugs that slow AV conduction' },
      ],
      keyline: 'The PR never changes, and a P wave suddenly fails to conduct.',
      pitfall:
        'A single non-conducted P wave in a 2:1 pattern cannot be classified as Mobitz I or II. Look at longer strips and at the QRS width.',
    },
  };
}

export const avMobitz2Lesson: Lesson = {
  id: 'avm2',
  title: 'Mobitz II: the sudden drop below the AV node',
  short: 'Mobitz II',
  blurb: 'The PR does not change, then a beat vanishes. The block is infranodal and can progress to complete block.',
  rate: 'Dropped beats',
  diagram: { bundleLabels: true },
  previewKey: 'av-mobitz2',
  legend: nodeLegend,
  build: buildMobitz2,
};

/* ---------- 2:1 and 3:1 (high-grade) block ---------- */

const HIGH_OPTIONS = [
  { id: '2to1', label: '2:1 block' },
  { id: '3to1', label: '3:1 block' },
];

function buildHigh(option: string | undefined): LessonBuild {
  const kind: AvBlockKind = option === '3to1' ? '3to1' : '2to1';
  const n = kind === '3to1' ? 3 : 2;
  const key = `av-${kind}`;
  const rate = kind === '3to1' ? 33 : 50;
  return {
    rhythms: { [key]: avBlockRhythm(kind) },
    scenes: sequence([
      {
        id: 'atria', dur: 5, chip: '1 · Atria beat steadily', rhythm: key, span: secs(W, 0, 2.0), accent: 'blue',
        title: 'The atria fire regularly at 100 per minute.',
        sub: 'P waves march out at a steady rate.',
      },
      {
        id: 'ratio', dur: 6, chip: `2 · ${n}:1 conduction`, rhythm: key, span: secs(W, 0.2, 2.7), accent: 'red',
        title: `Only every ${n === 2 ? 'second' : 'third'} P wave reaches the ventricles.`,
        sub: `${n} P waves for each QRS. The PR of the conducted beat is constant.`,
      },
      {
        id: 'cannot', dur: 6, chip: n === 2 ? '3 · Cannot grade it' : '3 · High-grade', rhythm: key, span: secs(W, 2.4, 4.5), accent: 'orange',
        title: n === 2
          ? 'A 2:1 pattern cannot be called Mobitz I or II.'
          : 'Two or more P waves in a row fail to conduct.',
        sub: n === 2
          ? 'There is no run of consecutive conducted beats to compare PR intervals.'
          : 'This is advanced (high-grade) block, closer to complete block.',
      },
      {
        id: 'rate', dur: 6, chip: '4 · Slow pulse', rhythm: key, span: secs(W, 4.2, 7.0), accent: 'navy',
        title: `The ventricular rate falls to about ${rate} per minute.`,
        sub: 'The ventricular rate is the atrial rate divided by the conduction ratio.',
      },
      {
        id: 'site', dur: 5, chip: '5 · Where is the block?', rhythm: key, span: secs(W, 5.0, 7.4), accent: 'orange',
        title: 'Use the QRS width and a trial of atropine or exercise.',
        sub: 'Narrow QRS with a long PR points to the node. A wide QRS points below it.',
      },
      {
        id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
        title: `P waves outnumber QRS complexes ${n} to 1.`,
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: kind === '3to1' ? 'Recognising 3:1 (high-grade) AV block' : 'Recognising 2:1 AV block',
      rows: [
        { label: 'Ratio', value: kind === '3to1' ? 'Three P waves for each QRS' : 'Two P waves for each QRS' },
        { label: 'Ventricular rate', value: `About ${rate} per minute here, with a regular atrial rate of 100 per minute` },
        { label: 'PR interval', value: 'Constant on the conducted beats' },
        { label: 'Classification', value: kind === '3to1'
          ? 'Two or more consecutive blocked P waves with some conducted beats is high-grade (advanced) AV block'
          : 'Cannot be labelled Mobitz I or II from the strip alone. Look for longer recordings, QRS width and PR behaviour' },
        { label: 'Atropine or exercise', value: 'Improves conduction if the block is in the node. Can worsen it if the block is below the node' },
        { label: 'Management', value: 'Treat reversible causes. A permanent pacemaker is usually needed when it is symptomatic or infranodal' },
      ],
      keyline: 'More P waves than QRS complexes, in a fixed ratio.',
      pitfall:
        'Blocked premature atrial beats in the T wave can mimic a pause. Check that the dropped P waves are on time.',
    },
  };
}

export const avHighLesson: Lesson = {
  id: 'avhigh',
  title: '2:1 and high-grade AV block',
  short: '2:1 / high-grade AV block',
  blurb: 'Every second or third P wave conducts. The pulse is slow and the level of the block must be worked out.',
  rate: '33–50 /min',
  optionLabel: 'Conduction ratio',
  options: HIGH_OPTIONS,
  defaultOption: '2to1',
  diagram: { bundleLabels: true },
  previewKey: 'av-2to1',
  legend: nodeLegend,
  build: buildHigh,
};

/* ---------- Third-degree (complete) AV block ---------- */

const COMPLETE_OPTIONS = [
  { id: 'junctional', label: 'Junctional escape' },
  { id: 'ventricular', label: 'Ventricular escape' },
];

function buildComplete(option: string | undefined): LessonBuild {
  const kind: AvBlockKind = option === 'ventricular' ? 'ventricular' : 'junctional';
  const isJunc = kind === 'junctional';
  const key = `av-${kind}`;
  return {
    rhythms: { [key]: avBlockRhythm(kind) },
    scenes: sequence([
      {
        id: 'atria', dur: 5, chip: '1 · Atria march on', rhythm: key, span: secs(W, 0, 2.4), accent: 'blue',
        title: 'The sinus node fires regularly at about 70 per minute.',
        sub: 'P waves appear on schedule, whatever the ventricles do.',
      },
      {
        id: 'block', dur: 6, chip: '2 · Total block', rhythm: key, span: secs(W, 0.3, 3.1), accent: 'red',
        title: 'No P wave conducts to the ventricles.',
        sub: 'Every impulse stops at the AV node or below it.',
      },
      {
        id: 'escape', dur: 6, chip: isJunc ? '3 · Junctional escape' : '3 · Ventricular escape', rhythm: key, span: secs(W, 0.4, 3.4), accent: 'purple',
        title: isJunc ? 'The AV junction takes over at about 43 per minute.' : 'A ventricular focus takes over at about 30 per minute.',
        sub: isJunc
          ? 'A narrow QRS. A reasonably reliable backup, but slow.'
          : 'A wide, slow QRS. A slow, unreliable backup that can stop.',
      },
      {
        id: 'dissociation', dur: 6, chip: '4 · AV dissociation', rhythm: key, span: secs(W, 2.4, 6.0), accent: 'navy',
        title: 'P waves and QRS complexes ignore each other.',
        sub: 'Both are regular, but the PR interval keeps changing. The P rate is faster than the QRS rate.',
      },
      {
        id: 'risk', dur: 6, chip: '5 · Why it matters', rhythm: key, span: secs(W, 5.0, 7.4), accent: 'red',
        title: isJunc ? 'The rate may be enough to stay alive, but not to be well.' : 'This rate often causes syncope or arrest.',
        sub: isJunc
          ? 'Low output, fatigue and syncope are common. Pacing is needed.'
          : 'Wide QRS escape rhythms below 40 per minute are unreliable. Prepare for pacing.',
      },
      {
        id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
        title: 'Regular P waves and a slow regular QRS that never meet.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: isJunc ? 'Recognising complete block with a junctional escape' : 'Recognising complete block with a ventricular escape',
      rows: [
        { label: 'P waves', value: 'Regular, about 70 per minute, and faster than the ventricles' },
        { label: 'QRS', value: isJunc ? 'Narrow, regular, 40–60 per minute (about 43 here)' : 'Wide, regular, 20–40 per minute (about 30 here)' },
        { label: 'PR interval', value: 'Changes constantly: there is no relationship between P and QRS' },
        { label: 'Site of block', value: isJunc ? 'At or just above the His bundle. Often congenital, inferior MI or vagal' : 'Below the His bundle. Seen with extensive conduction-system disease or anterior MI' },
        { label: 'Reliability', value: isJunc ? 'Fairly stable backup' : 'Slow and unstable. May stall and cause syncope or asystole' },
        { label: 'Management', value: 'Atropine may work only for nodal block. Transcutaneous or transvenous pacing in an emergency, then a permanent pacemaker' },
      ],
      keyline: 'Regular P waves, a slower regular QRS, and no relationship between them.',
      pitfall:
        'AV dissociation is not always complete block. In ventricular tachycardia or with a fast junctional rhythm the atria can be slower than the ventricles. The ventricular rate here is slower than the atrial rate, which defines block.',
    },
  };
}

export const avCompleteLesson: Lesson = {
  id: 'av3',
  title: 'Complete (third-degree) AV block',
  short: 'Complete heart block',
  blurb: 'No atrial impulse reaches the ventricles. A backup pacemaker below the block sets a slow rate of its own.',
  rate: '20–50 /min',
  optionLabel: 'Escape rhythm',
  options: COMPLETE_OPTIONS,
  defaultOption: 'junctional',
  diagram: { bundleLabels: true },
  diagramFor: (option) => ({ bundleLabels: true, ventricularFocus: option === 'ventricular' }),
  previewKey: 'av-junctional',
  legend: [
    { tone: 'blue', text: 'Sinus P waves (atria)' },
    { tone: 'red', text: 'Blocked impulse' },
    { tone: 'purple', text: 'Escape impulse' },
  ],
  build: buildComplete,
};
