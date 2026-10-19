import { useId } from 'react';
import type { Rhythm } from '../data/rhythms';
import type { Focus } from '../data/scenes';
import { STRIP, buildStrip, yAt } from '../lib/waveform';

interface Props {
  rhythm: Rhythm;
  /** 0..1 sweep position of the trace. */
  progress: number;
  focus?: Focus;
  compact?: boolean;
}

export function ECGStrip({ rhythm, progress, focus = 'none', compact = false }: Props) {
  const uid = useId().replace(/:/g, '');
  const geo = buildStrip(rhythm);
  const p = Math.min(Math.max(progress, 0), 1);
  const sweepX = p * STRIP.width;
  const seen = (x: number) => x <= sweepX;
  const viewBox = compact ? `0 12 ${STRIP.width} 68` : `0 0 ${STRIP.width} ${STRIP.height}`;
  const prWidth = focus === 'pr' ? 3.6 : 2.4;

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
        <path className="trace" d={geo.trace} />
        {geo.escapeSegments.map((d, i) => (
          <path key={i} className="trace trace--escape" d={d} />
        ))}
      </g>

      {geo.prBars
        .filter((b) => seen(b.x2))
        .map((b, i) => (
          <line key={i} className="prbar" x1={b.x1} x2={b.x2} y1={b.y} y2={b.y} strokeWidth={prWidth} />
        ))}

      {geo.pDots
        .filter((d) => seen(d.x))
        .map((d, i) => (
          <circle
            key={i}
            className={d.conducted ? 'pdot pdot--ok' : 'pdot pdot--drop'}
            cx={d.x}
            cy={d.y}
            r={!d.conducted && focus === 'dropped' ? 3.6 : 2.6}
          />
        ))}

      {!compact &&
        geo.noQrs
          .filter((n) => seen(n.x))
          .map((n, i) => (
            <g key={i}>
              <rect className="badge badge--red" x={n.x - 16} y={n.y - 7} width="32" height="11" rx="5.5" />
              <text className="badge-text" x={n.x} y={n.y + 1.2}>
                no QRS
              </text>
            </g>
          ))}

      {!compact && geo.tag && seen(geo.tag.x) && (
        <g>
          <line className="tag-line" x1={geo.tag.x} x2={geo.tag.x} y1="15" y2={STRIP.height - 6} strokeDasharray="2 2" />
          <rect className={`badge badge--${geo.tag.accent}`} x={geo.tag.x - 22} y="4" width="44" height="11" rx="5.5" />
          <text className="badge-text" x={geo.tag.x} y="11.8">
            {geo.tag.text}
          </text>
        </g>
      )}

      {!compact &&
        geo.escapeTags
          .filter((t) => seen(t.x))
          .map((t, i) => (
            <g key={i}>
              <rect className="badge badge--purple" x={t.x - 14} y={t.y} width="28" height="11" rx="5.5" />
              <text className="badge-text" x={t.x} y={t.y + 7.8}>
                escape
              </text>
            </g>
          ))}

      {!compact && p > 0 && p < 1 && (
        <circle className="head" cx={sweepX} cy={yAt(geo, p * rhythm.window)} r="3" />
      )}
    </svg>
  );
}
