import {
  DDD_STATES, FAULT_OPTIONS, PACE_MODE_OPTIONS, PHYSIO_OPTIONS, dddRhythm, faultRhythm, pacemakerRhythm, physioRhythm,
  type DddState, type FaultKind, type PaceMode, type PhysioKind,
} from '../rhythms/pacing';
import type { RhythmDef } from '../engine/types';
import { secs, sequence } from './sequence';
import type { Lesson, LessonBuild, LegendItem, LessonScene, RecognitionSummary } from './types';
import type { SceneSpec } from './sequence';

const pacerLegend: LegendItem[] = [
  { tone: 'teal', text: 'Pacemaker output' },
  { tone: 'blue', text: 'Native (sensed) activation' },
  { tone: 'orange', text: 'Slow spread through muscle' },
  { tone: 'red', text: 'Not conducted or not captured' },
];

const summaryScene = (n: number, title: string): SceneSpec => ({
  id: 'summary', dur: 6, chip: `${n} · Recognise it`, rhythm: null, accent: 'navy', title, sub: 'Schematic educational example.',
});

interface Plan {
  rhythms: Record<string, RhythmDef>;
  scenes: LessonScene[];
  summary: RecognitionSummary;
}

/* ---------- Pacing modes ---------- */

const MODE_NOTE = 'Rate response (the letter R, as in VVIR or DDDR) lets a sensor raise the paced rate with activity. It is not shown on these strips.';

