/** Shared model for the Arrhythmia Animation Library. All times are seconds of rhythm time. */

export type Tone = 'navy' | 'blue' | 'orange' | 'red' | 'purple';

export type PathId =
  | 'atria-sa'
  | 'atria-ect'
  | 'atria-retro'
  | 'atria-ap'
  | 'avn-direct'
  | 'avn-slow'
  | 'avn-fast'
  | 'his'
  | 'bb-left'
  | 'bb-right'
  | 'ap'
  | 'flutter-loop';

export type SiteId = 'sa' | 'ectopic' | 'junction' | 'ventricle';

/** One thing that happens on the conduction diagram at a given rhythm time. */
export type Pulse =
  | { type: 'travel'; path: PathId; t0: number; t1: number; tone: Tone; reverse?: boolean; stop?: number }
  | { type: 'flash'; site: SiteId; t: number; tone: Tone }
  | { type: 'spark'; x: number; y: number; t: number; tone: Tone }
  | { type: 'loop'; path: PathId; t0: number; t1: number; period: number; tone: Tone };

/** Annotations drawn on the ECG strip. */
export type Mark =
  | { kind: 'dot'; t: number; tone: Tone }
  | { kind: 'bar'; t0: number; t1: number; tone: Tone }
  | { kind: 'tag'; t: number; text: string; tone: Tone }
  | { kind: 'note'; t: number; text: string; tone: Tone }
  | { kind: 'seg'; t0: number; t1: number; tone: Tone };

export type BeatOrigin = 'sinus' | 'pac' | 'tachy' | 'conducted' | 'junctional' | 'ventricular';

export interface BeatEvent {
  /** QRS onset. */
  t: number;
  wide: boolean;
  origin: BeatOrigin;
  /** Pre-excited beat (delta wave). */
  preexcited?: boolean;
}

export type AtrialKind = 'sinus' | 'ectopic' | 'flutter' | 'retro';

export interface AtrialEvent {
  /** Onset of the atrial deflection. */
  t: number;
  kind: AtrialKind;
  /** True when this atrial impulse is followed by a conducted QRS. */
  conducted: boolean;
  /** Signed amplitude in R-wave units (negative = inverted). */
  amp: number;
}

export interface RhythmDef {
  /** Unique across the whole library; used as a cache key. */
  id: string;
  label: string;
  description: string;
  /** Length of the strip in seconds. */
  window: number;
  /** ECG value (R-wave units, up is positive) at rhythm time t. */
  signal: (t: number) => number;
  marks: Mark[];
  pulses: Pulse[];
  beats: BeatEvent[];
  /** Organised atrial deflections. Empty during fibrillation. */
  atrial: AtrialEvent[];
  fibrillation: boolean;
  /** True when the baseline between atrial waves is flat (no continuous flutter or fibrillatory activity). */
  isoelectric: boolean;
}
