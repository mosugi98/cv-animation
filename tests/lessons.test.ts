import { describe, expect, it } from 'vitest';
import { durationOf, sceneIndexIn, sceneProgressIn } from '../src/engine/timeline';
import { GROUPS, LESSONS, buildLesson, getLesson, isLessonId, resolveOption } from '../src/lessons';
import {
  CAPTURE_SPIKES, OUTPUT_ESCAPES, OUTPUT_MISSING, OVERSENSE_NOISE, SENSED_AV, UNDERSENSE_SPIKES, vddScript,
} from '../src/rhythms/pacing';
import { rhythmTime } from '../src/lessons/sequence';
import type { Lesson, LessonScene } from '../src/lessons/types';

interface Variant {
  lesson: Lesson;
  option?: string;
}

const variants: Variant[] = LESSONS.flatMap((lesson): Variant[] =>
  lesson.options ? lesson.options.map((o) => ({ lesson, option: o.id })) : [{ lesson, option: undefined }],
);

describe('lesson registry', () => {
  it('has the twenty-nine lessons with unique ids, in teaching order', () => {
    expect(LESSONS.map((l) => l.id)).toEqual([
      'avnrt', 'avrt', 'wpw', 'aberrancy', 'af', 'flutter', 'at',
      'sss', 'sinoblock', 'sinusarrest',
      'av1', 'avm1', 'avm2', 'avhigh', 'av3',
      'lbbb', 'rbbb', 'fascicular',
      'junctional', 'ventricular',
      'pacemaker', 'pacing-physio', 'pacing-fault',
      'pvc', 'vt', 'torsades', 'vf', 'hypokalemia', 'hyperkalemia',
    ]);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(29);
  });

  it('groups the conduction lessons by topic, with AV block inside the library', () => {
    const g = (id: string) => GROUPS.find((x) => x.id === id)?.lessons;
    expect(g('sinus-node')).toEqual(['sss', 'sinoblock', 'sinusarrest']);
    expect(g('av-block')).toEqual(['av1', 'avm1', 'avm2', 'avhigh', 'av3']);
    expect(g('bundle-branch')).toEqual(['lbbb', 'rbbb', 'fascicular']);
    expect(g('pacemakers')).toEqual(['pacemaker', 'pacing-physio', 'pacing-fault']);
    expect(GROUPS.map((x) => x.id)).toEqual([
      'svt', 'preexcitation', 'atrial', 'sinus-node', 'av-block', 'bundle-branch', 'escape', 'pacemakers',
      'ventricular-arrhythmias', 'electrolytes',
    ]);
  });

  it('groups the new lessons by topic', () => {
    const g = (id: string) => GROUPS.find((x) => x.id === id)?.lessons;
    expect(g('preexcitation')).toEqual(['wpw', 'aberrancy']);
    expect(g('ventricular-arrhythmias')).toEqual(['pvc', 'vt', 'torsades', 'vf']);
    expect(g('electrolytes')).toEqual(['hypokalemia', 'hyperkalemia']);
  });

  it('groups every lesson exactly once, with AVNRT and AVRT together under SVT', () => {
    const all = GROUPS.flatMap((g) => g.lessons);
    expect([...all].sort()).toEqual(LESSONS.map((l) => l.id).sort());
    expect(GROUPS.find((g) => g.id === 'svt')?.lessons).toEqual(['avnrt', 'avrt']);
  });

  it('looks lessons up and validates ids', () => {
    expect(getLesson('af')?.id).toBe('af');
    expect(getLesson('nope')).toBeUndefined();
    expect(isLessonId('avrt')).toBe(true);
    expect(isLessonId('sinus')).toBe(false);
  });

  it('configures options: flutter patterns, AT conduction, escape beat or rhythm', () => {
    expect(getLesson('flutter')!.options!.map((o) => o.id)).toEqual(['2:1', '4:1', 'variable']);
    expect(getLesson('at')!.options!.map((o) => o.id)).toEqual(['1:1', '2:1']);
    expect(getLesson('junctional')!.options!.map((o) => o.id)).toEqual(['beat', 'rhythm']);
    expect(getLesson('ventricular')!.options!.map((o) => o.id)).toEqual(['beat', 'rhythm']);
    expect(getLesson('avnrt')!.options).toBeUndefined();
    expect(getLesson('pvc')!.options!.map((o) => o.id)).toEqual(['single', 'bigeminy', 'couplet']);
    expect(getLesson('vt')!.options!.map((o) => o.id)).toEqual(['sustained', 'nsvt']);
    expect(getLesson('wpw')!.options!.map((o) => o.id)).toEqual(['sinus', 'orthodromic', 'antidromic', 'af']);
    expect(getLesson('torsades')!.options!.map((o) => o.id)).toEqual(['selflimit', 'vf']);
    expect(getLesson('vf')!.options!.map((o) => o.id)).toEqual(['coarse', 'fine']);
    expect(getLesson('aberrancy')!.options).toBeUndefined();
    expect(getLesson('hypokalemia')!.options).toBeUndefined();
    expect(getLesson('avhigh')!.options!.map((o) => o.id)).toEqual(['2to1', '3to1']);
    expect(getLesson('av3')!.options!.map((o) => o.id)).toEqual(['junctional', 'ventricular']);
    expect(getLesson('sinoblock')!.options!.map((o) => o.id)).toEqual(['type1', 'type2']);
    expect(getLesson('sinusarrest')!.options!.map((o) => o.id)).toEqual(['pause', 'escape']);
    expect(getLesson('sss')!.options!.map((o) => o.id)).toEqual(['tachybrady', 'brady']);
    expect(getLesson('fascicular')!.options!.map((o) => o.id)).toEqual(['lafb', 'lpfb', 'bifascicular', 'longpr']);
    expect(getLesson('pacemaker')!.options!.map((o) => o.id)).toEqual(['aai', 'vvi', 'voo', 'vdd', 'ddi', 'ddd']);
    expect(getLesson('pacing-physio')!.options!.map((o) => o.id)).toEqual(['rv', 'biv', 'csp']);
    expect(getLesson('pacing-fault')!.options!.map((o) => o.id)).toEqual(['capture', 'undersensing', 'oversensing', 'output']);
    for (const id of ['av1', 'avm1', 'avm2', 'lbbb', 'rbbb']) expect(getLesson(id)!.options).toBeUndefined();
  });

  it('never reuses a rhythm id for a different rhythm (strips are cached by id)', () => {
    const seen = new Map<string, string>();
    for (const { lesson, option } of variants) {
      for (const r of Object.values(buildLesson(lesson, option).rhythms)) {
        const sig = `${r.label}|${r.description}|${r.window}`;
        expect(seen.get(r.id) ?? sig, r.id).toBe(sig);
        seen.set(r.id, sig);
      }
    }
  });

  it('falls back to the default option for unknown values', () => {
    const f = getLesson('flutter')!;
    expect(resolveOption(f, '4:1')).toBe('4:1');
    expect(resolveOption(f, 'bogus')).toBe('2:1');
    expect(resolveOption(f, null)).toBe('2:1');
    expect(resolveOption(getLesson('af')!, '4:1')).toBeUndefined();
  });

  it('builds once per lesson and option', () => {
    const f = getLesson('flutter')!;
    expect(buildLesson(f, '4:1')).toBe(buildLesson(f, '4:1'));
    expect(buildLesson(f, '4:1')).not.toBe(buildLesson(f, '2:1'));
    expect(buildLesson(f, 'bogus')).toBe(buildLesson(f, '2:1'));
  });
});

