import { avrtInitiation, avrtSinus, avrtTachycardia } from '../rhythms/avrt';
import { wpwAf, wpwAntidromic } from '../rhythms/wpw';
import { sequence, type SceneSpec } from './sequence';
import type { Lesson, LessonBuild, RecognitionSummary } from './types';

const OPTIONS = [
  { id: 'sinus', label: 'Sinus rhythm' },
  { id: 'orthodromic', label: 'Orthodromic AVRT' },
  { id: 'antidromic', label: 'Antidromic AVRT' },
  { id: 'af', label: 'Atrial fibrillation' },
];

const summaryScene = (n: number, title: string): SceneSpec => ({
  id: 'summary', dur: 6, chip: `${n} · Recognise it`, rhythm: null, accent: 'navy', title, sub: 'Schematic educational example.',
});

function sinus(): { scenes: SceneSpec[]; summary: RecognitionSummary; rhythms: LessonBuild['rhythms'] } {
  return {
    rhythms: { sinus: avrtSinus() },
    scenes: [
      {
        id: 'short-pr', dur: 5, chip: '1 · Short PR', rhythm: 'sinus', span: [0, 0.3], accent: 'orange',
        title: 'An extra pathway lets the impulse skip the AV node delay.',
        sub: 'The AV node normally holds the impulse back. The accessory pathway does not, so the PR interval is short (under 120 ms).',
      },
      {
        id: 'delta', dur: 6, chip: '2 · Delta wave', rhythm: 'sinus', span: [0.3, 0.65], accent: 'orange',
        title: 'The ventricles start to activate early, through muscle.',
        sub: 'The QRS begins with a slow, slurred upstroke: the delta wave. It is slow because the impulse spreads cell to cell.',
      },
      {
        id: 'fusion', dur: 6, chip: '3 · Two routes', rhythm: 'sinus', span: [0.65, 1], accent: 'blue',
        title: 'Meanwhile the normal route arrives too.',
        sub: 'The two wavefronts fuse. The QRS is a little wider, with a delta wave, short PR, and secondary ST-T changes.',
      },
      {
        id: 'risk', dur: 5, chip: '4 · Why it matters', rhythm: 'sinus', accent: 'purple',
        title: 'The same pathway can also carry a re-entry circuit.',
        sub: 'That can cause three different tachycardias. Choose a rhythm above to see each one.',
      },
      summaryScene(5, 'Short PR, delta wave, wide QRS.'),
    ],
    summary: {
      heading: 'Recognising WPW pattern in sinus rhythm',
      rows: [
        { label: 'PR interval', value: 'Short: under 120 ms' },
        { label: 'Delta wave', value: 'Slurred, slow start of the QRS' },
        { label: 'QRS', value: 'Wider than normal (often over 110 ms), because it is a fusion beat' },
        { label: 'ST-T', value: 'Secondary changes, opposite to the delta wave' },
        { label: 'Mechanism', value: 'Accessory pathway (bundle of Kent) bypasses the AV node' },
        { label: 'Terminology', value: 'WPW pattern = the ECG finding; WPW syndrome = pattern plus arrhythmias or symptoms' },
      ],
      keyline: 'Short PR, delta wave, and a wide QRS in sinus rhythm.',
      pitfall: 'A delta wave can mimic old infarction (Q waves) or bundle branch block. The short PR interval is the clue.',
    },
  };
}

