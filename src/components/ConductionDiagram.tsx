import type { Rhythm } from '../data/rhythms';
import type { BlockSite, Focus } from '../data/scenes';
import { signalAt, type SignalState } from '../lib/signal';

const AXIS = 190;
const STOPS: [number, number][] = [[0, 34], [0.3, 84], [0.6, 122], [1, 158]];

function yAtS(s: number): number {
  for (let i = 1; i < STOPS.length; i++) {
    const [s0, y0] = STOPS[i - 1];
    const [s1, y1] = STOPS[i];
    if (s <= s1) return y0 + (y1 - y0) * ((s - s0) / (s1 - s0));
  }
  return STOPS[STOPS.length - 1][1];
}

const IDLE: SignalState = { s: null, fade: 0, stall: 'none', escape: 0 };

const DESCRIPTIONS: Record<BlockSite, string> = {
  none: 'The impulse travels from the atria through the AV node and His-Purkinje system to the ventricles.',
  'av-node': 'Conduction is blocked at the AV node.',
  'infra-nodal': 'Conduction is blocked below the AV node.',
  both: 'No atrial impulse reaches the ventricles; the ventricles beat from an escape focus.',
};

interface Props {
  rhythm: Rhythm | null;
  progress: number;
  block: BlockSite;
  focus: Focus;
  animate: boolean;
}

export function ConductionDiagram({ rhythm, progress, block, focus, animate }: Props) {
  const sig = rhythm && animate ? signalAt(rhythm, progress * rhythm.window) : IDLE;
  const escape = animate ? sig.escape : focus === 'escape' ? 1 : 0;
  const avBar = block === 'av-node' || block === 'both';
  const infraBar = block === 'infra-nodal' || block === 'both';
  const avOpacity = avBar ? 1 : sig.stall === 'av-node' ? sig.fade : 0;
  const infraOpacity = infraBar ? 1 : sig.stall === 'infra-nodal' ? sig.fade : 0;

  return (
    <svg className="diagram" viewBox="0 0 320 190" role="img" aria-label={`Simplified conduction schematic. ${DESCRIPTIONS[block]}`}>
      <text className="dg-row" x="8" y="38">Atria</text>
      <text className="dg-row" x="8" y="87">AV node</text>
      <text className="dg-row" x="8" y="125">His-Purkinje</text>
      <text className="dg-row" x="8" y="164">Ventricles</text>

      <rect className="dg-atria" x="70" y="12" width="240" height="44" rx="14" />
      <circle className="dg-sinus" cx="86" cy="26" r="3.5" />
      <text className="dg-sinus-label" x="94" y="29">sinus</text>

      <rect className="dg-vent" x="70" y="140" width="240" height="40" rx="14" />
      <rect className="dg-vent-escape" x="70" y="140" width="240" height="40" rx="14" opacity={escape * 0.35} />

      <line className="dg-path" x1={AXIS} y1="56" x2={AXIS} y2="128" />
      <line className="dg-path" x1={AXIS} y1="128" x2="130" y2="160" />
      <line className="dg-path" x1={AXIS} y1="128" x2="250" y2="160" />

      <circle className="dg-node" cx={AXIS} cy="84" r="8" />
      <circle className="dg-node-dot" cx={AXIS} cy="84" r="3.6" />

      {sig.s !== null && <circle className="dg-signal" cx={AXIS} cy={yAtS(sig.s)} r="5" opacity={sig.fade} />}

      <g opacity={avOpacity}>
        <circle className="dg-block-ring" cx={AXIS} cy="84" r="11" />
        <line className="dg-block-bar" x1="178" x2="202" y1="84" y2="84" />
      </g>

      <g opacity={infraOpacity}>
        <line className="dg-block-bar dg-block-bar--thick" x1="174" x2="206" y1="122" y2="122" />
      </g>
      {block === 'infra-nodal' && (
        <g>
          <rect className="badge badge--red" x="214" y="114" width="90" height="16" rx="8" />
          <text className="badge-text" x="259" y="125">below the AV node</text>
        </g>
      )}

      <g opacity={escape}>
        <circle className="dg-escape" cx="232" cy="160" r="5" />
        <rect className="badge badge--purple" x="242" y="152" width="38" height="16" rx="8" />
        <text className="badge-text" x="261" y="163">escape</text>
      </g>

      <text className="dg-note" x="312" y="188">simplified schematic</text>
    </svg>
  );
}