describe.each(variants)('lesson $lesson.id $option', ({ lesson, option }) => {
  const build = buildLesson(lesson, option);
  const { scenes, rhythms, summary } = build;

  it('has a contiguous timeline of 5-7 scenes lasting 24-40 seconds', () => {
    expect(scenes.length).toBeGreaterThanOrEqual(5);
    expect(scenes.length).toBeLessThanOrEqual(7);
    expect(scenes[0].start).toBe(0);
    scenes.forEach((s, i) => {
      expect(s.end).toBeGreaterThan(s.start);
      if (i > 0) expect(s.start).toBe(scenes[i - 1].end);
    });
    expect(durationOf(scenes)).toBeGreaterThanOrEqual(24);
    expect(durationOf(scenes)).toBeLessThanOrEqual(40);
  });

  it('ends with a single recognition-summary scene and animates the rest', () => {
    const last = scenes[scenes.length - 1];
    expect(last.view).toBe('summary');
    expect(last.rhythm).toBeNull();
    expect(last.sub).toBe('Schematic educational example.');
    expect(scenes.slice(0, -1).every((s) => s.view === 'play' && s.rhythm !== null)).toBe(true);
  });

  it('only references rhythms that exist, with valid spans', () => {
    for (const s of scenes) {
      if (s.rhythm === null) continue;
      expect(rhythms[s.rhythm]).toBeDefined();
      expect(s.span[0]).toBeGreaterThanOrEqual(0);
      expect(s.span[1]).toBeLessThanOrEqual(1);
      expect(s.span[1]).toBeGreaterThan(s.span[0]);
      // No scene stretches a rhythm slower than 8x real time.
      const real = (s.span[1] - s.span[0]) * rhythms[s.rhythm].window;
      expect((s.end - s.start) / real).toBeLessThanOrEqual(8);
    }
    expect(rhythms[lesson.previewKey] ?? buildLesson(lesson, lesson.defaultOption).rhythms[lesson.previewKey]).toBeDefined();
  });

  it('gives every scene a caption, a chip and a legend entry set', () => {
    for (const s of scenes) {
      expect(s.title.length).toBeGreaterThan(10);
      expect(s.sub.length).toBeGreaterThan(5);
      expect(s.chip).toMatch(/^\d · /);
      expect(`${s.title}${s.sub}${s.chip}`).not.toMatch(/undefined|NaN/);
    }
    expect(lesson.legend.length).toBeGreaterThanOrEqual(3);
  });

  it('has a complete recognition summary', () => {
    expect(summary.rows.length).toBeGreaterThanOrEqual(5);
    expect(summary.rows.every((r) => r.label && r.value)).toBe(true);
    expect(summary.keyline.length).toBeGreaterThan(20);
    expect(summary.pitfall.length).toBeGreaterThan(20);
  });

  it('labels every rhythm as a schematic example', () => {
    for (const r of Object.values(rhythms)) expect(r.description.toLowerCase()).toContain('schematic');
  });

  it('maps timeline time to rhythm time without leaving the strip', () => {
    for (const s of scenes) {
      if (s.rhythm === null) continue;
      const w = rhythms[s.rhythm].window;
      for (let k = 0; k <= 10; k++) {
        const t = s.start + ((s.end - s.start) * k) / 10 - (k === 10 ? 1e-6 : 0);
        const i = sceneIndexIn(scenes, t);
        expect(scenes[i].id).toBe(s.id);
        const rt = rhythmTime(w, s.span, sceneProgressIn(scenes, t));
        expect(rt).toBeGreaterThanOrEqual(-1e-9);
        expect(rt).toBeLessThanOrEqual(w + 1e-9);
      }
    }
  });
});

