import { useCallback, useEffect, useRef, useState } from 'react';

export interface Playback {
  time: number;
  playing: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  restart: () => void;
  seek: (t: number) => void;
}

const MAX_STEP = 0.1; // seconds; avoids a jump after the tab was hidden

/** Single elapsed-time source. Exactly one rAF loop exists while playing. */
export function usePlayback(duration: number, enabled: boolean, initialTime = 0): Playback {
  const [time, setTime] = useState(initialTime);
  const [wantsPlay, setWantsPlay] = useState(enabled && initialTime === 0);
  const timeRef = useRef(initialTime);
  const playing = wantsPlay && enabled;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const step = Math.min((now - last) / 1000, MAX_STEP);
      last = now;
      const next = Math.min(timeRef.current + step, duration);
      timeRef.current = next;
      setTime(next);
      if (next >= duration) {
        setWantsPlay(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration]);

  const seek = useCallback(
    (t: number) => {
      const c = Math.min(Math.max(t, 0), duration);
      timeRef.current = c;
      setTime(c);
    },
    [duration],
  );

  const play = useCallback(() => {
    if (timeRef.current >= duration) seek(0);
    setWantsPlay(true);
  }, [duration, seek]);

  const pause = useCallback(() => setWantsPlay(false), []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);
  const restart = useCallback(() => {
    seek(0);
    setWantsPlay(true);
  }, [seek]);

  return { time, playing, play, pause, toggle, restart, seek };
}
