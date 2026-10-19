import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Root, { titleFor } from '../src/Root';
import { LessonView } from '../src/components/library/LessonView';
import { LibraryIndex } from '../src/components/library/LibraryIndex';
import { SiteNav } from '../src/components/library/SiteNav';
import { LevelMeter, potassiumBand } from '../src/components/library/LevelMeter';
import { LESSONS, buildLesson, getLesson } from '../src/lessons';
import { hrefFor, parseRoute } from '../src/lib/route';

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ');
const variants = LESSONS.flatMap((lesson) => (lesson.options ?? [{ id: undefined }]).map((o) => ({ lesson, option: o.id })));

describe('hash routes', () => {
  it('parses every page', () => {
    expect(parseRoute('')).toEqual({ page: 'heart-block' });
    expect(parseRoute('#/')).toEqual({ page: 'heart-block' });
    expect(parseRoute('#/something-else')).toEqual({ page: 'heart-block' });
    expect(parseRoute('#/library')).toEqual({ page: 'library' });
    expect(parseRoute('#/library/')).toEqual({ page: 'library' });
    expect(parseRoute('#/library/af')).toEqual({ page: 'lesson', id: 'af', option: null });
    expect(parseRoute('#/library/flutter?option=4%3A1')).toEqual({ page: 'lesson', id: 'flutter', option: '4:1' });
  });

  it('round-trips through hrefFor', () => {
    for (const r of [
      { page: 'heart-block' as const },
      { page: 'library' as const },
      { page: 'lesson' as const, id: 'flutter', option: '4:1' },
      { page: 'lesson' as const, id: 'af', option: null },
    ]) {
      expect(parseRoute(hrefFor(r))).toEqual(r);
    }
  });

  it('titles each page', () => {
    expect(titleFor({ page: 'library' })).toBe('Arrhythmia Animation Library');
    expect(titleFor({ page: 'lesson', id: 'af', option: null })).toContain('Atrial fibrillation');
    expect(titleFor({ page: 'lesson', id: 'zzz', option: null })).toContain('not found');
  });
});

describe('library index', () => {
  const html = renderToString(<LibraryIndex />);

  it('links to every lesson and groups AVNRT and AVRT under SVT', () => {
    for (const l of LESSONS) expect(html).toContain(`href="#/library/${l.id}"`);
    expect(text(html)).toContain('Supraventricular tachycardia (SVT)');
    expect(text(html)).toContain('schematic educational examples');
  });

  it('has one h1 and headed groups', () => {
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html.match(/<h2/g)).toHaveLength(6);
    expect(text(html)).toContain(`${LESSONS.length} short animated lessons`);
  });
});

describe('site navigation', () => {
  it('marks the current page', () => {
    const a = renderToString(<SiteNav route={{ page: 'heart-block' }} />);
    expect(a).toMatch(/aria-current="page"[^>]*>Heart block/);
    const b = renderToString(<SiteNav route={{ page: 'lesson', id: 'af', option: null }} />);
    expect(b).not.toMatch(/aria-current="page"/);
    expect(b).toContain('aria-current="true"');
  });
});

