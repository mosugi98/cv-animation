import { GROUPS, buildLesson, getLesson } from '../../lessons';
import { hrefFor } from '../../lib/route';
import { SignalStrip } from './SignalStrip';

export function LibraryIndex() {
  return (
    <main className="lib-page lib-index">
      <header className="lib-head">
        <h1 className="lib-title">Arrhythmia Animation Library</h1>
        <p className="lib-lede">
          Seven short animated lessons. Each one links the ECG to what happens inside the heart, step by step, and ends with a
          recognition summary. All rhythms are schematic educational examples, not patient tracings.
        </p>
      </header>

      {GROUPS.map((g) => (
        <section key={g.id} className="lib-group" aria-labelledby={`g-${g.id}`}>
          <h2 id={`g-${g.id}`} className="lib-group__title">{g.title}</h2>
          <p className="lib-group__blurb">{g.blurb}</p>
          <ul className="lib-cards">
            {g.lessons.map((id) => {
              const lesson = getLesson(id)!;
              const preview = buildLesson(lesson).rhythms[lesson.previewKey];
              return (
                <li key={id}>
                  <a className="lesson-card" href={hrefFor({ page: 'lesson', id, option: null })} aria-labelledby={`c-${id}`} aria-describedby={`d-${id}`}>
                    <span className="lesson-card__strip" aria-hidden="true">
                      <SignalStrip rhythm={preview} rt={preview.window} compact pen={false} />
                    </span>
                    <span id={`c-${id}`} className="lesson-card__title">{lesson.short}</span>
                    <span id={`d-${id}`} className="lesson-card__body">
                      <span className="lesson-card__rate">{lesson.rate}</span>
                      <span className="lesson-card__blurb">{lesson.blurb}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
