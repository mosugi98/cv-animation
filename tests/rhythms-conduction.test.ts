import { describe, expect, it } from 'vitest';
import type { Pulse, RhythmDef } from '../src/engine/types';
import {
  AV_PP, AV_PP_FAST, BLOCK_PR, ESCAPE_CYCLE, FIRST_DEGREE_PR, MOBITZ2_PR, WENCKEBACH_PR, avBlockRhythm, avNormalRhythm, avPatterns, escapeTimes,
  type AvBlockKind,
} from '../src/rhythms/avblock';
import {
  ARREST_OPTIONS, ARREST_PAUSE, ARREST_PP, SA_BLOCK_OPTIONS, SSS_AF, SSS_OPTIONS, saBlockRhythm, sinusArrestRhythm, sinusBaselineRhythm, sssAfBeats, sssRhythm,
} from '../src/rhythms/sinusnode';
import { BUNDLE_PR, LONG_PR, bundleRhythm, fascicularRhythm } from '../src/rhythms/bundle';
import {
  CAPTURE_SPIKES, DDD_STATES, FAULT_OPTIONS, LRL, OUTPUT_ESCAPES, OUTPUT_MISSING, OUTPUT_SPIKES, OVERSENSE_NOISE, OVERSENSE_SPIKES, PACED_AV, PHYSIO_OPTIONS,
  REFRACTORY, SENSED_AV, UNDERSENSE_PP, UNDERSENSE_SPIKES, VENT_LAG, VOO_MAGNET, dddRhythm, dddScript, faultRhythm, interplay, pacemakerRhythm, physioQrs,
  physioRhythm, vddScript, vooScript, vviScript, aaiScript, ddiScript,
} from '../src/rhythms/pacing';

const gaps = (xs: number[]) => xs.slice(1).map((x, i) => x - xs[i]);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)));
const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;
const travels = (d: RhythmDef) => d.pulses.filter((p): p is Extract<Pulse, { type: 'travel' }> => p.type === 'travel');
const sample = (d: RhythmDef, a: number, b: number, step = 0.002) => {
  const out: number[] = [];
  for (let t = a; t <= b; t += step) out.push(d.signal(t));
  return out;
};
/** Duration of the QRS complex starting at q: first to last time the trace is more than 0.08 R-units from baseline in the next 0.2 s. */
const qrsWidth = (d: RhythmDef, q: number): number => {
  const step = 0.002;
  let first = -1;
  let last = -1;
  for (let t = q - 0.005; t <= q + 0.2; t += step) {
    if (Math.abs(d.signal(t)) > 0.08) {
      if (first < 0) first = t;
      last = t;
    }
  }
  return last - first;
};
/** Ventricular output spikes are 0.6 R-units tall; the smaller atrial spikes are 0.32, so they pass a lower bar. */
const spikeAt = (d: RhythmDef, s: number, min = 0.4) => Math.max(...sample(d, s - 0.004, s + 0.004, 0.0005)) > min;
const schematic = (d: RhythmDef) => expect(d.description.toLowerCase()).toContain('schematic');

const AV_KINDS: AvBlockKind[] = ['first', 'mobitz1', 'mobitz2', '2to1', '3to1', 'junctional', 'ventricular'];

