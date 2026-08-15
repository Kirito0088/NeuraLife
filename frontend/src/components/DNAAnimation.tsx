/**
 * DNAAnimation — Hyper-detailed translucent glass DNA double helix
 *
 * Rendering model:
 *  ┌─ Backbone atoms ──── 3D glass spheres (4-layer radial gradient)
 *  │   • Layer 1: translucent glass body (pale blue-silver)
 *  │   • Layer 2: inner caustic (refracted light inside glass)
 *  │   • Layer 3: primary specular highlight (hard white)
 *  │   • Layer 4: rim light (thin bright halo at atom edge)
 *  │
 *  ├─ Backbone bonds ──── frosted glass tubes (gradient stroke)
 *  │
 *  └─ Base pairs ────────── crystalline rods + small glass caps
 *
 * Palette: pure white highlight · pale blue-silver body · deep blue depth
 * All drawn back-to-front (z-sorted every frame) for correct depth order.
 * Respects prefers-reduced-motion.
 */

import { useEffect, useRef, useMemo } from 'react';

const CANVAS_W = 300;
const CANVAS_H = 680;

type GlassColor = {
  surface:  string; // bright inner surface where refracted light pools
  body:     string; // main glass body (translucent)
  depth:    string; // deeper zone
  shadow:   string; // shadow edge (transparent)
};

// ── Strand 1: glacial blue-silver glass ──
const G1: GlassColor = {
  surface: 'rgba(220, 238, 255, 0.72)',
  body:    'rgba(160, 200, 245, 0.48)',
  depth:   'rgba(80,  145, 215, 0.32)',
  shadow:  'rgba(40,  100, 200, 0)',
};

// ── Strand 2: silver-white glass ──
const G2: GlassColor = {
  surface: 'rgba(235, 245, 255, 0.70)',
  body:    'rgba(190, 215, 240, 0.44)',
  depth:   'rgba(110, 160, 215, 0.28)',
  shadow:  'rgba(70,  130, 200, 0)',
};

// ── Base pair caps (AT: blue-tinted / GC: silver-tinted) ──
const B_AT: GlassColor = {
  surface: 'rgba(200, 225, 255, 0.68)',
  body:    'rgba(130, 180, 240, 0.45)',
  depth:   'rgba(60,  120, 210, 0.28)',
  shadow:  'rgba(30,   90, 190, 0)',
};

const B_GC: GlassColor = {
  surface: 'rgba(225, 238, 255, 0.65)',
  body:    'rgba(175, 205, 235, 0.42)',
  depth:   'rgba(100, 150, 210, 0.26)',
  shadow:  'rgba(60,  120, 190, 0)',
};

export interface DNAAnimationProps {
  className?: string;
  style?: React.CSSProperties;
}

