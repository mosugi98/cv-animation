import type { Accent } from '../data/scenes';

interface Props {
  title: string;
  sub: string;
  accent: Accent;
  live: boolean;
}

export function SceneCaption({ title, sub, accent, live }: Props) {
  return (
    <div className="caption" aria-live={live ? 'polite' : 'off'}>
      <p className="caption__title">{title}</p>
      <p className={`caption__sub accent-${accent}`}>{sub}</p>
    </div>
  );
}