function singleMode(mode: PaceMode): Plan {
  const rhythm = pacemakerRhythm(mode);
  const W = rhythm.window;
  const k = mode;
  switch (mode) {
    case 'aai':
      return {
        rhythms: { [k]: rhythm },
        scenes: sequence([
          { id: 'sensed', dur: 5, chip: '1 · Sinus sensed', rhythm: k, span: secs(W, 0, 2.5), accent: 'blue',
            title: 'Sinus P waves are sensed, so the pacemaker stays quiet.',
            sub: 'Inhibited: no spikes while the atrial rate is above the lower rate limit (60 per minute).' },
          { id: 'stop', dur: 6, chip: '2 · The sinus node stops', rhythm: k, span: secs(W, 2.0, 3.4), accent: 'red',
            title: 'No P wave for one full second.',
            sub: 'The timer runs out at 1.0 s, the lower rate limit.' },
          { id: 'paced', dur: 6, chip: '3 · Atrial pacing', rhythm: k, span: secs(W, 3.0, 5.6), accent: 'teal',
            title: 'A small spike, then a P wave, then a narrow QRS.',
            sub: 'The atrium is paced at 60 per minute. AV conduction is normal, so the QRS is narrow.' },
          { id: 'inhibit', dur: 6, chip: '4 · Sinus returns', rhythm: k, span: secs(W, 5.2, 8.4), accent: 'blue',
            title: 'The sinus node recovers and inhibits the pacemaker.',
            sub: 'A sensed P wave before the timer ends resets it. No spike is fired.' },
          summaryScene(5, 'A spike before a P wave, with a narrow QRS.'),
        ]),
        summary: {
          heading: 'Recognising AAI pacing',
          rows: [
            { label: 'NBG code', value: 'A paced, A sensed, I (inhibited by a sensed P wave)' },
            { label: 'Spike', value: 'Small atrial spike, then a P wave, then the patient’s own narrow QRS' },
            { label: 'Rate', value: 'Lower rate limit 60 per minute here. Native sinus beats suppress the spikes' },
            { label: 'Indication', value: 'Sinus node dysfunction with normal AV conduction' },
            { label: 'Limit', value: 'No ventricular backup. AV block can develop later, so DDD is usually chosen' },
            { label: 'Rate response', value: MODE_NOTE },
          ],
          keyline: 'A spike, a P wave and a narrow QRS, only when the sinus node is slow.',
          pitfall: 'A small atrial spike can be hard to see. Look for a P wave with a fixed interval from the last P wave.',
        },
      };
    case 'vvi':
      return {
        rhythms: { [k]: rhythm },
        scenes: sequence([
          { id: 'native', dur: 5, chip: '1 · Native beats', rhythm: k, span: secs(W, 0, 2.0), accent: 'blue',
            title: 'Conducted QRS complexes keep the pacemaker quiet.',
            sub: 'The device senses each QRS and resets its timer. No spikes.' },
          { id: 'wait', dur: 6, chip: '2 · AV block begins', rhythm: k, span: secs(W, 1.8, 2.8), accent: 'red',
            title: 'P waves stop conducting. One second passes with no QRS.',
            sub: 'The lower rate limit timer reaches 1.0 s and the pacemaker fires.' },
          { id: 'paced', dur: 6, chip: '3 · Ventricular pacing', rhythm: k, span: secs(W, 2.3, 4.6), accent: 'teal',
            title: 'A spike, then a wide QRS, at 60 per minute.',
            sub: 'The impulse starts at the right ventricular apex and spreads slowly through muscle.' },
          { id: 'dissociation', dur: 6, chip: '4 · AV dissociation', rhythm: k, span: secs(W, 3.0, 4.8), accent: 'navy',
            title: 'The P waves carry on independently.',
            sub: 'VVI does not follow the atria, so atrial and ventricular activity are unrelated.' },
          { id: 'inhibit', dur: 5, chip: '5 · Conduction returns', rhythm: k, span: secs(W, 4.3, 6.5), accent: 'blue',
            title: 'A native QRS appears and inhibits the pacemaker.',
            sub: 'Narrow QRS complexes, and no spikes.' },
          summaryScene(6, 'A spike followed by a wide QRS, only when the heart is slow.'),
        ]),
        summary: {
          heading: 'Recognising VVI pacing',
          rows: [
            { label: 'NBG code', value: 'V paced, V sensed, I (inhibited by a sensed QRS)' },
            { label: 'Spike', value: 'Ventricular spike, then a wide LBBB-like QRS (right ventricular pacing)' },
            { label: 'Rate', value: 'Fires only if no QRS is sensed for 1.0 s (60 per minute)' },
            { label: 'Drawback', value: 'AV dissociation and loss of atrial kick can cause pacemaker syndrome (low output, neck pulsation, hypotension)' },
            { label: 'Leadless pacemakers', value: 'A leadless pacemaker in the right ventricle (for example Micra) works as VVI or VVIR. The ECG looks the same as a transvenous VVI pacemaker' },
            { label: 'Rate response', value: MODE_NOTE },
          ],
          keyline: 'A spike followed by a wide QRS, only after a pause.',
          pitfall: 'A native beat that arrives just before the timer ends inhibits a spike. Fusion and pseudofusion beats are normal.',
        },
      };
    case 'voo':
      return {
        rhythms: { [k]: rhythm },
        scenes: sequence([
          { id: 'native', dur: 5, chip: '1 · Native rhythm', rhythm: k, span: secs(W, 0, 1.7), accent: 'blue',
            title: 'Conducted beats, sensed normally.',
            sub: 'In a normal pacing mode the device would stay quiet.' },
          { id: 'magnet', dur: 6, chip: '2 · Magnet applied', rhythm: k, span: secs(W, 1.4, 2.4), accent: 'teal',
            title: 'A magnet turns off sensing.',
            sub: 'The pacemaker paces asynchronously at a fixed rate (here about 86 per minute) whatever the heart does.' },
          { id: 'refractory', dur: 6, chip: '3 · Refractory', rhythm: k, span: secs(W, 2.2, 3.5), accent: 'red',
            title: 'A spike after a native beat finds the muscle refractory.',
            sub: 'It does nothing. A spike only captures if the ventricle has recovered (about 300 ms).' },
          { id: 'compete', dur: 6, chip: '4 · Competition', rhythm: k, span: secs(W, 3.2, 5.8), accent: 'orange',
            title: 'Native beats and spikes compete for the ventricle.',
            sub: 'The rhythm looks irregular. Some spikes capture and some are wasted.' },
          { id: 'danger', dur: 5, chip: '5 · Vulnerable period', rhythm: k, span: secs(W, 5.2, 8.2), accent: 'red',
            title: 'A spike on the T wave is the theoretical risk.',
            sub: 'Rarely it triggers VT or VF, which is why asynchronous pacing is used only briefly.' },
          summaryScene(6, 'Fixed-rate spikes that ignore the native beats.'),
        ]),
        summary: {
          heading: 'Recognising asynchronous (VOO) pacing',
          rows: [
            { label: 'NBG code', value: 'V paced, O sensing, O response: no sensing at all' },
            { label: 'Spikes', value: 'Fixed rate and independent of the native QRS. Some capture and some fall in refractory tissue' },
            { label: 'Magnet', value: 'Placing a magnet over a pacemaker usually causes asynchronous pacing. The rate varies by manufacturer' },
            { label: 'ICD magnet', value: 'A magnet over an ICD suspends tachycardia therapy only. It does not change the pacing mode' },
            { label: 'Use', value: 'Surgery with electrocautery in pacemaker-dependent patients, or to test for oversensing' },
            { label: 'Risk', value: 'Competition with native beats and, rarely, a spike on the T wave' },
            { label: 'Rate response', value: MODE_NOTE },
          ],
          keyline: 'Regular spikes that march through the native rhythm.',
          pitfall: 'Undersensing also gives spikes that ignore native beats. After a magnet this is expected. Without a magnet it signals a fault.',
        },
      };
    case 'vdd':
      return {
        rhythms: { [k]: rhythm },
        scenes: sequence([
          { id: 'track', dur: 5, chip: '1 · P wave tracked', rhythm: k, span: secs(W, 0, 2.4), accent: 'blue',
            title: 'The sensed P wave triggers a ventricular spike.',
            sub: 'After the sensed AV delay (170 ms) the ventricle is paced. The ventricle follows the atrium.' },
          { id: 'slow', dur: 6, chip: '2 · Sinus slows', rhythm: k, span: secs(W, 1.9, 3.3), accent: 'red',
            title: 'The sinus rate drops below the lower rate limit.',
            sub: 'No P wave arrives for 1.0 s, so the ventricle is paced on its own timer.' },
          { id: 'ignored', dur: 6, chip: '3 · P in refractory', rhythm: k, span: secs(W, 3.0, 4.5), accent: 'orange',
            title: 'A P wave right after a paced beat is ignored.',
            sub: 'It falls in the post-ventricular atrial refractory period, so it does not start a new cycle.' },
          { id: 'resume', dur: 6, chip: '4 · Tracking resumes', rhythm: k, span: secs(W, 4.4, 7.4), accent: 'blue',
            title: 'The sinus rate rises and the ventricle follows again.',
            sub: 'Each P wave is tracked. Atrial and ventricular activity are synchronised.' },
          { id: 'limit', dur: 5, chip: '5 · The limit', rhythm: k, span: secs(W, 5.6, 8.2), accent: 'navy',
            title: 'VDD never paces the atrium.',
            sub: 'If the sinus node fails, only the ventricle is paced, as in VVI. A DDD pacemaker would pace both.' },
          summaryScene(6, 'A spike after each sensed P wave, never before one.'),
        ]),
        summary: {
          heading: 'Recognising VDD pacing',
          rows: [
            { label: 'NBG code', value: 'V paced, D sensed (A and V), D response (inhibits and triggers)' },
            { label: 'Pattern', value: 'Each tracked P wave is followed by a ventricular spike after the sensed AV delay' },
            { label: 'No atrial spike', value: 'The atrium is never paced. A slow sinus node leaves the device pacing at the lower rate' },
            { label: 'Indication', value: 'AV block with a healthy sinus node. Older single-lead VDD systems have a floating atrial electrode' },
            { label: 'Leadless', value: 'Leadless pacemakers with atrial mechanical sensing (for example Micra AV) can track the atrium and behave like VDD' },
            { label: 'Rate response', value: MODE_NOTE },
          ],
          keyline: 'A spike after each sensed P wave, never a spike before a P wave.',
          pitfall: 'A paced QRS after every P wave looks like DDD with AS-VP. The difference is that an AP–VP sequence never occurs.',
        },
      };
    case 'ddi':
      return {
        rhythms: { [k]: rhythm },
        scenes: sequence([
          { id: 'sense', dur: 5, chip: '1 · Sinus sensed', rhythm: k, span: secs(W, 0, 1.6), accent: 'blue',
            title: 'The sinus rate is above the lower rate limit.',
            sub: 'The device senses each P wave and withholds atrial pacing.' },
          { id: 'timer', dur: 6, chip: '2 · No tracking', rhythm: k, span: secs(W, 0.6, 3.2), accent: 'teal',
            title: 'The ventricle is paced on a fixed 1.0 s timer.',
            sub: 'Unlike DDD, a sensed P wave does not trigger a ventricular spike.' },
          { id: 'dissociation', dur: 6, chip: '3 · AV dissociation', rhythm: k, span: secs(W, 2.4, 4.5), accent: 'navy',
            title: 'P waves and paced QRS complexes are unrelated.',
            sub: 'The PR interval keeps changing. The ventricle cannot follow the faster sinus rate.' },
          { id: 'slows', dur: 5, chip: '4 · Atrial pacing', rhythm: k, span: secs(W, 4.0, 5.6), accent: 'teal',
            title: 'The sinus node slows below 60 per minute.',
            sub: 'Atrial pacing begins because no P wave was sensed in time.' },
          { id: 'sequential', dur: 6, chip: '5 · AV sequential', rhythm: k, span: secs(W, 4.6, 7.8), accent: 'teal',
            title: 'Atrial spike, then a ventricular spike 200 ms later.',
            sub: 'Both chambers are paced in sequence. This is the paced AV delay.' },
          summaryScene(6, 'Atrial pacing only when slow, but never tracking.'),
        ]),
        summary: {
          heading: 'Recognising DDI pacing',
          rows: [
            { label: 'NBG code', value: 'D paced, D sensed, I (inhibited). It does not trigger on a sensed P wave' },
            { label: 'Ventricle', value: 'Paced on the lower rate timer, not tied to sensed P waves' },
            { label: 'Atrium', value: 'Paced only if the sinus node is too slow' },
            { label: 'Consequence', value: 'The ventricular rate cannot rise above the lower rate while the sinus rate is higher, so there is AV dissociation' },
            { label: 'Use', value: 'Mode switching during atrial fibrillation or flutter, so fast atrial rates are not tracked' },
            { label: 'Rate response', value: MODE_NOTE },
          ],
          keyline: 'Atrial pacing when slow, but P waves never trigger a ventricular spike.',
          pitfall: 'DDD tracks the sinus rate. DDI does not. If the paced rate stays at 60 while the sinus rate is 86, think DDI or mode switch.',
        },
      };
  }
}

