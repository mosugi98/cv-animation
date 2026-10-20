import { describe, expect, it } from 'vitest';
import type { Pulse, RhythmDef } from '../src/engine/types';
import { PVC_COUPLING, PVC_PATTERNS, PVC_SINUS_RR, pvcRhythm, pvcTimes } from '../src/rhythms/pvc';
import { VT_CL, VT_OPTIONS, VT_SINUS_PP, VT_START, vtBeatTimes, vtRhythm } from '../src/rhythms/vt';
import { VF_OPTIONS, VF_START, VF_VT_CL, vfRhythm } from '../src/rhythms/vf';
import { POST_PAUSE_Q, PVC1, R_ON_T, TDP_END, TDP_START, TORSADES_OPTIONS, TORSADES_RATE, TORSADES_SINUS_PP, torsadesRhythm } from '../src/rhythms/torsades';

const gaps = (xs: number[]) => xs.slice(1).map((x, i) => x - xs[i]);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)));
const sparks = (d: RhythmDef) => d.pulses.filter((p): p is Extract<Pulse, { type: 'spark' }> => p.type === 'spark');
const travelPaths = (d: RhythmDef) => new Set(d.pulses.filter((p) => p.type === 'travel').map((p) => (p.type === 'travel' ? p.path : '')));
const crossings = (xs: number[]) => xs.slice(1).filter((x, i) => Math.sign(x) !== Math.sign(xs[i]) && x !== 0).length;
const sample = (d: RhythmDef, a: number, b: number, step = 0.005) => {
  const out: number[] = [];
  for (let t = a; t <= b; t += step) out.push(d.signal(t));
  return out;
};