describe('AV block', () => {
  const sinusP = (d: RhythmDef) => d.atrial.map((a) => a.t);

  it('normal baseline: PR 160 ms, every P conducted', () => {
    const d = avNormalRhythm();
    schematic(d);
    expect(d.atrial.every((a) => a.conducted)).toBe(true);
    d.beats.forEach((b, i) => expect(near(b.t - d.atrial[i].t, 0.16)).toBe(true));
  });

  it('first degree: long constant PR, nothing dropped', () => {
    const d = avBlockRhythm('first');
    expect(d.atrial.every((a) => a.conducted)).toBe(true);
    expect(d.beats.length).toBe(d.atrial.length);
    d.beats.forEach((b, i) => expect(near(b.t - d.atrial[i].t, FIRST_DEGREE_PR)).toBe(true));
    expect(FIRST_DEGREE_PR).toBeGreaterThan(0.2);
    expect(sd(gaps(sinusP(d)))).toBeLessThan(1e-9);
  });

  it('Mobitz I: PR lengthens by shrinking steps, then a P is dropped and the cycle resets; the pause is under two cycles of the shortest R-R', () => {
    const d = avBlockRhythm('mobitz1');
    const dropped = d.atrial.filter((a) => !a.conducted);
    expect(dropped.length).toBeGreaterThanOrEqual(2);
    expect(WENCKEBACH_PR.every((v, i) => i === 0 || v > WENCKEBACH_PR[i - 1])).toBe(true);
    const steps = WENCKEBACH_PR.slice(1).map((v, i) => v - WENCKEBACH_PR[i]);
    expect(steps[1]).toBeLessThan(steps[0]);
    // PR before each drop is the longest; the PR after it is the shortest.
    const prOf = (a: { t: number }) => d.beats.find((b) => b.t > a.t && b.t - a.t < 0.5)?.t;
    for (const a of dropped) {
      const before = d.atrial.filter((x) => x.t < a.t && x.conducted).at(-1)!;
      const after = d.atrial.find((x) => x.t > a.t && x.conducted);
      const prBefore = prOf(before)! - before.t;
      expect(near(prBefore, WENCKEBACH_PR[WENCKEBACH_PR.length - 1])).toBe(true);
      if (after) expect(near(prOf(after)! - after.t, WENCKEBACH_PR[0])).toBe(true);
    }
    const rr = gaps(d.beats.map((b) => b.t));
    const longest = Math.max(...rr);
    const shortest = Math.min(...rr);
    expect(longest).toBeLessThan(2 * shortest);
    expect(longest).toBeGreaterThan(1.3 * shortest);
    // Group beating: R-R shortens inside a group.
    expect(rr[1]).toBeLessThan(rr[0]);
    expect(d.atrial.length).toBe(Math.round(d.atrial.length));
  });

  it('Mobitz II: constant PR, sudden drop, the pause is exactly two P-P intervals', () => {
    const d = avBlockRhythm('mobitz2');
    const conducted = d.atrial.filter((a) => a.conducted);
    expect(d.atrial.some((a) => !a.conducted)).toBe(true);
    for (const a of conducted) expect(near(d.beats.find((b) => b.t > a.t)!.t - a.t, MOBITZ2_PR)).toBe(true);
    const rr = gaps(d.beats.map((b) => b.t));
    expect(Math.max(...rr)).toBeCloseTo(2 * AV_PP, 6);
    // The block is infranodal: the impulse crosses the AV node (blue) and stops at the His bundle (red).
    expect(travels(d).some((p) => p.path === 'his' && p.tone === 'red' && p.stop !== undefined)).toBe(true);
    expect(travels(d).some((p) => p.path === 'avn-direct' && p.tone === 'red')).toBe(false);
  });

  it('Mobitz I blocks at the AV node, not below it', () => {
    const d = avBlockRhythm('mobitz1');
    expect(travels(d).some((p) => p.path === 'avn-direct' && p.tone === 'red' && p.stop !== undefined)).toBe(true);
    expect(travels(d).some((p) => p.path === 'his' && p.tone === 'red')).toBe(false);
  });

  it('2:1 and 3:1: fixed conduction ratio, constant PR on the conducted beats', () => {
    for (const [kind, n] of [['2to1', 2], ['3to1', 3]] as const) {
      const d = avBlockRhythm(kind);
      const flags = avPatterns(kind).prs;
      flags.forEach((pr, i) => expect(pr === null).toBe(i % n !== 0));
      for (const b of d.beats) {
        const p = d.atrial.filter((a) => a.conducted && a.t < b.t).at(-1)!;
        expect(near(b.t - p.t, BLOCK_PR)).toBe(true);
      }
      expect(near(mean(gaps(d.beats.map((b) => b.t))), n * AV_PP_FAST, 1e-6)).toBe(true);
    }
    expect(60 / (3 * AV_PP_FAST)).toBeLessThan(40);
  });

  it('complete block: regular P waves, regular slower escape, no relationship between them', () => {
    for (const kind of ['junctional', 'ventricular'] as const) {
      const d = avBlockRhythm(kind);
      expect(d.atrial.every((a) => !a.conducted)).toBe(true);
      expect(sd(gaps(sinusP(d)))).toBeLessThan(1e-9);
      expect(mean(gaps(sinusP(d)))).toBeCloseTo(AV_PP, 6);
      const qs = d.beats.map((b) => b.t);
      expect(sd(gaps(qs))).toBeLessThan(1e-9);
      expect(mean(gaps(qs))).toBeCloseTo(ESCAPE_CYCLE[kind], 6);
      expect(60 / mean(gaps(qs))).toBeLessThan(kind === 'junctional' ? 60 : 40);
      expect(60 / mean(gaps(qs))).toBeGreaterThan(kind === 'junctional' ? 40 : 20);
      // Atrial rate is faster than the escape rate, and P-QRS intervals keep changing.
      expect(60 / AV_PP).toBeGreaterThan(60 / ESCAPE_CYCLE[kind]);
      const prs = qs.map((q) => q - d.atrial.filter((a) => a.t < q).at(-1)!.t);
      expect(new Set(prs.map((x) => x.toFixed(2))).size).toBeGreaterThanOrEqual(3);
      expect(d.beats.every((b) => b.wide === (kind === 'ventricular'))).toBe(true);
      expect(escapeTimes(kind).length).toBe(qs.length);
    }
  });

  it('ventricular escape is slower than junctional escape', () => {
    expect(ESCAPE_CYCLE.ventricular).toBeGreaterThan(ESCAPE_CYCLE.junctional);
  });

  it('has unique ids and schematic descriptions for every kind', () => {
    const ds = AV_KINDS.map(avBlockRhythm);
    expect(new Set(ds.map((d) => d.id)).size).toBe(AV_KINDS.length);
    ds.forEach(schematic);
  });
});

