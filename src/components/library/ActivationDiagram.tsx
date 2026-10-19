import { PATHS, SITES, VIEW, slicePoints, type DiagramFrame, type Point } from '../../engine/diagram';
import type { PathId } from '../../engine/types';
import type { DiagramConfig, LegendItem } from '../../lessons/types';

interface Props {
  config: DiagramConfig;
  frame: DiagramFrame;
  /** Short description of what is happening, for assistive technology. */
  description: string;
}

const pts = (p: readonly Point[]) => p.map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join(' ');

function Line({ path, className }: { path: PathId; className?: string }) {
  return <polyline className={`dg-path${className ? ` ${className}` : ''}`} points={pts(PATHS[path])} />;
}

/** Simplified conduction schematic. Everything that moves comes from the engine frame. */
export function ActivationDiagram({ config, frame, description }: Props) {
  const { dualPathways, accessoryPathway, flutterCircuit, ectopicFocus } = config;
  return (
    <svg className="diagram" viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} role="img" aria-label={`Simplified conduction schematic. ${description}`}>
      <text className="dg-row" x="8" y="38">Atria</text>
      <text className="dg-row" x="8" y="87">AV node</text>
      <text className="dg-row" x="8" y="122">His-Purkinje</text>
      <text className="dg-row" x="8" y="164">Ventricles</text>

      <rect className="dg-atria" x="70" y="10" width="240" height="50" rx="14" />
      <rect className="dg-vent" x="70" y="140" width="240" height="48" rx="14" />
      {frame.atria && <rect className={`dg-glow tone-${frame.atria.tone}`} x="70" y="10" width="240" height="50" rx="14" opacity={frame.atria.opacity} />}
      {frame.ventricles && <rect className={`dg-glow tone-${frame.ventricles.tone}`} x="70" y="140" width="240" height="48" rx="14" opacity={frame.ventricles.opacity} />}

      {flutterCircuit && <polyline className="dg-circuit" points={pts(PATHS['flutter-loop'])} />}

      {dualPathways ? (
        <>
          <Line path="avn-slow" />
          <Line path="avn-fast" />
          <text className="dg-small" x="160" y="86" textAnchor="end">slow</text>
          <text className="dg-small" x="220" y="86">fast</text>
        </>
      ) : (
        <Line path="avn-direct" />
      )}
      <Line path="his" />
      <Line path="bb-left" />
      <Line path="bb-right" />
      {accessoryPathway && (
        <>
          <Line path="ap" className="dg-path--ap" />
          <text className="dg-small" x="289" y="92" textAnchor="end">accessory</text>
          <text className="dg-small" x="289" y="102" textAnchor="end">pathway</text>
        </>
      )}

      <circle className="dg-node" cx="190" cy="58" r="4" />
      <circle className="dg-node" cx="190" cy="108" r="4" />
      <circle className="dg-sinus" cx={SITES.sa[0]} cy={SITES.sa[1]} r="3.5" />
      <text className="dg-small" x="96" y="32">sinus node</text>
      {ectopicFocus && (
        <>
          <circle className="dg-focus" cx={SITES.ectopic[0]} cy={SITES.ectopic[1]} r="3.5" />
          <text className="dg-small" x="262" y="22" textAnchor="middle">ectopic</text>
        </>
      )}

      {frame.trails.map((t, i) => (
        <polyline key={`t${i}`} className={`dg-trail tone-${t.tone}`} points={pts(slicePoints(PATHS[t.path], t.from, t.to))} opacity={t.opacity * 0.55} />
      ))}
      {frame.rings.map((r, i) => (
        <circle key={`r${i}`} className={`dg-ring tone-${r.tone}`} cx={r.x} cy={r.y} r={r.radius} opacity={r.opacity} />
      ))}
      {frame.dots.map((d, i) => (
        <circle key={`d${i}`} className={`dg-dot tone-${d.tone}`} cx={d.x} cy={d.y} r={d.r} opacity={d.opacity} />
      ))}
    </svg>
  );
}

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="legend" aria-label="Colour key">
      {items.map((l) => (
        <li key={l.text} className={`legend__item tone-${l.tone}`}>
          <span className="legend__swatch" aria-hidden="true" />
          {l.text}
        </li>
      ))}
    </ul>
  );
}
