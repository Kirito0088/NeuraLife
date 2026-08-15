/**
 * LandingPage — Premium editorial landing page for NeuraLife
 *
 * Visual language: white/near-black, minimal nav, large editorial typography,
 * DNA animation as hero centrepiece, large rounded content cards below the fold.
 * Matches the reference composition (LEARNIQ-style layout).
 */

import { useEffect, useCallback } from 'react';
import { DNAAnimation } from './DNAAnimation';

interface LandingPageProps {
  onEnterStudio: () => void;
}

/* ─── shared style tokens ─── */
const T = {
  white:     '#ffffff',
  offWhite:  '#f8f7f5',
  surface1:  '#f3f2f0',
  surface2:  '#eceae7',
  border:    '#e2e0db',
  borderSoft:'#eeedea',
  text:      '#0a0a0a',
  text2:     '#3d3d3d',
  text3:     '#6b6b6b',
  muted:     '#9a9a9a',
  fontSans:  `'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`,
  fontDisplay:`'Outfit', 'Inter', sans-serif`,
  fontMono:  `'JetBrains Mono', 'Fira Code', monospace`,
} as const;

const btn = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 28px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
    border: 'none',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    fontFamily: T.fontSans,
  } as React.CSSProperties,
  outline: {
    background: 'transparent',
    border: `1.5px solid ${T.text}`,
    color: T.text,
  } as React.CSSProperties,
  dark: {
    background: T.text,
    border: `1.5px solid ${T.text}`,
    color: T.white,
  } as React.CSSProperties,
  ghost: {
    background: 'transparent',
    border: `1.5px solid ${T.border}`,
    color: T.text3,
  } as React.CSSProperties,
};

const SPECIMENS = [
  { id: 'morpho-ring',    emoji: '🔵', label: 'Morpho Iris',       desc: 'Harmonic concentric rings' },
  { id: 'glowing-emblem', emoji: '✦',  label: 'Neural Mandala',    desc: 'Six-petal golden core' },
  { id: 'shield',         emoji: '🛡️',  label: 'Quantum Shield',    desc: 'Crystalline energy matrix' },
  { id: 'bio-lizard',     emoji: '🦎', label: 'Bio Salamander',    desc: 'Classic morphogenetic form' },
  { id: 'dna-spiral',     emoji: '🧬', label: 'DNA Double Helix',  desc: 'Dual energy strand helix' },
];

const DAMAGE_MODES = [
  { emoji: '✂️', label: 'Bisection Cut',   sub: '50% right-half excision' },
  { emoji: '🕳️', label: 'Core Cavity',     sub: 'Central rectangular void' },
  { emoji: '🌌', label: 'Scatter Disruption', sub: '40 % random cell decay' },
  { emoji: '⭕', label: 'Circular Puncture', sub: 'Micro-pore at centroid' },
];

/* ─── scroll-reveal helper ─── */
function useScrollReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('nl-revealed');
      }),
      { threshold: 0.07, rootMargin: '0px 0px -32px 0px' },
    );
    document.querySelectorAll('.nl-reveal').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