/** The scene whose span must contain a given moment of the rhythm. */
function contains(scenes: LessonScene[], id: string, rhythmWindow: number, t: number) {
  const s = scenes.find((x) => x.id === id)!;
  expect(s, `scene ${id}`).toBeDefined();
  expect(t / rhythmWindow).toBeGreaterThanOrEqual(s.span[0] - 1e-9);
  expect(t / rhythmWindow).toBeLessThanOrEqual(s.span[1] + 1e-9);
}

describe('captions are synchronised with the events they describe', () => {
  it('AVNRT: trigger scene shows the blocked premature beat, circuit scene the first re-entry beat', () => {
    const b = buildLesson(getLesson('avnrt')!);
    const r = b.rhythms.initiation;
    const pac = r.atrial.find((a) => a.kind === 'ectopic')!;
    contains(b.scenes, 'trigger', r.window, pac.t);
    const first = r.beats.find((x) => x.origin === 'pac')!;
    contains(b.scenes, 'circuit', r.window, first.t);
    contains(b.scenes, 'circuit', r.window, first.t + 0.35);
  });

  it('AVRT: trigger scene shows the block in the accessory pathway, circuit scene the first return beat', () => {
    const b = buildLesson(getLesson('avrt')!);
    const r = b.rhythms.initiation;
    const blocked = r.pulses.find((p) => p.type === 'travel' && p.path === 'ap' && p.stop !== undefined)!;
    if (blocked.type !== 'travel') throw new Error('unreachable');
    contains(b.scenes, 'trigger', r.window, blocked.t0);
    const first = r.beats.find((x) => x.origin === 'pac')!;
    contains(b.scenes, 'circuit', r.window, first.t + 0.14);
  });

  it('AVRT retro-P scene includes retrograde P waves', () => {
    const b = buildLesson(getLesson('avrt')!);
    const r = b.rhythms.tachycardia;
    const s = b.scenes.find((x) => x.id === 'retro-p')!;
    const inside = r.atrial.filter((a) => a.t / r.window >= s.span[0] && a.t / r.window <= s.span[1]);
    expect(inside.length).toBeGreaterThanOrEqual(3);
  });

  it('AF: the AV-node scene contains blocked impulses', () => {
    const b = buildLesson(getLesson('af')!);
    const r = b.rhythms.af;
    const s = b.scenes.find((x) => x.id === 'filter')!;
    const blocked = r.pulses.filter(
      (p) => p.type === 'travel' && p.tone === 'red' && p.t0 / r.window >= s.span[0] && p.t0 / r.window <= s.span[1],
    );
    expect(blocked.length).toBeGreaterThanOrEqual(2);
  });

  it('flutter: the conduction scene names the chosen ratio and uses the matching rhythm', () => {
    const f = getLesson('flutter')!;
    for (const o of ['2:1', '4:1', 'variable']) {
      const b = buildLesson(f, o);
      expect(Object.keys(b.rhythms)).toEqual([`flutter-${o}`]);
      const resp = b.scenes.find((s) => s.id === 'response')!;
      const text = `${resp.chip} ${resp.title}`.toLowerCase();
      expect(text).toContain(o === 'variable' ? 'variable' : o);
    }
    expect(buildLesson(f, '2:1').summary.rows.some((r) => r.value.includes('150'))).toBe(true);
    expect(buildLesson(f, '4:1').summary.rows.some((r) => r.value.includes('75'))).toBe(true);
  });

  it('atrial tachycardia: the focus scene starts where the ectopic P waves begin', () => {
    for (const o of ['1:1', '2:1']) {
      const b = buildLesson(getLesson('at')!, o);
      const r = Object.values(b.rhythms)[0];
      const first = r.atrial.find((a) => a.kind === 'ectopic')!;
      const focus = b.scenes.find((s) => s.id === 'focus')!;
      expect(focus.span[1] * r.window).toBeGreaterThan(first.t);
      expect(focus.span[0] * r.window).toBeLessThanOrEqual(first.t);
    }
  });

  it.each(['junctional', 'ventricular'])('%s: the pause scene or block scene precedes the late escape, and the escape scene contains it', (id) => {
    for (const o of ['beat', 'rhythm']) {
      const b = buildLesson(getLesson(id)!, o);
      const r = Object.values(b.rhythms)[0];
      const origin = id === 'junctional' ? 'junctional' : 'ventricular';
      const esc = r.beats.find((x) => x.origin === origin)!;
      contains(b.scenes, 'escape', r.window, esc.t);
      const before = b.scenes[b.scenes.findIndex((s) => s.id === 'escape') - 1];
      expect(before.span[1] * r.window).toBeLessThanOrEqual(esc.t);
      // The escape is late relative to the cycle preceding it.
      const prev = r.beats.filter((x) => x.t < esc.t).at(-1)!;
      expect(esc.t - prev.t).toBeGreaterThan(1.3 * 0.8);
    }
  });

  it('escape rhythm lessons describe the rate and escape beat lessons describe a single beat', () => {
    for (const id of ['junctional', 'ventricular']) {
      const beat = buildLesson(getLesson(id)!, 'beat');
      const rhythm = buildLesson(getLesson(id)!, 'rhythm');
      expect(beat.summary.rows.find((r) => r.label === 'Rate')!.value).toBe('A single beat');
      expect(rhythm.summary.rows.find((r) => r.label === 'Rate')!.value).toMatch(/per minute/);
      expect(beat.scenes.some((s) => s.id === 'resume')).toBe(true);
      expect(rhythm.scenes.some((s) => s.id === 'rhythm')).toBe(true);
    }
  });
});

