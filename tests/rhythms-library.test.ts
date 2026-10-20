import { describe, expect, it } from 'vitest';
import type { Pulse, RhythmDef } from '../src/engine/types';
import { AVNRT_CL, avnrtInitiation, avnrtSinus, avnrtTachycardia } from '../src/rhythms/avnrt';
import { AVRT_CL, AVRT_RP, avrtInitiation, avrtSinus, avrtTachycardia } from '../src/rhythms/avrt';
import { afIntervals, afRhythm } from '../src/rhythms/af';
import { FLUTTER_CYCLE, FLUTTER_PATTERNS, FLUTTER_TO_QRS, flutterRhythm } from '../src/rhythms/flutter';
import { AT_CYCLE, atRhythm } from '../src/rhythms/at';
import { JUNCTIONAL_PAUSE, JUNCTIONAL_RR, JUNCTIONAL_SINUS_RR, junctionalRhythm } from '../src/rhythms/junctional';
import { VENT_ESCAPE_RR, VENT_PP, ventricularRhythm } from '../src/rhythms/ventricular';

const qs = (d: RhythmDef) => d.beats.map((b) => b.t);
const gaps = (xs: number[]) => xs.slice(1).map((x, i) => x - xs[i]);
const rateOf = (interval: number) => 60 / interval;
const travels = (d: RhythmDef) => d.pulses.filter((p): p is Extract<Pulse, { type: 'travel' }> => p.type === 'travel');
const paths = (d: RhythmDef) => new Set(travels(d).map((p) => p.path));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)));
const withinWindow = (d: RhythmDef) => {
  for (const b of d.beats) expect(b.t + 0.3).toBeLessThanOrEqual(d.window);
};

describe('every rhythm', () => {
  const all: RhythmDef[] = [
    avnrtSinus(), avnrtInitiation(), avnrtTachycardia(),
    avrtSinus(), avrtInitiation(), avrtTachycardia(),
    afRhythm(),
    ...FLUTTER_PATTERNS.map((p) => flutterRhythm(p.id)),
    atRhythm('1:1'), atRhythm('2:1'),
    junctionalRhythm('beat'), junctionalRhythm('rhythm'),
    ventricularRhythm('beat'), ventricularRhythm('rhythm'),
  ];

  it('has a unique id, a description and a finite signal', () => {
    expect(new Set(all.map((d) => d.id)).size).toBe(all.length);
    for (const d of all) {
      expect(d.description.toLowerCase()).toContain('schematic');
      for (let t = 0; t <= d.window; t += 0.05) expect(Number.isFinite(d.signal(t))).toBe(true);
      withinWindow(d);
    }
  });

  it('keeps every pulse and mark inside the strip window', () => {
    for (const d of all) {
      for (const p of d.pulses) {
        const t = p.type === 'travel' || p.type === 'loop' ? p.t0 : p.t;
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThanOrEqual(d.window);
      }
    }
  });
});

describe('AVNRT', () => {
  const d = avnrtTachycardia();

  it('is regular, fast and narrow-complex', () => {
    const rr = gaps(qs(d));
    expect(sd(rr)).toBeLessThan(1e-9);
    expect(rr[0]).toBeCloseTo(AVNRT_CL);
    expect(rateOf(rr[0])).toBeGreaterThan(150);
    expect(rateOf(rr[0])).toBeLessThan(250);
    expect(d.beats.every((b) => !b.wide)).toBe(true);
  });

  it('buries the retrograde P wave in the QRS (RP under 70 ms)', () => {
    expect(d.atrial).toHaveLength(d.beats.length);
    d.beats.forEach((b, i) => {
      const rp = d.atrial[i].t - b.t;
      expect(d.atrial[i].kind).toBe('retro');
      expect(rp).toBeGreaterThan(0);
      expect(rp).toBeLessThan(0.07);
    });
  });

  it('re-enters inside the AV node: slow pathway down, fast pathway up, no accessory pathway', () => {
    const p = paths(d);
    expect(p.has('avn-slow')).toBe(true);
    expect(p.has('avn-fast')).toBe(true);
    expect(p.has('ap')).toBe(false);
    expect(p.has('atria-ap')).toBe(false);
    const slow = travels(d).filter((t) => t.path === 'avn-slow');
    const fast = travels(d).filter((t) => t.path === 'avn-fast');
    const his = travels(d).filter((t) => t.path === 'his');
    expect(slow.every((t) => !t.reverse)).toBe(true);
    expect(fast.every((t) => t.reverse)).toBe(true);
    slow.forEach((s, i) => {
      expect(fast[i].t0).toBeGreaterThanOrEqual(s.t1 - 1e-9);
      // Atria and ventricles are activated almost simultaneously.
      expect(Math.abs(fast[i].t0 - his[i].t0)).toBeLessThan(0.01);
    });
  });

  it('starts with a premature beat that blocks in the fast pathway and conducts slowly', () => {
    const init = avnrtInitiation();
    const sinusPP = gaps(init.atrial.filter((a) => a.kind === 'sinus').map((a) => a.t))[0];
    const pac = init.atrial.find((a) => a.kind === 'ectopic');
    const lastSinus = init.atrial.filter((a) => a.kind === 'sinus').at(-1)!;
    expect(pac).toBeDefined();
    expect(pac!.t - lastSinus.t).toBeLessThan(sinusPP);
    const first = init.beats.find((b) => b.origin === 'pac')!;
    expect(first.t - pac!.t).toBeGreaterThan(0.3);
    expect(travels(init).some((t) => t.path === 'avn-fast' && t.tone === 'red' && t.stop !== undefined)).toBe(true);
    expect(gaps(qs(init).slice(-5)).every((g) => Math.abs(g - AVNRT_CL) < 1e-9)).toBe(true);
  });

  it('conducts sinus beats over the fast pathway with a normal PR', () => {
    const s = avnrtSinus();
    s.beats.forEach((b, i) => expect(b.t - s.atrial[i].t).toBeCloseTo(0.16));
    expect(paths(s).has('avn-fast')).toBe(true);
    expect(paths(s).has('avn-slow')).toBe(false);
  });
});

