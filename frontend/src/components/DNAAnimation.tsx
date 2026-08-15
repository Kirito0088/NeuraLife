/**
 * DNAAnimation — Animated 2D canvas DNA double helix
 *
 * Renders a biologically-inspired double helix using 2D Canvas API.
 * - Depth-shaded strands (front = bright/thick, back = dim/thin)
 * - Warm metallic strand 1 (gold-bronze), cool strand 2 (silver-blue)
 * - Connecting rungs with ball endpoints
 * - Soft fade at top and bottom edges
 * - Floating biological particle elements (CSS)
 * - Phase-driven rotation animation (~10s per full cycle)
 * - Respects prefers-reduced-motion
 */

import { useEffect, useRef, useMemo } from 'react';

interface SegmentData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  depth: number; // -1 (back) to +1 (front)
}

interface RungData {
  x1: number;
  x2: number;
  y: number;
  depth: number;
}

export interface DNAAnimationProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Internal canvas resolution */
const CANVAS_W = 280;
const CANVAS_H = 640;

export function DNAAnimation({ className, style }: DNAAnimationProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const animRef    = useRef<number>(0);
  const phaseRef   = useRef(0);

  // Stable, deterministic particle positions (no randomness on re-render)
  const particles = useMemo(() =>
    Array.from({ length: 22 }, (_, i) => {
      const angle = (i / 22) * Math.PI * 2;
      return {
        x: Math.sin(angle * 2.3 + i * 0.8) * 110 + Math.sin(i * 1.7) * 30,
        y: (i / 22) * 600 + 20,
        size: 2 + (i % 4),
        opacity: 0.12 + (i % 5) * 0.07,
        duration: 10 + (i * 1.4) % 13,
        delay: (i * 0.9) % 11,
      };
    }),
  []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Use non-null-asserted alias so the closure doesn't see the nullable type
    const ctxOrNull = canvas.getContext('2d');
    if (!ctxOrNull) return;
    const ctx = ctxOrNull;

    const prefersReduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;

    // Helix geometry constants
    const CX       = CANVAS_W / 2;
    const AMP      = 80;          // amplitude (half-width of helix)
    const TOP      = 44;          // y start
    const HELIX_H  = CANVAS_H - 88; // usable height
    const PERIODS  = 4.6;         // number of full rotations visible
    const STEPS    = 200;         // path resolution
    const dt       = (2 * Math.PI * PERIODS) / STEPS;

    // Rung every ~1/7 of a period
    const RUNG_STEP = Math.max(1, Math.floor(STEPS / (PERIODS * 7)));

    const getY = (i: number) => TOP + (i / STEPS) * HELIX_H;

    function drawFrame() {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      const phase = phaseRef.current;

      const s1back:  SegmentData[] = [];
      const s1front: SegmentData[] = [];
      const s2back:  SegmentData[] = [];
      const s2front: SegmentData[] = [];
      const rungs:   RungData[]    = [];

      // Build segment lists
      for (let i = 0; i < STEPS; i++) {
        const t     = i * dt + phase;
        const tNext = (i + 1) * dt + phase;
        const y     = getY(i);
        const yNext = getY(i + 1);
        const depth = Math.sin((t + tNext) / 2); // mid-segment depth

        const seg1: SegmentData = {
          x1: CX + AMP * Math.sin(t),
          y1: y,
          x2: CX + AMP * Math.sin(tNext),
          y2: yNext,
          depth,
        };
        const seg2: SegmentData = {
          x1: CX - AMP * Math.sin(t),
          y1: y,
          x2: CX - AMP * Math.sin(tNext),
          y2: yNext,
          depth: -depth,
        };

        (depth  >= 0 ? s1front : s1back).push(seg1);
        (-depth >= 0 ? s2front : s2back).push(seg2);
      }

      // Build rungs list
      for (let i = 0; i < STEPS; i += RUNG_STEP) {
        const t = i * dt + phase;
        rungs.push({
          x1: CX + AMP * Math.sin(t),
          x2: CX - AMP * Math.sin(t),
          y:  getY(i),
          depth: Math.sin(t),
        });
      }

      // ── Segment drawing helper ──────────────────────────────────
      const drawSegs = (
        segs:       SegmentData[],
        frontColor: string,
        backColor:  string,
        glowColor:  string,
      ) => {
        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';
        for (const seg of segs) {
          const isFront = seg.depth >= 0;
          const absD    = Math.abs(seg.depth);
          ctx.save();
          if (isFront) {
            ctx.strokeStyle = frontColor;
            ctx.lineWidth   = 1.4 + absD * 3.2;
            ctx.globalAlpha = 0.50 + absD * 0.50;
            ctx.shadowColor = glowColor;
            ctx.shadowBlur  = absD * 12;
          } else {
            ctx.strokeStyle = backColor;
            ctx.lineWidth   = 0.7 + absD * 1.2;
            ctx.globalAlpha = 0.08 + absD * 0.18;
            ctx.shadowBlur  = 0;
          }
          ctx.beginPath();
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
          ctx.stroke();
          ctx.restore();
        }
      };

      // ── Draw order: back strands → rungs → front strands ──────
      // Back of strand 2 (silver-blue)
      drawSegs(s2back, '#b0bcc8', '#7890a0', 'rgba(130,170,210,0.3)');
      // Back of strand 1 (gold-bronze)
      drawSegs(s1back, '#c8b898', '#9a8868', 'rgba(200,170,120,0.3)');

      // Rungs
      for (const rung of rungs) {
        const absD    = Math.abs(rung.depth);
        const isFront = rung.depth >= 0;
        ctx.save();
        ctx.globalAlpha = isFront ? 0.32 + absD * 0.42 : 0.06 + absD * 0.12;
        ctx.strokeStyle = '#c0b8a8';
        ctx.lineWidth   = 0.6 + absD * 0.9;
        ctx.beginPath();
        ctx.moveTo(rung.x1, rung.y);
        ctx.lineTo(rung.x2, rung.y);
        ctx.stroke();

        // Ball endpoints
        const ballR   = 1.5 + absD * 2.4;
        const ballCol = rung.depth > 0 ? '#cabb9a' : '#aabcc8';
        ctx.fillStyle   = ballCol;
        ctx.globalAlpha = isFront ? 0.45 + absD * 0.45 : 0.05 + absD * 0.10;
        ctx.shadowColor = isFront ? 'rgba(200,180,140,0.55)' : 'transparent';
        ctx.shadowBlur  = isFront ? absD * 8 : 0;
        ctx.beginPath();
        ctx.arc(rung.x1, rung.y, ballR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rung.x2, rung.y, ballR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Front of strand 2 (silver-blue)
      drawSegs(s2front, '#b8c8da', '#90aac0', 'rgba(120,170,220,0.30)');
      // Front of strand 1 (gold-bronze) — topmost layer
      drawSegs(s1front, '#d8ccb4', '#b49870', 'rgba(220,180,110,0.35)');

      // Soft edge fades (top & bottom)
      const makeGrad = (y0: number, y1: number) => {
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        return g;
      };
      ctx.fillStyle = makeGrad(0, 100);
      ctx.fillRect(0, 0, CANVAS_W, 100);
      ctx.fillStyle = makeGrad(CANVAS_H, CANVAS_H - 100);
      ctx.fillRect(0, CANVAS_H - 100, CANVAS_W, 100);

      // Advance phase
      if (!prefersReduced) {
        phaseRef.current += 0.009; // ~11s per full rotation
        animRef.current = requestAnimationFrame(drawFrame);
      }
    }

    drawFrame();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display:  'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {/* Ambient warm glow behind the helix */}
      <div
        aria-hidden="true"
        style={{
          position:     'absolute',
          width:        '200px',
          height:       '520px',
          borderRadius: '50%',
          background:   'radial-gradient(ellipse, rgba(218,200,165,0.16) 0%, transparent 68%)',
          pointerEvents: 'none',
          zIndex:       0,
        }}
      />

      <canvas
        ref={canvasRef}
        style={{
          display:  'block',
          width:    `${CANVAS_W}px`,
          height:   `${CANVAS_H}px`,
          position: 'relative',
          zIndex:   1,
        }}
        aria-label="Animated DNA double helix — a scientific visualization of the biological intelligence powering NeuraLife"
        role="img"
      />

      {/* Floating biological particles (CSS-driven) */}
      <div className="dna-particles" aria-hidden="true">
        {particles.map((p, i) => (
          <div
            key={i}
            className="dna-particle"
            style={{
              '--particle-x':        `${p.x}px`,
              '--particle-y':        `${p.y}px`,
              '--particle-size':     `${p.size}px`,
              '--particle-opacity':  `${p.opacity}`,
              '--particle-duration': `${p.duration}s`,
              '--particle-delay':    `${p.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
