import { PILLS, type PillId } from '../data/scenes';

export function StagePills({ active }: { active: PillId[] }) {
  return (
    <ol className="pills" aria-label="Heart block stages">
      {PILLS.map((p) => (
        <li
          key={p.id}
          className={`pill pill--${p.accent}${active.includes(p.id) ? ' is-active' : ''}`}
          aria-current={active.length === 1 && active[0] === p.id ? 'step' : undefined}
        >
          {p.label}
        </li>
      ))}
    </ol>
  );
}