describe('sinoatrial block', () => {
  it('type II: constant P-P, then a pause of exactly two P-P intervals', () => {
    const d = saBlockRhythm('type2');
    const ps = d.atrial.map((a) => a.t);
    const g = gaps(ps);
    const basic = Math.min(...g);
    expect(g.filter((x) => near(x, basic)).length).toBeGreaterThanOrEqual(g.length - 2);
    const pause = Math.max(...g);
    expect(pause).toBeCloseTo(2 * basic, 6);
    // The missing beat has no P, QRS or T wave: the beat count is lower than the number of node impulses.
    expect(d.beats.length).toBe(d.atrial.length);
    expect(travels(d).some((p) => p.path === 'atria-sa' && p.tone === 'red' && p.stop !== undefined)).toBe(true);
  });

  it('type I: P-P shortens inside each group, then a pause shorter than two of the shortest P-P', () => {
    const d = saBlockRhythm('type1');
    const ps = d.atrial.map((a) => a.t);
    const g = gaps(ps);
    // Groups of 3 P waves: g = [shorten, shorten-ish, pause, ...]
    expect(g[1]).toBeLessThan(g[0]);
    const pause = Math.max(...g);
    const shortest = Math.min(...g);
    expect(pause).toBeLessThan(2 * shortest);
    expect(pause).toBeGreaterThan(shortest);
    // The exit delay grows, so the slow orange conduction is drawn on the delayed beats only.
    expect(travels(d).filter((p) => p.path === 'atria-sa' && p.tone === 'orange').length).toBeGreaterThan(0);
  });

  it('has options, unique ids and schematic descriptions', () => {
    expect(SA_BLOCK_OPTIONS.map((o) => o.id)).toEqual(['type1', 'type2']);
    const ds = SA_BLOCK_OPTIONS.map((o) => saBlockRhythm(o.id));
    expect(new Set(ds.map((d) => d.id)).size).toBe(2);
    ds.forEach(schematic);
  });
});

describe('sinus arrest', () => {
  it('pause is long and not a multiple of the P-P interval', () => {
    const d = sinusArrestRhythm('pause');
    const g = gaps(d.atrial.map((a) => a.t));
    const pause = Math.max(...g);
    expect(pause).toBeCloseTo(ARREST_PAUSE, 6);
    expect(pause).toBeGreaterThan(3);
    const ratio = pause / ARREST_PP;
    expect(Math.abs(ratio - Math.round(ratio))).toBeGreaterThan(0.2);
    // Sinus rhythm before and after, and the node does not fire during the pause (no flash).
    const flashes = d.pulses.filter((p) => p.type === 'flash').map((p) => (p.type === 'flash' ? p.t : 0));
    expect(flashes.filter((t) => t > 2.4 && t < 2.1 + ARREST_PAUSE - 0.1).length).toBe(0);
  });

  it('escape version: narrow QRS with no P wave in front of it, arriving after a long pause', () => {
    const d = sinusArrestRhythm('escape');
    const esc = d.beats.filter((b) => b.origin === 'junctional');
    expect(esc.length).toBeGreaterThanOrEqual(2);
    expect(esc.every((b) => !b.wide)).toBe(true);
    const first = esc[0];
    const prev = d.beats.filter((b) => b.t < first.t).at(-1)!;
    expect(first.t - prev.t).toBeGreaterThan(1.3);
    expect(d.atrial.filter((a) => a.kind === 'sinus' && a.t > prev.t && a.t < first.t).length).toBe(0);
  });

  it('has options, unique ids and schematic descriptions', () => {
    const ds = ARREST_OPTIONS.map((o) => sinusArrestRhythm(o.id));
    expect(new Set(ds.map((d) => d.id)).size).toBe(2);
    ds.forEach(schematic);
    schematic(sinusBaselineRhythm());
  });
});