describe('AVRT', () => {
  const d = avrtTachycardia();

  it('is regular, fast and narrow-complex', () => {
    const rr = gaps(qs(d));
    expect(sd(rr)).toBeLessThan(1e-9);
    expect(rr[0]).toBeCloseTo(AVRT_CL);
    expect(rateOf(rr[0])).toBeGreaterThan(150);
    expect(rateOf(rr[0])).toBeLessThan(250);
    expect(d.beats.every((b) => !b.wide)).toBe(true);
  });

  it('shows the retrograde P wave after the QRS: RP at least 70 ms but shorter than half the R-R', () => {
    d.beats.forEach((b, i) => {
      const rp = d.atrial[i].t - b.t;
      expect(rp).toBeGreaterThanOrEqual(0.07);
      expect(rp).toBeLessThan(AVRT_CL / 2);
    });
  });

  it('draws the retrograde P wave as its own dip, separate from the T wave', () => {
    for (const r of [d, avrtInitiation()]) {
      const q = r.beats[r.beats.length - 2].t;
      const dip = r.signal(q + AVRT_RP + 0.05);
      const st = r.signal(q + 0.075);
      const tPeak = r.signal(q + 0.23);
      expect(dip).toBeLessThan(-0.05);
      expect(st).toBeGreaterThan(dip + 0.04);
      expect(tPeak).toBeGreaterThan(0.05);
    }
  });

  it('uses a macro-circuit: AV node down, accessory pathway up, no dual AV node pathways', () => {
    const p = paths(d);
    expect(p.has('ap')).toBe(true);
    expect(p.has('avn-direct')).toBe(true);
    expect(p.has('atria-ap')).toBe(true);
    expect(p.has('avn-slow')).toBe(false);
    expect(p.has('avn-fast')).toBe(false);
    const ap = travels(d).filter((t) => t.path === 'ap');
    expect(ap.every((t) => t.reverse)).toBe(true);
    const bb = travels(d).filter((t) => t.path === 'bb-left');
    // The accessory pathway is used only after the ventricles have been activated.
    ap.forEach((a, i) => expect(a.t0).toBeGreaterThanOrEqual(bb[i].t0));
  });

  it('differs from AVNRT in where the retrograde P wave sits and which structures are used', () => {
    const nrt = avnrtTachycardia();
    const nrtRp = nrt.atrial[0].t - nrt.beats[0].t;
    const rtRp = d.atrial[0].t - d.beats[0].t;
    expect(rtRp).toBeGreaterThan(nrtRp);
    expect([...paths(nrt)].some((p) => paths(d).has(p) === false)).toBe(true);
  });

  it('shows pre-excitation in sinus rhythm: short PR and a delta wave', () => {
    const s = avrtSinus();
    expect(s.beats.every((b) => b.preexcited)).toBe(true);
    s.beats.forEach((b, i) => expect(b.t - s.atrial[i].t).toBeLessThan(0.12));
    expect(travels(s).some((t) => t.path === 'ap' && !t.reverse)).toBe(true);
  });

  it('starts when a premature beat blocks in the accessory pathway', () => {
    const init = avrtInitiation();
    expect(travels(init).some((t) => t.path === 'ap' && t.tone === 'red' && t.stop !== undefined)).toBe(true);
    const tachy = init.beats.filter((b) => b.origin === 'tachy' || b.origin === 'pac');
    expect(tachy.every((b) => !b.preexcited)).toBe(true);
    expect(init.beats.filter((b) => b.preexcited)).toHaveLength(2);
  });
});