const DDD_SCENES: Record<DddState, { chip: string; title: string; sub: string; accent: 'blue' | 'teal' | 'orange' }> = {
  'as-vp': {
    chip: '1 · AS–VP', accent: 'blue',
    title: 'AS–VP: sinus P wave sensed, ventricle paced.',
    sub: 'The sinus node works, the AV node does not. A spike follows each P wave after the sensed AV delay (170 ms).',
  },
  'ap-vp': {
    chip: '2 · AP–VP', accent: 'teal',
    title: 'AP–VP: atrium and ventricle both paced.',
    sub: 'Sinus node failure and AV block. Two spikes, 200 ms apart (the paced AV delay).',
  },
  'ap-vs': {
    chip: '3 · AP–VS', accent: 'orange',
    title: 'AP–VS: atrium paced, ventricle senses the native QRS.',
    sub: 'Sinus node failure with intact AV conduction. The native QRS arrives in time, so the ventricular spike is inhibited.',
  },
  'as-vs': {
    chip: '4 · AS–VS', accent: 'blue',
    title: 'AS–VS: nothing is paced.',
    sub: 'Native P wave and native QRS. The device only watches and is ready to help.',
  },
};

function dddMode(): Plan {
  const rhythms: Record<string, RhythmDef> = {};
  for (const s of DDD_STATES) rhythms[s] = dddRhythm(s);
  return {
    rhythms,
    scenes: sequence([
      ...DDD_STATES.map((s): SceneSpec => ({
        id: s, dur: 6, chip: DDD_SCENES[s].chip, rhythm: s, span: secs(rhythms[s].window, 0.1, 3.4),
        accent: DDD_SCENES[s].accent, title: DDD_SCENES[s].title, sub: DDD_SCENES[s].sub,
      })),
      summaryScene(5, 'One pacemaker, four states, depending on what the heart does.'),
    ]),
    summary: {
      heading: 'Recognising DDD pacing',
      rows: [
        { label: 'NBG code', value: 'D paced, D sensed, D response (inhibits and tracks)' },
        { label: 'AS–VP', value: 'Sensed P wave, spike 170 ms later, wide QRS' },
        { label: 'AP–VP', value: 'Atrial spike, then a ventricular spike 200 ms later, wide QRS' },
        { label: 'AP–VS', value: 'Atrial spike, then the native narrow QRS. No ventricular spike' },
        { label: 'AS–VS', value: 'No spikes at all. Native P wave and QRS' },
        { label: 'Extras', value: 'An upper tracking limit stops fast atrial rates driving the ventricle (pacemaker Wenckebach or 2:1). Mode switching handles atrial fibrillation. ' + MODE_NOTE },
      ],
      keyline: 'Two spikes, one spike, or none: the state shows what the heart is doing for itself.',
      pitfall: 'An unusually short PR in AP–VS may hide a ventricular spike inside the QRS. If a spike lies on the QRS, it is pseudofusion.',
    },
  };
}