describe('sick sinus syndrome', () => {
  it('tachy-brady: sinus rhythm, fast irregular AF run, then a long pause and an escape beat before the sinus node restarts', () => {
    const d = sssRhythm('tachybrady');
    const af = sssAfBeats();
    const rr = gaps(af);
    expect(sd(rr) / mean(rr)).toBeGreaterThan(0.12);
    expect(60 / mean(rr)).toBeGreaterThan(100);
    const after = d.beats.filter((b) => b.t > af[af.length - 1]);
    const pause = after[0].t - af[af.length - 1];
    expect(pause).toBeGreaterThan(2);
    expect(after[0].origin).toBe('junctional');
    expect(after.some((b) => b.origin === 'sinus')).toBe(true);
    expect(d.beats.filter((b) => b.t < SSS_AF.start && b.origin === 'sinus').length).toBeGreaterThanOrEqual(2);
    // During the AF run the baseline is not flat.
    expect(sd(sample(d, SSS_AF.start + 0.5, SSS_AF.end - 0.5).slice(0, 40))).toBeGreaterThan(0.005);
  });

  it('bradycardia: persistent sinus rate under 50, then a pause ended by an escape beat', () => {
    const d = sssRhythm('brady');
    const sinus = d.atrial.filter((a) => a.kind === 'sinus').map((a) => a.t);
    expect(60 / gaps(sinus.slice(0, 3))[0]).toBeLessThan(50);
    const qs = d.beats.map((b) => b.t);
    expect(Math.max(...gaps(qs))).toBeGreaterThan(2);
    expect(d.beats.some((b) => b.origin === 'junctional')).toBe(true);
  });

  it('has options, unique ids and schematic descriptions', () => {
    const ds = SSS_OPTIONS.map((o) => sssRhythm(o.id));
    expect(new Set(ds.map((d) => d.id)).size).toBe(2);
    ds.forEach(schematic);
  });
});

describe('bundle branch blocks', () => {
  const lbbb = bundleRhythm('lbbb');
  const rbbb = bundleRhythm('rbbb');
  const normal = bundleRhythm('normal');

  it('normal QRS is narrow; both blocks widen it to 120 ms or more', () => {
    expect(qrsWidth(normal, normal.beats[2].t)).toBeLessThan(0.11);
    expect(qrsWidth(lbbb, lbbb.beats[2].t)).toBeGreaterThanOrEqual(0.12);
    expect(qrsWidth(rbbb, rbbb.beats[2].t)).toBeGreaterThanOrEqual(0.12);
    expect(lbbb.beats.every((b) => b.wide) && rbbb.beats.every((b) => b.wide)).toBe(true);
  });

  it('LBBB lead V6: broad notched R, no initial q wave, T wave opposite to the QRS', () => {
    const q = lbbb.beats[2].t;
    const v = sample(lbbb, q - 0.005, q + 0.2);
    expect(Math.min(...sample(lbbb, q, q + 0.05))).toBeGreaterThan(-0.05);
    // Two peaks with a dip between them: the notch.
    const peaks = v.filter((x, i) => i > 0 && i < v.length - 1 && x > v[i - 1] && x >= v[i + 1] && x > 0.3);
    expect(peaks.length).toBeGreaterThanOrEqual(1);
    const notch = Math.min(...sample(lbbb, q + 0.065, q + 0.08));
    expect(notch).toBeLessThan(Math.max(...sample(lbbb, q + 0.09, q + 0.11)) - 0.1);
    expect(Math.max(...sample(lbbb, q + 0.04, q + 0.16))).toBeGreaterThan(0.6);
    expect(Math.min(...sample(lbbb, q + 0.3, q + 0.5))).toBeLessThan(-0.15);
  });

  it('RBBB lead V1: rSR′, a late taller R′, inverted T', () => {
    const q = rbbb.beats[2].t;
    const r = Math.max(...sample(rbbb, q + 0.02, q + 0.045));
    const s = Math.min(...sample(rbbb, q + 0.05, q + 0.09));
    const rPrime = Math.max(...sample(rbbb, q + 0.1, q + 0.18));
    expect(r).toBeGreaterThan(0.12);
    expect(s).toBeLessThan(-0.2);
    expect(rPrime).toBeGreaterThan(0.6);
    expect(rPrime).toBeGreaterThan(r * 2);
    expect(Math.min(...sample(rbbb, q + 0.3, q + 0.5))).toBeLessThan(-0.15);
  });

  it('the blocked bundle stops red and the other side is activated late through muscle', () => {
    expect(travels(lbbb).some((p) => p.path === 'bb-left' && p.tone === 'red' && p.stop !== undefined)).toBe(true);
    expect(travels(lbbb).some((p) => p.path === 'cross-l')).toBe(true);
    expect(travels(lbbb).some((p) => p.path === 'bb-right' && p.tone === 'blue')).toBe(true);
    expect(travels(rbbb).some((p) => p.path === 'bb-right' && p.tone === 'red' && p.stop !== undefined)).toBe(true);
    expect(travels(rbbb).some((p) => p.path === 'cross-r')).toBe(true);
    expect(travels(rbbb).some((p) => p.path === 'bb-left' && p.tone === 'blue')).toBe(true);
    // The late wavefront takes longer than the normal 70 ms.
    const slow = travels(lbbb).find((p) => p.path === 'cross-l')!;
    expect(slow.t1 - slow.t0).toBeGreaterThan(0.1);
  });

  it('keeps sinus rhythm with PR 160 ms and schematic descriptions', () => {
    for (const d of [normal, lbbb, rbbb]) {
      schematic(d);
      expect(d.atrial.every((a) => a.conducted)).toBe(true);
      d.beats.forEach((b, i) => expect(near(b.t - d.atrial[i].t, BUNDLE_PR)).toBe(true));
    }
    expect(new Set([normal.id, lbbb.id, rbbb.id]).size).toBe(3);
  });
});