describe('new lessons are synchronised with the events they describe', () => {
  it('PVC: the early-beat scene contains the first PVC, and the pause scene follows it', () => {
    for (const o of ['single', 'bigeminy', 'couplet']) {
      const b = buildLesson(getLesson('pvc')!, o);
      const r = Object.values(b.rhythms)[0];
      const pvc = r.beats.find((x) => x.origin === 'ventricular')!;
      contains(b.scenes, 'early', r.window, pvc.t + 0.1);
      const pause = b.scenes.find((s) => s.id === 'pause')!;
      expect(pause.span[0]).toBeGreaterThanOrEqual(b.scenes.find((s) => s.id === 'early')!.span[1] - 1e-9);
    }
  });

  it('VT: the onset scene contains the first VT beat; sustained VT shows P waves inside the dissociation scene', () => {
    for (const o of ['sustained', 'nsvt']) {
      const b = buildLesson(getLesson('vt')!, o);
      const r = Object.values(b.rhythms)[0];
      const first = r.beats.find((x) => x.origin === 'ventricular')!;
      contains(b.scenes, 'onset', r.window, first.t + 0.1);
    }
    const b = buildLesson(getLesson('vt')!, 'sustained');
    const r = Object.values(b.rhythms)[0];
    const s = b.scenes.find((x) => x.id === 'dissociation')!;
    const inside = r.atrial.filter((a) => a.t / r.window >= s.span[0] && a.t / r.window <= s.span[1]);
    expect(inside.length).toBeGreaterThanOrEqual(2);
  });

  it('torsades: the trigger scene holds the R-on-T PVC and the twisting scene begins with the run', () => {
    for (const o of ['selflimit', 'vf']) {
      const b = buildLesson(getLesson('torsades')!, o);
      const r = Object.values(b.rhythms)[0];
      const rOnT = r.marks.find((m) => m.kind === 'tag' && m.text === 'R on T')!;
      if (rOnT.kind !== 'tag') throw new Error('unreachable');
      contains(b.scenes, 'trigger', r.window, rOnT.t);
      const tw = b.scenes.find((s) => s.id === 'twisting')!;
      expect(tw.span[0] * r.window).toBeLessThanOrEqual(rOnT.t + 0.2);
    }
  });

  it('VF: the fibrillation scene starts after the breakdown scene and shows no QRS beats', () => {
    for (const o of ['coarse', 'fine']) {
      const b = buildLesson(getLesson('vf')!, o);
      const r = Object.values(b.rhythms)[0];
      const vf = b.scenes.find((s) => s.id === 'vf')!;
      expect(r.beats.filter((x) => x.t / r.window >= vf.span[0]).length).toBe(0);
    }
  });

  it('electrolyte lessons carry a potassium meter on every animated scene, rising or falling in order', () => {
    const hypo = buildLesson(getLesson('hypokalemia')!).scenes.filter((s) => s.view === 'play');
    const hyper = buildLesson(getLesson('hyperkalemia')!).scenes.filter((s) => s.view === 'play');
    expect(hypo.every((s) => s.meter !== undefined)).toBe(true);
    expect(hyper.every((s) => s.meter !== undefined)).toBe(true);
    const falling = hypo.map((s) => s.meter!);
    expect([...falling].sort((a, b) => b - a)).toEqual(falling);
    const rising = hyper.map((s) => s.meter!);
    expect([...rising].sort((a, b) => a - b)).toEqual(rising);
    expect(falling[falling.length - 1]).toBeLessThan(3.0);
    expect(rising[rising.length - 1]).toBeGreaterThan(8);
  });

  it('non-electrolyte lessons never show a meter', () => {
    for (const l of LESSONS.filter((x) => !['hypokalemia', 'hyperkalemia'].includes(x.id))) {
      const b = buildLesson(l, l.defaultOption);
      expect(b.scenes.every((s) => s.meter === undefined)).toBe(true);
    }
  });
});


