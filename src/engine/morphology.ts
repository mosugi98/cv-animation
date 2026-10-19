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
export const tWaveWide = (t: number, q: number): number => gauss(t, q + 0.4, 0.06, -0.32);

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
