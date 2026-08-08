import { useState, useCallback } from 'react';
import type { DamagePresetType } from '../inference';

export type PatternPreset = 'morpho-ring' | 'glowing-emblem' | 'shield';
export type BrushMode = 'damage' | 'growth';
export type PaletteMode = 'neon' | 'emerald' | 'solar' | 'hologram';

export interface ControlState {
  pattern: PatternPreset;
  brushMode: BrushMode;
  brushRadius: number;
  heightScale: number;
  normalStrength: number;
  paletteMode: PaletteMode;
  paused: boolean;
  autoRotate: boolean;
  stepMultiplier: number;
}

export interface BiomassMetrics {
  activeCells: number;
  totalCells: number;
  biomassPercent: number;
}

interface ControlPanelProps {
  controls: ControlState;
  biomass: BiomassMetrics;
  onChange: (next: ControlState) => void;
  onReset: () => void;
  onImageUpload: (file: File) => void;
  onApplyDamagePreset?: (preset: DamagePresetType) => void;
}

const PATTERNS: { id: PatternPreset; label: string; emoji: string; description: string }[] = [
  { id: 'morpho-ring', label: 'Morpho Ring', emoji: '🔵', description: 'Concentric glowing rings' },
  { id: 'glowing-emblem', label: 'Glowing Emblem', emoji: '✦', description: 'Core emblem with outer ring' },
  { id: 'shield', label: 'Shield', emoji: '🛡', description: 'Geometric square lattice' },
];

const PALETTES: { id: PaletteMode; label: string; color: string }[] = [
  { id: 'neon', label: 'Cyber Neon', color: '#818cf8' },
  { id: 'emerald', label: 'Biolum Emerald', color: '#34d399' },
  { id: 'solar', label: 'Solar Fire', color: '#fbbf24' },
  { id: 'hologram', label: 'Ice Hologram', color: '#38bdf8' },
];

const DAMAGE_PRESETS: { id: DamagePresetType; label: string; emoji: string; sub: string }[] = [
  { id: 'cut_half', label: 'Cut Half', emoji: '✂️', sub: 'Right 50%' },
  { id: 'cut_center', label: 'Cut Center', emoji: '🕳️', sub: 'Central Box' },
  { id: 'scatter', label: 'Scatter', emoji: '🌌', sub: '40% Random' },
  { id: 'small_hole', label: 'Center Hole', emoji: '⭕', sub: 'Cavity' },
];