describe('premature ventricular contractions', () => {
  for (const { id } of PVC_PATTERNS) {
    const d = pvcRhythm(id);
    const pvcs = d.beats.filter((b) => b.origin === 'ventricular');
    const sinus = d.beats.filter((b) => b.origin === 'sinus');

    it(`${id}: the PVC is early, wide and has no P wave in front of it`, () => {
      expect(pvcs.length).toBe(pvcTimes(id).length);
      expect(pvcs.every((b) => b.wide)).toBe(true);
      expect(sinus.every((b) => !b.wide)).toBe(true);
      for (const v of pvcs) {
        const prev = d.beats.filter((b) => b.t < v.t).at(-1)!;
        if (prev.origin === 'sinus') expect(v.t - prev.t).toBeLessThan(PVC_SINUS_RR);
        // Any P wave in the 0.3 s before a PVC is not conducted: it is unrelated to the PVC.
        for (const a of d.atrial.filter((x) => x.t > v.t - 0.3 && x.t < v.t)) expect(a.conducted).toBe(false);
      }
    });

    it(`${id}: the sinus node is undisturbed, so the P waves keep one rhythm`, () => {
      const g = gaps(d.atrial.map((a) => a.t));
      expect(sd(g)).toBeLessThan(1e-9);
      expect(g[0]).toBeCloseTo(PVC_SINUS_RR);
      expect(d.atrial.every((a) => a.kind === 'sinus')).toBe(true);
    });

    it(`${id}: the P wave that falls just after a PVC is not conducted (ventricles refractory)`, () => {
      const lost = d.atrial.filter((a) => !a.conducted);
      expect(lost.length).toBeGreaterThanOrEqual(1);
      for (const a of lost) expect(pvcs.some((v) => a.t + 0.16 - v.t > -0.02 && a.t + 0.16 - v.t < 0.32)).toBe(true);
    });

    it(`${id}: the T wave is discordant (inverted) after the PVC`, () => {
      const v = pvcs[pvcs.length - 1];
      const t = sample(d, v.t + 0.3, v.t + 0.5);
      expect(Math.min(...t)).toBeLessThan(-0.1);
    });

    it(`${id}: the pause after each PVC (or couplet) is fully compensatory: sinus-to-sinus equals two sinus cycles`, () => {
      let checked = 0;
      // Group consecutive PVCs, then compare the sinus beats on either side of the group.
      const groups = pvcs.filter((v, i) => i === 0 || v.t - pvcs[i - 1].t > 0.6);
      for (const first of groups) {
        const last = pvcs.filter((v) => v.t >= first.t && v.t - first.t < 0.6).at(-1)!;
        const before = sinus.filter((b) => b.t < first.t).at(-1)!;
        const after = sinus.find((b) => b.t > last.t);
        if (!after) continue;
        expect(after.t - before.t).toBeCloseTo(2 * PVC_SINUS_RR);
        checked++;
      }
      expect(checked).toBeGreaterThanOrEqual(1);
    });
  }

  it('coupling interval is shorter than the sinus cycle', () => {
    expect(PVC_COUPLING).toBeLessThan(PVC_SINUS_RR);
  });

  it('bigeminy alternates a sinus beat and a PVC', () => {
    const d = pvcRhythm('bigeminy');
    const origins = d.beats.map((b) => b.origin);
    expect(origins.length).toBeGreaterThanOrEqual(6);
    origins.forEach((o, i) => expect(o).toBe(i % 2 === 0 ? 'sinus' : 'ventricular'));
  });

  it('couplet has two consecutive PVCs and then sinus rhythm resumes', () => {
    const d = pvcRhythm('couplet');
    const o = d.beats.map((b) => b.origin);
    const i = o.indexOf('ventricular');
    expect(o.slice(i, i + 2)).toEqual(['ventricular', 'ventricular']);
    expect(o.slice(i + 2).every((x) => x === 'sinus')).toBe(true);
    expect(o.slice(i + 2).length).toBeGreaterThanOrEqual(2);
  });

  it('single PVC: one PVC only', () => {
    expect(pvcRhythm('single').beats.filter((b) => b.origin === 'ventricular')).toHaveLength(1);
  });

  it('spreads from a ventricular focus through muscle, not the His-Purkinje system', () => {
    const p = travelPaths(pvcRhythm('single'));
    expect(p.has('vent-l') && p.has('vent-r')).toBe(true);
    const pv = pvcRhythm('single').pulses;
    expect(pv.some((x) => x.type === 'flash' && x.site === 'ventricle')).toBe(true);
  });
});

describe('ventricular tachycardia', () => {
  for (const { id } of VT_OPTIONS) {
    const d = vtRhythm(id);
    const vt = d.beats.filter((b) => b.origin === 'ventricular');

    it(`${id}: regular, fast (over 100 per minute), wide-complex run of at least three beats`, () => {
      expect(vt.length).toBeGreaterThanOrEqual(3);
      expect(sd(gaps(vt.map((b) => b.t)))).toBeLessThan(1e-9);
      expect(60 / VT_CL).toBeGreaterThan(100);
      expect(gaps(vt.map((b) => b.t))[0]).toBeCloseTo(VT_CL);
      expect(vt.every((b) => b.wide)).toBe(true);
      expect(vt.map((b) => b.t)).toEqual(vtBeatTimes(id));
    });

    it(`${id}: AV dissociation, with P waves slower than the QRS rate and not conducted during the run`, () => {
      const g = gaps(d.atrial.map((a) => a.t));
      expect(sd(g)).toBeLessThan(1e-9);
      expect(g[0]).toBeCloseTo(VT_SINUS_PP);
      expect(g[0]).toBeGreaterThan(VT_CL);
      const end = vt[vt.length - 1].t;
      for (const a of d.atrial.filter((x) => x.t + 0.16 > VT_START && x.t + 0.16 < end + 0.2)) expect(a.conducted).toBe(false);
    });

    it(`${id}: starts early (premature), and a re-entry circuit runs in the ventricles, not the atria`, () => {
      const lastSinus = d.beats.filter((b) => b.origin === 'sinus' && b.t < VT_START).at(-1)!;
      expect(VT_START - lastSinus.t).toBeLessThan(VT_SINUS_PP);
      const loops = d.pulses.filter((p) => p.type === 'loop');
      expect(loops).toHaveLength(1);
      expect(loops[0].type === 'loop' && loops[0].path).toBe('vent-loop');
      expect(loops[0].type === 'loop' && loops[0].period).toBe(VT_CL);
    });
  }

  it('non-sustained VT stops by itself and sinus rhythm resumes with narrow beats', () => {
    const d = vtRhythm('nsvt');
    const last = d.beats.filter((b) => b.origin === 'ventricular').at(-1)!;
    const after = d.beats.filter((b) => b.t > last.t);
    expect(after.length).toBeGreaterThanOrEqual(2);
    expect(after.every((b) => b.origin === 'sinus' && !b.wide)).toBe(true);
    expect(d.beats.filter((b) => b.origin === 'ventricular')).toHaveLength(6);
  });

  it('sustained VT lasts to the end of the strip and sinus conduction does not return', () => {
    const d = vtRhythm('sustained');
    const vt = d.beats.filter((b) => b.origin === 'ventricular');
    expect(vt.length).toBeGreaterThan(8);
    expect(d.beats.filter((b) => b.t > VT_START).every((b) => b.origin === 'ventricular')).toBe(true);
  });
});