function orthodromic() {
  return {
    rhythms: { sinus: avrtSinus(), initiation: avrtInitiation(), tachycardia: avrtTachycardia() },
    scenes: [
      {
        id: 'baseline', dur: 4, chip: '1 · Baseline', rhythm: 'sinus', span: [0, 0.6], accent: 'orange',
        title: 'At baseline, a short PR and a delta wave.',
        sub: 'The pathway pre-excites the ventricles in sinus rhythm.',
      },
      {
        id: 'circuit', dur: 7, chip: '2 · Circuit', rhythm: 'initiation', span: [0.35, 1], accent: 'purple',
        title: 'The impulse goes down the AV node and up the accessory pathway.',
        sub: 'The ventricles are reached only by the normal route, so the QRS is narrow. This is the common type, about 95% of AVRT.',
      },
      {
        id: 'tachy', dur: 5, chip: '3 · Narrow tachycardia', rhythm: 'tachycardia', span: [0, 0.5], accent: 'purple',
        title: 'Narrow, regular, about 180 per minute, with the delta wave gone.',
        sub: 'The ventricles are reached only through the AV node.',
      },
      {
        id: 'retro-p', dur: 5, chip: '4 · P after QRS', rhythm: 'tachycardia', span: [0.5, 1], accent: 'purple',
        title: 'A retrograde P wave follows each QRS.',
        sub: 'The atria are activated from below, through the accessory pathway.',
      },
      summaryScene(5, 'Narrow regular tachycardia in a person with WPW.'),
    ] as SceneSpec[],
    summary: {
      heading: 'Recognising orthodromic AVRT in WPW',
      rows: [
        { label: 'Rate', value: '150–250 per minute' },
        { label: 'QRS', value: 'Narrow: no delta wave, because the ventricles are reached via the AV node' },
        { label: 'P wave', value: 'Retrograde, after the QRS' },
        { label: 'Circuit', value: 'Down the AV node, up the accessory pathway' },
        { label: 'Treatment', value: 'Vagal manoeuvres, adenosine; synchronised cardioversion if unstable; ablation is the long-term cure' },
      ],
      keyline: 'Regular narrow tachycardia in a person whose baseline shows a delta wave.',
      pitfall: 'AVNRT looks similar, but the retrograde P wave is hidden in or at the end of the QRS.',
    },
  };
}

function antidromic() {
  return {
    rhythms: { sinus: avrtSinus(), antidromic: wpwAntidromic() },
    scenes: [
      {
        id: 'baseline', dur: 4, chip: '1 · Baseline', rhythm: 'sinus', span: [0, 0.6], accent: 'orange',
        title: 'Same pathway, same baseline.',
        sub: 'A short PR interval and a delta wave in sinus rhythm.',
      },
      {
        id: 'reverse', dur: 5, chip: '2 · Reversed circuit', rhythm: 'antidromic', span: [0, 0.3], accent: 'orange',
        title: 'This time the impulse goes down the accessory pathway.',
        sub: 'The whole ventricle is activated slowly through muscle, so the QRS is wide.',
      },
      {
        id: 'return', dur: 5, chip: '3 · Back up', rhythm: 'antidromic', span: [0.3, 0.6], accent: 'purple',
        title: 'It returns to the atria through the His-Purkinje system and the AV node.',
        sub: 'The circuit runs the opposite way to the usual one.',
      },
      {
        id: 'wide', dur: 6, chip: '4 · Wide and regular', rhythm: 'antidromic', span: [0.6, 1], accent: 'red',
        title: 'Regular, fast and wide: it looks like VT.',
        sub: 'It is rare, about 5% of AVRT, but it can be mistaken for VT.',
      },
      summaryScene(5, 'Regular wide tachycardia from a circuit that runs backward.'),
    ] as SceneSpec[],
    summary: {
      heading: 'Recognising antidromic AVRT',
      rows: [
        { label: 'Rate', value: '150–250 per minute' },
        { label: 'QRS', value: 'Wide, fully pre-excited' },
        { label: 'Circuit', value: 'Down the accessory pathway, up the AV node' },
        { label: 'Frequency', value: 'Uncommon: about 5% of AVRT' },
        { label: 'Treatment', value: 'Synchronised cardioversion if unstable; otherwise expert-guided drugs (procainamide, ibutilide). Avoid AV-nodal blockers unless the diagnosis is certain.' },
      ],
      keyline: 'Regular wide tachycardia in a person known to have WPW.',
      pitfall: 'Distinguishing it from VT is hard from the ECG alone, so treat as VT if unsure.',
    },
  };
}

