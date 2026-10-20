/** Waveform primitives. Every function returns R-wave units (R peak of a normal beat = 1). */

export const gauss = (t: number, centre: number, sigma: number, amp: number): number =>
  amp * Math.exp(-0.5 * ((t - centre) / sigma) ** 2);

/** Small deterministic PRNG so "random" rhythms are identical on every render and in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Atrial deflection. `onset` is where it leaves the baseline; the peak sits 0.05 s later. */
export const pWave = (t: number, onset: number, amp = 0.15): number =>
  gauss(t, onset + 0.05, 0.022, amp);

/** Narrow QRS. `q` is the QRS onset. */
export function qrsNarrow(t: number, q: number, amp = 1): number {
  return (
    gauss(t, q + 0.015, 0.008, -0.12 * amp) +
    gauss(t, q + 0.05, 0.011, amp) +
    gauss(t, q + 0.085, 0.01, -0.22 * amp)
  );
}

/** Wide QRS (> 0.12 s) typical of a ventricular origin. */
export function qrsWide(t: number, q: number): number {
  return gauss(t, q + 0.07, 0.032, 0.85) + gauss(t, q + 0.15, 0.03, -0.5);
}

/** Pre-excited QRS: slurred upstroke (delta wave) then the R wave. */
export function qrsDelta(t: number, q: number): number {
  return gauss(t, q + 0.03, 0.026, 0.3) + gauss(t, q + 0.085, 0.022, 0.8) + gauss(t, q + 0.14, 0.012, -0.2);
}

/** T wave. `delay` is the distance from QRS onset to the T peak; shorter at fast rates. */
export const tWave = (t: number, q: number, amp = 0.3, delay = 0.32): number =>
  gauss(t, q + delay, delay * 0.14 + 0.005, amp);

/** Discordant (inverted) T wave that follows a wide ventricular QRS. */
export const tWaveWide = (t: number, q: number, delay = 0.4, amp = -0.32, sigma = 0.06): number =>
  gauss(t, q + delay, sigma, amp);

/** Right bundle branch block pattern (rSR'): small r, S, then a tall broad R' that ends the QRS late (~0.25 s). */
export function qrsRbbb(t: number, q: number): number {
  return gauss(t, q + 0.03, 0.013, 0.26) + gauss(t, q + 0.075, 0.017, -0.5) + gauss(t, q + 0.15, 0.04, 0.9);
}

/** Tall, narrow-based, symmetric ("tented") T wave of hyperkalaemia. */
export const peakedT = (t: number, q: number, amp = 0.75, delay = 0.22): number => gauss(t, q + delay, 0.03, amp);

/** U wave: a small hump after the T wave, prominent in hypokalaemia. */
export const uWave = (t: number, q: number, amp = 0.1, delay = 0.5): number => gauss(t, q + delay, 0.05, amp);

/** Downsloping ST depression between `from` and `to` seconds after QRS onset. */
export function stDepression(t: number, q: number, depth = 0.1, from = 0.1, to = 0.28): number {
  const sig = (x: number) => 1 / (1 + Math.exp(-x));
  return -depth * (sig((t - (q + from)) / 0.012) - sig((t - (q + to)) / 0.02));
}

/** Broad ventricular complex whose width is stretched by `widen` (1 = normal narrow QRS ~0.09 s). */
export function qrsBroad(t: number, q: number, widen = 1, amp = 1): number {
  return (
    gauss(t, q + 0.015 * widen, 0.008 * widen, -0.1 * amp) +
    gauss(t, q + 0.05 * widen, 0.011 * widen, amp) +
    gauss(t, q + 0.088 * widen, 0.011 * widen, -0.3 * amp)
  );
}

const smoothstep = (x: number): number => {
  const c = Math.min(Math.max(x, 0), 1);
  return c * c * (3 - 2 * c);
};

/**
 * Ventricular fibrillation: chaotic, unrepeating undulations (about 4-7 per second), no QRS. It fades in over
 * 0.4 s from `t0`. `amp` is about 0.8 for coarse VF and about 0.15 for fine VF.
 */
export function vfWave(t: number, t0: number, amp = 0.8): number {
  if (t < t0) return 0;
  const parts: [number, number, number, number, number][] = [
    [4.3, 0.2, 0.6, 1.3, 1.0],
    [5.6, 1.7, 0.9, 0.8, 0.8],
    [6.4, 2.9, 1.4, 1.9, 0.6],
    [3.7, 4.1, 0.5, 0.7, 0.7],
    [7.1, 5.3, 1.1, 1.6, 0.4],
  ];
  let v = 0;
  for (const [f, ph, g, m, a] of parts) v += a * Math.sin(2 * Math.PI * f * t + ph + m * Math.sin(2 * Math.PI * g * t));
  const wobble = 0.65 + 0.35 * Math.sin(2 * Math.PI * 0.55 * t + 1);
  return (amp * v * wobble * smoothstep((t - t0) / 0.4)) / 2.2;
}