describe('ventricular fibrillation', () => {
  for (const { id } of VF_OPTIONS) {
    const d = vfRhythm(id);

    it(`${id}: fast VT first, then no QRS complexes at all`, () => {
      expect(d.beats.length).toBeGreaterThanOrEqual(3);
      expect(d.beats.every((b) => b.t < VF_START && b.wide)).toBe(true);
      expect(60 / VF_VT_CL).toBeGreaterThan(180);
      expect(d.atrial).toHaveLength(0);
      expect(d.isoelectric).toBe(false);
    });

    it(`${id}: chaotic, never-repeating undulations of 4-7 per second after onset`, () => {
      const v = sample(d, VF_START + 0.6, d.window - 0.05);
      const perSecond = crossings(v) / (d.window - 0.05 - VF_START - 0.6);
      expect(perSecond).toBeGreaterThan(6);
      expect(perSecond).toBeLessThan(16);
    });

    it(`${id}: ventricular sparks only, no atrial activity`, () => {
      const s = sparks(d);
      expect(s.length).toBeGreaterThan(200);
      expect(s.every((x) => x.y >= 140 && x.t >= VF_START)).toBe(true);
      expect(new Set(s.map((x) => Math.round(x.x / 25))).size).toBeGreaterThan(5);
    });
  }

  it('fine VF is much lower in amplitude than coarse VF', () => {
    const peak = (id: 'coarse' | 'fine') => Math.max(...sample(vfRhythm(id), VF_START + 0.6, 5.9).map(Math.abs));
    expect(peak('fine')).toBeLessThan(peak('coarse') / 3);
    expect(peak('fine')).toBeGreaterThan(0.05);
  });
});