export function ControlPanel({ controls, biomass, onChange, onReset, onImageUpload, onApplyDamagePreset }: ControlPanelProps) {
  const [open, setOpen] = useState(true);

  const set = useCallback(
    (patch: Partial<ControlState>) => onChange({ ...controls, ...patch }),
    [controls, onChange]
  );

  return (
    <>
      {/* Toggle Button */}
      <button
        id="control-panel-toggle"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 200,
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: open ? 'rgba(99,102,241,0.9)' : 'rgba(15,15,25,0.85)',
          border: '1px solid rgba(99,102,241,0.5)',
          color: '#e0e0ff',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'background 0.25s, transform 0.2s',
          boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
        }}
        title={open ? 'Close Controls' : 'Open Controls'}
        aria-label="Toggle control panel"
      >
        {open ? '✕' : '⚙'}
      </button>

      {/* Panel */}
      {open && (
        <aside
          id="control-panel"
          style={{
            position: 'fixed',
            top: 72,
            right: 20,
            width: 300,
            maxHeight: 'calc(100vh - 90px)',
            overflowY: 'auto',
            zIndex: 199,
            background: 'rgba(10,10,18,0.88)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 16,
            padding: '20px 18px',
            boxShadow: '0 12px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            color: '#cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            userSelect: 'none',
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', paddingBottom: 12 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#818cf8',
              }}
            >
              NeuraLife 3D Suite
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.4 }}>
              Neural Cellular Automata · Morphogenesis Engine
            </p>
          </div>

          {/* Biomass Analytics Readout Card */}
          <section
            id="biomass-card"
            style={{
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase' }}>
                Active Biomass
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
                {biomass.biomassPercent}%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#64748b' }}>Living Cells</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginTop: 2 }}>
                {biomass.activeCells} / {biomass.totalCells}
              </div>
            </div>
          </section>

          {/* Brush Mode Toggle */}
          <section id="brush-mode-section">
            <Label>Brush Tool</Label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                id="brush-damage-btn"
                onClick={() => set({ brushMode: 'damage' })}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 10,
                  border: controls.brushMode === 'damage' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.06)',
                  background: controls.brushMode === 'damage' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.03)',
                  color: controls.brushMode === 'damage' ? '#fca5a5' : '#64748b',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                ⚡ Damage
              </button>
              <button
                id="brush-growth-btn"
                onClick={() => set({ brushMode: 'growth' })}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 10,
                  border: controls.brushMode === 'growth' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                  background: controls.brushMode === 'growth' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.03)',
                  color: controls.brushMode === 'growth' ? '#6ee7b7' : '#64748b',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                🌱 Seed Growth
              </button>
            </div>
          </section>

          {/* Damage Presets Section */}
          <section id="damage-presets-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Label>Damage Presets</Label>
              <span style={{ fontSize: 9, color: '#f87171', fontWeight: 700, letterSpacing: '0.08em' }}>CATASTROPHIC</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 8 }}>
              {DAMAGE_PRESETS.map((d) => (
                <button
                  key={d.id}
                  id={`damage-preset-${d.id}`}
                  onClick={() => onApplyDamagePreset?.(d.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#fca5a5',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 2,
                    transition: 'all 0.15s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.55)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <span>{d.emoji}</span>
                    <span style={{ fontWeight: 700 }}>{d.label}</span>
                  </span>
                  <span style={{ fontSize: 9, color: '#fca5a5aa', letterSpacing: '0.02em' }}>{d.sub}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Pattern Selector */}
          <section id="pattern-selector">
            <Label>Target Pattern</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
              {PATTERNS.map((p) => (
                <button
                  key={p.id}
                  id={`pattern-${p.id}`}
                  onClick={() => set({ pattern: p.id })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: controls.pattern === p.id
                      ? '1px solid rgba(99,102,241,0.7)'
                      : '1px solid rgba(255,255,255,0.06)',
                    background: controls.pattern === p.id
                      ? 'rgba(99,102,241,0.18)'
                      : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                    width: '100%',
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{p.emoji}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: controls.pattern === p.id ? '#a5b4fc' : '#94a3b8' }}>
                      {p.label}
                    </div>
                  </div>
                  {controls.pattern === p.id && (
                    <span style={{ marginLeft: 'auto', color: '#818cf8', fontSize: 12 }}>●</span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Color Palette Selector */}
          <section id="palette-selector">
            <Label>Thermal Color Theme</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 8 }}>
              {PALETTES.map((pal) => (
                <button
                  key={pal.id}
                  id={`palette-${pal.id}`}
                  onClick={() => set({ paletteMode: pal.id })}
                  style={{
                    padding: '7px 8px',
                    borderRadius: 8,
                    border: controls.paletteMode === pal.id ? `1px solid ${pal.color}` : '1px solid rgba(255,255,255,0.06)',
                    background: controls.paletteMode === pal.id ? `${pal.color}22` : 'rgba(255,255,255,0.03)',
                    color: controls.paletteMode === pal.id ? '#f8fafc' : '#64748b',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: pal.color }} />
                  {pal.label}
                </button>
              ))}
            </div>
          </section>

          {/* Sliders: Brush Radius, 3D Extrusion Height, Normal Intensity */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Label>Brush Radius</Label>
                <span style={{ fontSize: 12, color: '#818cf8', fontWeight: 700 }}>{controls.brushRadius}px</span>
              </div>
              <input
                id="brush-radius-slider"
                type="range"
                min={1}
                max={12}
                step={1}
                value={controls.brushRadius}
                onChange={(e) => set({ brushRadius: Number(e.target.value) })}
                style={{ width: '100%', marginTop: 6, accentColor: '#6366f1', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Label>3D Height Extrusion</Label>
                <span style={{ fontSize: 12, color: '#818cf8', fontWeight: 700 }}>{controls.heightScale.toFixed(1)}×</span>
              </div>
              <input
                id="height-scale-slider"
                type="range"
                min={0.0}
                max={2.0}
                step={0.1}
                value={controls.heightScale}
                onChange={(e) => set({ heightScale: Number(e.target.value) })}
                style={{ width: '100%', marginTop: 6, accentColor: '#6366f1', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Label>Normal Lighting Strength</Label>
                <span style={{ fontSize: 12, color: '#818cf8', fontWeight: 700 }}>{controls.normalStrength.toFixed(1)}×</span>
              </div>
              <input
                id="normal-strength-slider"
                type="range"
                min={0.1}
                max={2.0}
                step={0.1}
                value={controls.normalStrength}
                onChange={(e) => set({ normalStrength: Number(e.target.value) })}
                style={{ width: '100%', marginTop: 6, accentColor: '#6366f1', cursor: 'pointer' }}
              />
            </div>
          </section>

          {/* Toggles Row */}
          <section style={{ display: 'flex', gap: 8 }}>
            <ToggleButton
              id="pause-toggle"
              active={controls.paused}
              label={controls.paused ? '▶ Resume' : '⏸ Pause'}
              onClick={() => set({ paused: !controls.paused })}
              color="#6366f1"
            />
            <ToggleButton
              id="autorotate-toggle"
              active={controls.autoRotate}
              label={controls.autoRotate ? '🔄 Rotate On' : '🔄 Rotate Off'}
              onClick={() => set({ autoRotate: !controls.autoRotate })}
              color="#8b5cf6"
            />
          </section>

          {/* Custom Image Upload */}
          <label
            id="upload-image-label"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '9px 0',
              borderRadius: 10,
              border: '1px dashed rgba(99,102,241,0.4)',
              background: 'rgba(99,102,241,0.06)',
              color: '#a5b4fc',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            📁 Upload Custom Target
            <input
              id="upload-image-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onImageUpload(e.target.files[0]);
                }
              }}
            />
          </label>

          {/* Reset Button */}
          <button
            id="reset-seed-btn"
            onClick={onReset}
            style={{
              padding: '10px 0',
              borderRadius: 10,
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239,68,68,0.08)',
              color: '#fca5a5',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
              letterSpacing: '0.04em',
            }}
          >
            ↺ Reset Seed Cell
          </button>

          {/* Footer */}
          <p style={{ margin: 0, fontSize: 10, color: '#334155', textAlign: 'center', letterSpacing: '0.06em' }}>
            NEURALIFE · 3D SUITE v1.0 · BPTT-96
          </p>
        </aside>
      )}
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      {children}
    </span>
  );
}

function ToggleButton({
  id, active, label, onClick, color,
}: {
  id: string; active: boolean; label: string; onClick: () => void; color: string;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      style={{
        flex: 1,
        padding: '9px 0',
        borderRadius: 10,
        border: `1px solid ${active ? color + 'aa' : 'rgba(255,255,255,0.06)'}`,
        background: active ? `${color}22` : 'rgba(255,255,255,0.03)',
        color: active ? '#c7d2fe' : '#64748b',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}
