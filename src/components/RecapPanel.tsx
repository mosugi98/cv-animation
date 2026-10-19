import { RHYTHMS } from '../data/rhythms';
import type { Accent, PillId } from '../data/scenes';
import { ECGStrip } from './ECGStrip';

const ROWS: { id: PillId; label: string; note: string; accent: Accent }[] = [
  { id: 'first', label: '1 · 1st degree', note: 'long PR · every P conducts', accent: 'orange' },
  { id: 'mobitz1', label: '2 · Mobitz I', note: 'PR grows → one P dropped', accent: 'orange' },
  { id: 'mobitz2', label: '3 · Mobitz II', note: 'same PR → sudden drop', accent: 'red' },
  { id: 'complete', label: '4 · Complete', note: 'P and QRS unrelated', accent: 'purple' },
];

export function RecapPanel() {
  return (
    <section className="recap" aria-label="Summary of the four AV block patterns">
      <p className="recap__badge">TEACHING DRAWING · NOT A PATIENT TRACING</p>
      {ROWS.map((row) => (
        <div className="recap__row" key={row.id}>
          <div className="recap__head">
            <span className={`recap__label accent-${row.accent}`}>{row.label}</span>
            <span className="recap__note">{row.note}</span>
          </div>
          <ECGStrip rhythm={RHYTHMS[row.id]} progress={1} compact />
        </div>
      ))}
    </section>
  );
}