describe('fascicular blocks', () => {
  const normalII = fascicularRhythm('normal-ii');
  const lafb = fascicularRhythm('lafb');
  const lpfb = fascicularRhythm('lpfb');
  const bi = fascicularRhythm('bifascicular');
  const biPr = fascicularRhythm('bifascicular-pr');

  it('LAFB and LPFB: QRS stays under 120 ms but the main deflection turns negative (rS)', () => {
    for (const d of [lafb, lpfb]) {
      const q = d.beats[2].t;
      expect(qrsWidth(d, q)).toBeLessThan(0.12);
      expect(d.beats.every((b) => !b.wide)).toBe(true);
      expect(Math.min(...sample(d, q, q + 0.12))).toBeLessThan(-0.6);
      expect(Math.max(...sample(d, q, q + 0.12))).toBeLessThan(0.4);
    }
    const q = normalII.beats[2].t;
    expect(Math.max(...sample(normalII, q, q + 0.12))).toBeGreaterThan(0.8);
  });

  it('LAFB blocks the anterior fascicle and the posterior one conducts first; LPFB is the mirror image', () => {
    expect(travels(lafb).some((p) => p.path === 'fasc-ant' && p.tone === 'red')).toBe(true);
    expect(travels(lafb).some((p) => p.path === 'fasc-post' && p.tone !== 'red')).toBe(true);
    expect(travels(lafb).filter((p) => p.path === 'fasc-link').every((p) => !p.reverse)).toBe(true);
    expect(travels(lpfb).some((p) => p.path === 'fasc-post' && p.tone === 'red')).toBe(true);
    expect(travels(lpfb).filter((p) => p.path === 'fasc-link').every((p) => p.reverse)).toBe(true);
    expect(travels(lpfb).some((p) => p.path === 'fasc-link')).toBe(true);
    expect(travels(lafb).some((p) => p.path === 'bb-right' && p.tone === 'red')).toBe(false);
  });

  it('bifascicular: RBBB pattern plus a blocked anterior fascicle; the long-PR version delays conduction', () => {
    const q = bi.beats[2].t;
    expect(qrsWidth(bi, q)).toBeGreaterThanOrEqual(0.12);
    expect(Math.max(...sample(bi, q + 0.1, q + 0.18))).toBeGreaterThan(0.6);
    expect(travels(bi).some((p) => p.path === 'bb-right' && p.tone === 'red')).toBe(true);
    expect(travels(bi).some((p) => p.path === 'fasc-ant' && p.tone === 'red')).toBe(true);
    expect(travels(bi).some((p) => p.path === 'fasc-post' && p.tone === 'blue')).toBe(true);
    expect(near(bi.beats[2].t - bi.atrial[2].t, BUNDLE_PR)).toBe(true);
    expect(near(biPr.beats[2].t - biPr.atrial[2].t, LONG_PR)).toBe(true);
    expect(LONG_PR).toBeGreaterThan(0.2);
    expect(travels(biPr).some((p) => p.path === 'fasc-post' && p.tone === 'orange')).toBe(true);
  });

  it('has unique ids and schematic descriptions', () => {
    const kinds = ['normal-ii', 'normal-i', 'lafb', 'lpfb', 'bifascicular', 'bifascicular-pr'] as const;
    const ds = kinds.map(fascicularRhythm);
    expect(new Set(ds.map((d) => d.id)).size).toBe(kinds.length);
    ds.forEach(schematic);
  });
});

