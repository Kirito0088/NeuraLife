import { useState, useCallback } from 'react';
import type { DamagePresetType } from '../inference';

export type PatternPreset = 'morpho-ring' | 'glowing-emblem' | 'shield' | 'bio-lizard' | 'dna-spiral';
export type BrushMode = 'damage' | 'growth';
export type PaletteMode = 'neon' | 'emerald' | 'solar' | 'hologram' | 'synthwave';
export type VisualMode = 'bio-membrane' | 'hologram' | 'topographic' | 'slice-2d';
export type SimulationEngine = 'morphogenesis' | 'neural-onnx';
export type ModelChoice = '/models/nca_model.onnx' | '/models/dummy_model.onnx';

export interface ControlState {
  pattern: PatternPreset;
  brushMode: BrushMode;
  brushRadius: number;
  heightScale: number;
  normalStrength: number;
  paletteMode: PaletteMode;
  visualMode: VisualMode;
  simulationEngine: SimulationEngine;
  paused: boolean;
  autoRotate: boolean;
  stepMultiplier: number;
  modelPath: ModelChoice;
  gridResolution: number;
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
  { id: 'morpho-ring', label: 'Morpho Iris', emoji: '🔵', description: 'Concentric glowing rings' },
  { id: 'glowing-emblem', label: 'Neural Mandala', emoji: '✦', description: 'Hexagonal golden core' },
  { id: 'shield', label: 'Quantum Shield', emoji: '🛡️', description: 'Geometric crystal matrix' },
  { id: 'bio-lizard', label: 'Bio Salamander', emoji: '🦎', description: 'Classic morphogenetic organism' },
  { id: 'dna-spiral', label: 'DNA Double Helix', emoji: '🧬', description: 'Swirling dual energy strands' },
];

const PALETTES: { id: PaletteMode; label: string; color: string }[] = [
  { id: 'neon', label: 'Cyber Neon', color: '#818cf8' },
  { id: 'emerald', label: 'Bio Emerald', color: '#34d399' },
  { id: 'solar', label: 'Solar Flare', color: '#fbbf24' },
  { id: 'hologram', label: 'Ice Hologram', color: '#38bdf8' },
  { id: 'synthwave', label: 'Synthwave', color: '#f43f5e' },
];

const VISUAL_MODES: { id: VisualMode; label: string; icon: string }[] = [
  { id: 'bio-membrane', label: 'Bio Membrane', icon: '🧬' },
  { id: 'hologram', label: 'Holo Grid', icon: '🪐' },
  { id: 'topographic', label: 'Topographic', icon: '🏔️' },
  { id: 'slice-2d', label: '2D Micro Slice', icon: '🔬' },
];

const DAMAGE_PRESETS: { id: DamagePresetType; label: string; emoji: string; sub: string }[] = [
  { id: 'cut_half', label: 'Bisection Cut', emoji: '✂️', sub: '50% Right Excision' },
  { id: 'cut_center', label: 'Core Cavity', emoji: '🕳️', sub: 'Central Excision' },
  { id: 'scatter', label: 'Disruption', emoji: '🌌', sub: '40% Random Decay' },
  { id: 'small_hole', label: 'Puncture', emoji: '⭕', sub: 'Circular Pore' },
];

