import { useId } from 'react';
import { STRIP, buildStrip, yAt } from '../../engine/strip';
import type { RhythmDef } from '../../engine/types';

interface Props {
  rhythm: RhythmDef;
  /** Rhythm time (seconds) up to which the trace is revealed. */
  rt: number;
  /** Hides labels and rows to fit small previews. */
  compact?: boolean;
  /** Draws the moving pen dot. */
  pen?: boolean;
}

const CHAR_W = 4.3;
const clampX = (x: number, half: number) => Math.min(Math.max(x, half + 2), STRIP.width - half - 2);

export function SignalStrip({ rhythm, rt, compact = false, pen = true }: Props) {
  const uid = useId().replace(/:/g, '');
  const g = buildStrip(rhythm);
  const t = Math.min(Math.max(rt, 0), rhythm.window);
  const sweepX = t * g.pxPerSec;
  const seen = (x: number) => x <= sweepX + 0.01;
  const viewBox = compact ? `0 12 ${STRIP.width} 68` : `0 0 ${STRIP.width} ${STRIP.height}`;

  return (
    <svg className="strip" viewBox={viewBox} role="img" aria-label={`${rhythm.label}. ${rhythm.description}`}>
      <defs>
        <pattern id={`grid-${uid}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path className="grid-line" d="M10 0H0V10" fill="none" strokeWidth="0.6" />
        </pattern>
        <clipPath id={`clip-${uid}`}>
          <rect x="0" y="0" width={sweepX} height={STRIP.height} />
        </clipPath>
      </defs>
      <rect x="0" y="0" width={STRIP.width} height={STRIP.height} fill={`url(#grid-${uid})`} />

      <g clipPath={`url(#clip-${uid})`}>
        <path className="trace" d={g.trace} />
        {g.segments.map((s, i) => (
          <path key={i} className={`trace trace--seg tone-${s.tone}`} d={s.d} />
        ))}
      </g>

      {g.dots.filter((d) => seen(d.x)).map((d, i) => (
        <circle key={`d${i}`} className={`mk-dot tone-${d.tone}`} cx={d.x} cy={d.y} r="2.6" />
      ))}

      {!compact && g.bars.filter((b) => seen(b.x2)).map((b, i) => (
        <line key={`b${i}`} className={`mk-bar tone-${b.tone}`} x1={b.x1} x2={b.x2} y1={b.y} y2={b.y} />
      ))}

      {!compact && g.tags.filter((tg) => seen(tg.x)).map((tg, i) => {
        const w = tg.text.length * CHAR_W + 10;
        const x = clampX(tg.x, w / 2);
        return (
          <g key={`t${i}`} className={`tone-${tg.tone}`}>
            <line className="tag-line" x1={tg.x} x2={tg.x} y1="12" y2={STRIP.height - 6} strokeDasharray="2 2" />
            <rect className="mk-badge" x={x - w / 2} y="1.5" width={w} height="10.5" rx="5.25" />
            <text className="badge-text" x={x} y="9.2">{tg.text}</text>
          </g>
        );
      })}

      {!compact && g.notes.filter((n) => seen(n.x)).map((n, i) => (
        <text key={`n${i}`} className={`mk-note tone-${n.tone}`} x={clampX(n.x, (n.text.length * CHAR_W) / 2)} y={n.y}>
          {n.text}
        </text>
      ))}

      {pen && !compact && t > 0 && t < rhythm.window && <circle className="head" cx={sweepX} cy={yAt(g, t)} r="3" />}
    </svg>
  );
}