describe('pacemakers', () => {

  it('AAI: waits one lower-rate interval after the last sinus P, paces the atrium at 60/min, and sinus beats inhibit it', () => {
    const { atrial } = aaiScript();
    const d = pacemakerRhythm('aai');
    const aps = atrial.filter((a) => a.kind === 'AP');
    expect(aps.length).toBeGreaterThanOrEqual(3);
    const lastAs = atrial.filter((a) => a.kind === 'AS' && a.t < aps[0].t).at(-1)!;
    expect(near(aps[0].t - lastAs.t, LRL)).toBe(true);
    gaps(aps.map((a) => a.t)).forEach((g) => expect(near(g, LRL)).toBe(true));
    // Sinus beats that return within the lower-rate interval inhibit the output.
    const resumed = atrial.filter((a) => a.kind === 'AS' && a.t > aps[aps.length - 1].t);
    expect(resumed.length).toBeGreaterThanOrEqual(2);
    expect(resumed[0].t - aps[aps.length - 1].t).toBeLessThan(LRL);
    // AV conduction is intact: every atrial event is followed by a narrow native QRS.
    expect(d.beats.every((b) => !b.wide)).toBe(true);
    expect(d.beats.length).toBe(atrial.length);
    for (const a of aps) expect(spikeAt(d, a.t, 0.25)).toBe(true);
    expect(d.atrial.filter((a) => a.kind === 'paced').length).toBe(aps.length);
  });

  it('VVI: spikes only when no QRS was seen for 1.0 s, spaced exactly 1.0 s, and native QRS inhibits them', () => {
    const { atrial, vent } = vviScript();
    const d = pacemakerRhythm('vvi');
    const spikes = vent.map((v) => v.t);
    gaps(spikes).forEach((g) => expect(near(g, LRL)).toBe(true));
    const natives = d.beats.filter((b) => !b.wide).map((b) => b.t);
    for (const s of spikes) expect(natives.filter((n) => n > s - LRL + 1e-9 && n < s).length).toBe(0);
    // First spike is exactly one lower-rate interval after the last native QRS.
    expect(near(spikes[0] - natives.filter((n) => n < spikes[0]).at(-1)!, LRL)).toBe(true);
    // After pacing, native beats return and no further spikes fire.
    expect(natives.filter((n) => n > spikes[spikes.length - 1]).length).toBeGreaterThanOrEqual(3);
    // During pacing the P waves are not conducted and march independently.
    expect(atrial.filter((a) => a.t > spikes[0] - 0.3 && a.t < spikes[spikes.length - 1]).every((a) => a.pr === null)).toBe(true);
    expect(d.beats.filter((b) => b.origin === 'paced').every((b) => b.wide)).toBe(true);
    for (const s of spikes) expect(spikeAt(d, s)).toBe(true);
  });

  it('VOO: spikes keep a fixed rate whatever the native rhythm does; some fall in refractory tissue and do nothing', () => {
    const { vent, outcome } = vooScript();
    const d = pacemakerRhythm('voo');
    gaps(vent.map((v) => v.t)).forEach((g) => expect(near(g, 0.7)).toBe(true));
    expect(vent.some((v) => v.kind === 'VP')).toBe(true);
    expect(vent.some((v) => v.kind === 'VPX')).toBe(true);
    expect(outcome.filter((o) => o.kind === 'native' && o.captured).length).toBeGreaterThanOrEqual(3);
    // No two ventricular activations occur within the refractory period.
    const activations = outcome.filter((o) => o.captured).map((o) => o.t);
    gaps(activations).forEach((g) => expect(g).toBeGreaterThanOrEqual(REFRACTORY - 1e-9));
    // Spikes only begin after the magnet is applied.
    expect(Math.min(...vent.map((v) => v.t))).toBeGreaterThan(VOO_MAGNET);
    for (const v of vent) expect(spikeAt(d, v.t)).toBe(true);
    expect(d.marks.some((m) => m.kind === 'tag' && m.text === 'MAGNET')).toBe(true);
  });

  it('interplay: a stimulus inside the refractory period of the last activation fails', () => {
    const r = interplay([1.0], [1.1, 1.5]);
    expect(r.map((x) => x.captured)).toEqual([true, false, true]);
  });

  it('VDD: tracked P waves trigger a spike after 170 ms, an ignored P wave does not, and the ventricle is paced at 60/min when the sinus is slow; no atrial pacing', () => {
    const { atrial, vent } = vddScript();
    const d = pacemakerRhythm('vdd');
    const tracked = atrial.filter((a) => a.tracked);
    for (const a of tracked) expect(vent.some((v) => near(v.t, a.t + SENSED_AV))).toBe(true);
    for (const a of atrial.filter((x) => !x.tracked)) expect(vent.some((v) => near(v.t, a.t + SENSED_AV))).toBe(false);
    // Lower-rate pacing: a spike with no P wave before it, exactly 1.0 s after the previous spike.
    const lrlSpikes = vent.filter((v) => !tracked.some((a) => near(v.t, a.t + SENSED_AV)));
    expect(lrlSpikes.length).toBeGreaterThanOrEqual(2);
    for (const v of lrlSpikes) expect(vent.some((w) => near(v.t - w.t, LRL))).toBe(true);
    expect(d.atrial.some((a) => a.kind === 'paced')).toBe(false);
    expect(d.beats.every((b) => b.origin === 'paced')).toBe(true);
  });

  it('DDI: ventricular spikes on a fixed 1.0 s timer unrelated to sensed P waves; the atrium is paced only once the sinus node slows', () => {
    const { atrial, vent } = ddiScript();
    gaps(vent.map((v) => v.t)).forEach((g) => expect(near(g, LRL)).toBe(true));
    const as = atrial.filter((a) => a.kind === 'AS');
    const aps = atrial.filter((a) => a.kind === 'AP');
    // AS-to-spike intervals are all different: no tracking.
    const lags = as.map((a) => vent.find((v) => v.t > a.t)!.t - a.t);
    expect(new Set(lags.map((x) => x.toFixed(2))).size).toBeGreaterThanOrEqual(3);
    // Every atrial pace is followed by a ventricular spike after the paced AV delay.
    for (const a of aps) expect(vent.some((v) => near(v.t - a.t, PACED_AV))).toBe(true);
    expect(Math.min(...aps.map((a) => a.t))).toBeGreaterThan(Math.max(...as.map((a) => a.t)));
    schematic(pacemakerRhythm('ddi'));
  });

  it('DDD: each of the four states has the defining pattern', () => {
    const asvp = dddScript('as-vp');
    for (const a of asvp.atrial) expect(asvp.vent.some((v) => near(v.t - a.t, SENSED_AV))).toBe(true);
    const apvp = dddScript('ap-vp');
    for (const a of apvp.atrial) expect(apvp.vent.some((v) => near(v.t - a.t, PACED_AV))).toBe(true);
    gaps(apvp.atrial.map((a) => a.t)).forEach((g) => expect(near(g, LRL)).toBe(true));
    const apvs = dddScript('ap-vs');
    expect(apvs.vent.length).toBe(0);
    expect(apvs.atrial.every((a) => a.kind === 'AP' && a.pr !== null && a.pr + 0.02 < PACED_AV)).toBe(true);
    const asvs = dddScript('as-vs');
    expect(asvs.vent.length).toBe(0);
    expect(asvs.atrial.every((a) => a.kind === 'AS' && a.pr !== null)).toBe(true);
    const d = dddRhythm('as-vs');
    expect(d.beats.every((b) => b.origin === 'sinus')).toBe(true);
    expect(dddRhythm('ap-vs').beats.every((b) => !b.wide)).toBe(true);
    expect(dddRhythm('ap-vp').beats.every((b) => b.wide && b.origin === 'paced')).toBe(true);
    expect(new Set(DDD_STATES.map((s) => dddRhythm(s).id)).size).toBe(4);
  });

  it('physiological pacing: RV pacing is widest, biventricular narrower, conduction-system pacing close to native', () => {
    const w = (k: 'rv' | 'biv' | 'csp') => {
      const d = physioRhythm(k);
      return qrsWidth(d, d.beats[2].t);
    };
    expect(w('rv')).toBeGreaterThanOrEqual(0.14);
    expect(w('biv')).toBeLessThan(w('rv'));
    expect(w('biv')).toBeGreaterThanOrEqual(0.1);
    expect(w('csp')).toBeLessThan(w('biv'));
    expect(w('csp')).toBeLessThan(0.115);
    expect(physioQrs.rv.width).toBeGreaterThan(physioQrs.biv.width);
    expect(physioQrs.biv.width).toBeGreaterThan(physioQrs.csp.width);
    expect(physioRhythm('csp').beats.every((b) => !b.wide)).toBe(true);
    const biv = physioRhythm('biv');
    expect(biv.pulses.some((p) => p.type === 'flash' && p.site === 'pace-lv')).toBe(true);
    expect(biv.pulses.some((p) => p.type === 'flash' && p.site === 'pace-v')).toBe(true);
    expect(physioRhythm('csp').pulses.some((p) => p.type === 'flash' && p.site === 'pace-his')).toBe(true);
    expect(physioRhythm('rv').pulses.some((p) => p.type === 'flash' && p.site === 'pace-lv')).toBe(false);
    expect(new Set(PHYSIO_OPTIONS.map((o) => physioRhythm(o.id).id)).size).toBe(3);
  });

  it('every pacing rhythm draws spikes at paced events and is schematic with a unique id', () => {
    const all = [
      ...(['aai', 'vvi', 'voo', 'vdd', 'ddi'] as const).map(pacemakerRhythm),
      ...DDD_STATES.map(dddRhythm),
      ...PHYSIO_OPTIONS.map((o) => physioRhythm(o.id)),
      ...FAULT_OPTIONS.map((o) => faultRhythm(o.id)),
    ];
    expect(new Set(all.map((d) => d.id)).size).toBe(all.length);
    all.forEach(schematic);
    for (const d of all) for (const b of d.beats.filter((x) => x.origin === 'paced' && x.wide)) expect(spikeAt(d, b.t - VENT_LAG)).toBe(true);
  });
});

