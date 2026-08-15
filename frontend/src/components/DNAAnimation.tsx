/**
 * DNAAnimation — Molecular-style 3D DNA double helix
 *
 * Renders a biologically accurate DNA model using 2D canvas:
 * - Backbone phosphate atoms as 3D spheres (radial gradient highlight + shadow)
 * - Sugar-phosphate backbone bonds connecting adjacent atoms
 * - Base pair rods (AT = red/blue, GC = green/gold) connecting the two strands
 * - Base pair atoms at rung endpoints
 * - Full z-depth sorting: all items drawn back-to-front
 * - Specular highlight on every front-facing atom for convincing 3D look
 * - Respects prefers-reduced-motion
 */

import { useEffect, useRef, useMemo } from 'react';

const CANVAS_W = 300;
const CANVAS_H = 680;

type AtomColor = {
  bright: string;   // highlight (nearly white tint)
  midLow: string;   // secondary highlight
  mid:    string;   // base hue
  dark:   string;   // shadow
  edge:   string;   // fully transparent edge
};

// ── Strand 1: warm amber-orange phosphate backbone ──
const S1: AtomColor = {
  bright: '#fff4cc',
  midLow: '#f0b840',
  mid:    '#d07818',
  dark:   '#7a3800',
  edge:   'rgba(50,18,0,0)',
};

// ── Strand 2: cool blue phosphate backbone ──
const S2: AtomColor = {
  bright: '#d8f0ff',
  midLow: '#70bcf8',
  mid:    '#2478d8',
  dark:   '#003470',
  edge:   'rgba(0,8,48,0)',
};

// ── Base pair AT (Adenine-Thymine): red ──
const BASE_AT: AtomColor = {
  bright: '#ffe4e4',
  midLow: '#f09090',
  mid:    '#cc2828',
  dark:   '#5a0010',
  edge:   'rgba(38,0,0,0)',
};

// ── Base pair GC (Guanine-Cytosine): green ──
const BASE_GC: AtomColor = {
  bright: '#e4ffe8',
  midLow: '#78e890',
  mid:    '#18a838',
  dark:   '#004c18',
  edge:   'rgba(0,28,0,0)',
};

export interface DNAAnimationProps {
  className?: string;
  style?: React.CSSProperties;
}

