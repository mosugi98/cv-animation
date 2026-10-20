import type { RhythmDef } from '../../engine/types';
import type { RecognitionSummary as Summary } from '../../lessons/types';
import { SignalStrip } from './SignalStrip';

interface Props {
  summary: Summary;
  /** Full strip of the characteristic rhythm shown at the top of the card. */
  rhythm: RhythmDef | null;
}

/** The "how to recognise it" card: key line, defining features and the commonest look-alike. */
export function RecognitionSummary({ summary, rhythm }: Props) {
  return (
    <section className="summary" aria-label="Rhythm recognition summary">
      <p className="lib-badge">SCHEMATIC EDUCATIONAL EXAMPLE · NOT A PATIENT TRACING</p>
      <h2 className="summary__heading">{summary.heading}</h2>
      {rhythm && (
        <div className="summary__strip">
          <SignalStrip rhythm={rhythm} rt={rhythm.window} pen={false} />
        </div>
      )}
      <p className="summary__key">{summary.keyline}</p>
      <dl className="summary__rows">
        {summary.rows.map((r) => (
          <div className="summary__row" key={r.label}>
            <dt>{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="summary__pitfall">
        <strong>Don’t confuse with: </strong>
        {summary.pitfall}
      </p>
    </section>
  );
}
