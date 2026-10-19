import { describe, expect, it } from 'vitest';
import { RHYTHMS } from '../src/data/rhythms';
import { signalAt } from '../src/lib/signal';

describe('signalAt', () => {
  it('shows nothing before the first P wave', () => {
    expect(signalAt(RHYTHMS.sinus, 0.2).s).toBeNull();
  });

  it('travels from atria toward the AV node, then reaches the ventricles at the QRS', () => {
    const mid = signalAt(RHYTHMS.sinus, 0.5 + 0.05);
    expect(mid.s).toBeCloseTo(0.15);
    const arrived = signalAt(RHYTHMS.sinus, 0.5 + 0.16);
    expect(arrived.s).toBe(1);
  });

  it('dwells at the AV node when the PR is long', () => {
    const dwell = signalAt(RHYTHMS.first, 0.5 + 0.2);
    expect(dwell.s).toBeCloseTo(0.3);
    expect(dwell.stall).toBe('none');
  });

  it('stalls a Mobitz I drop at the AV node', () => {
    const st = signalAt(RHYTHMS.mobitz1, 3.5 + 0.15);
    expect(st.s).toBeCloseTo(0.3);
    expect(st.stall).toBe('av-node');
  });

  it('stalls a Mobitz II drop below the AV node', () => {
    const st = signalAt(RHYTHMS.mobitz2, 3.5 + 0.25);
    expect(st.s).toBeCloseTo(0.6);
    expect(st.stall).toBe('infra-nodal');
  });

  it('fires the escape pulse in complete block and fades it', () => {
    expect(signalAt(RHYTHMS.complete, 1.3 + 0.1).escape).toBeGreaterThan(0.8);
    expect(signalAt(RHYTHMS.complete, 1.3 + 1.0).escape).toBe(0);
    expect(signalAt(RHYTHMS.mobitz2, 3).escape).toBe(0);
  });
});