describe('torsades de pointes', () => {
  for (const { id } of TORSADES_OPTIONS) {
    const d = torsadesRhythm(id);

    it(`${id}: initiated by short-long-short: a PVC, a full compensatory pause, then an R-on-T PVC`, () => {
      const sinusBefore = d.beats.filter((b) => b.origin === 'sinus' && b.t < PVC1).at(-1)!;
      expect(PVC1 - sinusBefore.t).toBeLessThan(TORSADES_SINUS_PP);
      expect(POST_PAUSE_Q - sinusBefore.t).toBeCloseTo(2 * TORSADES_SINUS_PP);
      const pvcs = d.beats.filter((b) => b.origin === 'ventricular');
      expect(pvcs.map((b) => b.t)).toEqual([PVC1, R_ON_T]);
      expect(pvcs.every((b) => b.wide)).toBe(true);
      expect(R_ON_T - POST_PAUSE_Q).toBeLessThan(0.52); // before the T-wave peak of the post-pause beat
      expect(R_ON_T - POST_PAUSE_Q).toBeGreaterThan(0.3);
      expect(TDP_START).toBeGreaterThan(R_ON_T);
    });

    it(`${id}: the QT interval is long and the T wave is large after the pause`, () => {
      const qt = d.marks.find((m) => m.kind === 'bar' && m.tone === 'orange' && m.t0 === POST_PAUSE_Q);
      expect(qt && qt.kind === 'bar' && qt.t1 - qt.t0).toBeGreaterThanOrEqual(0.6);
      const tPeak = Math.max(...sample(d, POST_PAUSE_Q + 0.4, POST_PAUSE_Q + 0.62).map(Math.abs));
      const tBefore = Math.max(...sample(d, 1.26 + 0.3, 1.26 + 0.5).map(Math.abs));
      expect(tPeak).toBeGreaterThan(tBefore);
    });

    it(`${id}: polymorphic twisting at a rate of about 190-250 per minute`, () => {
      const end = TDP_END[id];
      // Count clear swings (local extrema beyond 0.15); the near-zero nodes between spindles are skipped.
      const v = sample(d, TDP_START + 0.2, end - 0.3);
      let extrema = 0;
      for (let i = 1; i < v.length - 1; i++) {
        const peak = v[i] > v[i - 1] && v[i] >= v[i + 1] && v[i] > 0.15;
        const trough = v[i] < v[i - 1] && v[i] <= v[i + 1] && v[i] < -0.15;
        if (peak || trough) extrema++;
      }
      const swingsPerSecond = extrema / (end - 0.3 - TDP_START - 0.2);
      expect(swingsPerSecond).toBeGreaterThan(5.5);
      expect(swingsPerSecond).toBeLessThan(8.5);
      expect(TORSADES_RATE).toBeGreaterThan(190);
      // Amplitude waxes and wanes: a node between two spindles.
      const peaks = [0, 1, 2, 3, 4, 5].map((k) => {
        const a = TDP_START + 0.3 + k * 0.4;
        return Math.max(...sample(d, a, a + 0.4).map(Math.abs));
      });
      expect(Math.max(...peaks)).toBeGreaterThan(2 * Math.min(...peaks));
    });

    it(`${id}: ventricular sparks and a ventricular circuit only`, () => {
      expect(sparks(d).every((s) => s.y >= 140)).toBe(true);
      const loops = d.pulses.filter((p) => p.type === 'loop');
      expect(loops.length).toBe(3);
      expect(loops.every((p) => p.type === 'loop' && p.path === 'vent-loop')).toBe(true);
      expect(loops.map((p) => (p.type === 'loop' ? p.period : 0))).toEqual([0.34, 0.27, 0.36]);
    });
  }

  it('self-terminating: lasts seconds, then conducted sinus beats return', () => {
    const d = torsadesRhythm('selflimit');
    expect(TDP_END.selflimit - TDP_START).toBeGreaterThan(2);
    const after = d.beats.filter((b) => b.t > TDP_END.selflimit);
    expect(after.length).toBeGreaterThanOrEqual(1);
    expect(after.every((b) => b.origin === 'sinus' && !b.wide)).toBe(true);
  });

  it('degenerating: chaotic VF follows and no conducted beat returns', () => {
    const d = torsadesRhythm('vf');
    expect(d.beats.filter((b) => b.t > TDP_END.vf)).toHaveLength(0);
    const v = sample(d, TDP_END.vf + 0.5, d.window - 0.1);
    const perSecond = crossings(v) / (d.window - 0.1 - TDP_END.vf - 0.5);
    expect(perSecond).toBeGreaterThan(5);
    expect(sparks(d).some((s) => s.tone === 'red' && s.t > TDP_END.vf)).toBe(true);
  });
});