/**
 * Polymorphic VT of torsades de pointes: a carrier at `rate` per minute inside a slowly turning envelope, so
 * the complexes grow, shrink through a node and come back with opposite polarity (the "twisting" of the points).
 */
export function torsadesWave(t: number, t0: number, t1: number, rate = 220, spindle = 1.15, amp = 0.8): number {
  if (t < t0 || t > t1) return 0;
  const f = rate / 60;
  const envelope = Math.cos((Math.PI * (t - t0)) / spindle);
  const fade = smoothstep((t - t0) / 0.12) * smoothstep((t1 - t) / 0.2);
  return amp * envelope * Math.sin(2 * Math.PI * f * (t - t0)) * fade;
}

/** Sine-wave pattern of severe hyperkalaemia: QRS and T have merged into one smooth oscillation. */
export function sineWave(t: number, t0: number, period = 0.55, amp = 0.7): number {
  return t < t0 ? 0 : amp * Math.sin((2 * Math.PI * (t - t0)) / period) * smoothstep((t - t0) / 0.3);
}

/**
 * Continuous sawtooth of atrial flutter: slow downslope, sharp upstroke, no flat baseline.
 * `first` is the onset of the first flutter wave and `cycle` the flutter cycle length.
 */
export function flutterSaw(t: number, first: number, cycle: number, amp = 0.17): number {
  const shape = (x: number): number => {
    const ph = (((x - first) / cycle) % 1 + 1) % 1;
    return ph < 0.8 ? amp * (1 - (2 * ph) / 0.8) : -amp + (2 * amp * (ph - 0.8)) / 0.2;
  };
  const d = 0.006; // 3-tap smoothing to round the corners
  return (shape(t - d) + shape(t) + shape(t + d)) / 3;
}

/**
 * Pacemaker output spike: a one-sample-wide vertical line. The tent is wider than the strip's 5 ms sample step, so
 * it is never missed whatever its alignment.
 */
export const spike = (t: number, at: number, amp = 0.6): number => amp * Math.max(0, 1 - Math.abs(t - at) / 0.008);

/**
 * Left bundle branch block, as seen in a lateral lead (I or V6): broad, notched R wave of 140-160 ms with no
 * septal q wave. The discordant ST-T comes from the wide-beat T wave.
 */
export function qrsLbbb(t: number, q: number): number {
  return gauss(t, q + 0.045, 0.018, 0.62) + gauss(t, q + 0.105, 0.021, 0.8) + gauss(t, q + 0.155, 0.014, -0.08);
}

/**
 * Small r, deep S (rS) in 90-110 ms: lead II in left anterior fascicular block, lead I in left posterior fascicular
 * block. The initial small r keeps the QRS narrow, but the main vector now points away from the lead.
 */
export function qrsRs(t: number, q: number, r = 0.26, s = 0.78): number {
  return gauss(t, q + 0.018, 0.008, r) + gauss(t, q + 0.055, 0.014, -s) + gauss(t, q + 0.098, 0.012, 0.06);
}

/** A burst of high-frequency noise (muscle potentials) lasting `len` seconds from `t0`, which a pacemaker may wrongly sense. */
export function noiseBurst(t: number, t0: number, len = 0.14, amp = 0.16): number {
  if (t < t0 || t > t0 + len) return 0;
  const edge = Math.sin((Math.PI * (t - t0)) / len);
  return amp * edge * Math.sin(2 * Math.PI * 38 * (t - t0)) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 71 * t));
}

/** Coarse, irregular fibrillatory baseline: no two cycles alike, no flat segment. */
export function fibWavelets(t: number, amp = 0.06): number {
  const parts: [number, number, number, number][] = [
    [6.1, 0.0, 0.7, 0.9],
    [7.7, 1.3, 1.1, 0.7],
    [4.6, 2.1, 0.5, 0.8],
    [9.3, 0.6, 1.7, 0.5],
    [5.4, 3.4, 0.9, 0.6],
  ];
  let v = 0;
  for (const [f, ph, g, a] of parts) v += a * Math.sin(2 * Math.PI * f * t + ph + 0.9 * Math.sin(2 * Math.PI * g * t));
  return (amp * v) / 2.2;
}

export const sum =
  (fns: Array<(t: number) => number>) =>
  (t: number): number => {
    let v = 0;
    for (const fn of fns) v += fn(t);
    return v;
  };
