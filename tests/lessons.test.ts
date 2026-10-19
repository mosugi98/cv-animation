import { describe, expect, it } from 'vitest';
import { durationOf, sceneIndexIn, sceneProgressIn } from '../src/engine/timeline';
import { GROUPS, LESSONS, buildLesson, getLesson, isLessonId, resolveOption } from '../src/lessons';
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
  it('has the fifteen lessons with unique ids', () => {
    expect(LESSONS.map((l) => l.id)).toEqual([
      'avnrt', 'avrt', 'wpw', 'aberrancy', 'af', 'flutter', 'at', 'junctional', 'ventricular',
      'pvc', 'vt', 'torsades', 'vf', 'hypokalemia', 'hyperkalemia',
    ]);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(15);
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