describe.each(variants)('lesson page $lesson.id $option', ({ lesson, option }) => {
  const scenes = buildLesson(lesson, option).scenes;

  it('renders the first scene with diagram, strip, legend, caption and controls', () => {
    const html = renderToString(<LessonView lesson={lesson} option={option} />);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('class="diagram"');
    expect(html).toContain('class="strip"');
    expect(html).toContain('aria-label="Colour key"');
    expect(html).toContain('aria-label="Playback controls"');
    expect(html).toContain('aria-label="Timeline"');
    expect(html).toContain('SCHEMATIC EDUCATIONAL EXAMPLE');
    expect(text(html)).toContain(scenes[0].title);
    expect(html.match(/class="scene-btn/g)).toHaveLength(scenes.length);
  });

  it('shows the recognition summary in the last scene', () => {
    const html = renderToString(<LessonView lesson={lesson} option={option} initialTime={scenes[scenes.length - 1].start + 0.5} forceReduced />);
    expect(html).toContain('aria-label="Rhythm recognition summary"');
    expect(html).toContain('summary__key');
    expect(html).not.toContain('class="diagram"');
  });

  it('renders every scene without error, in both motion modes', () => {
    for (const s of scenes) {
      for (const forceReduced of [false, true]) {
        const html = renderToString(<LessonView lesson={lesson} option={option} initialTime={s.start + (s.end - s.start) / 2} forceReduced={forceReduced} />);
        expect(text(html)).toContain(s.title);
        expect(html).not.toMatch(/NaN|undefined/);
      }
    }
  });

  it('offers reduced-motion scene stepping', () => {
    const html = renderToString(<LessonView lesson={lesson} option={option} forceReduced />);
    expect(html).toContain('Previous scene');
    expect(html).toContain('Next scene');
    expect(html).not.toContain('aria-label="Pause"');
  });
});

describe('option pickers', () => {
  it('renders a radiogroup with one checked option for lessons that have options', () => {
    const f = LESSONS.find((l) => l.id === 'flutter')!;
    const html = renderToString(<LessonView lesson={f} option="4:1" />);
    expect(html).toContain('role="radiogroup"');
    expect(html.match(/role="radio"/g)).toHaveLength(3);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-checked="true"[^>]*>4:1</);
    expect(text(html)).toContain('AV conduction pattern');
  });

  it('has no radiogroup for lessons without options', () => {
    const html = renderToString(<LessonView lesson={LESSONS.find((l) => l.id === 'af')!} />);
    expect(html).not.toContain('radiogroup');
  });
});

describe('Root', () => {
  it('renders the heart-block page by default (server render has no hash)', () => {
    const html = renderToString(<Root />);
    expect(html).toContain('site-nav');
    expect(html).toContain('Heart block animation');
  });
});

describe('potassium meter', () => {
  it('classifies serum potassium against the reference range', () => {
    expect(potassiumBand(2.4)).toBe('low');
    expect(potassiumBand(3.4)).toBe('low');
    expect(potassiumBand(3.5)).toBe('normal');
    expect(potassiumBand(5.0)).toBe('normal');
    expect(potassiumBand(5.1)).toBe('high');
    expect(potassiumBand(9.2)).toBe('high');
  });

  it('renders an accessible reading with the normal range', () => {
    const html = renderToString(<LevelMeter value={3.0} />);
    expect(html).toContain('role="img"');
    expect(html).toContain('Serum potassium 3.0 millimoles per litre: low');
    expect(html).toContain('level-meter__normal');
  });

  it('shows the meter on electrolyte lessons and nowhere else', () => {
    for (const id of ['hypokalemia', 'hyperkalemia']) {
      const html = renderToString(<LessonView lesson={getLesson(id)!} option={undefined} />);
      expect(html).toContain('level-meter');
    }
    for (const id of ['pvc', 'vt', 'wpw', 'aberrancy', 'torsades', 'vf', 'af']) {
      const html = renderToString(<LessonView lesson={getLesson(id)!} option={undefined} />);
      expect(html).not.toContain('level-meter');
    }
  });

  it('diagram options for the ventricular lessons draw the focus marker and circuit', () => {
    const vt = renderToString(<LessonView lesson={getLesson('vt')!} option={undefined} />);
    expect(vt).toContain('ventricular focus');
    expect(vt).toContain('dg-circuit');
    const ab = renderToString(<LessonView lesson={getLesson('aberrancy')!} option={undefined} />);
    expect(ab).toContain('right bundle');
    const pvc = renderToString(<LessonView lesson={getLesson('pvc')!} option={undefined} />);
    expect(pvc).not.toContain('dg-circuit');
  });
});
