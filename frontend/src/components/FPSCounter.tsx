import { useRef, useEffect, useCallback } from 'react';

/**
 * FPSCounter — Development overlay that displays rolling average FPS.
 *
 * Performance notes:
 * - Uses a ring buffer of rAF timestamps to compute average FPS.
 * - Updates a DOM text node directly via ref — never triggers React
 *   re-renders in the hot path (per Vercel `rerender-use-ref-transient-values`).
 * - Paints the FPS value once every ~250ms to avoid layout thrash.
 */

const RING_BUFFER_SIZE = 60;
const DISPLAY_INTERVAL_MS = 250;

export function FPSCounter() {
  const spanRef = useRef<HTMLSpanElement>(null);
  const timestampsRef = useRef<number[]>([]);
  const indexRef = useRef(0);
  const lastDisplayRef = useRef(0);
  const rafIdRef = useRef(0);

  const tick = useCallback((now: number) => {
    const timestamps = timestampsRef.current;
    const idx = indexRef.current % RING_BUFFER_SIZE;
    timestamps[idx] = now;
    indexRef.current++;

    // Only update the DOM text at the display interval.
    if (now - lastDisplayRef.current >= DISPLAY_INTERVAL_MS) {
      lastDisplayRef.current = now;

      const filled = Math.min(indexRef.current, RING_BUFFER_SIZE);
      if (filled > 1) {
        const oldest =
          timestamps[(indexRef.current - filled) % RING_BUFFER_SIZE];
        const newest = timestamps[(indexRef.current - 1) % RING_BUFFER_SIZE];
        const elapsed = newest - oldest;
        const fps = elapsed > 0 ? ((filled - 1) / elapsed) * 1000 : 0;

        if (spanRef.current) {
          spanRef.current.textContent = `${Math.round(fps)} FPS`;
        }
      }
    }

    rafIdRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafIdRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [tick]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        padding: '6px 14px',
        borderRadius: 8,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        color: '#00ffa3',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.04em',
        zIndex: 9999,
        pointerEvents: 'none',
        userSelect: 'none',
        border: '1px solid rgba(0, 255, 163, 0.15)',
      }}
    >
      <span ref={spanRef}>-- FPS</span>
    </div>
  );
}