export function DNAAnimation({ className, style }: DNAAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const phaseRef  = useRef(0);

  // Deterministic floating micro-particles
  const particles = useMemo(() =>
    Array.from({ length: 26 }, (_, i) => ({
      x:        Math.sin(i * 2.6 + i * 0.35) * 148,
      y:        (i / 26) * 640 + 8,
      size:     1.5 + (i % 4) * 0.65,
      opacity:  0.08 + (i % 5) * 0.045,
      duration: 10  + (i * 1.3) % 13,
      delay:    (i * 0.85) % 11,
    })), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctxRaw = canvas.getContext('2d');
    if (!ctxRaw) return;
    const ctx = ctxRaw; // non-null alias for closures

    const prefersReduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;

    // ─── Helix geometry ───────────────────────────────────────────────
    const CX      = CANVAS_W / 2;
    const AMP     = 86;       // half-width of helix
    const TOP     = 54;       // y start
    const HELIX_H = CANVAS_H - 110;
    const PERIODS = 4.3;      // full turns visible
    const N_ATOMS = 52;       // backbone atoms per strand
    const RUNG_EVERY = 5;     // base pair every N backbone atoms

    // ─── Glass sphere renderer (4-layer) ─────────────────────────────

    function drawGlassAtom(
      cx:     number,
      cy:     number,
      r:      number,
      gc:     GlassColor,
      alpha:  number,
    ): void {
      if (r < 0.5 || alpha < 0.015) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha);

      // Highlight offset: upper-left (standard studio lighting)
      const hx = cx - r * 0.30;
      const hy = cy - r * 0.28;

      // ── Layer 1: glass body (translucent, radial from highlight) ──
      const g1 = ctx.createRadialGradient(hx, hy, 0, cx, cy, r);
      g1.addColorStop(0,    gc.surface);
      g1.addColorStop(0.38, gc.body);
      g1.addColorStop(0.70, gc.depth);
      g1.addColorStop(1,    gc.shadow);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = g1;
      ctx.fill();

      // ── Layer 2: inner caustic (refracted light inside glass) ──────
      // Caustic appears offset toward the opposite-lower side from the
      // external highlight — characteristic of solid glass spheres.
      const cax = cx + r * 0.18;
      const cay = cy + r * 0.16;
      const g2 = ctx.createRadialGradient(cax, cay, 0, cax, cay, r * 0.55);
      g2.addColorStop(0,   'rgba(210, 232, 255, 0.38)');
      g2.addColorStop(0.5, 'rgba(190, 220, 255, 0.12)');
      g2.addColorStop(1,   'rgba(170, 210, 255, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = g2;
      ctx.fill();

      // ── Layer 3: primary hard specular highlight (white) ────────────
      const g3 = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.50);
      g3.addColorStop(0,    'rgba(255, 255, 255, 0.92)');
      g3.addColorStop(0.28, 'rgba(255, 255, 255, 0.35)');
      g3.addColorStop(0.65, 'rgba(240, 248, 255, 0.06)');
      g3.addColorStop(1,    'rgba(255, 255, 255, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = g3;
      ctx.fill();

      // ── Layer 4: rim highlight (thin bright edge — classic glass) ───
      if (r > 5) {
        const g4 = ctx.createRadialGradient(cx, cy, r * 0.72, cx, cy, r * 1.01);
        g4.addColorStop(0,   'rgba(210, 232, 255, 0)');
        g4.addColorStop(0.6, 'rgba(220, 238, 255, 0.10)');
        g4.addColorStop(1,   'rgba(245, 252, 255, 0.42)');
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = g4;
        ctx.fill();
      }

      ctx.restore();
    }

    // ─── Frosted glass tube bond ──────────────────────────────────────

    function drawGlassBond(
      x1: number, y1: number,
      x2: number, y2: number,
      w:  number,
      alpha: number,
      col1: string,
      col2: string,
    ): void {
      if (alpha < 0.01 || w < 0.3) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.lineWidth   = w;
      ctx.lineCap     = 'round';

      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0,    col1);
      g.addColorStop(0.5,  'rgba(190, 220, 255, 0.55)');
      g.addColorStop(1,    col2);
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Thin specular sheen along the bond (simulates glass tube highlight)
      if (w > 2) {
        ctx.globalAlpha = alpha * 0.45;
        ctx.lineWidth   = Math.max(0.5, w * 0.22);
        ctx.strokeStyle = 'rgba(255,255,255,0.90)';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.restore();
    }

    // ─── Depth helpers ─────────────────────────────────────────────────

    /** Atom radius: effectiveDepth in [-1,+1] where +1 = fully front */
    function atomR(d: number): number {
      return d >= 0 ? 7 + d * 7 : 2 + Math.abs(d) * 1.5;
    }

    /** Atom alpha: more opaque in front, ghost-like in back */
    function atomA(d: number): number {
      return d >= 0 ? 0.78 + d * 0.22 : 0.06 + Math.abs(d) * 0.09;
    }

    // ─── Main animation loop ───────────────────────────────────────────

    type Item = { depth: number; draw: () => void };

    function drawFrame(): void {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      const phase = phaseRef.current;
      const dt    = (2 * Math.PI * PERIODS) / N_ATOMS;

      // Compute all atom positions
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

      // ── Backbone glass tube bonds ──────────────────────────────────
      for (let i = 0; i < N_ATOMS; i++) {
        const midT  = s1[i].t + dt * 0.5;
        const dep1  =  Math.sin(midT);
        const dep2  = -dep1;
        const abs1  = Math.abs(dep1);
        const abs2  = Math.abs(dep2);

        // Strand 1
        {
          const w = dep1 >= 0 ? 2.5 + abs1 * 5 : 0.7 + abs1 * 0.6;
          const a = dep1 >= 0 ? 0.60 + abs1 * 0.35 : 0.04 + abs1 * 0.06;
          const px = s1[i].x, py = s1[i].y, qx = s1[i+1].x, qy = s1[i+1].y;
          items.push({ depth: dep1 - 0.05,
            draw: () => drawGlassBond(px, py, qx, qy, w, a,
              'rgba(170,210,250,0.80)', 'rgba(140,190,240,0.80)'),
          });
        }

        // Strand 2
        {
          const w = dep2 >= 0 ? 2.5 + abs2 * 5 : 0.7 + abs2 * 0.6;
          const a = dep2 >= 0 ? 0.60 + abs2 * 0.35 : 0.04 + abs2 * 0.06;
          const px = s2[i].x, py = s2[i].y, qx = s2[i+1].x, qy = s2[i+1].y;
          items.push({ depth: dep2 - 0.05,
            draw: () => drawGlassBond(px, py, qx, qy, w, a,
              'rgba(200,225,250,0.75)', 'rgba(175,210,245,0.75)'),
          });
        }
      }

      // ── Base pair crystalline rods + caps ──────────────────────────
      for (let i = 0; i <= N_ATOMS; i += RUNG_EVERY) {
        const pi   = Math.min(i, N_ATOMS);
        const p    = s1[pi], q = s2[pi];
        const dep  = Math.sin(p.t);
        const abs  = Math.abs(dep);
        const front = dep >= 0;
        const isAT  = (Math.floor(i / RUNG_EVERY) % 2) === 0;

        // Rung rod (crystalline glass tube, very translucent)
        {
          const rw = front ? 1.8 + abs * 3.2 : 0.4 + abs * 0.4;
          const ra = front ? 0.48 + abs * 0.38 : 0.03 + abs * 0.04;
          const px = p.x, py = p.y, qx = q.x, qy = q.y;
          // AT: slightly cooler blue; GC: slightly warmer silver
          const c  = isAT ? 'rgba(160,200,248,0.75)' : 'rgba(195,218,248,0.72)';
          items.push({ depth: dep - 0.10,
            draw: () => drawGlassBond(px, py, qx, qy, rw, ra, c, c),
          });
        }

        // Cap atoms at each rung end
        {
          const bc   = isAT ? B_AT : B_GC;
          const d1   = dep,      r1 = atomR(d1) * 0.68, a1 = atomA(d1) * 0.92;
          const d2   = -dep,     r2 = atomR(d2) * 0.68, a2 = atomA(d2) * 0.92;
          const px   = p.x, py = p.y, qx = q.x, qy = q.y;
          items.push({ depth: dep,
            draw: () => {
              drawGlassAtom(px, py, r1, bc,           a1);
              drawGlassAtom(qx, qy, r2, isAT ? B_GC : B_AT, a2);
            },
          });
        }
      }

      // ── Backbone phosphate glass atoms (largest) ───────────────────
      for (let i = 0; i <= N_ATOMS; i++) {
        const p  = s1[i], q = s2[i];
        const d1 = Math.sin(p.t);
        const d2 = -d1;

        const r1 = atomR(d1), a1 = atomA(d1);
        const r2 = atomR(d2), a2 = atomA(d2);
        const px = p.x, py = p.y, qx = q.x, qy = q.y;

        items.push({ depth: d1, draw: () => drawGlassAtom(px, py, r1, G1, a1) });
        items.push({ depth: d2, draw: () => drawGlassAtom(qx, qy, r2, G2, a2) });
      }

      // Z-sort all items back → front and draw
      items.sort((a, b) => a.depth - b.depth);
      for (const item of items) item.draw();

      // ── Edge fades (top and bottom white fade) ────────────────────
      const fadeT = ctx.createLinearGradient(0, 0, 0, 125);
      fadeT.addColorStop(0, 'rgba(255,255,255,1)');
      fadeT.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fadeT;
      ctx.fillRect(0, 0, CANVAS_W, 125);

      const fadeB = ctx.createLinearGradient(0, CANVAS_H - 125, 0, CANVAS_H);
      fadeB.addColorStop(0, 'rgba(255,255,255,0)');
      fadeB.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = fadeB;
      ctx.fillRect(0, CANVAS_H - 125, CANVAS_W, 125);

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
      {/* Very subtle cool-blue ambient glow — matches glass tint */}
      <div
        aria-hidden="true"
        style={{
          position:     'absolute',
          width:        '260px',
          height:       '600px',
          borderRadius: '50%',
          background:   'radial-gradient(ellipse, rgba(180,215,255,0.10) 0%, transparent 68%)',
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
        aria-label="Translucent glass DNA double helix — crystalline molecular model with blue and silver highlights"
        role="img"
      />

      {/* Floating micro-particles (CSS-animated) */}
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
