import { useState } from 'react';
import { ConductionDiagram } from './components/ConductionDiagram';
import { ECGStrip } from './components/ECGStrip';
import { EndCard } from './components/EndCard';
import { RecapPanel } from './components/RecapPanel';
import { SceneCaption } from './components/SceneCaption';
import { StagePills } from './components/StagePills';
import { TimelineControls } from './components/TimelineControls';
import { RHYTHMS } from './data/rhythms';
import { DURATION, SCENES } from './data/scenes';
import { usePlayback } from './hooks/usePlayback';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { sceneIndexAt, sceneProgress, stepScene } from './lib/timeline';

interface Props {
  initialTime?: number;
  forceReduced?: boolean;
}

export default function App({ initialTime = 0, forceReduced = false }: Props) {
  const osReduced = usePrefersReducedMotion();
  const [manualReduced, setManualReduced] = useState(forceReduced);
  const reduced = osReduced || manualReduced;

  const { time, playing, toggle, restart, seek } = usePlayback(DURATION, !reduced, initialTime);

  const index = sceneIndexAt(time);
  const scene = SCENES[index];
  const progress = reduced ? 1 : sceneProgress(time);
  const rhythm = scene.rhythm ? RHYTHMS[scene.rhythm] : null;
  const showCards = scene.kind === 'hook' || scene.kind === 'lesson';

  return (
    <div className={`page${reduced ? ' is-reduced' : ''}`}>
      <main className={`stage stage--${scene.kind}`} aria-label="Heart block animation">
        <h1 className="sr-only">ECG explainer: heart block, where the gate fails</h1>
        {scene.kind === 'hook' && (
          <p className="headline">
            {scene.title}
            <br />
            <span className="accent-red">{scene.sub}</span>
          </p>
        )}
        {scene.kind === 'end' && (
          <p className="headline headline--ghost" aria-hidden="true">
            Every P wave knocks.
            <br />
            Not every one gets in.
          </p>
        )}
        {(scene.kind === 'lesson' || scene.kind === 'recap') && (
          <>
            <p className="lesson-title">Heart block: where the gate fails</p>
            <StagePills active={scene.activePills} />
          </>
        )}

        {showCards && rhythm && (
          <>
            <div className="card card--diagram">
              <ConductionDiagram rhythm={rhythm} progress={progress} block={scene.block} focus={scene.focus} animate={!reduced} />
            </div>
            <div className="card card--strip">
              <ECGStrip rhythm={rhythm} progress={progress} focus={scene.focus} />
            </div>
          </>
        )}
        {scene.kind === 'recap' && <RecapPanel />}
        {scene.kind === 'end' && <EndCard />}

        {scene.kind === 'hook' && (
          <div className="card note">
            <p className="note__main">{scene.note}</p>
            <p className="note__sub">{scene.noteSub}</p>
          </div>
        )}
        {(scene.kind === 'lesson' || scene.kind === 'recap') && (
          <SceneCaption key={scene.id} title={scene.title} sub={scene.sub} accent={scene.accent} live={!playing} />
        )}
      </main>

      <TimelineControls
        time={time}
        duration={DURATION}
        playing={playing}
        reduced={reduced}
        sceneIndex={index}
        onToggle={toggle}
        onRestart={() => (reduced ? seek(0) : restart())}
        onSeek={seek}
        onPrev={() => seek(stepScene(time, -1))}
        onNext={() => seek(stepScene(time, 1))}
      />

      <footer className="footer">
        <label className="toggle">
          <input type="checkbox" checked={reduced} disabled={osReduced} onChange={(e) => setManualReduced(e.target.checked)} />
          Reduce motion{osReduced ? ' (set by your system)' : ''}
        </label>
        <p className="disclaimer">Illustrative teaching animation; interpret real ECGs in clinical context.</p>
      </footer>
    </div>
  );
}