export function DNAAnimation({ className, style }: DNAAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const phaseRef  = useRef(0);

  // Stable, deterministic floating particles
  const particles = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({
      x:        Math.sin(i * 2.5 + i * 0.4) * 145,
      y:        (i / 24) * 640 + 8,
      size:     2 + (i % 4) * 0.7,
      opacity:  0.10 + (i % 5) * 0.055,
      duration: 10  + (i * 1.3) % 13,
      delay:    (i * 0.9) % 11,
    })), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctxRaw = canvas.getContext('2d');
    if (!ctxRaw) return;
    const ctx = ctxRaw; // non-null alias for closure

    const prefersReduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;

    // ── Helix geometry ──────────────────────────────────────
    const CX      = CANVAS_W / 2;
    const AMP     = 88;       // helix half-width in px
    const TOP     = 52;       // y-start
    const HELIX_H = CANVAS_H - 108;
    const PERIODS = 4.3;      // full rotations visible
    const N_ATOMS = 52;       // discrete backbone atoms per strand
    const RUNG_EVERY = 5;     // base pair every N atoms

    // ── Drawing helpers ─────────────────────────────────────

    /** Draw a 3D sphere (radial gradient) at (cx,cy) with given radius */
    function drawAtom(
      cx: number, cy: number,
      r:  number,
      c:  AtomColor,
      alpha: number,
    ): void {
      if (r < 0.4 || alpha < 0.015) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha);

      // Highlight offset (upper-left)
      const hx = cx - r * 0.30;
      const hy = cy - r * 0.28;

      // Main sphere gradient
      const grd = ctx.createRadialGradient(hx, hy, 0, cx, cy, r);
      grd.addColorStop(0,    c.bright);
      grd.addColorStop(0.28, c.midLow);
      grd.addColorStop(0.56, c.mid);
      grd.addColorStop(0.84, c.dark);
      grd.addColorStop(1,    c.edge);

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Specular highlight (small bright spot)
      if (r > 4 && alpha > 0.3) {
        const sGrd = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.52);
        sGrd.addColorStop(0,   'rgba(255,255,255,0.78)');
        sGrd.addColorStop(0.5, 'rgba(255,255,255,0.08)');
        sGrd.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = sGrd;
        ctx.fill();
      }
      ctx.restore();
    }

    /** Draw a gradient-colored cylindrical bond from (x1,y1) to (x2,y2) */
    function drawBond(
      x1: number, y1: number,
      x2: number, y2: number,
      w:  number,
      col1: string, col2: string,
      alpha: number,
    ): void {
      if (alpha < 0.01 || w < 0.3) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.lineWidth = w;
      ctx.lineCap  = 'round';
      const grd = ctx.createLinearGradient(x1, y1, x2, y2);
      grd.addColorStop(0, col1);
      grd.addColorStop(1, col2);
      ctx.strokeStyle = grd;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    }

    // ── Per-depth helpers ────────────────────────────────────

    /** Atom radius based on effective depth (-1 = deep back, +1 = deep front) */
    function rForDepth(d: number): number {
      return d >= 0 ? 7 + d * 7 : 2 + Math.abs(d) * 1.5;
    }

    /** Atom alpha based on effective depth */
    function aForDepth(d: number): number {
      return d >= 0 ? 0.82 + d * 0.18 : 0.07 + Math.abs(d) * 0.10;
    }

    // ── Main draw loop ───────────────────────────────────────
    type Item = { depth: number; draw: () => void };

    function drawFrame(): void {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      const phase = phaseRef.current;
      const dt    = (2 * Math.PI * PERIODS) / N_ATOMS;

      // Compute all atom positions upfront
      type Pt = { x: number; y: number; t: number };
      const s1: Pt[] = [];
      const s2: Pt[] = [];
      for (let i = 0; i <= N_ATOMS; i++) {
        const t = i * dt + phase;
        const y = TOP + (i / N_ATOMS) * HELIX_H;
        s1.push({ x: CX + AMP * Math.sin(t), y, t });
        s2.push({ x: CX - AMP * Math.sin(t), y, t });
      }

      const items: Item[] = [];

      // ── Backbone bonds ────────────────────────────────────
      for (let i = 0; i < N_ATOMS; i++) {
        // Strand 1 (amber)
        {
          const p = s1[i], q = s1[i + 1];
          const d = Math.sin(p.t + dt * 0.5);
          const abs = Math.abs(d);
          const front = d >= 0;
          const w = front ? 3 + abs * 5   : 0.8 + abs * 0.7;
          const a = front ? 0.65 + abs*0.3 : 0.05 + abs*0.07;
          const px = p.x, py = p.y, qx = q.x, qy = q.y;
          items.push({ depth: d - 0.05,
            draw: () => drawBond(px, py, qx, qy, w, '#c07020', '#924010', a),
          });
        }
        // Strand 2 (blue)
        {
          const p = s2[i], q = s2[i + 1];
          const d = -Math.sin(s1[i].t + dt * 0.5); // opposite depth
          const abs = Math.abs(d);
          const front = d >= 0;
          const w = front ? 3 + abs * 5   : 0.8 + abs * 0.7;
          const a = front ? 0.65 + abs*0.3 : 0.05 + abs*0.07;
          const px = p.x, py = p.y, qx = q.x, qy = q.y;
          items.push({ depth: d - 0.05,
            draw: () => drawBond(px, py, qx, qy, w, '#1c60c8', '#103898', a),
          });
        }
      }

      // ── Base pair rungs ───────────────────────────────────
      for (let i = 0; i <= N_ATOMS; i += RUNG_EVERY) {
        const pi = Math.min(i, N_ATOMS);
        const p  = s1[pi], q = s2[pi];
        const d  = Math.sin(p.t);
        const abs = Math.abs(d);
        const front = d >= 0;
        const isAT  = (Math.floor(i / RUNG_EVERY) % 2) === 0;

        // Rung cylinder bond
        {
          const rw = front ? 2 + abs * 3.5 : 0.5 + abs * 0.5;
          const ra = front ? 0.55 + abs*0.35 : 0.04 + abs*0.05;
          const c1 = isAT ? '#c42828' : '#20983a';
          const c2 = isAT ? '#3434c4' : '#b09010';
          const px = p.x, py = p.y, qx = q.x, qy = q.y;
          items.push({ depth: d - 0.08,
            draw: () => drawBond(px, py, qx, qy, rw, c1, c2, ra),
          });
        }

        // Rung atoms at each end
        {
          const ra = rForDepth(d);
          const aa = aForDepth(d);
          const bc1 = isAT ? BASE_AT : BASE_GC;
          const bc2 = isAT ? BASE_GC : BASE_AT;
          const px = p.x, py = p.y, qx = q.x, qy = q.y;
          const d2  = -d;
          const ra2 = rForDepth(d2);
          const aa2 = aForDepth(d2);
          items.push({ depth: d,
            draw: () => {
              drawAtom(px, py, ra  * 0.72, bc1, aa);
              drawAtom(qx, qy, ra2 * 0.72, bc2, aa2);
            },
          });
        }
      }

      // ── Backbone phosphate atoms (largest) ────────────────
      for (let i = 0; i <= N_ATOMS; i++) {
        const p  = s1[i], q = s2[i];
        const d1 = Math.sin(p.t);
        const d2 = -d1;

        const px = p.x, py = p.y;
        const qx = q.x, qy = q.y;
        const r1 = rForDepth(d1), a1 = aForDepth(d1);
        const r2 = rForDepth(d2), a2 = aForDepth(d2);

        items.push({ depth: d1, draw: () => drawAtom(px, py, r1, S1, a1) });
        items.push({ depth: d2, draw: () => drawAtom(qx, qy, r2, S2, a2) });
      }

      // Z-sort (back → front) and draw
      items.sort((a, b) => a.depth - b.depth);
      for (const item of items) item.draw();

      // ── Soft edge fades (top + bottom) ────────────────────
      const fadeTop = ctx.createLinearGradient(0, 0, 0, 120);
      fadeTop.addColorStop(0, 'rgba(255,255,255,1)');
      fadeTop.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fadeTop;
      ctx.fillRect(0, 0, CANVAS_W, 120);

      const fadeBot = ctx.createLinearGradient(0, CANVAS_H - 120, 0, CANVAS_H);
      fadeBot.addColorStop(0, 'rgba(255,255,255,0)');
      fadeBot.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = fadeBot;
      ctx.fillRect(0, CANVAS_H - 120, CANVAS_W, 120);

      // Advance phase and request next frame
      if (!prefersReduced) {
        phaseRef.current += 0.009; // ≈ 11 s per full rotation
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
        alignItems:     'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {/* Warm ambient glow behind the helix */}
      <div
        aria-hidden="true"
        style={{
          position:     'absolute',
          width:        '240px',
          height:       '580px',
          borderRadius: '50%',
          background:   'radial-gradient(ellipse, rgba(218,195,145,0.16) 0%, transparent 68%)',
          pointerEvents: 'none',
          zIndex:        0,
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
        aria-label="DNA double helix molecular model — animated backbone atoms, base pairs, and sugar-phosphate bonds"
        role="img"
      />

      {/* Floating biological micro-particles (CSS animated) */}
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