describe('conduction and pacing lessons are synchronised with the events they describe', () => {
  const rhythmOf = (id: string, option?: string, key?: string) => {
    const b = buildLesson(getLesson(id)!, option);
    return { b, r: key ? b.rhythms[key] : Object.values(b.rhythms)[0] };
  };
  const spanOf = (b: { scenes: LessonScene[] }, id: string, w: number) => {
    const s = b.scenes.find((x) => x.id === id)!;
    expect(s, `scene ${id}`).toBeDefined();
    return [s.span[0] * w, s.span[1] * w] as const;
  };
  const inside = (b: { scenes: LessonScene[] }, id: string, w: number, t: number) => {
    const [a, z] = spanOf(b, id, w);
    expect(t, `${id} should contain ${t}`).toBeGreaterThanOrEqual(a - 1e-9);
    expect(t, `${id} should contain ${t}`).toBeLessThanOrEqual(z + 1e-9);
  };

  it('first-degree block: the measuring scene shows a whole P-to-QRS interval', () => {
    const { b, r } = rhythmOf('av1');
    inside(b, 'measure', r.window, r.atrial[0].t);
    inside(b, 'measure', r.window, r.beats[0].t);
  });

  it('Wenckebach: lengthening scene shows the growing PRs, the drop scene the blocked P, the reset scene the shortest PR', () => {
    const { b, r } = rhythmOf('avm1');
    const dropped = r.atrial.find((a) => !a.conducted)!;
    inside(b, 'drop', r.window, dropped.t);
    inside(b, 'lengthen', r.window, r.beats[1].t);
    inside(b, 'lengthen', r.window, r.beats[2].t);
    const after = r.beats.find((x) => x.t > dropped.t)!;
    inside(b, 'reset', r.window, after.t);
  });

  it('Mobitz II: the drop scene shows the blocked P, and the pause scene covers the whole pause', () => {
    const { b, r } = rhythmOf('avm2');
    const dropped = r.atrial.find((a) => !a.conducted)!;
    inside(b, 'drop', r.window, dropped.t);
    const before = r.beats.filter((x) => x.t < dropped.t).at(-1)!;
    const after = r.beats.find((x) => x.t > dropped.t)!;
    inside(b, 'pause', r.window, before.t);
    inside(b, 'pause', r.window, after.t);
  });

  it.each(['2to1', '3to1'])('%s block: the ratio scene shows conducted and blocked P waves and names the ratio', (o) => {
    const { b, r } = rhythmOf('avhigh', o);
    const [a, z] = spanOf(b, 'ratio', r.window);
    const inScene = r.atrial.filter((x) => x.t >= a && x.t <= z);
    expect(inScene.some((x) => x.conducted)).toBe(true);
    expect(inScene.filter((x) => !x.conducted).length).toBeGreaterThanOrEqual(o === '2to1' ? 1 : 2);
    expect(b.scenes.find((s) => s.id === 'ratio')!.chip).toContain(o === '2to1' ? '2:1' : '3:1');
    expect(b.summary.rows.find((x) => x.label === 'Ventricular rate')!.value).toContain(o === '2to1' ? '50' : '33');
  });

  it.each([
    ['junctional', false],
    ['ventricular', true],
  ])('complete block with a %s escape: the escape scene holds the first escape beat, wide=%s', (o, wide) => {
    const { b, r } = rhythmOf('av3', o);
    inside(b, 'escape', r.window, r.beats[0].t);
    expect(r.beats.every((x) => x.wide === wide)).toBe(true);
    expect(b.scenes.find((s) => s.id === 'escape')!.chip.toLowerCase()).toContain(o);
    const [a, z] = spanOf(b, 'dissociation', r.window);
    expect(r.atrial.filter((x) => x.t >= a && x.t <= z).length).toBeGreaterThanOrEqual(3);
    expect(r.beats.filter((x) => x.t >= a && x.t <= z).length).toBeGreaterThanOrEqual(2);
  });

  it('SA block: the block scene covers the missing P wave and the pause scene the whole pause', () => {
    for (const o of ['type1', 'type2']) {
      const { b, r } = rhythmOf('sinoblock', o);
      const ps = r.atrial.map((x) => x.t);
      const gaps = ps.slice(1).map((t, i) => t - ps[i]);
      const k = gaps.indexOf(Math.max(...gaps));
      const mid = (ps[k] + ps[k + 1]) / 2;
      inside(b, o === 'type1' ? 'drop' : 'blocked', r.window, mid);
      if (o === 'type2') {
        inside(b, 'pause', r.window, ps[k]);
        inside(b, 'pause', r.window, ps[k + 1]);
      }
    }
  });

  it('sinus arrest: the stop scene starts before the pause and the pause (or escape) scene contains the late event', () => {
    const p = rhythmOf('sinusarrest', 'pause');
    const ps = p.r.atrial.map((x) => x.t);
    const gaps = ps.slice(1).map((t, i) => t - ps[i]);
    const k = gaps.indexOf(Math.max(...gaps));
    inside(p.b, 'stop', p.r.window, (ps[k] + ps[k + 1]) / 2 - 0.5);
    inside(p.b, 'pause', p.r.window, ps[k]);
    inside(p.b, 'pause', p.r.window, ps[k + 1]);
    const e = rhythmOf('sinusarrest', 'escape');
    const esc = e.r.beats.find((x) => x.origin === 'junctional')!;
    inside(e.b, 'escape', e.r.window, esc.t);
  });

  it('sick sinus syndrome: the AF scene holds the fibrillation run, the pause scene its end, the escape scene the first escape beat', () => {
    const { b, r } = rhythmOf('sss', 'tachybrady');
    const af = r.beats.filter((x) => x.origin === 'tachy' || (x.t > 1.9 && x.t < 4.0));
    expect(af.length).toBeGreaterThanOrEqual(4);
    for (const x of af) inside(b, 'tachy', r.window, x.t);
    inside(b, 'pause', r.window, af[af.length - 1].t + 0.2);
    const esc = r.beats.find((x) => x.origin === 'junctional')!;
    inside(b, 'escape', r.window, esc.t);
    const br = rhythmOf('sss', 'brady');
    const e2 = br.r.beats.find((x) => x.origin === 'junctional')!;
    inside(br.b, 'escape', br.r.window, e2.t);
  });

  it('bundle branch blocks: only the blocked rhythm is wide, and the ECG scene shows complete QRS complexes', () => {
    for (const [id, key] of [['lbbb', 'lbbb'], ['rbbb', 'rbbb']] as const) {
      const { b } = rhythmOf(id);
      expect(b.rhythms.normal.beats.every((x) => !x.wide)).toBe(true);
      expect(b.rhythms[key].beats.every((x) => x.wide)).toBe(true);
      const ecg = b.scenes.find((s) => s.id === 'ecg')!;
      expect(ecg.rhythm).toBe(key);
      const r = b.rhythms[key];
      expect(r.beats.filter((x) => x.t / r.window >= ecg.span[0] && x.t / r.window <= ecg.span[1]).length).toBeGreaterThanOrEqual(2);
      expect(b.scenes.find((s) => s.id === 'normal')!.rhythm).toBe('normal');
    }
  });

  it('fascicular blocks: block scenes show the blocked fascicle; bifascicular variants keep the RBBB pattern', () => {
    for (const o of ['lafb', 'lpfb', 'bifascicular', 'longpr']) {
      const { b } = rhythmOf('fascicular', o);
      const r = b.rhythms.block;
      expect(r.beats.filter((x) => x.wide).length === r.beats.length).toBe(o === 'bifascicular' || o === 'longpr');
      const first = b.scenes[1];
      expect(first.span[0] * r.window).toBeLessThanOrEqual(r.beats[1].t);
    }
    const lafb = rhythmOf('fascicular', 'lafb').b;
    inside(lafb, 'block', 6.4, 0.46 + 0.1);
    expect(rhythmOf('fascicular', 'longpr').b.summary.rows.find((x) => x.label === 'PR interval')!.value).toContain('280');
  });

  it('pacemaker modes: key scenes contain the first paced event of their mode', () => {
    const aai = rhythmOf('pacemaker', 'aai');
    inside(aai.b, 'paced', aai.r.window, aai.r.atrial.find((x) => x.kind === 'paced')!.t);
    const vvi = rhythmOf('pacemaker', 'vvi');
    const vp = vvi.r.beats.find((x) => x.origin === 'paced')!;
    inside(vvi.b, 'paced', vvi.r.window, vp.t);
    inside(vvi.b, 'wait', vvi.r.window, vp.t - 0.02);
    const voo = rhythmOf('pacemaker', 'voo');
    const spikes = voo.r.pulses.filter((p) => p.type === 'flash' && p.site === 'pace-v').map((p) => (p.type === 'flash' ? p.t : 0));
    inside(voo.b, 'magnet', voo.r.window, Math.min(...spikes));
    const wasted = voo.r.pulses.find((p) => p.type === 'travel' && p.path === 'paced-l' && p.tone === 'red')!;
    if (wasted.type !== 'travel') throw new Error('unreachable');
    inside(voo.b, 'refractory', voo.r.window, wasted.t0);
    const vdd = rhythmOf('pacemaker', 'vdd');
    const untracked = vddScript().atrial.find((x) => !x.tracked)!;
    inside(vdd.b, 'ignored', vdd.r.window, untracked.t);
    const lrl = vddScript().vent.find((v) => !vddScript().atrial.some((a) => a.tracked && Math.abs(v.t - (a.t + SENSED_AV)) < 1e-6))!;
    inside(vdd.b, 'slow', vdd.r.window, lrl.t);
    const ddi = rhythmOf('pacemaker', 'ddi');
    inside(ddi.b, 'sequential', ddi.r.window, ddi.r.atrial.find((x) => x.kind === 'paced')!.t);
    const [a, z] = spanOf(ddi.b, 'timer', ddi.r.window);
    expect(ddi.r.beats.filter((x) => x.t >= a && x.t <= z).length).toBeGreaterThanOrEqual(2);
  });

  it('DDD: one scene per state with its own rhythm, in the order AS-VP, AP-VP, AP-VS, AS-VS', () => {
    const { b } = rhythmOf('pacemaker', 'ddd');
    expect(Object.keys(b.rhythms)).toEqual(['as-vp', 'ap-vp', 'ap-vs', 'as-vs']);
    expect(b.scenes.slice(0, 4).map((s) => s.rhythm)).toEqual(['as-vp', 'ap-vp', 'ap-vs', 'as-vs']);
    expect(b.scenes.slice(0, 4).map((s) => s.chip)).toEqual(['1 · AS–VP', '2 · AP–VP', '3 · AP–VS', '4 · AS–VS']);
    for (const s of b.scenes.slice(0, 4)) {
      const r = b.rhythms[s.rhythm!];
      expect(r.beats.filter((x) => x.t / r.window >= s.span[0] && x.t / r.window <= s.span[1]).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('pacemaker summaries cover leadless devices, rate response and the magnet response', () => {
    const text = (o: string) => JSON.stringify(buildLesson(getLesson('pacemaker')!, o).summary).toLowerCase();
    expect(text('vvi')).toContain('leadless');
    expect(text('vdd')).toContain('leadless');
    for (const o of ['aai', 'vvi', 'voo', 'vdd', 'ddi', 'ddd']) expect(text(o)).toContain('rate response');
    expect(text('voo')).toContain('magnet');
    expect(text('voo')).toContain('icd');
    for (const l of ['pacemaker', 'pacing-physio', 'pacing-fault']) {
      expect(getLesson(l)!.legend.some((x) => x.tone === 'teal')).toBe(true);
    }
  });

  it('pacing sites: the QRS scene holds a paced QRS, and the three sites say different things about the QRS', () => {
    const widths: string[] = [];
    for (const o of ['rv', 'biv', 'csp']) {
      const { b, r } = rhythmOf('pacing-physio', o);
      const [a, z] = spanOf(b, o === 'rv' ? 'wide' : o === 'biv' ? 'meet' : 'narrow', r.window);
      expect(r.beats.filter((x) => x.t >= a && x.t <= z).length).toBeGreaterThanOrEqual(2);
      widths.push(b.summary.rows.find((x) => x.label === 'QRS')!.value);
    }
    expect(new Set(widths).size).toBe(3);
  });

  it('pacemaker faults: each fault scene contains the event it names', () => {
    const cap = rhythmOf('pacing-fault', 'capture');
    const failed = CAPTURE_SPIKES.find((s) => !s.ok)!;
    inside(cap.b, 'fail', cap.r.window, failed.t);
    const under = rhythmOf('pacing-fault', 'undersensing');
    inside(under.b, 'ignored', under.r.window, UNDERSENSE_SPIKES[0]);
    const over = rhythmOf('pacing-fault', 'oversensing');
    inside(over.b, 'noise', over.r.window, OVERSENSE_NOISE[0]);
    inside(over.b, 'withheld', over.r.window, OVERSENSE_NOISE[0] + 0.2);
    inside(over.b, 'withheld', over.r.window, OVERSENSE_NOISE[0] + 1.0);
    const out = rhythmOf('pacing-fault', 'output');
    inside(out.b, 'stop', out.r.window, OUTPUT_MISSING[0]);
    inside(out.b, 'escape', out.r.window, OUTPUT_ESCAPES[0]);
  });
});