export function LandingPage({ onEnterStudio }: LandingPageProps) {
  useScrollReveal();

  const handleEnter = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onEnterStudio();
  }, [onEnterStudio]);

  return (
    <div style={{ background: T.white, minHeight: '100dvh', overflowX: 'hidden' }}>

      {/* ═══════════════════════════════════════
          NAVIGATION
      ═══════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px',
      }}>
        {/* Brand */}
        <span
          onClick={handleEnter}
          style={{
            fontFamily: T.fontDisplay, fontSize: 18, fontWeight: 800,
            letterSpacing: '-0.02em', color: T.text, cursor: 'pointer',
          }}
        >
          NeuraLife
        </span>

        {/* Nav actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Menu label */}
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
              color: T.text3, background: 'none', border: 'none',
              cursor: 'pointer', padding: '4px 0',
            }}
          >
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
              <line x1="0" y1="1" x2="14" y2="1"  stroke={T.text3} strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="0" y1="5" x2="14" y2="5"  stroke={T.text3} strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="0" y1="9" x2="14" y2="9"  stroke={T.text3} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Menu
          </button>

          {/* Search icon */}
          <button style={{
            width: 36, height: 36, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${T.border}`, borderRadius: 9999,
            background: 'none', cursor: 'pointer', color: T.text3,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
              <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Account icon */}
          <button style={{
            width: 36, height: 36, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${T.border}`, borderRadius: 9999,
            background: 'none', cursor: 'pointer', color: T.text3,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M1.5 13c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* ═══════════════════════════════════════
          HERO  (100dvh, 3-col grid)
      ═══════════════════════════════════════ */}
      <section style={{
        position: 'relative', minHeight: '100dvh',
        display: 'grid',
        gridTemplateColumns: '2.1fr 2.4fr 1.7fr',
        gridTemplateRows: '1fr',
        paddingTop: 80,
        overflow: 'hidden',
      }}>

        {/* ─ Left column: label + headline + CTA ─ */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '60px 32px 140px 40px', gap: 36, zIndex: 2,
        }}>
          <span style={{
            fontFamily: T.fontSans, fontSize: 11, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: T.text3,
          }}>
            The Intelligence of Life
          </span>

          <h1 style={{
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(50px, 6.2vw, 90px)',
            fontWeight: 900, lineHeight: 0.91,
            letterSpacing: '-0.035em', color: T.text,
          }}>
            Where<br/>
            Biology<br/>
            Meets<br/>
            Neural<br/>
            Intelligence
          </h1>

          <button
            id="hero-explore-btn"
            onClick={handleEnter}
            style={{ ...btn.base, ...btn.outline, alignSelf: 'flex-start' }}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, { background: T.text, color: T.white, transform: 'translateY(-1px)' });
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, { background: 'transparent', color: T.text, transform: 'translateY(0)' });
            }}
          >
            Explore the Platform
          </button>
        </div>

        {/* ─ Center column: DNA animation ─ */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'visible', zIndex: 1,
          paddingBottom: 80,
        }}>
          <DNAAnimation />
        </div>

        {/* ─ Right column: description + enter CTA ─ */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'flex-start',
          padding: '60px 40px 200px 16px', gap: 28, zIndex: 2,
        }}>
          <p style={{
            fontFamily: T.fontSans, fontSize: 14, lineHeight: 1.72,
            color: T.text2, maxWidth: 230,
          }}>
            NeuraLife simulates biological morphogenesis in real time — patterns that grow, self-organise, and regenerate, guided by neural cellular automata running on WebGPU.
          </p>

          <button
            id="hero-studio-btn"
            onClick={handleEnter}
            style={{ ...btn.base, ...btn.dark }}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, { background: '#2a2a2a', borderColor: '#2a2a2a', transform: 'translateY(-1px)' });
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, { background: T.text, borderColor: T.text, transform: 'translateY(0)' });
            }}
          >
            ↓ Enter the Studio
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          ANCHOR INFO CARD  (rounded, below fold)
      ═══════════════════════════════════════ */}
      <section style={{
        background: T.surface1,
        borderTop: `1px solid ${T.border}`,
        borderRadius: '40px 40px 0 0',
        padding: '56px 40px',
        position: 'relative', zIndex: 5,
        marginTop: -56,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 56, maxWidth: 1200, margin: '0 auto',
          alignItems: 'start',
        }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={{
              fontFamily: T.fontDisplay, fontSize: 80, fontWeight: 800,
              lineHeight: 1, letterSpacing: '-0.05em', color: T.text,
            }}>
              01
            </span>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
              <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.muted }}>
                2024-11-15
              </span>
              <span style={{
                fontFamily: T.fontSans, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.07em', textTransform: 'uppercase', color: T.text3,
              }}>
                Neural Cellular Automata
              </span>
            </div>
            <h2 style={{
              fontFamily: T.fontDisplay, fontSize: 'clamp(20px, 2.4vw, 30px)',
              fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', color: T.text,
            }}>
              Biological Intelligence,<br/>Computationally Modelled
            </h2>
          </div>

          {/* Right */}
          <div style={{ paddingTop: 16 }}>
            <p style={{ fontFamily: T.fontSans, fontSize: 15, lineHeight: 1.72, color: T.text2 }}>
              NeuraLife models the fundamental processes of biological growth and regeneration
              using Neural Cellular Automata — AI systems where each cell coordinates with its
              neighbours to create complex global structures, exactly as living cells do during
              embryonic development and tissue repair.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 02 — 16-Channel Neural Analysis
      ═══════════════════════════════════════ */}
      <section style={{ padding: '100px 40px', maxWidth: 1280, margin: '0 auto' }}>
        <div
          className="nl-reveal"
          style={{
            background: T.surface1,
            border: `1px solid ${T.borderSoft}`,
            borderRadius: 40, padding: '60px 56px', overflow: 'hidden',
          }}
        >
          {/* Section header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 48, alignItems: 'end', marginBottom: 52,
          }}>
            <div>
              <div style={{
                fontFamily: T.fontDisplay, fontSize: 100, fontWeight: 800,
                lineHeight: 1, letterSpacing: '-0.05em',
                color: T.border, marginBottom: -8,
              }}>
                02
              </div>
              <span style={{
                fontFamily: T.fontSans, fontSize: 11, fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase', color: T.text3,
                display: 'block', marginBottom: 12,
              }}>
                Neural Analysis
              </span>
              <h2 style={{
                fontFamily: T.fontDisplay,
                fontSize: 'clamp(28px, 3.5vw, 46px)',
                fontWeight: 800, lineHeight: 1.0,
                letterSpacing: '-0.028em', color: T.text,
              }}>
                16 Channels of<br/>Biological State
              </h2>
            </div>
            <p style={{ fontFamily: T.fontSans, fontSize: 15, lineHeight: 1.7, color: T.text2, paddingBottom: 4 }}>
              Each of the 16,384 cells in the morphogenetic lattice maintains a
              16-dimensional hidden state. Four visible channels encode colour and
              opacity; twelve latent channels encode biochemical signals, growth
              factors, and intercellular communication gradients — invisible to the
              eye but essential to the organism's emergent intelligence.
            </p>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1, background: T.border,
            border: `1px solid ${T.border}`, borderRadius: 20, overflow: 'hidden',
          }}>
            {[
              { value: '16,384', label: 'Active cells per simulation' },
              { value: '16',     label: 'State channels per cell' },
              { value: '60 fps', label: 'Real-time WebGPU rendering' },
            ].map((s) => (
              <div key={s.value} style={{ background: T.white, padding: '32px 36px' }}>
                <div style={{
                  fontFamily: T.fontDisplay, fontSize: 40, fontWeight: 800,
                  letterSpacing: '-0.035em', color: T.text, lineHeight: 1, marginBottom: 8,
                }}>
                  {s.value}
                </div>
                <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.text3, lineHeight: 1.4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 03 — Morphogenetic Specimens
      ═══════════════════════════════════════ */}
      <section style={{ padding: '0 40px 100px', maxWidth: 1280, margin: '0 auto' }}>
        <div className="nl-reveal">
          {/* Header */}
          <div style={{ marginBottom: 40, display: 'flex', gap: 48, alignItems: 'flex-end' }}>
            <div>
              <div style={{
                fontFamily: T.fontDisplay, fontSize: 100, fontWeight: 800,
                lineHeight: 1, letterSpacing: '-0.05em', color: T.border, marginBottom: -8,
              }}>
                03
              </div>
              <span style={{
                fontFamily: T.fontSans, fontSize: 11, fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase', color: T.text3,
                display: 'block', marginBottom: 10,
              }}>
                Pattern Discovery
              </span>
              <h2 style={{
                fontFamily: T.fontDisplay,
                fontSize: 'clamp(28px, 3.5vw, 46px)',
                fontWeight: 800, lineHeight: 1.0,
                letterSpacing: '-0.028em', color: T.text,
              }}>
                Five Morphogenetic<br/>Specimens
              </h2>
            </div>
            <p style={{
              fontFamily: T.fontSans, fontSize: 15, lineHeight: 1.7,
              color: T.text2, maxWidth: 380, paddingBottom: 4,
            }}>
              Each specimen defines a target morphology. The neural field grows from
              a single seed cell, self-organising until it perfectly matches the pattern
              — then holds that structure indefinitely.
            </p>
          </div>

          {/* Pattern cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
            {SPECIMENS.map((s, i) => (
              <button
                key={s.id}
                className="nl-reveal"
                data-delay={String(i * 80)}
                onClick={handleEnter}
                style={{
                  background: T.white,
                  border: `1px solid ${T.border}`,
                  borderRadius: 20,
                  padding: '28px 18px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.22s ease',
                  fontFamily: T.fontSans,
                }}
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, {
                    borderColor: T.text, transform: 'translateY(-5px)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.09)',
                  });
                }}
                onMouseLeave={(e) => {
                  Object.assign(e.currentTarget.style, {
                    borderColor: T.border, transform: 'translateY(0)',
                    boxShadow: 'none',
                  });
                }}
              >
                <span style={{ fontSize: 34, display: 'block', marginBottom: 14 }}>{s.emoji}</span>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 5, letterSpacing: '0.02em' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 04 — Interactive Studio
      ═══════════════════════════════════════ */}
      <section style={{ padding: '0 40px 100px', maxWidth: 1280, margin: '0 auto' }}>
        <div
          className="nl-reveal"
          style={{
            background: T.text, color: T.white,
            borderRadius: 40, padding: '60px 56px',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56,
          }}
        >
          <div>
            <div style={{
              fontFamily: T.fontDisplay, fontSize: 100, fontWeight: 800,
              lineHeight: 1, letterSpacing: '-0.05em',
              color: 'rgba(255,255,255,0.12)', marginBottom: -8,
            }}>
              04
            </div>
            <span style={{
              fontFamily: T.fontSans, fontSize: 11, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 12,
            }}>
              Interactive Exploration
            </span>
            <h2 style={{
              fontFamily: T.fontDisplay,
              fontSize: 'clamp(28px, 3.2vw, 44px)',
              fontWeight: 800, lineHeight: 1.0,
              letterSpacing: '-0.028em', color: T.white,
            }}>
              Shape, Damage,<br/>Observe Regeneration.
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, justifyContent: 'center' }}>
            <p style={{
              fontFamily: T.fontSans, fontSize: 15, lineHeight: 1.72,
              color: 'rgba(255,255,255,0.72)',
            }}>
              Use the raycaster brush to directly perturb living tissue. Apply
              catastrophic injuries and watch neighbouring cells detect damage
              gradients, coordinate biochemical signals, and regenerate the exact
              target morphology — entirely through local rules.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { icon: '⚡', label: 'Disruption Brush', sub: 'Direct cell erasure' },
                { icon: '🌱', label: 'Seed Brush',       sub: 'Inject living tissue' },
                { icon: '🔬', label: '16-Channel View',  sub: 'Inspect latent state' },
                { icon: '🪐', label: '3D Shader Modes',  sub: 'Topographic / Holo' },
              ].map((f) => (
                <div key={f.label} style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 14, padding: '16px 18px',
                }}>
                  <div style={{ fontSize: 18, marginBottom: 8 }}>{f.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.white, marginBottom: 3 }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{f.sub}</div>
                </div>
              ))}
            </div>

            <button
              id="section4-studio-btn"
              onClick={handleEnter}
              style={{
                ...btn.base,
                background: T.white, color: T.text,
                border: `1.5px solid ${T.white}`,
                alignSelf: 'flex-start',
              }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, { opacity: '0.88', transform: 'translateY(-1px)' })}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { opacity: '1', transform: 'translateY(0)' })}
            >
              Enter the 3D Studio →
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 05 — Self-Healing Intelligence
      ═══════════════════════════════════════ */}
      <section style={{ padding: '0 40px 100px', maxWidth: 1280, margin: '0 auto' }}>
        <div className="nl-reveal" style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'end' }}>
            <div>
              <div style={{
                fontFamily: T.fontDisplay, fontSize: 100, fontWeight: 800,
                lineHeight: 1, letterSpacing: '-0.05em', color: T.border, marginBottom: -8,
              }}>
                05
              </div>
              <span style={{
                fontFamily: T.fontSans, fontSize: 11, fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase', color: T.text3,
                display: 'block', marginBottom: 10,
              }}>
                Intelligent Insights
              </span>
              <h2 style={{
                fontFamily: T.fontDisplay,
                fontSize: 'clamp(28px, 3.5vw, 46px)',
                fontWeight: 800, lineHeight: 1.0,
                letterSpacing: '-0.028em', color: T.text,
              }}>
                Damage. Observe.<br/>Regenerate.
              </h2>
            </div>
            <p style={{ fontFamily: T.fontSans, fontSize: 15, lineHeight: 1.72, color: T.text2, paddingBottom: 4 }}>
              Four clinically-inspired injury modes test the organism's resilience.
              Each cell uses only local neighbourhood information to sense damage
              and initiate repair — no central coordinator, no global memory.
              Pure distributed biological intelligence.
            </p>
          </div>

          {/* Damage mode cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {DAMAGE_MODES.map((d, i) => (
              <div
                key={d.label}
                className="nl-reveal"
                data-delay={String(i * 80)}
                style={{
                  background: T.surface1,
                  border: `1px solid ${T.border}`,
                  borderRadius: 20, padding: '28px 22px',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, { borderColor: T.text, transform: 'translateY(-4px)' });
                }}
                onMouseLeave={(e) => {
                  Object.assign(e.currentTarget.style, { borderColor: T.border, transform: 'translateY(0)' });
                }}
              >
                <span style={{ fontSize: 28, display: 'block', marginBottom: 16 }}>{d.emoji}</span>
                <div style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 }}>
                  {d.label}
                </div>
                <div style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
                  {d.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Inline stat strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1, background: T.border,
            border: `1px solid ${T.border}`, borderRadius: 20, overflow: 'hidden',
          }}>
            {[
              { value: '4',    label: 'Injury test modes' },
              { value: '100%', label: 'Self-healing specimens' },
              { value: '~8s',  label: 'Average recovery time' },
            ].map((s) => (
              <div key={s.value} style={{ background: T.white, padding: '28px 32px' }}>
                <div style={{
                  fontFamily: T.fontDisplay, fontSize: 36, fontWeight: 800,
                  letterSpacing: '-0.03em', color: T.text, lineHeight: 1, marginBottom: 6,
                }}>
                  {s.value}
                </div>
                <div style={{ fontFamily: T.fontSans, fontSize: 13, color: T.text3 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 06 — Final CTA
      ═══════════════════════════════════════ */}
      <section
        className="nl-reveal"
        style={{
          borderTop: `1px solid ${T.borderSoft}`,
          padding: '120px 40px',
          textAlign: 'center',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 40,
        }}
      >
        <span style={{
          fontFamily: T.fontSans, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: T.text3,
        }}>
          Ready to Explore
        </span>

        <h2 style={{
          fontFamily: T.fontDisplay,
          fontSize: 'clamp(44px, 6vw, 84px)',
          fontWeight: 900, lineHeight: 0.91,
          letterSpacing: '-0.04em', color: T.text,
          maxWidth: 600,
        }}>
          Begin Your<br/>Exploration
        </h2>

        <p style={{
          fontFamily: T.fontSans, fontSize: 15, lineHeight: 1.7,
          color: T.text3, maxWidth: 440,
        }}>
          Open the real-time 3D studio. Grow, damage, and observe biological
          self-regeneration — all in your browser.
        </p>

        <button
          id="final-cta-btn"
          onClick={handleEnter}
          style={{ ...btn.base, ...btn.dark, padding: '16px 40px', fontSize: 12 }}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, { background: '#2a2a2a', borderColor: '#2a2a2a', transform: 'translateY(-2px)' })}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, { background: T.text, borderColor: T.text, transform: 'translateY(0)' })}
        >
          Enter the 3D Studio →
        </button>

        <p style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted, marginTop: 8 }}>
          Requires Chrome 113+ or Edge 113+ with WebGPU enabled.
        </p>
      </section>

      {/* ═══════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════ */}
      <footer style={{
        borderTop: `1px solid ${T.border}`,
        padding: '32px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: T.fontDisplay, fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', color: T.text }}>
          NeuraLife
        </span>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <span style={{ fontFamily: T.fontSans, fontSize: 12, color: T.muted }}>
            Neural Cellular Automata Research Platform
          </span>
          <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.muted }}>
            v2.0 · WebGPU
          </span>
        </div>
      </footer>
    </div>
  );
}
