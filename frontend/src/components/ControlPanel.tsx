import { useState, useCallback } from 'react';

export type PatternPreset = 'morpho-ring' | 'glowing-emblem' | 'shield';

export interface ControlState {
  pattern: PatternPreset;
  brushRadius: number;
  paused: boolean;
  autoRotate: boolean;
  stepMultiplier: number;
}

interface ControlPanelProps {
  controls: ControlState;
  onChange: (next: ControlState) => void;
  onReset: () => void;
  onImageUpload: (file: File) => void;
}

const PATTERNS: { id: PatternPreset; label: string; emoji: string; description: string }[] = [
  { id: 'morpho-ring', label: 'Morpho Ring', emoji: '🔵', description: 'Concentric glowing rings' },
  { id: 'glowing-emblem', label: 'Glowing Emblem', emoji: '✦', description: 'Core emblem with outer ring' },
  { id: 'shield', label: 'Shield', emoji: '🛡', description: 'Geometric square lattice' },
];

export function ControlPanel({ controls, onChange, onReset, onImageUpload }: ControlPanelProps) {
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
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: open
            ? 'rgba(99,102,241,0.9)'
            : 'rgba(15,15,25,0.85)',
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
          boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
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
            top: 70,
            right: 20,
            width: 280,
            zIndex: 199,
            background: 'rgba(10,10,18,0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 16,
            padding: '20px 18px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
            color: '#cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            userSelect: 'none',
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', paddingBottom: 14 }}>
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
              NeuraLife Controls
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
              Neural Cellular Automata · Live Inference
            </p>
          </div>

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
                    padding: '9px 12px',
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
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{p.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: controls.pattern === p.id ? '#a5b4fc' : '#94a3b8' }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{p.description}</div>
                  </div>
                  {controls.pattern === p.id && (
                    <span style={{ marginLeft: 'auto', color: '#818cf8', fontSize: 14 }}>●</span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Brush Radius Slider */}
          <section id="brush-radius-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Label>Damage Brush Radius</Label>
              <span style={{ fontSize: 13, color: '#818cf8', fontWeight: 700 }}>{controls.brushRadius}px</span>
            </div>
            <input
              id="brush-radius-slider"
              type="range"
              min={1}
              max={10}
              step={1}
              value={controls.brushRadius}
              onChange={(e) => set({ brushRadius: Number(e.target.value) })}
              style={{ width: '100%', marginTop: 8, accentColor: '#6366f1', cursor: 'pointer' }}
              aria-label="Brush radius"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#334155', marginTop: 3 }}>
              <span>1px · Fine</span>
              <span>10px · Heavy</span>
            </div>
          </section>

          {/* Step Multiplier */}
          <section id="step-multiplier-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Label>Step Speed</Label>
              <span style={{ fontSize: 13, color: '#818cf8', fontWeight: 700 }}>{controls.stepMultiplier}×</span>
            </div>
            <input
              id="step-multiplier-slider"
              type="range"
              min={1}
              max={4}
              step={1}
              value={controls.stepMultiplier}
              onChange={(e) => set({ stepMultiplier: Number(e.target.value) })}
              style={{ width: '100%', marginTop: 8, accentColor: '#6366f1', cursor: 'pointer' }}
              aria-label="CA step speed multiplier"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#334155', marginTop: 3 }}>
              <span>1× · Normal</span>
              <span>4× · Fast</span>
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
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.18)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
          >
            ↺ Reset Seed Cell
          </button>

          {/* Footer */}
          <p style={{ margin: 0, fontSize: 10, color: '#1e293b', textAlign: 'center', letterSpacing: '0.06em' }}>
            NEURALIFE · NCA v0.1 · BPTT-96
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
