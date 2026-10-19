import { useRef } from 'react';
import { resolveOption } from '../../lessons';
import type { Lesson } from '../../lessons/types';
import { replaceOption } from '../../lib/route';
import { LessonPlayer } from './LessonPlayer';

interface Props {
  lesson: Lesson;
  option?: string | null;
  initialTime?: number;
  forceReduced?: boolean;
  onOption?: (id: string) => void;
}

/** Lesson page: heading, option picker and the player. The player remounts when the option changes. */
export function LessonView({ lesson, option, initialTime, forceReduced, onOption }: Props) {
  const current = resolveOption(lesson, option);
  const group = useRef<HTMLDivElement>(null);
  const options = lesson.options ?? [];
  const choose = onOption ?? ((id: string) => replaceOption(lesson.id, id));

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = options.findIndex((o) => o.id === current);
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = options[(i + step + options.length) % options.length];
    choose(next.id);
    requestAnimationFrame(() => group.current?.querySelector<HTMLButtonElement>(`[data-option="${CSS.escape(next.id)}"]`)?.focus());
  };

  return (
    <main className="lib-page">
      <header className="lib-head">
        <a className="lib-back" href="#/library">← All lessons</a>
        <h1 className="lib-title">{lesson.title}</h1>
        <p className="lib-lede">{lesson.blurb}</p>
      </header>

      {options.length > 0 && (
        <div className="lib-options">
          <span className="lib-options__label" id={`opt-${lesson.id}`}>{lesson.optionLabel}</span>
          <div className="seg" role="radiogroup" aria-labelledby={`opt-${lesson.id}`} ref={group} onKeyDown={onKeyDown}>
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                data-option={o.id}
                aria-checked={o.id === current}
                tabIndex={o.id === current ? 0 : -1}
                className={`seg__btn${o.id === current ? ' is-on' : ''}`}
                onClick={() => choose(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <LessonPlayer key={`${lesson.id}:${current ?? ''}`} lesson={lesson} option={current} initialTime={initialTime} forceReduced={forceReduced} />
    </main>
  );
}