export function ControlPanel({
  controls,
  biomass,
  onChange,
  onReset,
  onImageUpload,
  onApplyDamagePreset,
}: ControlPanelProps) {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'specimen' | 'tools' | 'optics' | 'engine'>('specimen');

  const set = useCallback(
    (patch: Partial<ControlState>) => onChange({ ...controls, ...patch }),
    [controls, onChange]
  );

  return (
    <>
      {/* Sleek Toggle Button */}
      <button
        id="control-panel-toggle"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed',
          top: 18,
          right: 22,
          zIndex: 250,
          width: 44,
          height: 44,
          borderRadius: 12,
          background: open ? 'rgba(99, 102, 241, 0.95)' : 'rgba(15, 15, 26, 0.85)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          color: '#ffffff',
          fontSize: 16,
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 15px rgba(99, 102, 241, 0.3)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        title={open ? 'Collapse Studio Deck' : 'Expand Studio Deck'}
        aria-label="Toggle control panel"
      >
        {open ? '✕' : '⚙️'}
      </button>

      {/* Floating Control Deck */}
      {open && (
        <aside
          id="control-panel"
          style={{
            position: 'fixed',
            top: 74,
            right: 22,
            width: 330,
            maxHeight: 'calc(100dvh - 96px)',
            zIndex: 240,
            background: 'rgba(10, 10, 18, 0.88)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(99, 102, 241, 0.28)',
            borderRadius: 18,
            padding: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.15)',
            color: '#e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            overflowY: 'auto',
            userSelect: 'none',
          }}
        >
          {/* Deck Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', color: '#f8fafc', textTransform: 'uppercase' }}>
                Morpho Studio Deck
              </div>
              <div style={{ fontSize: 10, color: '#818cf8', fontWeight: 600 }}>
                Neural Cellular Automata Suite
              </div>
            </div>

            {/* Quick Play/Pause Badge */}
            <button
              id="pause-toggle-btn"
              onClick={() => set({ paused: !controls.paused })}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                border: controls.paused ? '1px solid #f59e0b' : '1px solid #10b981',
                background: controls.paused ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: controls.paused ? '#fcd34d' : '#6ee7b7',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {controls.paused ? '⏸ Paused' : '▶ Running'}
            </button>
          </div>

          {/* Navigation Category Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, background: 'rgba(255,255,255,0.03)', padding: 3, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { id: 'specimen', label: 'Specimen', icon: '🧬' },
              { id: 'tools', label: 'Interact', icon: '⚡' },
              { id: 'optics', label: '3D Optics', icon: '🪐' },
              { id: 'engine', label: 'Engine', icon: '⚙️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '7px 0',
                  borderRadius: 7,
                  border: 'none',
                  background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                  color: activeTab === tab.id ? '#ffffff' : '#94a3b8',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  transition: 'all 0.15s',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Biomass Telemetry Sparkline Card */}
          <div
            id="biomass-card"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.06) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 12,
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#818cf8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Living Tissue Biomass
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#f8fafc', marginTop: 1 }}>
                {biomass.biomassPercent}%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>Active Cells</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#cbd5e1', marginTop: 1 }}>
                {biomass.activeCells} <span style={{ fontSize: 10, color: '#64748b' }}>/ {biomass.totalCells}</span>
              </div>
            </div>
          </div>

          {/* TAB 1: SPECIMEN PATTERNS */}
          {activeTab === 'specimen' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Morphogenetic Target Presets
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                      border: controls.pattern === p.id ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.06)',
                      background: controls.pattern === p.id ? 'rgba(99, 102, 241, 0.22)' : 'rgba(255,255,255,0.03)',
                      color: controls.pattern === p.id ? '#ffffff' : '#94a3b8',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{p.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{p.label}</div>
                      <div style={{ fontSize: 9, color: '#64748b' }}>{p.description}</div>
                    </div>
                    {controls.pattern === p.id && <span style={{ color: '#818cf8', fontSize: 10 }}>● Active</span>}
                  </button>
                ))}
              </div>

              {/* Custom Image Upload */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '9px',
                  borderRadius: 10,
                  border: '1px dashed rgba(99, 102, 241, 0.4)',
                  background: 'rgba(99, 102, 241, 0.05)',
                  color: '#c7d2fe',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: 2,
                }}
              >
                <span>📂 Upload Custom Target (PNG/JPG)</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) onImageUpload(e.target.files[0]);
                  }}
                />
              </label>
            </div>
          )}

          {/* TAB 2: INTERACTION & PERTURBATION */}
          {activeTab === 'tools' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Raycaster Brush Tool
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  id="brush-damage-btn"
                  onClick={() => set({ brushMode: 'damage' })}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 9,
                    border: controls.brushMode === 'damage' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.06)',
                    background: controls.brushMode === 'damage' ? 'rgba(239,68,68,0.22)' : 'rgba(255,255,255,0.03)',
                    color: controls.brushMode === 'damage' ? '#fca5a5' : '#64748b',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Disrupt / Damage
                </button>
                <button
                  id="brush-growth-btn"
                  onClick={() => set({ brushMode: 'growth' })}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 9,
                    border: controls.brushMode === 'growth' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                    background: controls.brushMode === 'growth' ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.03)',
                    color: controls.brushMode === 'growth' ? '#6ee7b7' : '#64748b',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🌱 Cultivate / Seed
                </button>
              </div>

              {/* Brush Radius Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>
                  <span>Brush Radius</span>
                  <span style={{ color: '#818cf8', fontWeight: 700 }}>{controls.brushRadius} cells</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="18"
                  value={controls.brushRadius}
                  onChange={(e) => set({ brushRadius: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: '#818cf8', cursor: 'pointer' }}
                />
              </div>

              {/* Catastrophic Damage Presets */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Catastrophic Injury
                  </span>
                  <span style={{ fontSize: 8, color: '#f87171', fontWeight: 800 }}>SELF-HEALING BENCHMARK</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {DAMAGE_PRESETS.map((d) => (
                    <button
                      key={d.id}
                      id={`damage-preset-${d.id}`}
                      onClick={() => onApplyDamagePreset?.(d.id)}
                      style={{
                        padding: '7px 9px',
                        borderRadius: 8,
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: '#fca5a5',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 2,
                        textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)')}
                    >
                      <span>{d.emoji} {d.label}</span>
                      <span style={{ fontSize: 8, color: '#fca5a588' }}>{d.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 3D OPTICS & AESTHETICS */}
          {activeTab === 'optics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                3D Visual Shader Mode
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {VISUAL_MODES.map((vm) => (
                  <button
                    key={vm.id}
                    id={`visual-mode-${vm.id}`}
                    onClick={() => set({ visualMode: vm.id })}
                    style={{
                      padding: '7px 8px',
                      borderRadius: 8,
                      border: controls.visualMode === vm.id ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.06)',
                      background: controls.visualMode === vm.id ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.03)',
                      color: controls.visualMode === vm.id ? '#ffffff' : '#94a3b8',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>{vm.icon}</span>
                    <span>{vm.label}</span>
                  </button>
                ))}
              </div>

              {/* 3D Height Extrusion Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>
                  <span>3D Height Elevation</span>
                  <span style={{ color: '#818cf8', fontWeight: 700 }}>{controls.heightScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.8"
                  step="0.02"
                  value={controls.heightScale}
                  onChange={(e) => set({ heightScale: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: '#818cf8', cursor: 'pointer' }}
                />
              </div>

              {/* Normal Relief Strength */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>
                  <span>Surface Normal Relief</span>
                  <span style={{ color: '#818cf8', fontWeight: 700 }}>{controls.normalStrength.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.05"
                  value={controls.normalStrength}
                  onChange={(e) => set({ normalStrength: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: '#818cf8', cursor: 'pointer' }}
                />
              </div>

              {/* Bioluminescent Color Palettes */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
                  Thermal Color Palettes
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {PALETTES.map((pal) => (
                    <button
                      key={pal.id}
                      id={`palette-${pal.id}`}
                      onClick={() => set({ paletteMode: pal.id })}
                      style={{
                        padding: '5px 9px',
                        borderRadius: 7,
                        border: controls.paletteMode === pal.id ? `1px solid ${pal.color}` : '1px solid rgba(255,255,255,0.06)',
                        background: controls.paletteMode === pal.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                        color: controls.paletteMode === pal.id ? '#ffffff' : '#94a3b8',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: pal.color }} />
                      <span>{pal.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ENGINE & SIMULATION */}
          {activeTab === 'engine' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Simulation Engine
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  id="engine-morpho-btn"
                  onClick={() => set({ simulationEngine: 'morphogenesis' })}
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    borderRadius: 8,
                    border: controls.simulationEngine === 'morphogenesis' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                    background: controls.simulationEngine === 'morphogenesis' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.03)',
                    color: controls.simulationEngine === 'morphogenesis' ? '#6ee7b7' : '#64748b',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🧬 Morphogenesis
                </button>
                <button
                  id="engine-onnx-btn"
                  onClick={() => set({ simulationEngine: 'neural-onnx' })}
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    borderRadius: 8,
                    border: controls.simulationEngine === 'neural-onnx' ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.06)',
                    background: controls.simulationEngine === 'neural-onnx' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                    color: controls.simulationEngine === 'neural-onnx' ? '#c7d2fe' : '#64748b',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🧠 Neural ONNX
                </button>
              </div>

              {/* Neural Model File Selection */}
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginTop: 4 }}>
                ONNX Model File
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  id="model-choice-trained"
                  onClick={() => set({ modelPath: '/models/nca_model.onnx' })}
                  style={{
                    flex: 1,
                    padding: '7px 4px',
                    borderRadius: 8,
                    border: controls.modelPath === '/models/nca_model.onnx' ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.06)',
                    background: controls.modelPath === '/models/nca_model.onnx' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                    color: controls.modelPath === '/models/nca_model.onnx' ? '#c7d2fe' : '#64748b',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ✦ Trained (24KB)
                </button>
                <button
                  id="model-choice-dummy"
                  onClick={() => set({ modelPath: '/models/dummy_model.onnx' })}
                  style={{
                    flex: 1,
                    padding: '7px 4px',
                    borderRadius: 8,
                    border: controls.modelPath === '/models/dummy_model.onnx' ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.06)',
                    background: controls.modelPath === '/models/dummy_model.onnx' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                    color: controls.modelPath === '/models/dummy_model.onnx' ? '#c7d2fe' : '#64748b',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⚙ Baseline (52KB)
                </button>
              </div>

              {/* Grid Resolution */}
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginTop: 4 }}>
                Lattice Resolution
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  id="res-choice-128"
                  onClick={() => set({ gridResolution: 128 })}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: 8,
                    border: controls.gridResolution === 128 ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                    background: controls.gridResolution === 128 ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.03)',
                    color: controls.gridResolution === 128 ? '#6ee7b7' : '#64748b',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  128×128 (HD)
                </button>
                <button
                  id="res-choice-64"
                  onClick={() => set({ gridResolution: 64 })}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: 8,
                    border: controls.gridResolution === 64 ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                    background: controls.gridResolution === 64 ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.03)',
                    color: controls.gridResolution === 64 ? '#6ee7b7' : '#64748b',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  64×64 (Fast)
                </button>
              </div>

              {/* Step Multiplier & Auto Rotate */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>Auto Orbit 3D</span>
                <button
                  onClick={() => set({ autoRotate: !controls.autoRotate })}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: controls.autoRotate ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.05)',
                    color: controls.autoRotate ? '#c7d2fe' : '#64748b',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {controls.autoRotate ? '🔄 Enabled' : '⏸ Disabled'}
                </button>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div style={{ display: 'flex', gap: 6, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, marginTop: 4 }}>
            <button
              id="reset-btn"
              onClick={onReset}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 9,
                border: '1px solid rgba(99, 102, 241, 0.4)',
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#e0e7ff',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🔄 Re-Seed Lattice
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