function buildPacemaker(option: string | undefined): LessonBuild {
  const id = PACE_MODE_OPTIONS.find((o) => o.id === option)?.id ?? 'vvi';
  return id === 'ddd' ? dddMode() : singleMode(id as PaceMode);
}

export const pacemakerLesson: Lesson = {
  id: 'pacemaker',
  title: 'Pacemakers: AAI, VVI, VOO, VDD, DDI and DDD',
  short: 'Pacemaker modes',
  blurb: 'Where the device paces, where it senses and how it responds. Each mode leaves its own signature on the ECG.',
  rate: 'LRL 60 /min',
  optionLabel: 'Pacing mode',
  options: PACE_MODE_OPTIONS,
  defaultOption: 'vvi',
  diagram: { pacemaker: { atrial: true, rv: true } },
  diagramFor: (option) => ({
    pacemaker: option === 'aai' ? { atrial: true } : option === 'ddi' || option === 'ddd' ? { atrial: true, rv: true } : { rv: true },
  }),
  previewKey: 'vvi',
  legend: pacerLegend,
  build: buildPacemaker,
};

/* ---------- Ventricular pacing sites ---------- */

function buildPhysio(option: string | undefined): LessonBuild {
  const kind = (PHYSIO_OPTIONS.find((o) => o.id === option)?.id ?? 'rv') as PhysioKind;
  const rhythm = physioRhythm(kind);
  const W = rhythm.window;
  const k = kind;
  const steps: SceneSpec[] =
    kind === 'rv'
      ? [
          { id: 'trigger', dur: 5, chip: '1 · Sensed P, paced V', rhythm: k, span: secs(W, 0, 1.8), accent: 'teal',
            title: 'A sensed P wave triggers a spike after 170 ms.',
            sub: 'AV block: the pacemaker supplies the missing conduction.' },
          { id: 'spread', dur: 6, chip: '2 · Spread from the apex', rhythm: k, span: secs(W, 0.3, 1.7), accent: 'orange',
            title: 'The impulse starts at the right ventricular apex.',
            sub: 'It spreads slowly from cell to cell, not through the fast His-Purkinje system.' },
          { id: 'wide', dur: 6, chip: '3 · Wide QRS', rhythm: k, span: secs(W, 1.2, 3.2), accent: 'navy',
            title: 'The QRS is about 170 ms with an LBBB pattern.',
            sub: 'The right ventricle is activated first and the left ventricle late.' },
          { id: 'risk', dur: 6, chip: '4 · Dyssynchrony', rhythm: k, span: secs(W, 2.8, 5.0), accent: 'red',
            title: 'The walls contract at different times.',
            sub: 'A high pacing burden can lead to pacing-induced cardiomyopathy in some patients.' },
          { id: 'alt', dur: 5, chip: '5 · Alternatives', rhythm: k, span: secs(W, 4.2, 6.2), accent: 'blue',
            title: 'Other pacing sites restore a more normal activation.',
            sub: 'Biventricular pacing and conduction-system pacing are compared in the next options.' },
          summaryScene(6, 'A spike followed by a wide QRS with a left bundle branch block pattern.'),
        ]
      : kind === 'biv'
        ? [
            { id: 'leads', dur: 5, chip: '1 · Two ventricular leads', rhythm: k, span: secs(W, 0, 1.8), accent: 'teal',
              title: 'One lead in the right ventricle and one on the left.',
              sub: 'The left lead sits in a coronary sinus vein on the lateral wall of the left ventricle.' },
            { id: 'both', dur: 6, chip: '2 · Paced together', rhythm: k, span: secs(W, 0.3, 1.7), accent: 'teal',
              title: 'Both leads fire at the same moment.',
              sub: 'Two wavefronts spread from opposite walls toward each other.' },
            { id: 'meet', dur: 6, chip: '3 · The wavefronts meet', rhythm: k, span: secs(W, 1.2, 3.2), accent: 'orange',
              title: 'The ventricles are activated sooner and together.',
              sub: 'The QRS is narrower than with right ventricular pacing alone (about 120 ms).' },
            { id: 'who', dur: 6, chip: '4 · Who benefits', rhythm: k, span: secs(W, 2.8, 5.0), accent: 'navy',
              title: 'Heart failure with LBBB and a wide QRS.',
              sub: 'LVEF 35% or less, QRS 150 ms or more with LBBB, symptomatic on medical therapy.' },
            { id: 'check', dur: 5, chip: '5 · Check capture', rhythm: k, span: secs(W, 4.2, 6.2), accent: 'red',
              title: 'If the left lead stops capturing, the QRS widens again.',
              sub: 'It then looks like right ventricular pacing. Aim for more than 98% biventricular pacing.' },
            summaryScene(6, 'A paced QRS that is narrower than right ventricular pacing.'),
          ]
        : [
            { id: 'lead', dur: 5, chip: '1 · A lead at the conduction system', rhythm: k, span: secs(W, 0, 1.8), accent: 'teal',
              title: 'The lead sits at the His bundle or the left bundle area.',
              sub: 'It is placed in the septum, not at the apex.' },
            { id: 'fast', dur: 6, chip: '2 · The fast pathway', rhythm: k, span: secs(W, 0.3, 1.7), accent: 'blue',
              title: 'The impulse enters the His-Purkinje system.',
              sub: 'It travels along the normal fast fibres to both ventricles.' },
            { id: 'narrow', dur: 6, chip: '3 · Narrow QRS', rhythm: k, span: secs(W, 1.2, 3.2), accent: 'navy',
              title: 'The QRS is about 100 ms, close to native.',
              sub: 'Both ventricles are activated almost together.' },
            { id: 'benefit', dur: 6, chip: '4 · Why use it', rhythm: k, span: secs(W, 2.8, 5.0), accent: 'blue',
              title: 'It keeps the contraction synchronised.',
              sub: 'Used for AV block, and as an alternative to biventricular pacing for resynchronisation.' },
            { id: 'limits', dur: 5, chip: '5 · Limits', rhythm: k, span: secs(W, 4.2, 6.2), accent: 'orange',
              title: 'Thresholds can be higher and may rise over time.',
              sub: 'The QRS is not always as narrow as native, especially with left bundle area pacing.' },
            summaryScene(6, 'A spike followed by a narrow QRS.'),
          ];
  const heading: Record<PhysioKind, string> = {
    rv: 'Recognising right ventricular apical pacing',
    biv: 'Recognising biventricular (CRT) pacing',
    csp: 'Recognising conduction-system pacing',
  };
  const rows: Record<PhysioKind, RecognitionSummary['rows']> = {
    rv: [
      { label: 'Lead position', value: 'Right ventricular apex or septum' },
      { label: 'QRS', value: 'Wide (about 170 ms), LBBB pattern, with a left-axis deviation if the lead is at the apex' },
      { label: 'Spike', value: 'Visible spike, then a wide QRS' },
      { label: 'Mechanism', value: 'Slow muscle-to-muscle spread. The left ventricle is activated late' },
      { label: 'Concern', value: 'Pacing-induced cardiomyopathy with a high ventricular pacing burden (above about 20–40%)' },
      { label: 'Leadless', value: 'A leadless pacemaker in the right ventricle looks the same' },
    ],
    biv: [
      { label: 'Lead position', value: 'Right ventricle and a coronary sinus vein on the left ventricle' },
      { label: 'QRS', value: 'Narrower than right ventricular pacing (about 120 ms here)' },
      { label: 'Spike', value: 'One or two spikes close together, then a paced QRS' },
      { label: 'Mechanism', value: 'Two wavefronts that meet in the middle' },
      { label: 'Indication', value: 'LVEF 35% or less, symptomatic, QRS 150 ms or more with LBBB. Also patients expected to need frequent ventricular pacing' },
      { label: 'Check', value: 'Loss of left ventricular capture makes the QRS look like right ventricular pacing' },
    ],
    csp: [
      { label: 'Lead position', value: 'His bundle or left bundle branch area' },
      { label: 'QRS', value: 'Narrow (about 100 ms here), close to native' },
      { label: 'Spike', value: 'Spike followed by a narrow QRS with a short stimulus-to-QRS interval' },
      { label: 'Mechanism', value: 'The impulse uses the fast His-Purkinje system' },
      { label: 'Indication', value: 'AV block, and an alternative when biventricular pacing is not possible or fails' },
      { label: 'Limits', value: 'Higher and less stable thresholds, and technical difficulty. Left bundle area pacing can show an RBBB-like pattern in V1' },
    ],
  };
  const keyline: Record<PhysioKind, string> = {
    rv: 'Wide LBBB-like QRS after a ventricular spike.',
    biv: 'A paced QRS that is narrower than right ventricular pacing, with a dominant R wave in V1 when the left lead captures.',
    csp: 'A narrow QRS after a ventricular spike.',
  };
  return {
    rhythms: { [k]: rhythm },
    scenes: sequence(steps),
    summary: {
      heading: heading[kind],
      rows: rows[kind],
      keyline: keyline[kind],
      pitfall: kind === 'rv'
        ? 'A native LBBB looks the same. The pacing spike is the only clue.'
        : kind === 'biv'
          ? 'A narrow paced QRS with a spike may be conduction-system pacing instead of biventricular pacing. Check the lead positions on chest X-ray.'
          : 'A narrow QRS after a spike can be a native beat with a pseudofusion spike. Look for the stimulus-to-QRS delay.',
    },
  };
}