function af() {
  return {
    rhythms: { sinus: avrtSinus(), af: wpwAf() },
    scenes: [
      {
        id: 'baseline', dur: 4, chip: '1 · Baseline', rhythm: 'sinus', span: [0, 0.6], accent: 'orange',
        title: 'The same accessory pathway, now with atrial fibrillation.',
        sub: 'The pathway is a second route into the ventricles.',
      },
      {
        id: 'af', dur: 5, chip: '2 · Pre-excited AF', rhythm: 'af', span: [0, 0.35], accent: 'red',
        title: 'The disorganised atria fire at 300–600 per minute.',
        sub: 'Nothing about the pathway slows them: it conducts far more impulses than the AV node would.',
      },
      {
        id: 'blocked', dur: 5, chip: '3 · AV node brake', rhythm: 'af', span: [0.35, 0.65], accent: 'orange',
        title: 'The AV node blocks most impulses. The pathway does not.',
        sub: 'Some beats come through the pathway alone, some fuse with the AV node route.',
      },
      {
        id: 'fast', dur: 6, chip: '4 · Dangerous rate', rhythm: 'af', span: [0.65, 1], accent: 'red',
        title: 'Irregular and wide, with some R-R intervals under 250 ms.',
        sub: 'Complexes vary in shape. This can degenerate into ventricular fibrillation.',
      },
      summaryScene(5, 'Irregular, very fast wide complexes: an emergency.'),
    ] as SceneSpec[],
    summary: {
      heading: 'Recognising pre-excited atrial fibrillation',
      rows: [
        { label: 'Rhythm', value: 'Irregularly irregular' },
        { label: 'Rate', value: 'Very fast, often over 200 per minute; shortest R-R under 250 ms signals a high-risk pathway' },
        { label: 'QRS', value: 'Wide, with changing shape from beat to beat' },
        { label: 'Danger', value: 'Can degenerate into ventricular fibrillation' },
        { label: 'Avoid', value: 'AV-nodal blockers (adenosine, verapamil, diltiazem, beta-blockers, digoxin): they can speed up conduction through the pathway' },
        { label: 'Treatment', value: 'Synchronised cardioversion if unstable; otherwise IV procainamide or ibutilide, under expert guidance' },
      ],
      keyline: 'Irregular, fast, wide and variable: AF travelling down an accessory pathway.',
      pitfall: 'It can be mistaken for polymorphic VT or AF with bundle branch block; the irregularity and the very short R-R intervals are the clues.',
    },
  };
}

function build(option: string | undefined): LessonBuild {
  const id = OPTIONS.find((o) => o.id === option)?.id ?? 'sinus';
  const b = id === 'orthodromic' ? orthodromic() : id === 'antidromic' ? antidromic() : id === 'af' ? af() : sinus();
  return { rhythms: b.rhythms, scenes: sequence(b.scenes), summary: b.summary };
}

export const wpwLesson: Lesson = {
  id: 'wpw',
  title: 'Wolff-Parkinson-White (WPW)',
  short: 'WPW',
  blurb: 'A pathway that bypasses the AV node: short PR and delta wave in sinus rhythm, with three kinds of tachycardia.',
  rate: 'Varies',
  optionLabel: 'Rhythm',
  options: OPTIONS,
  defaultOption: 'sinus',
  diagram: { accessoryPathway: true, ectopicFocus: true },
  previewKey: 'sinus',
  legend: [
    { tone: 'blue', text: 'Normal conduction (AV node)' },
    { tone: 'orange', text: 'Pre-excited conduction through the accessory pathway' },
    { tone: 'purple', text: 'Backward conduction' },
    { tone: 'red', text: 'Blocked impulse' },
  ],
  build,
};