describe('atrial fibrillation', () => {
  const d = afRhythm();
  const rr = gaps(qs(d));

  it('has disorganised atrial activity: no P waves, fibrillatory baseline, chaotic wavelets', () => {
    expect(d.fibrillation).toBe(true);
    expect(d.atrial).toHaveLength(0);
    expect(d.isoelectric).toBe(false);
    const sparks = d.pulses.filter((p) => p.type === 'spark');
    expect(sparks.length).toBeGreaterThanOrEqual(100);
    for (const s of sparks) {
      if (s.type !== 'spark') continue;
      expect(s.x).toBeGreaterThanOrEqual(70);
      expect(s.x).toBeLessThanOrEqual(310);
      expect(s.y).toBeGreaterThanOrEqual(12);
      expect(s.y).toBeLessThanOrEqual(56);
    }
    expect(new Set(sparks.map((s) => (s.type === 'spark' ? Math.round(s.x / 20) : 0))).size).toBeGreaterThan(5);
  });

  it('has an irregularly irregular ventricular response', () => {
    expect(rr.length).toBeGreaterThanOrEqual(5);
    expect(sd(rr) / mean(rr)).toBeGreaterThan(0.15);
    for (let i = 1; i < rr.length; i++) expect(Math.abs(rr[i] - rr[i - 1])).toBeGreaterThanOrEqual(0.06 - 1e-9);
    expect(Math.max(...rr) - Math.min(...rr)).toBeGreaterThan(0.3);
    expect(new Set(rr.map((x) => x.toFixed(2))).size).toBe(rr.length);
  });

  it('has a controlled to moderate ventricular rate with narrow QRS', () => {
    expect(rateOf(mean(rr))).toBeGreaterThan(60);
    expect(rateOf(mean(rr))).toBeLessThan(180);
    expect(d.beats.every((b) => !b.wide)).toBe(true);
    expect(Math.min(...rr)).toBeGreaterThan(0.3);
  });

  it('is reproducible and not periodic', () => {
    expect(afIntervals()).toEqual(afIntervals());
    expect(afIntervals(1)).not.toEqual(afIntervals(2));
    expect(afRhythm().pulses).toEqual(d.pulses);
  });

  it('filters impulses at the AV node: some are blocked', () => {
    expect(travels(d).filter((t) => t.tone === 'red' && t.stop !== undefined).length).toBeGreaterThan(3);
  });
});

describe('atrial flutter', () => {
  it('has organised flutter waves at about 300 per minute with no flat baseline', () => {
    for (const { id } of FLUTTER_PATTERNS) {
      const d = flutterRhythm(id);
      expect(d.isoelectric).toBe(false);
      expect(d.atrial.every((a) => a.kind === 'flutter')).toBe(true);
      const g = gaps(d.atrial.map((a) => a.t));
      expect(sd(g)).toBeLessThan(1e-9);
      expect(g[0]).toBeCloseTo(FLUTTER_CYCLE);
      expect(rateOf(g[0])).toBeGreaterThan(250);
      expect(rateOf(g[0])).toBeLessThan(350);
      expect(d.pulses.some((p) => p.type === 'loop' && p.path === 'flutter-loop' && p.period === FLUTTER_CYCLE)).toBe(true);
    }
  });

  it('conducts every flutter wave to the QRS with a fixed flutter-to-QRS interval', () => {
    for (const { id } of FLUTTER_PATTERNS) {
      const d = flutterRhythm(id);
      const conducted = d.atrial.filter((a) => a.conducted);
      expect(conducted).toHaveLength(d.beats.length);
      conducted.forEach((a, i) => expect(d.beats[i].t - a.t).toBeCloseTo(FLUTTER_TO_QRS));
    }
  });

  it('2:1 gives a regular ventricular rate of 150', () => {
    const d = flutterRhythm('2:1');
    const rr = gaps(qs(d));
    expect(sd(rr)).toBeLessThan(1e-9);
    expect(rateOf(rr[0])).toBeCloseTo(150);
    expect(d.atrial.filter((a) => !a.conducted).length).toBeGreaterThan(0);
  });

  it('4:1 gives a regular ventricular rate of 75', () => {
    const rr = gaps(qs(flutterRhythm('4:1')));
    expect(sd(rr)).toBeLessThan(1e-9);
    expect(rateOf(rr[0])).toBeCloseTo(75);
  });

  it('variable conduction mixes ratios and gives an irregular but patterned response', () => {
    const d = flutterRhythm('variable');
    const ratios = gaps(qs(d)).map((g) => Math.round(g / FLUTTER_CYCLE));
    expect(new Set(ratios).size).toBeGreaterThanOrEqual(2);
    expect(ratios.every((r) => r === 2 || r === 4)).toBe(true);
    expect(sd(gaps(qs(d)))).toBeGreaterThan(0.05);
  });

  it('has different ventricular rates for the three patterns', () => {
    const r = FLUTTER_PATTERNS.map((p) => mean(gaps(qs(flutterRhythm(p.id)))));
    expect(new Set(r.map((x) => x.toFixed(2))).size).toBe(3);
  });
});

