import type { PathId, Pulse, SiteId, Tone } from './types';

export type Point = readonly [number, number];

export const VIEW = { width: 320, height: 200 } as const;

/** Polylines the activation travels along (diagram coordinates). */
export const PATHS: Record<PathId, Point[]> = {
  'atria-sa': [[88, 28], [140, 44], [190, 56]],
  'atria-ect': [[262, 30], [228, 44], [190, 56]],
  'atria-retro': [[190, 56], [150, 42], [108, 28]],
  'atria-ap': [[296, 52], [250, 52], [190, 56]],
  'avn-direct': [[190, 58], [190, 108]],
  'avn-slow': [[190, 58], [172, 68], [168, 84], [172, 100], [190, 108]],
  'avn-fast': [[190, 58], [208, 68], [212, 84], [208, 100], [190, 108]],
  his: [[190, 108], [190, 128]],
  'bb-left': [[190, 128], [160, 144], [130, 160]],
  'bb-right': [[190, 128], [220, 144], [250, 160]],
  ap: [[296, 56], [296, 140]],
  'flutter-loop': [[84, 21], [296, 21], [296, 47], [84, 47], [84, 21]],
};

export const SITES: Record<SiteId, Point> = {
  sa: [88, 28],
  ectopic: [262, 30],
  junction: [190, 84],
  ventricle: [232, 160],
};

/** Seconds a dot lingers (fading) after it reaches the end of its path. */
export const FADE = 0.3;
const RING_LIFE = 0.45;
const SPARK_LIFE = 0.28;

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

/** Point at fraction p (0..1) of the polyline's length. */
export function pointAlong(pts: Point[], p: number): Point {
  const f = clamp01(p);
  let total = 0;
  const lens: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    lens.push(l);
    total += l;
  }
  let target = f * total;
  for (let i = 0; i < lens.length; i++) {
    if (target <= lens[i] || i === lens.length - 1) {
      const k = lens[i] === 0 ? 0 : Math.min(target / lens[i], 1);
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    target -= lens[i];
  }
  return pts[pts.length - 1];
}

/** Polyline points between fractions a and b (either order) of the path's length. */
export function slicePoints(pts: Point[], a: number, b: number): Point[] {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const out: Point[] = [pointAlong(pts, lo)];
  let total = 0;
  const cum: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    cum.push(total);
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const f = cum[i] / total;
    if (f > lo && f < hi) out.push(pts[i]);
  }
  out.push(pointAlong(pts, hi));
  return out;
}

export interface DotState { x: number; y: number; tone: Tone; opacity: number; r: number }
/** The stretch of a path already travelled, as fractions of its length (from may exceed to for reversed travel). */
export interface TrailState { path: PathId; tone: Tone; opacity: number; from: number; to: number }
export interface RingState { x: number; y: number; tone: Tone; opacity: number; radius: number }
export interface Glow { tone: Tone; opacity: number }

export interface DiagramFrame {
  dots: DotState[];
  trails: TrailState[];
  rings: RingState[];
  atria: Glow | null;
  ventricles: Glow | null;
}

const ATRIAL_PATHS: PathId[] = ['atria-sa', 'atria-ect', 'atria-retro', 'atria-ap', 'flutter-loop'];
const VENTRICULAR_PATHS: PathId[] = ['bb-left', 'bb-right'];

function strongest(a: Glow | null, b: Glow): Glow {
  return !a || b.opacity > a.opacity ? b : a;
}

/** Everything visible on the diagram at rhythm time rt. Pure function of (pulses, rt). */
export function frameAt(pulses: Pulse[], rt: number): DiagramFrame {
  const frame: DiagramFrame = { dots: [], trails: [], rings: [], atria: null, ventricles: null };

  for (const p of pulses) {
    if (p.type === 'travel') {
      if (rt < p.t0) continue;
      const span = Math.max(p.t1 - p.t0, 1e-6);
      const prog = clamp01((rt - p.t0) / span) * (p.stop ?? 1);
      const age = rt - p.t1;
      const opacity = age <= 0 ? 1 : Math.max(0, 1 - age / FADE);
      if (opacity <= 0) continue;
      const [x, y] = pointAlong(PATHS[p.path], p.reverse ? 1 - prog : prog);
      frame.dots.push({ x, y, tone: p.tone, opacity, r: 4.6 });
      frame.trails.push({ path: p.path, tone: p.tone, opacity: opacity * 0.9, from: p.reverse ? 1 : 0, to: p.reverse ? 1 - prog : prog });
      const glow: Glow = { tone: p.tone, opacity: opacity * 0.4 };
      const toAtria = ATRIAL_PATHS.includes(p.path) || (p.path === 'ap' && p.reverse);
      const toVentricles = VENTRICULAR_PATHS.includes(p.path) || (p.path === 'ap' && !p.reverse);
      if (toAtria) frame.atria = strongest(frame.atria, glow);
      if (toVentricles && prog > 0.2) frame.ventricles = strongest(frame.ventricles, glow);
    } else if (p.type === 'loop') {
      if (rt < p.t0) continue;
      const age = rt - p.t1;
      const opacity = age <= 0 ? 1 : Math.max(0, 1 - age / FADE);
      if (opacity <= 0) continue;
      const [x, y] = pointAlong(PATHS[p.path], ((rt - p.t0) / p.period) % 1);
      frame.dots.push({ x, y, tone: p.tone, opacity, r: 4.6 });
      frame.trails.push({ path: p.path, tone: p.tone, opacity: opacity * 0.5, from: 0, to: 1 });
      frame.atria = strongest(frame.atria, { tone: p.tone, opacity: opacity * 0.25 });
    } else if (p.type === 'flash') {
      const age = rt - p.t;
      if (age < 0 || age > RING_LIFE) continue;
      const [x, y] = SITES[p.site];
      const opacity = 1 - age / RING_LIFE;
      frame.rings.push({ x, y, tone: p.tone, opacity, radius: 5 + (age / RING_LIFE) * 16 });
      const glow: Glow = { tone: p.tone, opacity: opacity * 0.4 };
      if (p.site === 'sa' || p.site === 'ectopic') frame.atria = strongest(frame.atria, glow);
      if (p.site === 'ventricle') frame.ventricles = strongest(frame.ventricles, glow);
    } else {
      const age = rt - p.t;
      if (age < 0 || age > SPARK_LIFE) continue;
      frame.dots.push({ x: p.x, y: p.y, tone: p.tone, opacity: 1 - age / SPARK_LIFE, r: 2.8 });
      frame.atria = strongest(frame.atria, { tone: p.tone, opacity: 0.18 * (1 - age / SPARK_LIFE) });
    }
  }
  return frame;
}