export const physioLesson: Lesson = {
  id: 'pacing-physio',
  title: 'Where the ventricle is paced: RV, CRT and conduction-system pacing',
  short: 'Pacing sites and CRT',
  blurb: 'The same spike produces a very different QRS depending on where it is delivered.',
  rate: 'QRS 100–170 ms',
  optionLabel: 'Pacing site',
  options: PHYSIO_OPTIONS,
  defaultOption: 'rv',
  diagram: { pacemaker: { rv: true } },
  diagramFor: (option) => ({ pacemaker: option === 'biv' ? { rv: true, lv: true } : option === 'csp' ? { his: true } : { rv: true } }),
  previewKey: 'rv',
  legend: pacerLegend,
  build: buildPhysio,
};

/* ---------- Pacemaker malfunction ---------- */

function buildFault(option: string | undefined): LessonBuild {
  const kind = (FAULT_OPTIONS.find((o) => o.id === option)?.id ?? 'capture') as FaultKind;
  const rhythm = faultRhythm(kind);
  const W = rhythm.window;
  const k = kind;
  const common = (
    heading: string, rows: RecognitionSummary['rows'], keyline: string, pitfall: string,
  ): RecognitionSummary => ({ heading, rows, keyline, pitfall });

  if (kind === 'capture') {
    return {
      rhythms: { [k]: rhythm },
      scenes: sequence([
        { id: 'normal', dur: 5, chip: '1 · Normal capture', rhythm: k, span: secs(W, 0, 2.2), accent: 'teal',
          title: 'Each spike is followed by a wide QRS.',
          sub: 'The output is enough to depolarise the ventricle. The red P-wave dots cannot conduct, so this patient depends on pacing.' },
        { id: 'fail', dur: 6, chip: '2 · Spike, no QRS', rhythm: k, span: secs(W, 2.0, 3.4), accent: 'red',
          title: 'A spike on time with no QRS after it.',
          sub: 'Failure to capture: the pacemaker fires but the ventricle does not respond.' },
        { id: 'pause', dur: 6, chip: '3 · Pauses', rhythm: k, span: secs(W, 2.0, 4.7), accent: 'navy',
          title: 'The pauses are 2 to 3 seconds long.',
          sub: 'The heart rate falls. A patient who depends on the pacemaker may faint.' },
        { id: 'intermittent', dur: 6, chip: '4 · Intermittent', rhythm: k, span: secs(W, 4.2, 7.0), accent: 'orange',
          title: 'Some spikes capture and some do not.',
          sub: 'The threshold is hovering just above the programmed output.' },
        { id: 'causes', dur: 5, chip: '5 · Why it happens', rhythm: k, span: secs(W, 6.0, 8.4), accent: 'red',
          title: 'The capture threshold has risen.',
          sub: 'Lead dislodgement, fibrosis at the tip, MI, hyperkalaemia, drugs such as flecainide, or a fractured lead.' },
        summaryScene(6, 'Spikes at a regular rate, with some spikes missing a QRS.'),
      ]),
      summary: common(
        'Recognising failure to capture',
        [
          { label: 'Spikes', value: 'Present and on time at the programmed rate' },
          { label: 'QRS', value: 'Missing after some or all spikes' },
          { label: 'Effect', value: 'Bradycardia, pauses, syncope in pacemaker-dependent patients' },
          { label: 'Causes', value: 'Lead dislodgement or perforation, rising threshold (fibrosis, MI), hyperkalaemia and other metabolic changes, class IC antiarrhythmics, lead fracture, battery depletion' },
          { label: 'Do not confuse', value: 'A spike inside the QRS or T wave of a native beat falls in refractory tissue. That is normal, not failure to capture' },
          { label: 'Management', value: 'Interrogate the device, increase the output, correct the metabolic cause, and revise the lead if needed. Temporary pacing if unstable' },
        ],
        'Pacing spikes that are not followed by a QRS.',
        'A spike falling on a native QRS or T wave is normal refractory behaviour. Check whether the ventricle was able to respond.',
      ),
    };
  }
  if (kind === 'undersensing') {
    return {
      rhythms: { [k]: rhythm },
      scenes: sequence([
        { id: 'native', dur: 5, chip: '1 · Native beats', rhythm: k, span: secs(W, 0, 1.3), accent: 'blue',
          title: 'The patient has their own conducted beats.',
          sub: 'A working pacemaker would sense them and stay quiet.' },
        { id: 'ignored', dur: 6, chip: '2 · Not sensed', rhythm: k, span: secs(W, 1.0, 2.6), accent: 'red',
          title: 'A spike fires right after a native QRS.',
          sub: 'The pacemaker did not see the QRS. It fires anyway.' },
        { id: 'timer', dur: 6, chip: '3 · Its own timer', rhythm: k, span: secs(W, 1.3, 4.0), accent: 'teal',
          title: 'Spikes march on at 60 per minute regardless of the native rhythm.',
          sub: 'The native rate is 67 per minute, so the two rhythms drift against each other.' },
        { id: 'refractory', dur: 6, chip: '4 · Wasted and risky spikes', rhythm: k, span: secs(W, 3.0, 5.6), accent: 'orange',
          title: 'Spikes in refractory tissue do nothing.',
          sub: 'A spike on the T wave could, rarely, trigger VT or VF.' },
        { id: 'causes', dur: 5, chip: '5 · Why it happens', rhythm: k, span: secs(W, 5.4, 8.4), accent: 'red',
          title: 'The signal is too small to be sensed.',
          sub: 'Low R-wave amplitude, lead dislodgement, MI at the lead tip, or sensitivity set too low.' },
        summaryScene(6, 'Spikes ignoring native QRS complexes.'),
      ]),
      summary: common(
        'Recognising undersensing',
        [
          { label: 'Spikes', value: 'Fire at the programmed rate regardless of the native beats' },
          { label: 'Position', value: 'Spikes fall just after a QRS, on the T wave or anywhere in the cycle' },
          { label: 'Capture', value: 'A spike captures only if the ventricle is no longer refractory' },
          { label: 'Causes', value: 'Low native signal amplitude, lead dislodgement, fibrosis or MI at the tip, sensitivity programmed too insensitive, lead fracture' },
          { label: 'Risk', value: 'Competitive pacing; rarely a spike on the T wave triggers a ventricular arrhythmia' },
          { label: 'Management', value: 'Interrogate the device and make it more sensitive (lower mV value). Reposition the lead if needed' },
        ],
        'Pacing spikes that fire when a native beat should have inhibited them.',
        'A spike on a native T wave can be mistaken for failure to capture. The real problem is that the device did not see the QRS.',
      ),
    };
  }
  if (kind === 'oversensing') {
    return {
      rhythms: { [k]: rhythm },
      scenes: sequence([
        { id: 'pace', dur: 5, chip: '1 · Regular pacing', rhythm: k, span: secs(W, 0, 2.0), accent: 'teal',
          title: 'The pacemaker fires at 60 per minute.',
          sub: 'Each spike is followed by a wide QRS. The red P-wave dots cannot conduct, so this patient depends on pacing.' },
        { id: 'noise', dur: 6, chip: '2 · Noise is sensed', rhythm: k, span: secs(W, 1.8, 3.0), accent: 'red',
          title: 'A burst of noise is mistaken for a heartbeat.',
          sub: 'Muscle potentials, loose connections or interference look like a QRS to the device.' },
        { id: 'withheld', dur: 6, chip: '3 · Spike withheld', rhythm: k, span: secs(W, 2.0, 3.6), accent: 'red',
          title: 'The expected spike never fires.',
          sub: 'The timer restarts from the noise, so the next spike is a full second after it.' },
        { id: 'pause', dur: 6, chip: '4 · A pause', rhythm: k, span: secs(W, 2.0, 4.4), accent: 'navy',
          title: 'The pause is nearly 2 seconds.',
          sub: 'Pacemaker-dependent patients may become dizzy or faint.' },
        { id: 'again', dur: 5, chip: '5 · It repeats', rhythm: k, span: secs(W, 5.2, 7.4), accent: 'orange',
          title: 'Each burst of noise causes another pause.',
          sub: 'Pauses come whenever noise appears, often with movement of the arm.' },
        summaryScene(6, 'Pacing pauses that start with noise on the baseline.'),
      ]),
      summary: common(
        'Recognising oversensing',
        [
          { label: 'Pattern', value: 'Regular pacing with sudden pauses of nearly 2 s that start with noise or an extra signal' },
          { label: 'Mechanism', value: 'The device senses a non-cardiac signal and inhibits its output' },
          { label: 'Causes', value: 'Lead fracture or insulation break, loose set screw, skeletal muscle potentials, electromagnetic interference, T-wave oversensing, far-field or cross-talk sensing' },
          { label: 'Clue', value: 'Noise on the strip, often reproduced by arm movement or pressing on the pocket' },
          { label: 'Magnet test', value: 'A magnet makes the device pace asynchronously, so the spikes return. That shows the output is working and sensing is the problem' },
          { label: 'Management', value: 'Reprogram sensitivity, move the lead or fix the connection, and remove sources of interference' },
        ],
        'Normal pacing that suddenly stops when noise appears.',
        'Failure to output also gives missing spikes. With oversensing, a magnet brings the spikes back.',
      ),
    };
  }
  return {
    rhythms: { [k]: rhythm },
    scenes: sequence([
      { id: 'pace', dur: 5, chip: '1 · Normal pacing', rhythm: k, span: secs(W, 0, 2.8), accent: 'teal',
        title: 'The pacemaker captures with every spike.',
        sub: 'A wide QRS follows each spike at 60 per minute. The red P-wave dots cannot conduct, so this patient depends on pacing.' },
      { id: 'stop', dur: 6, chip: '2 · The spikes stop', rhythm: k, span: secs(W, 2.6, 4.8), accent: 'red',
        title: 'The pacemaker stops firing.',
        sub: 'No spike appears where one is due. The red dots mark the missing spikes.' },
      { id: 'escape', dur: 6, chip: '3 · A slow escape beat', rhythm: k, span: secs(W, 4.4, 6.0), accent: 'purple',
        title: 'A wide ventricular escape beat appears late.',
        sub: 'A slow, wide QRS with no spike. The heart paces itself at 24 per minute.' },
      { id: 'return', dur: 6, chip: '4 · Output returns', rhythm: k, span: secs(W, 6.2, 9.2), accent: 'teal',
        title: 'Pacing resumes, then fails again.',
        sub: 'The fault is intermittent.' },
      { id: 'causes', dur: 5, chip: '5 · Why it happens', rhythm: k, span: secs(W, 3.0, 6.6), accent: 'red',
        title: 'No energy reaches the heart.',
        sub: 'Lead fracture or insulation break, a loose connection, battery depletion, or a circuit failure.' },
      summaryScene(6, 'Missing spikes where pacing is expected.'),
    ]),
    summary: common(
      'Recognising failure to output',
      [
        { label: 'Spikes', value: 'Absent where the programmed rate says they should be' },
        { label: 'Rhythm', value: 'Long pauses, with a slow wide ventricular escape rhythm or asystole if no escape' },
        { label: 'Causes', value: 'Lead fracture or insulation break, loose connection at the header, battery depletion (elective replacement or end of life), component failure' },
        { label: 'Distinguish', value: 'Oversensing also stops spikes. A magnet restores spikes in oversensing but not in true failure to output' },
        { label: 'Danger', value: 'Syncope or arrest in a pacemaker-dependent patient' },
        { label: 'Management', value: 'Urgent device interrogation and chest X-ray. Temporary pacing, then lead or generator replacement' },
      ],
      'No spikes where there should be spikes, even with a magnet.',
      'Oversensing gives the same missing spikes. A magnet response separates them.',
    ),
  };
}

export const faultLesson: Lesson = {
  id: 'pacing-fault',
  title: 'Pacemaker malfunction: capture, sensing and output',
  short: 'Pacemaker malfunction',
  blurb: 'Four ways a pacemaker can fail on the ECG: it fires but does not capture, does not sense, senses too much, or does not fire.',
  rate: 'Variable',
  optionLabel: 'Problem',
  options: FAULT_OPTIONS,
  defaultOption: 'capture',
  diagram: { pacemaker: { rv: true } },
  previewKey: 'capture',
  legend: [
    { tone: 'teal', text: 'Pacemaker output' },
    { tone: 'red', text: 'Not captured, not sensed or missing' },
    { tone: 'purple', text: 'Ventricular escape' },
  ],
  build: buildFault,
};
