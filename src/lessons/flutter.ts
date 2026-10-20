import { FLUTTER_PATTERNS, flutterRhythm, type FlutterPattern } from '../rhythms/flutter';
import { sequence } from './sequence';
import type { Lesson, LessonBuild } from './types';

const RESPONSE: Record<FlutterPattern, { title: string; sub: string; rate: string; rhythm: string; rows: string }> = {
  '2:1': {
    title: '2:1 conduction: every second flutter wave gets through.',
    sub: 'A regular ventricular rate of about 150 per minute.',
    rate: 'Regular, about 150 per minute',
    rhythm: 'Regular',
    rows: 'A fixed rate near 150 per minute should prompt a search for hidden flutter waves',
  },
  '4:1': {
    title: '4:1 conduction: every fourth flutter wave gets through.',
    sub: 'A regular ventricular rate of about 75 per minute.',
    rate: 'Regular, about 75 per minute',
    rhythm: 'Regular',
    rows: 'The slower rate makes the sawtooth easy to see between the QRS complexes',
  },
  variable: {
    title: 'Variable conduction: the AV node switches between ratios.',
    sub: 'The R-R intervals are irregular, but they are multiples of the flutter cycle.',
    rate: 'Irregular, but patterned',
    rhythm: 'Irregular, in steps of the flutter cycle',
    rows: 'Every R-R interval is a whole multiple of the flutter cycle length',
  },
};

function build(option: string | undefined): LessonBuild {
  const pattern = (FLUTTER_PATTERNS.find((p) => p.id === option)?.id ?? '2:1') as FlutterPattern;
  const r = RESPONSE[pattern];
  const key = `flutter-${pattern}`;
  return {
    rhythms: { [key]: flutterRhythm(pattern) },
    scenes: sequence([
      {
        id: 'circuit', dur: 6, chip: '1 · Circuit', rhythm: key, span: [0, 0.5], accent: 'blue',
        title: 'One circuit loops through the right atrium.',
        sub: 'It repeats about 300 times a minute, with no resting gap between laps.',
      },
      {
        id: 'sawtooth', dur: 5, chip: '2 · Flutter waves', rhythm: key, span: [0.25, 0.75], accent: 'purple',
        title: 'Every lap is the same flutter wave.',
        sub: 'Organised, regular and sawtooth, with no flat baseline between waves.',
      },
      {
        id: 'node', dur: 6, chip: '3 · AV node', rhythm: key, span: [0.5, 1], accent: 'red',
        title: 'The AV node cannot follow 300 per minute.',
        sub: 'It blocks some flutter waves and conducts others.',
      },
      { id: 'response', dur: 7, chip: `4 · ${pattern === 'variable' ? 'Variable' : pattern}`, rhythm: key, accent: 'orange', title: r.title, sub: r.sub },
      {
        id: 'summary', dur: 6, chip: '5 · Recognise it', rhythm: null, accent: 'navy',
        title: 'Sawtooth waves with a fixed flutter-to-QRS timing.',
        sub: 'Schematic educational example.',
      },
    ]),
    summary: {
      heading: `Recognising atrial flutter (${pattern === 'variable' ? 'variable' : pattern} conduction)`,
      rows: [
        { label: 'Atrial activity', value: 'Sawtooth flutter waves, about 300 per minute; polarity simplified in this schematic' },
        { label: 'Baseline', value: 'No isoelectric gap between flutter waves' },
        { label: 'Ventricular rhythm', value: r.rate },
        { label: 'QRS', value: 'Narrow' },
        { label: 'Mechanism', value: 'Macro re-entry circuit in the atrium; the AV node sets the conduction ratio' },
        { label: 'Tip', value: r.rows },
      ],
      keyline: 'Regular sawtooth atrial waves at about 300 per minute.',
      pitfall:
        'Atrial tachycardia also has organised P waves, but it keeps a flat baseline between them and a slower atrial rate.',
    },
  };
}

export const flutterLesson: Lesson = {
  id: 'flutter',
  title: 'Atrial flutter: an organised circuit and the AV node',
  short: 'Atrial flutter',
  blurb: 'A single atrial circuit at about 300 per minute. The AV node decides how many waves reach the ventricles.',
  rate: 'Atrial ≈300 · ventricular depends on ratio',
  optionLabel: 'AV conduction pattern',
  options: FLUTTER_PATTERNS.map((p) => ({ id: p.id, label: p.label })),
  defaultOption: '2:1',
  diagram: { flutterCircuit: true },
  previewKey: 'flutter-2:1',
  legend: [
    { tone: 'blue', text: 'Flutter circuit and blocked waves' },
    { tone: 'orange', text: 'Wave conducted to the ventricles' },
    { tone: 'red', text: 'Wave blocked in the AV node' },
  ],
  build,
};
