import type { TimedScene } from '../engine/timeline';
import type { RhythmDef, Tone } from '../engine/types';

export type LessonId =
  | 'avnrt'
  | 'avrt'
  | 'wpw'
  | 'aberrancy'
  | 'af'
  | 'flutter'
  | 'at'
  | 'junctional'
  | 'ventricular'
  | 'pvc'
  | 'vt'
  | 'torsades'
  | 'vf'
  | 'hypokalemia'
  | 'hyperkalemia';

/** One caption-synchronised step of a lesson. */
export interface LessonScene extends TimedScene {
  /** Short step label shown above the caption. */
  chip: string;
  title: string;
  sub: string;
  accent: Tone;
  /** 'summary' scenes show the recognition summary instead of the animation. */
  view: 'play' | 'summary';
  /** Key into LessonBuild.rhythms; null for the summary scene. */
  rhythm: string | null;
  /**
   * Portion of the rhythm strip (0..1 of its window) played during this scene. Consecutive scenes may share a
   * rhythm and cover consecutive spans, so one rhythm can be explained in several steps.
   */
  span: readonly [number, number];
  /** Serum potassium (mmol/L) to show on the level meter in this scene. */
  meter?: number;
}

export interface LessonOption {
  id: string;
  label: string;
}

export interface LegendItem {
  tone: Tone;
  text: string;
}

export interface SummaryRow {
  label: string;
  value: string;
}

/** The "how to recognise it" card shown in the last scene and on the lesson page. */
export interface RecognitionSummary {
  heading: string;
  rows: SummaryRow[];
  /** One-sentence pattern to remember. */
  keyline: string;
  /** The most common look-alike and how to tell it apart. */
  pitfall: string;
}

export interface DiagramConfig {
  /** Draw slow and fast pathways inside the AV node (AVNRT). */
  dualPathways?: boolean;
  /** Draw an accessory pathway on the right side (AVRT). */
  accessoryPathway?: boolean;
  /** Draw the flutter circuit in the atria. */
  flutterCircuit?: boolean;
  /** Draw the ectopic atrial focus. */
  ectopicFocus?: boolean;
  /** Draw a ventricular focus and dashed ventricular re-entry circuit. */
  ventricularFocus?: boolean;
  ventricleCircuit?: boolean;
  /** Label the left and right bundle branches. */
  bundleLabels?: boolean;
}

export interface LessonBuild {
  scenes: LessonScene[];
  rhythms: Record<string, RhythmDef>;
  summary: RecognitionSummary;
}

export interface Lesson {
  id: LessonId;
  title: string;
  /** Short label for cards and navigation. */
  short: string;
  blurb: string;
  /** Approximate rate shown on the index card. */
  rate: string;
  optionLabel?: string;
  options?: LessonOption[];
  defaultOption?: string;
  diagram: DiagramConfig;
  legend: LegendItem[];
  /** Rhythm drawn as the preview on the index card. */
  previewKey: string;
  build: (option?: string) => LessonBuild;
}

export interface LessonGroup {
  id: string;
  title: string;
  blurb: string;
  lessons: LessonId[];
}

export type { Tone };
