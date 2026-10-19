import { SCENES } from '../data/scenes';

interface Props {
  time: number;
  duration: number;
  playing: boolean;
  reduced: boolean;
  sceneIndex: number;
  onToggle: () => void;
  onRestart: () => void;
  onSeek: (t: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

const fmt = (s: number) => `${s.toFixed(1)} s`;

export function TimelineControls(p: Props) {
  const scene = SCENES[p.sceneIndex];
  return (
    <section className="controls" aria-label="Playback controls">
      <div className="controls__row">
        {p.reduced ? (
          <>
            <button type="button" className="btn" onClick={p.onPrev}>Previous scene</button>
            <button type="button" className="btn btn--primary" onClick={p.onNext}>Next scene</button>
          </>
        ) : (
          <button type="button" className="btn btn--primary" onClick={p.onToggle} aria-label={p.playing ? 'Pause' : 'Play'}>
            {p.playing ? 'Pause' : 'Play'}
          </button>
        )}
        <button type="button" className="btn" onClick={p.onRestart}>Restart</button>
        <span className="controls__time" aria-hidden="true">{fmt(p.time)} / {fmt(p.duration)}</span>
      </div>

      <input
        className="scrubber"
        type="range"
        min={0}
        max={p.duration}
        step={0.1}
        value={p.time}
        onChange={(e) => p.onSeek(Number(e.target.value))}
        aria-label="Timeline"
        aria-valuetext={`Scene ${p.sceneIndex + 1} of ${SCENES.length}: ${scene.title}`}
      />

      <ol className="scene-nav" aria-label="Scenes">
        {SCENES.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className={`scene-btn${i === p.sceneIndex ? ' is-current' : ''}`}
              aria-label={`Go to scene ${i + 1}: ${s.title}`}
              aria-current={i === p.sceneIndex ? 'step' : undefined}
              onClick={() => p.onSeek(s.start)}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