describe('pacemaker malfunction', () => {
  it('failure to capture: spikes on time, some without a QRS, so pauses appear', () => {
    const d = faultRhythm('capture');
    const failed = CAPTURE_SPIKES.filter((s) => !s.ok);
    expect(failed.length).toBeGreaterThanOrEqual(2);
    expect(CAPTURE_SPIKES.some((s) => s.ok)).toBe(true);
    gaps(CAPTURE_SPIKES.map((s) => s.t)).forEach((g) => expect(near(g, LRL)).toBe(true));
    for (const s of failed) {
      expect(spikeAt(d, s.t)).toBe(true);
      expect(d.beats.filter((b) => b.t > s.t && b.t < s.t + 0.3).length).toBe(0);
    }
    for (const s of CAPTURE_SPIKES.filter((x) => x.ok)) expect(d.beats.some((b) => near(b.t, s.t + VENT_LAG))).toBe(true);
    expect(Math.max(...gaps(d.beats.map((b) => b.t)))).toBeGreaterThan(1.9);
    expect(d.pulses.some((p) => p.type === 'travel' && p.path === 'paced-l' && p.tone === 'red')).toBe(true);
  });

  it('undersensing: spikes keep a 1.0 s timer while native beats come every 0.9 s; some spikes fall in refractory tissue', () => {
    const d = faultRhythm('undersensing');
    gaps(UNDERSENSE_SPIKES).forEach((g) => expect(near(g, LRL)).toBe(true));
    expect(UNDERSENSE_PP).toBeLessThan(LRL);
    const natives = d.beats.filter((b) => b.origin === 'sinus');
    expect(natives.length).toBeGreaterThanOrEqual(4);
    for (const s of UNDERSENSE_SPIKES) expect(spikeAt(d, s)).toBe(true);
    // Native QRS complexes are not inhibiting anything: spikes land within 1.0 s of a native QRS.
    expect(UNDERSENSE_SPIKES.some((s) => natives.some((n) => s - n.t > 0 && s - n.t < LRL))).toBe(true);
    const unproductive = UNDERSENSE_SPIKES.filter((s) => !d.beats.some((b) => b.origin === 'paced' && near(b.t, s + VENT_LAG)));
    expect(unproductive.length).toBeGreaterThanOrEqual(1);
  });

  it('oversensing: noise inhibits the pacemaker and delays the next spike by a full lower-rate interval from the noise', () => {
    const d = faultRhythm('oversensing');
    for (const n of OVERSENSE_NOISE) {
      // Noise is visible in the trace.
      expect(Math.max(...sample(d, n, n + 0.14, 0.002).map(Math.abs))).toBeGreaterThan(0.06);
      const before = OVERSENSE_SPIKES.filter((s) => s < n).at(-1)!;
      const after = OVERSENSE_SPIKES.find((s) => s > n)!;
      expect(near(after - n, LRL)).toBe(true);
      expect(after - before).toBeGreaterThan(1.7);
    }
    const regular = gaps(OVERSENSE_SPIKES).filter((g) => near(g, LRL));
    expect(regular.length).toBeGreaterThanOrEqual(3);
  });

  it('failure to output: spikes missing where expected, a long pause, a wide escape beat, then pacing returns', () => {
    const d = faultRhythm('output');
    for (const m of OUTPUT_MISSING) expect(spikeAt(d, m)).toBe(false);
    const gap = Math.max(...gaps(d.beats.map((b) => b.t)));
    expect(gap).toBeGreaterThan(2);
    const esc = d.beats.filter((b) => b.origin === 'ventricular');
    expect(esc.length).toBe(OUTPUT_ESCAPES.length);
    expect(esc.every((b) => b.wide)).toBe(true);
    expect(d.beats.filter((b) => b.origin === 'paced' && b.t > OUTPUT_SPIKES[2] + 1).length).toBeGreaterThanOrEqual(1);
    // The escape beat is slower than the paced rate and has no spike in front of it.
    for (const e of esc) expect(spikeAt(d, e.t - VENT_LAG)).toBe(false);
  });

  it('has options and schematic descriptions', () => {
    expect(FAULT_OPTIONS.map((o) => o.id)).toEqual(['capture', 'undersensing', 'oversensing', 'output']);
  });
});