describe('atrial tachycardia', () => {
  for (const conduction of ['1:1', '2:1'] as const) {
    const d = atRhythm(conduction);
    const ectopic = d.atrial.filter((a) => a.kind === 'ectopic');
    const sinus = d.atrial.filter((a) => a.kind === 'sinus');

    it(`${conduction}: organised, regular non-sinus atrial activity at 100-250 per minute`, () => {
      expect(ectopic.length).toBeGreaterThanOrEqual(5);
      const g = gaps(ectopic.map((a) => a.t));
      expect(sd(g)).toBeLessThan(1e-9);
      expect(g[0]).toBeCloseTo(AT_CYCLE);
      expect(rateOf(g[0])).toBeGreaterThanOrEqual(100);
      expect(rateOf(g[0])).toBeLessThanOrEqual(250);
      expect(g[0]).toBeLessThan(gaps(sinus.map((a) => a.t))[0]);
    });

    it(`${conduction}: P wave shape differs from sinus and the baseline is flat between waves`, () => {
      expect(Math.sign(ectopic[0].amp)).not.toBe(Math.sign(sinus[0].amp));
      expect(d.isoelectric).toBe(true);
      expect(d.fibrillation).toBe(false);
      expect(d.pulses.some((p) => p.type === 'flash' && p.site === 'ectopic')).toBe(true);
      expect(travels(d).some((t) => t.path === 'atria-ect')).toBe(true);
    });
  }

  it('1:1 conducts every ectopic P wave; 2:1 conducts every second', () => {
    const one = atRhythm('1:1').atrial.filter((a) => a.kind === 'ectopic');
    expect(one.slice(0, -1).every((a) => a.conducted)).toBe(true);
    const two = atRhythm('2:1').atrial.filter((a) => a.kind === 'ectopic');
    two.forEach((a, i) => expect(a.conducted).toBe(i % 2 === 0));
    const q1 = atRhythm('1:1').beats.filter((b) => b.t > 2);
    const q2 = atRhythm('2:1').beats.filter((b) => b.t > 2);
    expect(gaps(q1.map((b) => b.t))[0]).toBeCloseTo(AT_CYCLE);
    expect(gaps(q2.map((b) => b.t))[0]).toBeCloseTo(2 * AT_CYCLE);
  });
});

