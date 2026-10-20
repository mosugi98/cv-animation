export const K_SCALE = { min: 2, max: 10 } as const;
export const K_NORMAL = { low: 3.5, high: 5.0 } as const;

export type KBand = 'low' | 'normal' | 'high';

export function potassiumBand(value: number): KBand {
  if (value < K_NORMAL.low) return 'low';
  if (value > K_NORMAL.high) return 'high';
  return 'normal';
}

const BAND_TEXT: Record<KBand, string> = { low: 'low', normal: 'normal', high: 'high' };
const BAND_TONE: Record<KBand, string> = { low: 'orange', normal: 'blue', high: 'red' };

const pct = (v: number): number =>
  Math.min(Math.max(((v - K_SCALE.min) / (K_SCALE.max - K_SCALE.min)) * 100, 0), 100);

/** Serum potassium on a horizontal scale with the normal range shaded. Schematic, not a measurement. */
export function LevelMeter({ value }: { value: number }) {
  const band = potassiumBand(value);
  const label = `Serum potassium ${value.toFixed(1)} millimoles per litre: ${BAND_TEXT[band]}. Normal is about ${K_NORMAL.low} to ${K_NORMAL.high}.`;
  return (
    <div className="card level-meter" role="img" aria-label={label}>
      <div className="level-meter__head" aria-hidden="true">
        <span>Serum K⁺</span>
        <strong className={`tone-${BAND_TONE[band]}`}>
          {value.toFixed(1)} mmol/L · {BAND_TEXT[band]}
        </strong>
      </div>
      <div className="level-meter__scale" aria-hidden="true">
        <span
          className="level-meter__normal"
          style={{ left: `${pct(K_NORMAL.low)}%`, width: `${pct(K_NORMAL.high) - pct(K_NORMAL.low)}%` }}
        />
        <span className={`level-meter__marker tone-${BAND_TONE[band]}`} style={{ left: `${pct(value)}%` }} />
      </div>
      <div className="level-meter__ticks" aria-hidden="true">
        <span>{K_SCALE.min}</span>
        <span>3.5–5.0 normal</span>
        <span>{K_SCALE.max}</span>
      </div>
    </div>
  );
}
