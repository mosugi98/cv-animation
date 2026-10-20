import { useState } from 'react';
import { frameAt, type DiagramFrame } from '../../engine/diagram';
import { durationOf, sceneIndexIn, sceneProgressIn, stepSceneIn } from '../../engine/timeline';
import { usePlayback } from '../../hooks/usePlayback';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { buildLesson, diagramOf } from '../../lessons';
import { rhythmTime } from '../../lessons/sequence';
import type { Lesson } from '../../lessons/types';
import { SceneCaption } from '../SceneCaption';
import { TimelineControls } from '../TimelineControls';
import { ActivationDiagram, Legend } from './ActivationDiagram';
import { LevelMeter } from './LevelMeter';
import { RecognitionSummary } from './RecognitionSummary';
import { SignalStrip } from './SignalStrip';

interface Props {
  lesson: Lesson;
  option?: string;
  initialTime?: number;
  forceReduced?: boolean;
}

const IDLE: DiagramFrame = { dots: [], trails: [], rings: [], atria: null, ventricles: null };

/**
 * One clock drives everything: the scene, the strip sweep, the diagram frame and the caption are all derived
 * from `time`, so they cannot drift apart and scrubbing is exact.
 */
export function LessonPlayer({ lesson, option, initialTime = 0, forceReduced = false }: Props) {
  const { scenes, rhythms, summary } = buildLesson(lesson, option);
  const duration = durationOf(scenes);

  const osReduced = usePrefersReducedMotion();
  const [manualReduced, setManualReduced] = useState(forceReduced);
  const reduced = osReduced || manualReduced;

  const { time, playing, toggle, restart, seek } = usePlayback(duration, !reduced, initialTime);

  const index = sceneIndexIn(scenes, time);
  const scene = scenes[index];
  const progress = reduced ? 1 : sceneProgressIn(scenes, time);
  const rhythm = scene.rhythm ? rhythms[scene.rhythm] : null;
  const rt = rhythm ? rhythmTime(rhythm.window, scene.span, progress) : 0;
  const frame = rhythm && !reduced ? frameAt(rhythm.pulses, rt) : IDLE;
  const summaryRhythm = [...scenes].reverse().find((s) => s.rhythm !== null)?.rhythm;

  return (
    <div className={`lib-player${reduced ? ' is-reduced' : ''}`}>
      <section className="lib-stage" aria-label={`${lesson.short} animation`}>
        <p className="lib-badge">SCHEMATIC EDUCATIONAL EXAMPLE · NOT A PATIENT TRACING</p>
        {scene.view === 'play' && rhythm ? (
          <>
            {scene.meter !== undefined && <LevelMeter value={scene.meter} />}
            <div className="card card--diagram">
              <ActivationDiagram config={diagramOf(lesson, option)} frame={frame} description={`${scene.title} ${scene.sub}`} />
            </div>
            <div className="card card--strip">
              <p className="strip-label">{rhythm.label}</p>
              <SignalStrip rhythm={rhythm} rt={rt} />
            </div>
            <Legend items={lesson.legend} />
          </>
        ) : (
          <RecognitionSummary summary={summary} rhythm={summaryRhythm ? rhythms[summaryRhythm] : null} />
        )}
        <div className="lib-caption">
          <p className={`lib-chip tone-${scene.accent}`}>{scene.chip}</p>
          <SceneCaption key={scene.id} title={scene.title} sub={scene.sub} accent={scene.accent} live={!playing} />
        </div>
      </section>

      <div className="lib-side">
        <TimelineControls
          scenes={scenes}
          time={time}
          duration={duration}
          playing={playing}
          reduced={reduced}
          sceneIndex={index}
          onToggle={toggle}
          onRestart={() => (reduced ? seek(0) : restart())}
          onSeek={seek}
          onPrev={() => seek(stepSceneIn(scenes, time, -1))}
          onNext={() => seek(stepSceneIn(scenes, time, 1))}
        />
      </div>
      <label className="toggle lib-toggle">
        <input type="checkbox" checked={reduced} disabled={osReduced} onChange={(e) => setManualReduced(e.target.checked)} />
        Reduce motion{osReduced ? ' (set by your system)' : ''}
      </label>
    </div>
  );
}