describe('junctional escape', () => {
  for (const kind of ['beat', 'rhythm'] as const) {
    const d = junctionalRhythm(kind);
    const escapes = d.beats.filter((b) => b.origin === 'junctional');
    const sinusBeats = d.beats.filter((b) => b.origin === 'sinus');
    const lastSinusBeforePause = sinusBeats[2];

    it(`${kind}: follows a pause and is never premature`, () => {
      expect(escapes.length).toBe(kind === 'beat' ? 1 : 3);
      const coupling = escapes[0].t - lastSinusBeforePause.t;
      expect(coupling).toBeCloseTo(JUNCTIONAL_PAUSE);
      expect(coupling).toBeGreaterThan(1.3 * JUNCTIONAL_SINUS_RR);
      for (const e of escapes) {
        const prev = d.beats.filter((b) => b.t < e.t).at(-1)!;
        expect(e.t - prev.t).toBeGreaterThan(JUNCTIONAL_SINUS_RR);
      }
    });

    it(`${kind}: narrow QRS with retrograde P waves and no sinus P wave in the pause`, () => {
      expect(escapes.every((e) => !e.wide)).toBe(true);
      const retro = d.atrial.filter((a) => a.kind === 'retro');
      expect(retro).toHaveLength(escapes.length);
      expect(retro.every((a) => a.amp < 0)).toBe(true);
      const pauseSinus = d.atrial.filter((a) => a.kind === 'sinus' && a.t > lastSinusBeforePause.t - 0.16 + 0.05 && a.t < escapes[0].t);
      expect(pauseSinus).toHaveLength(0);
      expect(d.pulses.some((p) => p.type === 'flash' && p.site === 'junction')).toBe(true);
    });
  }

  it('rhythm runs at a slow, regular 40-60 per minute', () => {
    const e = junctionalRhythm('rhythm').beats.filter((b) => b.origin === 'junctional').map((b) => b.t);
    const g = gaps(e);
    expect(sd(g)).toBeLessThan(1e-9);
    expect(g[0]).toBeCloseTo(JUNCTIONAL_RR);
    expect(rateOf(g[0])).toBeGreaterThanOrEqual(40);
    expect(rateOf(g[0])).toBeLessThanOrEqual(60);
  });

  it('beat: sinus rhythm resumes afterwards', () => {
    const d = junctionalRhythm('beat');
    const idx = d.beats.findIndex((b) => b.origin === 'junctional');
    expect(d.beats.slice(idx + 1).every((b) => b.origin === 'sinus')).toBe(true);
    expect(d.beats.length - idx - 1).toBe(2);
  });
});

describe('ventricular escape', () => {
  for (const kind of ['beat', 'rhythm'] as const) {
    const d = ventricularRhythm(kind);
    const escapes = d.beats.filter((b) => b.origin === 'ventricular');
    const conductedFirst = d.beats.filter((b) => b.origin === 'sinus')[1];

    it(`${kind}: follows a long pause and is never premature`, () => {
      expect(escapes.length).toBe(kind === 'beat' ? 1 : 3);
      expect(escapes[0].t - conductedFirst.t).toBeGreaterThan(2 * VENT_PP);
      for (const e of escapes) {
        const prev = d.beats.filter((b) => b.t < e.t).at(-1)!;
        expect(e.t - prev.t).toBeGreaterThan(VENT_PP * 1.5);
      }
    });

    it(`${kind}: wide QRS with no P wave in front of it`, () => {
      expect(escapes.every((e) => e.wide)).toBe(true);
      expect(d.beats.filter((b) => b.origin !== 'ventricular').every((b) => !b.wide)).toBe(true);
      for (const e of escapes) expect(d.atrial.filter((a) => a.t > e.t - 0.3 && a.t < e.t)).toHaveLength(0);
      expect(d.pulses.some((p) => p.type === 'flash' && p.site === 'ventricle')).toBe(true);
    });

    it(`${kind}: P waves in the pause are not conducted`, () => {
      const pause = d.atrial.filter((a) => a.t > conductedFirst.t && a.t < escapes[0].t);
      expect(pause.length).toBeGreaterThanOrEqual(2);
      expect(pause.every((a) => !a.conducted)).toBe(true);
    });
  }

  it('rhythm: slow regular 20-40 per minute, unrelated to the continuing P waves', () => {
    const d = ventricularRhythm('rhythm');
    const e = d.beats.filter((b) => b.origin === 'ventricular').map((b) => b.t);
    const g = gaps(e);
    expect(sd(g)).toBeLessThan(1e-9);
    expect(g[0]).toBeCloseTo(VENT_ESCAPE_RR);
    expect(rateOf(g[0])).toBeGreaterThanOrEqual(20);
    expect(rateOf(g[0])).toBeLessThanOrEqual(40);
    const pp = gaps(d.atrial.map((a) => a.t));
    expect(sd(pp)).toBeLessThan(1e-9);
    expect(pp[0]).toBeCloseTo(VENT_PP);
    // The P-to-QRS relationship drifts: no fixed PR means no conduction.
    const offsets = e.map((q) => {
      const before = d.atrial.filter((a) => a.t <= q);
      return +(q - before[before.length - 1].t).toFixed(2);
    });
    expect(new Set(offsets).size).toBe(offsets.length);
  });

  it('beat: conduction resumes after the escape beat', () => {
    const d = ventricularRhythm('beat');
    const idx = d.beats.findIndex((b) => b.origin === 'ventricular');
    expect(d.beats.slice(idx + 1).length).toBeGreaterThanOrEqual(3);
    expect(d.beats.slice(idx + 1).every((b) => b.origin === 'sinus' && !b.wide)).toBe(true);
  });
});
