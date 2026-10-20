import {
  ARREST_OPTIONS, SA_BLOCK_OPTIONS, SSS_OPTIONS, saBlockRhythm, sinusArrestRhythm, sssRhythm,
  type ArrestKind, type SaBlockType, type SssKind,
} from '../rhythms/sinusnode';
import { secs, sequence } from './sequence';
import type { Lesson, LessonBuild, LegendItem } from './types';

const nodeLegend: LegendItem[] = [
  { tone: 'blue', text: 'Sinus impulse' },
  { tone: 'orange', text: 'Delayed exit from the node' },
  { tone: 'red', text: 'Impulse blocked or absent' },
];

/* ---------- Sinoatrial exit block ---------- */

function buildSaBlock(option: string | undefined): LessonBuild {
  const type: SaBlockType = option === 'type1' ? 'type1' : 'type2';
  const key = `sa-block-${type}`;
  const rhythm = saBlockRhythm(type);
  const W = rhythm.window;

  if (type === 'type1') {
    return {
      rhythms: { [key]: rhythm },
      scenes: sequence([
        {
          id: 'group', dur: 5, chip: '1 · A group begins', rhythm: key, span: secs(W, 0, 1.5), accent: 'blue',
          title: 'The sinus node fires at a steady rate.',
          sub: 'The first impulse of a group leaves the node and reaches the atria with a short delay.',
        },
        {
          id: 'shorten', dur: 6, chip: '2 · P-P shortens', rhythm: key, span: secs(W, 0.4, 2.4), accent: 'orange',
          title: 'Each impulse leaves the node a little later.',
          sub: 'The exit delay grows by smaller steps, so the P-P interval shortens (0.92 s, then 0.88 s).',
        },
        {
          id: 'drop', dur: 6, chip: '3 · A P wave is missing', rhythm: key, span: secs(W, 1.9, 3.8), accent: 'red',
          title: 'One impulse never leaves the node.',
          sub: 'There is no P wave and no QRS. The pause (1.4 s) is shorter than two of the shortest P-P intervals.',
        },
        {
          id: 'repeat', dur: 5, chip: '4 · The pattern repeats', rhythm: key, span: secs(W, 3.5, 5.7), accent: 'blue',
          title: 'The next group starts with a longer P-P.',
          sub: 'Groups of three P waves, each followed by a pause.',
        },
        {
          id: 'compare', dur: 6, chip: '5 · Wenckebach of the atria', rhythm: key, span: secs(W, 5.4, 7.6), accent: 'navy',
          title: 'Same idea as AV Wenckebach, but in the sinus exit.',
          sub: 'Look at the P-P interval, not the PR. The PR stays constant.',
        },
        {
          id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
          title: 'Shortening P-P, then a pause shorter than twice the shortest.',
          sub: 'Schematic educational example.',
        },
      ]),
      summary: saSummary(type),
    };
  }
  return {
    rhythms: { [key]: rhythm },
    scenes: sequence([
      {
        id: 'steady', dur: 5, chip: '1 · A steady rhythm', rhythm: key, span: secs(W, 0, 2.4), accent: 'blue',
        title: 'Sinus rhythm is regular at about 67 per minute.',
        sub: 'P-P is 0.9 s, with a normal P wave and QRS.',
      },
      {
        id: 'blocked', dur: 6, chip: '2 · Exit block', rhythm: key, span: secs(W, 2.0, 3.4), accent: 'red',
        title: 'One impulse is made but cannot leave the node.',
        sub: 'It dies at the border between the node and the atrium, so there is no P wave and no QRS.',
      },
      {
        id: 'pause', dur: 6, chip: '3 · A fixed pause', rhythm: key, span: secs(W, 2.0, 4.3), accent: 'navy',
        title: 'The pause equals exactly two P-P intervals.',
        sub: 'The node kept its rhythm. Only the exit failed, so the pause is a multiple of the basic P-P.',
      },
      {
        id: 'resume', dur: 5, chip: '4 · Back on schedule', rhythm: key, span: secs(W, 3.8, 6.0), accent: 'blue',
        title: 'The next P wave arrives right on time.',
        sub: 'Same P wave shape, same PR. No warning, no change in the intervals before the pause.',
      },
      {
        id: 'meaning', dur: 5, chip: '5 · Why it matters', rhythm: key, span: secs(W, 5.6, 8.4), accent: 'orange',
        title: 'It is a sign of sinus node or atrial disease.',
        sub: 'Long pauses cause dizziness and syncope. Look for drugs and vagal causes.',
      },
      {
        id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
        title: 'A regular P-P with a pause of exactly 2 × P-P.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: saSummary(type),
  };
}

function saSummary(type: SaBlockType): LessonBuild['summary'] {
  const first = type === 'type1';
  return {
    heading: first ? 'Recognising SA block, type I (Wenckebach)' : 'Recognising SA block, type II',
    rows: [
      { label: 'P-P interval', value: first ? 'Shortens within each group, then a pause' : 'Constant, then a pause' },
      { label: 'Pause', value: first ? 'Shorter than two of the shortest P-P intervals' : 'Exactly two (or three) times the basic P-P' },
      { label: 'PR and P shape', value: 'Normal and unchanged. The block is between the node and the atrium' },
      { label: 'On the ECG', value: 'The sinus node itself is silent on the surface ECG, so the block is inferred from the P-P pattern' },
      { label: 'Causes', value: 'High vagal tone, drugs (digoxin, beta-blockers, calcium-channel blockers, amiodarone), inferior MI, sinus node fibrosis, hyperkalaemia' },
      { label: 'Management', value: 'Stop offending drugs and treat the cause. Permanent pacing if symptoms match the pauses. Third-degree SA block cannot be told from sinus arrest on the surface ECG' },
    ],
    keyline: first
      ? 'P-P shortens, then a pause shorter than twice the shortest P-P.'
      : 'Regular P waves with a pause that is exactly a whole multiple of P-P.',
    pitfall:
      'Sinus arrest also gives a pause, but the pause is not a multiple of the P-P interval. A blocked premature atrial beat in the T wave can also hide a P wave, so inspect the T wave before the pause.',
  };
}

export const saBlockLesson: Lesson = {
  id: 'sinoblock',
  title: 'Sinoatrial block: the impulse that cannot leave the node',
  short: 'SA block',
  blurb: 'The node fires, but the impulse fails to exit to the atria. The missing P wave leaves a pause with a tell-tale length.',
  rate: 'Pauses',
  optionLabel: 'Type',
  options: SA_BLOCK_OPTIONS,
  defaultOption: 'type2',
  diagram: {},
  previewKey: 'sa-block-type2',
  legend: nodeLegend,
  build: buildSaBlock,
};

/* ---------- Sinus arrest ---------- */

function buildArrest(option: string | undefined): LessonBuild {
  const kind: ArrestKind = option === 'escape' ? 'escape' : 'pause';
  const key = `sinus-arrest-${kind}`;
  const rhythm = sinusArrestRhythm(kind);
  const W = rhythm.window;
  const escape = kind === 'escape';
  return {
    rhythms: { [key]: rhythm },
    scenes: sequence([
      {
        id: 'sinus', dur: 5, chip: '1 · Sinus rhythm', rhythm: key, span: secs(W, 0, 2.4), accent: 'blue',
        title: 'Normal sinus rhythm at about 67 per minute.',
        sub: 'P wave, narrow QRS, P-P 0.9 s.',
      },
      {
        id: 'stop', dur: 6, chip: '2 · The node stops', rhythm: key, span: secs(W, 2.0, 3.6), accent: 'red',
        title: 'The sinus node stops discharging.',
        sub: 'There is no impulse to block. Nothing leaves the node, so no P wave and no QRS follow.',
      },
      escape
        ? {
            id: 'escape', dur: 6, chip: '3 · A backup takes over', rhythm: key, span: secs(W, 2.4, 4.6), accent: 'purple',
            title: 'The AV junction fires after a delay.',
            sub: 'A narrow QRS with no normal P wave. The escape comes late, after about 1.5 s.',
          }
        : {
            id: 'pause', dur: 6, chip: '3 · A long pause', rhythm: key, span: secs(W, 2.0, 5.4), accent: 'navy',
            title: 'The pause lasts 3.3 s and is not a multiple of the P-P.',
            sub: 'Unlike SA block, the next P wave cannot be predicted from the earlier rhythm.',
          },
      escape
        ? {
            id: 'rhythm', dur: 6, chip: '4 · Escape continues', rhythm: key, span: secs(W, 3.5, 6.2), accent: 'purple',
            title: 'The junctional escape repeats at a slow rate.',
            sub: 'About 40 per minute until the sinus node recovers.',
          }
        : {
            id: 'restart', dur: 6, chip: '4 · The node restarts', rhythm: key, span: secs(W, 5.0, 7.4), accent: 'blue',
            title: 'The sinus node starts again at its old rate.',
            sub: 'P-P is back to 0.9 s. The pause was long enough to cause symptoms.',
          },
      {
        id: 'return', dur: 5, chip: '5 · Sinus returns', rhythm: key, span: secs(W, escape ? 5.2 : 5.4, 8.4), accent: 'blue',
        title: escape ? 'Sinus P waves take over again.' : 'Is the pause dangerous?',
        sub: escape
          ? 'The faster sinus node overrides the slower escape rhythm.'
          : 'Pauses of 3 s or more while awake, or pauses with syncope, need attention.',
      },
      {
        id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
        title: escape ? 'A pause ended by a late narrow escape beat.' : 'A pause with no P wave, not a multiple of P-P.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: escape ? 'Recognising sinus arrest with junctional escape' : 'Recognising sinus arrest',
      rows: [
        { label: 'Pause', value: 'No P wave and no QRS for longer than the normal cycle (3.3 s here)' },
        { label: 'Length', value: 'Not a multiple of the basic P-P, unlike SA block' },
        { label: 'Escape', value: escape ? 'Junctional escape beats (narrow QRS, no normal P) after about 1.5 s' : 'None here: a long asystolic pause. A junctional or ventricular escape may appear in other tracings' },
        { label: 'Significance', value: 'A pause of 3 s or more while awake is abnormal. Symptoms: dizziness, syncope' },
        { label: 'Causes', value: 'Sinus node dysfunction, drugs (digoxin, beta-blockers, calcium-channel blockers, amiodarone, ivabradine), vagal surges, ischaemia of the node' },
        { label: 'Management', value: 'Remove causes. Atropine for acute symptoms. Permanent pacing for symptomatic pauses from intrinsic sinus node dysfunction' },
      ],
      keyline: 'A long pause with no P wave, and the pause is not a multiple of P-P.',
      pitfall:
        'In SA block the pause is exactly a multiple of P-P. In sinus arrest it is not. Always measure with calipers.',
    },
  };
}

export const sinusArrestLesson: Lesson = {
  id: 'sinusarrest',
  title: 'Sinus arrest: the node that stops',
  short: 'Sinus arrest',
  blurb: 'The sinus node stops for a while. The pause is long, unpredictable, and may be ended by an escape beat.',
  rate: 'Pause ≥ 3 s',
  optionLabel: 'After the pause',
  options: ARREST_OPTIONS,
  defaultOption: 'pause',
  diagram: {},
  previewKey: 'sinus-arrest-pause',
  legend: [
    { tone: 'blue', text: 'Sinus impulse' },
    { tone: 'red', text: 'Pause with no activation' },
    { tone: 'purple', text: 'Junctional escape impulse' },
  ],
  build: buildArrest,
};

/* ---------- Sick sinus syndrome ---------- */

function buildSss(option: string | undefined): LessonBuild {
  const kind: SssKind = option === 'brady' ? 'brady' : 'tachybrady';
  const key = `sss-${kind}`;
  const rhythm = sssRhythm(kind);
  const W = rhythm.window;
  if (kind === 'brady') {
    return {
      rhythms: { [key]: rhythm },
      scenes: sequence([
        {
          id: 'slow', dur: 5, chip: '1 · Too slow', rhythm: key, span: secs(W, 0, 3.4), accent: 'orange',
          title: 'The sinus rate is persistently slow.',
          sub: 'P-P is 1.4 s, about 43 per minute, with a normal P wave and QRS.',
        },
        {
          id: 'pause', dur: 6, chip: '2 · A sinus pause', rhythm: key, span: secs(W, 3.2, 5.3), accent: 'red',
          title: 'The node pauses for over 2 seconds.',
          sub: 'No P wave and no QRS. The patient may feel faint here.',
        },
        {
          id: 'escape', dur: 6, chip: '3 · A backup beat', rhythm: key, span: secs(W, 5.0, 6.2), accent: 'purple',
          title: 'A junctional escape beat rescues the rhythm.',
          sub: 'A narrow QRS arrives late, without a normal P wave in front of it.',
        },
        {
          id: 'recover', dur: 6, chip: '4 · Sinus restarts', rhythm: key, span: secs(W, 6.0, 8.8), accent: 'blue',
          title: 'The sinus node restarts, again at a slow rate.',
          sub: 'The rate is still low and will not rise with exercise.',
        },
        {
          id: 'meaning', dur: 5, chip: '5 · The syndrome', rhythm: key, span: secs(W, 0, 8.8), accent: 'navy',
          title: 'Slow rate, pauses and escapes on one strip.',
          sub: 'Together with symptoms, this is sick sinus syndrome.',
        },
        {
          id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
          title: 'Bradycardia with pauses and escape beats.',
          sub: 'Schematic educational example.',
        },
      ]),
      summary: sssSummary(kind),
    };
  }
  return {
    rhythms: { [key]: rhythm },
    scenes: sequence([
      {
        id: 'sinus', dur: 5, chip: '1 · Sinus rhythm', rhythm: key, span: secs(W, 0, 1.9), accent: 'blue',
        title: 'The strip starts in sinus rhythm.',
        sub: 'Regular P waves with a normal QRS.',
      },
      {
        id: 'tachy', dur: 6, chip: '2 · Atrial fibrillation', rhythm: key, span: secs(W, 1.8, 4.0), accent: 'orange',
        title: 'Sudden atrial fibrillation: fast and irregular.',
        sub: 'No P waves, an irregular fibrillatory baseline, and irregular QRS complexes.',
      },
      {
        id: 'pause', dur: 6, chip: '3 · The pause', rhythm: key, span: secs(W, 3.5, 5.2), accent: 'red',
        title: 'The AF stops, and then nothing happens.',
        sub: 'The sinus node was suppressed by the fast rate and does not restart at once.',
      },
      {
        id: 'escape', dur: 6, chip: '4 · An escape beat', rhythm: key, span: secs(W, 5.0, 6.6), accent: 'purple',
        title: 'A junctional escape beat ends the pause.',
        sub: 'The pause lasts more than 2 seconds. A narrow QRS with no sinus P wave.',
      },
      {
        id: 'resume', dur: 5, chip: '5 · Sinus restarts', rhythm: key, span: secs(W, 6.5, 8.8), accent: 'blue',
        title: 'Sinus rhythm returns, slowly.',
        sub: 'Tachycardia followed by bradycardia: tachy-brady syndrome.',
      },
      {
        id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
        title: 'A fast atrial arrhythmia that ends in a long pause.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: sssSummary(kind),
  };
}

function sssSummary(kind: SssKind): LessonBuild['summary'] {
  const tb = kind === 'tachybrady';
  return {
    heading: tb ? 'Recognising tachycardia-bradycardia syndrome' : 'Recognising sick sinus syndrome (bradycardia type)',
    rows: [
      { label: 'Core problem', value: 'Failure of the sinus node to make or deliver impulses at a suitable rate' },
      { label: 'Pattern', value: tb ? 'Atrial fibrillation (or flutter or tachycardia) alternating with slow rhythm and pauses' : 'Sinus bradycardia, sinus pauses and escape beats, with a poor response to exercise' },
      { label: 'Pause', value: tb ? 'After the tachycardia stops (post-conversion pause), often more than 2–3 s' : 'Pauses over 2–3 s, ended by junctional escape beats' },
      { label: 'Symptoms', value: 'Fatigue, palpitations, dizziness, syncope. Symptoms must match the rhythm to treat' },
      { label: 'Management', value: 'Permanent pacemaker (dual-chamber or atrial-based) for symptomatic patients. Rate-control drugs make bradycardia worse and are given only after pacing. Anticoagulate AF by stroke risk' },
      { label: 'Diagnosis', value: 'Holter, event recorder or implantable loop recorder to correlate symptoms with the pauses' },
    ],
    keyline: tb
      ? 'A fast atrial rhythm that stops, followed by a long pause.'
      : 'A slow sinus rate with pauses and escape beats.',
    pitfall:
      'Do not give AV-nodal blocking drugs for the fast phase without a pacemaker plan. The brady phase can then become dangerous.',
  };
}

export const sssLesson: Lesson = {
  id: 'sss',
  title: 'Sick sinus syndrome: slow, pausing, sometimes fast',
  short: 'Sick sinus syndrome',
  blurb: 'A failing sinus node can run too slowly, pause, or alternate with atrial tachycardia (tachy-brady syndrome).',
  rate: 'Variable',
  optionLabel: 'Pattern',
  options: SSS_OPTIONS,
  defaultOption: 'tachybrady',
  diagram: {},
  previewKey: 'sss-tachybrady',
  legend: [
    { tone: 'blue', text: 'Sinus impulse' },
    { tone: 'orange', text: 'Atrial fibrillation (chaotic)' },
    { tone: 'red', text: 'Pause with no activation' },
    { tone: 'purple', text: 'Junctional escape impulse' },
  ],
  build: buildSss,
};
