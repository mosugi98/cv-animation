import { BUNDLE_WINDOW, bundleRhythm, fascicularRhythm } from '../rhythms/bundle';
import { secs, sequence } from './sequence';
import type { Lesson, LessonBuild, LegendItem } from './types';

const W = BUNDLE_WINDOW;

const bundleLegend: LegendItem[] = [
  { tone: 'blue', text: 'Fast conduction in a working bundle' },
  { tone: 'orange', text: 'Slow spread through muscle' },
  { tone: 'red', text: 'Blocked bundle or fascicle' },
];

/* ---------- Left bundle branch block ---------- */

function buildLbbb(): LessonBuild {
  return {
    rhythms: { normal: bundleRhythm('normal'), lbbb: bundleRhythm('lbbb') },
    scenes: sequence([
      {
        id: 'normal', dur: 5, chip: '1 · Normal', rhythm: 'normal', span: secs(W, 0, 2.4), accent: 'blue',
        title: 'Normally both bundles fire together.',
        sub: 'Both ventricles are activated at once and the QRS is narrow (about 90 ms).',
      },
      {
        id: 'block', dur: 6, chip: '2 · Left bundle blocked', rhythm: 'lbbb', span: secs(W, 0.3, 1.7), accent: 'red',
        title: 'The left bundle branch is blocked.',
        sub: 'The impulse goes down the right bundle only. The left side gets nothing from the His bundle.',
      },
      {
        id: 'late', dur: 6, chip: '3 · The left side is late', rhythm: 'lbbb', span: secs(W, 1.1, 2.7), accent: 'orange',
        title: 'The left ventricle is activated through muscle, late.',
        sub: 'The wavefront crosses the septum cell by cell, from right to left. This is slow.',
      },
      {
        id: 'ecg', dur: 6, chip: '4 · Wide QRS', rhythm: 'lbbb', span: secs(W, 2.1, 4.2), accent: 'navy',
        title: 'QRS 120 ms or more, with a broad notched R in V6.',
        sub: 'No septal q wave in V6, because the septum is now activated from the right.',
      },
      {
        id: 'repol', dur: 5, chip: '5 · Discordant T', rhythm: 'lbbb', span: secs(W, 3.4, 5.6), accent: 'orange',
        title: 'The ST segment and T wave point opposite to the QRS.',
        sub: 'In V6 the QRS is upright, so the T wave is inverted. This is expected, not ischaemia.',
      },
      {
        id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
        title: 'A wide QRS with a broad R in V6 and a discordant T.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: 'Recognising left bundle branch block',
      rows: [
        { label: 'QRS duration', value: '120 ms or more (strict criteria: 140 ms in men, 130 ms in women)' },
        { label: 'V5–V6, I, aVL', value: 'Broad, notched or slurred R wave, with no septal q wave' },
        { label: 'V1–V2', value: 'Deep S wave (QS or rS pattern), the mirror image of V6' },
        { label: 'ST-T', value: 'Discordant: opposite to the main QRS deflection' },
        { label: 'Causes', value: 'Hypertension, cardiomyopathy, aortic valve disease, ischaemic heart disease, degenerative conduction disease' },
        { label: 'Why it matters', value: 'Implies structural heart disease. New LBBB with a typical acute MI picture needs the Sgarbossa criteria. With LVEF 35% or less and QRS 150 ms or more, cardiac resynchronisation therapy helps' },
      ],
      keyline: 'Wide QRS with a broad, notched R wave in V6 and no q wave.',
      pitfall:
        'A paced rhythm from the right ventricle also looks like LBBB. Look for pacing spikes. Never diagnose ischaemia from the ST-T changes alone.',
    },
  };
}

export const lbbbLesson: Lesson = {
  id: 'lbbb',
  title: 'Left bundle branch block: the late left ventricle',
  short: 'Left bundle branch block',
  blurb: 'The right bundle fires and the left ventricle is activated late through muscle, giving a wide QRS and a discordant T.',
  rate: 'QRS ≥ 120 ms',
  diagram: { bundleLabels: true },
  previewKey: 'lbbb',
  legend: bundleLegend,
  build: buildLbbb,
};

/* ---------- Right bundle branch block ---------- */

function buildRbbb(): LessonBuild {
  return {
    rhythms: { normal: bundleRhythm('normal'), rbbb: bundleRhythm('rbbb') },
    scenes: sequence([
      {
        id: 'normal', dur: 5, chip: '1 · Normal', rhythm: 'normal', span: secs(W, 0, 2.4), accent: 'blue',
        title: 'Normally both bundles fire together.',
        sub: 'Both ventricles are activated at once and the QRS is narrow (about 90 ms).',
      },
      {
        id: 'block', dur: 6, chip: '2 · Right bundle blocked', rhythm: 'rbbb', span: secs(W, 0.3, 1.7), accent: 'red',
        title: 'The right bundle branch is blocked.',
        sub: 'The impulse goes down the left bundle only. The left ventricle is activated on time.',
      },
      {
        id: 'late', dur: 6, chip: '3 · The right side is late', rhythm: 'rbbb', span: secs(W, 1.1, 2.7), accent: 'orange',
        title: 'The right ventricle is activated through muscle, late.',
        sub: 'The wavefront crosses the septum slowly, from left to right.',
      },
      {
        id: 'ecg', dur: 6, chip: '4 · rSR′ in V1', rhythm: 'rbbb', span: secs(W, 2.1, 4.2), accent: 'navy',
        title: 'A small r, an S, then a tall late R′ in V1.',
        sub: 'The early part is normal. The late R′ is the right ventricle firing last.',
      },
      {
        id: 'repol', dur: 5, chip: '5 · Inverted T', rhythm: 'rbbb', span: secs(W, 3.4, 5.6), accent: 'orange',
        title: 'The T wave is inverted in V1–V3.',
        sub: 'The repolarisation change is secondary to the late activation.',
      },
      {
        id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
        title: 'A wide QRS with rSR′ in V1 and a wide S in I and V6.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: 'Recognising right bundle branch block',
      rows: [
        { label: 'QRS duration', value: '120 ms or more for complete block. Incomplete block is 100–120 ms' },
        { label: 'V1–V2', value: 'rSR′ ("M" shape) with a late R′ that is taller than the first r' },
        { label: 'I, aVL, V5–V6', value: 'Wide, slurred S wave' },
        { label: 'ST-T', value: 'T wave inversion in V1–V3 is expected' },
        { label: 'Causes', value: 'Often a normal variant. Also pulmonary embolism, right heart strain, cor pulmonale, ASD, congenital heart disease, cardiomyopathy' },
        { label: 'Why it matters', value: 'Often benign alone. New RBBB with chest pain, dyspnoea or a right heart problem prompts a search for pulmonary embolism. Look for a Brugada pattern if ST elevation is present in V1–V2' },
      ],
      keyline: 'Wide QRS with an rSR′ in V1 and a wide S wave in V6.',
      pitfall:
        'A Brugada type 1 pattern (coved ST elevation in V1–V2) looks like RBBB. The ST elevation is the clue.',
    },
  };
}

export const rbbbLesson: Lesson = {
  id: 'rbbb',
  title: 'Right bundle branch block: the late right ventricle',
  short: 'Right bundle branch block',
  blurb: 'The left bundle fires on time and the right ventricle follows late, giving an rSR′ in V1.',
  rate: 'QRS ≥ 120 ms',
  diagram: { bundleLabels: true },
  previewKey: 'rbbb',
  legend: bundleLegend,
  build: buildRbbb,
};

/* ---------- Fascicular blocks ---------- */

const FASC_OPTIONS = [
  { id: 'lafb', label: 'Left anterior (LAFB)' },
  { id: 'lpfb', label: 'Left posterior (LPFB)' },
  { id: 'bifascicular', label: 'Bifascicular (RBBB + LAFB)' },
  { id: 'longpr', label: 'Bifascicular + long PR' },
];

function buildFascicular(option: string | undefined): LessonBuild {
  const id = FASC_OPTIONS.find((o) => o.id === option)?.id ?? 'lafb';
  if (id === 'lafb' || id === 'lpfb') {
    const ant = id === 'lafb';
    const lead = ant ? 'II' : 'I';
    return {
      rhythms: {
        normal: fascicularRhythm(ant ? 'normal-ii' : 'normal-i'),
        block: fascicularRhythm(ant ? 'lafb' : 'lpfb'),
      },
      scenes: sequence([
        {
          id: 'fascicles', dur: 5, chip: '1 · Two fascicles', rhythm: 'normal', span: secs(W, 0, 2.0), accent: 'blue',
          title: 'The left bundle divides into two fascicles.',
          sub: ant
            ? 'The anterior fascicle is thin and has a single blood supply. The posterior is thick with a double supply.'
            : 'The posterior fascicle is short, thick and has a double blood supply, so it rarely fails alone.',
        },
        {
          id: 'block', dur: 6, chip: ant ? '2 · Anterior blocked' : '2 · Posterior blocked', rhythm: 'block', span: secs(W, 0.3, 1.7), accent: 'red',
          title: ant ? 'The anterior fascicle is blocked.' : 'The posterior fascicle is blocked.',
          sub: ant
            ? 'The impulse still goes down the right bundle and the posterior fascicle.'
            : 'The impulse still goes down the right bundle and the anterior fascicle.',
        },
        {
          id: 'route', dur: 6, chip: '3 · A detour', rhythm: 'block', span: secs(W, 1.2, 2.8), accent: 'orange',
          title: ant
            ? 'The anterior wall is reached late, from below.'
            : 'The inferior wall is reached late, from above.',
          sub: 'The remaining fascicle spreads to the blocked area through muscle. This is slower, but only by a few milliseconds.',
        },
        {
          id: 'axis', dur: 6, chip: '4 · The axis swings', rhythm: 'block', span: secs(W, 2.4, 4.4), accent: 'navy',
          title: ant ? 'The axis swings to the left (−45° to −90°).' : 'The axis swings to the right (+90° or more).',
          sub: ant
            ? `Lead ${lead} shows rS: a small r, then a deep S. Lead I and aVL show a small q and a tall R.`
            : `Lead ${lead} shows rS: a small r, then a deep S. Leads III and aVF show a small q and a tall R.`,
        },
        {
          id: 'narrow', dur: 5, chip: '5 · Still narrow', rhythm: 'block', span: secs(W, 4.0, 6.0), accent: 'blue',
          title: 'The QRS stays under 120 ms.',
          sub: 'Most of the ventricle is activated quickly, so only the axis changes, not the width.',
        },
        {
          id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
          title: ant ? 'Left axis deviation with rS in the inferior leads.' : 'Right axis deviation with rS in lead I.',
          sub: 'Schematic educational example.',
        },
      ]),
      summary: {
        heading: ant ? 'Recognising left anterior fascicular block' : 'Recognising left posterior fascicular block',
        rows: [
          { label: 'QRS axis', value: ant ? 'Left axis deviation, −45° or more negative' : 'Right axis deviation, +90° or more' },
          { label: 'Lead pattern', value: ant ? 'qR in I and aVL, rS in II, III and aVF' : 'rS in I and aVL, qR in III and aVF' },
          { label: 'QRS duration', value: 'Normal or slightly prolonged, under 120 ms' },
          { label: 'Frequency', value: ant ? 'Common' : 'Rare, because the posterior fascicle is short, thick and has a double blood supply' },
          { label: 'Causes', value: ant ? 'Fibrosis, ischaemia (anterior MI), cardiomyopathy, aortic stenosis, hyperkalaemia. A normal variant is possible' : 'Usually extensive disease: inferior MI, fibrosis, cardiomyopathy. Exclude RVH, lung disease and lateral MI first' },
          { label: 'Why it matters', value: 'Alone it is usually benign and needs no treatment. With RBBB it forms bifascicular block, which may progress to complete block' },
        ],
        keyline: ant ? 'Narrow QRS with left axis deviation, rS in II, III and aVF.' : 'Narrow QRS with right axis deviation, rS in lead I.',
        pitfall: ant
          ? 'Inferior MI and other causes of left axis deviation can mimic LAFB. An inferior q wave rules LAFB out.'
          : 'Right ventricular hypertrophy, lung disease and a lateral MI also cause right axis deviation. LPFB is a diagnosis of exclusion.',
      },
    };
  }

  const longPr = id === 'longpr';
  const key = longPr ? 'bifascicular-pr' : 'bifascicular';
  return {
    rhythms: { block: fascicularRhythm(key) },
    scenes: sequence(longPr
      ? [
          {
            id: 'bifasc', dur: 5, chip: '1 · Bifascicular block', rhythm: 'block', span: secs(W, 0, 1.8), accent: 'red',
            title: 'Two of the three fascicles are blocked.',
            sub: 'The right bundle and the left anterior fascicle. The posterior fascicle carries every beat.',
          },
          {
            id: 'long', dur: 6, chip: '2 · A long PR', rhythm: 'block', span: secs(W, 0.2, 2.0), accent: 'orange',
            title: 'The PR interval is also long (280 ms).',
            sub: 'Every P wave still conducts, but slowly.',
          },
          {
            id: 'where', dur: 6, chip: '3 · Where is the delay?', rhythm: 'block', span: secs(W, 1.5, 3.4), accent: 'orange',
            title: 'The delay can be in the AV node or the last fascicle.',
            sub: 'The ECG cannot tell. Only an electrophysiology study measures the His-ventricle (HV) interval.',
          },
          {
            id: 'term', dur: 6, chip: '4 · A word of caution', rhythm: 'block', span: secs(W, 3.0, 5.0), accent: 'navy',
            title: 'This is not proof of trifascicular block.',
            sub: 'A long PR with bifascicular block is usually nodal. Intermittent complete block would be the proof.',
          },
          {
            id: 'plan', dur: 5, chip: '5 · What to do', rhythm: 'block', span: secs(W, 4.4, 6.4), accent: 'blue',
            title: 'Syncope needs a work-up. No symptoms needs observation.',
            sub: 'Avoid drugs that slow AV conduction unless needed. Pace if the cause of syncope is conduction disease.',
          },
          {
            id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
            title: 'Bifascicular block with a first-degree AV block.',
            sub: 'Schematic educational example.',
          },
        ]
      : [
          {
            id: 'rbbb', dur: 5, chip: '1 · Right bundle blocked', rhythm: 'block', span: secs(W, 0, 1.7), accent: 'red',
            title: 'The right bundle branch is blocked.',
            sub: 'V1 shows the rSR′ pattern with a wide QRS.',
          },
          {
            id: 'lafb', dur: 6, chip: '2 · Anterior fascicle too', rhythm: 'block', span: secs(W, 1.0, 2.7), accent: 'red',
            title: 'The left anterior fascicle is also blocked.',
            sub: 'This is the most common pairing (RBBB with LAFB). RBBB with LPFB is rarer.',
          },
          {
            id: 'one', dur: 6, chip: '3 · One fascicle left', rhythm: 'block', span: secs(W, 2.0, 3.9), accent: 'blue',
            title: 'Only the posterior fascicle conducts.',
            sub: 'The whole ventricle depends on one thin pathway.',
          },
          {
            id: 'ecg', dur: 6, chip: '4 · On the ECG', rhythm: 'block', span: secs(W, 3.4, 5.3), accent: 'navy',
            title: 'RBBB plus left axis deviation.',
            sub: 'RBBB in V1 and an rS pattern in the inferior leads from LAFB.',
          },
          {
            id: 'risk', dur: 5, chip: '5 · The risk', rhythm: 'block', span: secs(W, 4.8, 6.4), accent: 'orange',
            title: 'The last fascicle can fail, causing complete block.',
            sub: 'Progression is rare, but it can be sudden.',
          },
          {
            id: 'summary', dur: 6, chip: '6 · Recognise it', rhythm: null, accent: 'navy',
            title: 'RBBB with left or right axis deviation.',
            sub: 'Schematic educational example.',
          },
        ]),
    summary: {
      heading: longPr ? 'Recognising bifascicular block with a long PR' : 'Recognising bifascicular block',
      rows: [
        { label: 'Definition', value: 'RBBB plus block of the left anterior or posterior fascicle' },
        { label: 'ECG', value: 'RBBB (rSR′ in V1, QRS 120 ms or more) with left axis deviation (LAFB) or right axis deviation (LPFB)' },
        { label: 'PR interval', value: longPr ? '280 ms here: first-degree AV block as well. The site of the delay is unknown from the ECG' : 'Normal here (160 ms)' },
        { label: 'Risk', value: 'Progression to complete heart block is uncommon, but rises with syncope, alternating bundle branch block or a long HV interval' },
        { label: 'Causes', value: 'Degenerative fibrosis, ischaemic heart disease, cardiomyopathy, aortic valve disease' },
        { label: 'Management', value: 'No symptoms: observe. Unexplained syncope: electrophysiology study. HV interval of 70 ms or more, or alternating bundle branch block: pacemaker. Avoid drugs that slow AV conduction' },
      ],
      keyline: 'RBBB plus left or right axis deviation, with or without a long PR.',
      pitfall: longPr
        ? 'Do not call every case "trifascicular". A long PR with bifascicular block is usually an AV node delay.'
        : 'RBBB with left axis deviation can also come from inferior MI or LV hypertrophy. Look at the inferior leads for q waves.',
    },
  };
}

export const fascicularLesson: Lesson = {
  id: 'fascicular',
  title: 'Fascicular block: when only part of the left bundle fails',
  short: 'Fascicular blocks',
  blurb: 'The left bundle has two fascicles. Block in one changes the axis, not the width. With RBBB it makes a bifascicular block.',
  rate: 'Axis change',
  optionLabel: 'Pattern',
  options: FASC_OPTIONS,
  defaultOption: 'lafb',
  diagram: { fascicles: true, bundleLabels: true },
  previewKey: 'block',
  legend: bundleLegend,
  build: buildFascicular,
};
