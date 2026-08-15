import { useEffect, useRef, useState, useMemo } from 'react';
import type { Tensor } from 'onnxruntime-web';
import { extractAllChannelSnapshots } from '../inference';
import type { ColormapType, ChannelSnapshot } from '../inference';

interface HiddenChannelInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  stateTensor: Tensor | null;
  gridWidth: number;
  gridHeight: number;
  active3DChannel: number;
  onSelect3DChannel: (channelIdx: number) => void;
}

const COLORMAPS: { id: ColormapType; label: string; preview: string }[] = [
  { id: 'viridis', label: 'Viridis (Scientific)', preview: 'linear-gradient(90deg, #440154, #21908d, #fde725)' },
  { id: 'turbo', label: 'Turbo (Thermal)', preview: 'linear-gradient(90deg, #30123b, #28bbec, #a2fc3c, #fb8022, #7a0403)' },
  { id: 'plasma', label: 'Plasma (Harmonic)', preview: 'linear-gradient(90deg, #0d0887, #9c179e, #ed7953, #f0f921)' },
  { id: 'grayscale', label: 'Monochrome', preview: 'linear-gradient(90deg, #000000, #ffffff)' },
];

export function HiddenChannelInspector({
  isOpen,
  onClose,
  stateTensor,
  gridWidth,
  gridHeight,
  active3DChannel,
  onSelect3DChannel,
}: HiddenChannelInspectorProps) {
  const [colormap, setColormap] = useState<ColormapType>('viridis');
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [focusedChannel, setFocusedChannel] = useState<number | null>(null);
  const [snapshots, setSnapshots] = useState<ChannelSnapshot[]>([]);

  // Update snapshots periodically or when state changes
  useEffect(() => {
    if (!isOpen || !stateTensor) return;

    let animFrame: number;
    let lastTime = 0;

    const updateInspector = (time: number) => {
      // Throttle update to ~20 FPS for silky UI performance
      if (time - lastTime >= 50) {
        lastTime = time;
        const allSnapshots = extractAllChannelSnapshots(stateTensor, gridHeight, gridWidth, colormap);
        setSnapshots(allSnapshots);
      }
      animFrame = requestAnimationFrame(updateInspector);
    };

    animFrame = requestAnimationFrame(updateInspector);

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [isOpen, stateTensor, gridHeight, gridWidth, colormap]);

  const filteredSnapshots = useMemo(() => {
    if (filter === 'visible') return snapshots.filter((s) => s.index < 4);
    if (filter === 'hidden') return snapshots.filter((s) => s.index >= 4);
    return snapshots;
  }, [snapshots, filter]);

  if (!isOpen) return null;

  return (
    <div
      id="hidden-channel-inspector-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 250,
        background: 'rgba(5, 5, 10, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'nca-fade-in 0.2s ease-out',
      }}
    >
      <div
        id="hidden-channel-inspector-modal"
        style={{
          width: '100%',
          maxWidth: 1100,
          maxHeight: '92vh',
          background: 'rgba(15, 15, 26, 0.95)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 20,
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: '"Inter", "Outfit", system-ui, sans-serif',
          color: '#e2e8f0',
        }}
      >
        {/* Header Bar */}
        <header
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(20, 20, 35, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🔬</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '0.04em', color: '#f8fafc' }}>
                  16-Channel Latent Memory Inspector
                </h1>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}
                >
                  ● LIVE STREAMING
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                Inspect emergent spatial gradients & hidden morphogenesis channels ($h_1 \dots h_{12}$)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* 3D Projection Status Pill */}
            {active3DChannel >= 0 && (
              <button
                onClick={() => onSelect3DChannel(-1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 10,
                  border: '1px solid #6366f1',
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: '#c7d2fe',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                title="Reset 3D Canvas back to RGBA"
              >
                <span>🪐 3D: Channel {active3DChannel} Active</span>
                <span style={{ fontSize: 12 }}>✕</span>
              </button>
            )}

            {/* Close Button */}
            <button
              id="close-inspector-btn"
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#94a3b8',
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.color = '#fca5a5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              ✕
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            background: 'rgba(10, 10, 18, 0.4)',
            flexWrap: 'wrap',
          }}
        >
          {/* Category Filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'visible', 'hidden'] as const).map((f) => (
              <button
                key={f}
                id={`filter-${f}-btn`}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: filter === f ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.06)',
                  background: filter === f ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                  color: filter === f ? '#e0e7ff' : '#64748b',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s',
                }}
              >
                {f === 'all' ? 'All 16 Channels' : f === 'visible' ? 'RGBA (4)' : 'Hidden States (12)'}
              </button>
            ))}
          </div>

          {/* Colormap Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Colormap:
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {COLORMAPS.map((cm) => (
                <button
                  key={cm.id}
                  id={`colormap-${cm.id}-btn`}
                  onClick={() => setColormap(cm.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    borderRadius: 8,
                    border: colormap === cm.id ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.06)',
                    background: colormap === cm.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    color: colormap === cm.id ? '#f1f5f9' : '#64748b',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 10,
                      borderRadius: 3,
                      background: cm.preview,
                      display: 'inline-block',
                    }}
                  />
                  {cm.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Channels Grid View */}
        <div
          id="channels-grid-container"
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
            maxHeight: 'calc(92vh - 160px)',
          }}
        >
          {filteredSnapshots.map((snap) => {
            const is3DActive = active3DChannel === snap.index;
            return (
              <ChannelCard
                key={snap.index}
                snapshot={snap}
                gridWidth={gridWidth}
                gridHeight={gridHeight}
                is3DActive={is3DActive}
                onProject3D={() => onSelect3DChannel(is3DActive ? -1 : snap.index)}
                onFocus={() => setFocusedChannel(snap.index)}
              />
            );
          })}
        </div>

        {/* Scientific Insight Footer */}
        <footer
          style={{
            padding: '12px 24px',
            borderTop: '1px solid rgba(99, 102, 241, 0.12)',
            background: 'rgba(10, 10, 18, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: '#64748b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#818cf8', fontWeight: 700 }}>💡 Emergence Note:</span>
            <span>
              Hidden channels $h_1 \dots h_{12}$ spontaneously form orthogonal spatial gradients and boundary potentials to coordinate self-healing without global coordinates.
            </span>
          </div>
          <div style={{ fontFamily: 'monospace', color: '#475569' }}>
            {gridWidth}×{gridHeight} State Lattice
          </div>
        </footer>
      </div>

      {/* Focused Channel Detailed Modal */}
      {focusedChannel !== null && snapshots[focusedChannel] && (
        <FocusedChannelDetail
          snapshot={snapshots[focusedChannel]}
          gridWidth={gridWidth}
          gridHeight={gridHeight}
          colormap={colormap}
          is3DActive={active3DChannel === focusedChannel}
          onProject3D={() => onSelect3DChannel(active3DChannel === focusedChannel ? -1 : focusedChannel)}
          onClose={() => setFocusedChannel(null)}
        />
      )}
    </div>
  );
}

function ChannelCard({
  snapshot,
  gridWidth,
  gridHeight,
  is3DActive,
  onProject3D,
  onFocus,
}: {
  snapshot: ChannelSnapshot;
  gridWidth: number;
  gridHeight: number;
  is3DActive: boolean;
  onProject3D: () => void;
  onFocus: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = new ImageData(
      new Uint8ClampedArray(snapshot.pixels),
      gridWidth,
      gridHeight
    );
    ctx.putImageData(imgData, 0, 0);
  }, [snapshot, gridWidth, gridHeight]);

  return (
    <div
      id={`channel-card-${snapshot.index}`}
      style={{
        background: is3DActive ? 'rgba(99, 102, 241, 0.12)' : 'rgba(25, 25, 40, 0.45)',
        border: is3DActive ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: 14,
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: is3DActive ? '0 0 20px rgba(99, 102, 241, 0.25)' : 'none',
        transition: 'all 0.2s',
      }}
    >
      {/* Title & Tag */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: snapshot.info.color,
              boxShadow: `0 0 8px ${snapshot.info.color}`,
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>
            {snapshot.info.name}
          </span>
        </div>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 6,
            background: snapshot.info.category === 'visible' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)',
            color: snapshot.info.category === 'visible' ? '#60a5fa' : '#c084fc',
            textTransform: 'uppercase',
          }}
        >
          {snapshot.info.category}
        </span>
      </div>

      {/* Canvas Heatmap Preview */}
      <div
        onClick={onFocus}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1',
          borderRadius: 10,
          overflow: 'hidden',
          background: '#0a0a0f',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Click to focus"
      >
        <canvas
          ref={canvasRef}
          width={gridWidth}
          height={gridHeight}
          style={{
            width: '100%',
            height: '100%',
            imageRendering: 'pixelated',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            opacity: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.15s',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
        >
          🔍 Inspect
        </div>
      </div>

      {/* Stats Readout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          fontSize: 10,
          color: '#94a3b8',
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '8px',
          borderRadius: 8,
        }}
      >
        <div>
          <span style={{ color: '#64748b' }}>Range: </span>
          <span style={{ fontWeight: 600, color: '#cbd5e1' }}>
            [{snapshot.min}, {snapshot.max}]
          </span>
        </div>
        <div>
          <span style={{ color: '#64748b' }}>Energy: </span>
          <span style={{ fontWeight: 600, color: '#cbd5e1' }}>
            {snapshot.meanEnergy}
          </span>
        </div>
      </div>

      {/* Actions */}
      <button
        id={`project-3d-btn-${snapshot.index}`}
        onClick={onProject3D}
        style={{
          width: '100%',
          padding: '7px 0',
          borderRadius: 8,
          border: is3DActive ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
          background: is3DActive ? '#6366f1' : 'rgba(255, 255, 255, 0.03)',
          color: is3DActive ? '#ffffff' : '#94a3b8',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          transition: 'all 0.15s',
        }}
      >
        <span>{is3DActive ? '🪐 Projecting in 3D' : '🪐 Project in 3D'}</span>
      </button>
    </div>
  );
}

function FocusedChannelDetail({
  snapshot,
  gridWidth,
  gridHeight,
  colormap,
  is3DActive,
  onProject3D,
  onClose,
}: {
  snapshot: ChannelSnapshot;
  gridWidth: number;
  gridHeight: number;
  colormap: ColormapType;
  is3DActive: boolean;
  onProject3D: () => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imgData = new ImageData(
      new Uint8ClampedArray(snapshot.pixels),
      gridWidth,
      gridHeight
    );
    ctx.putImageData(imgData, 0, 0);
  }, [snapshot, gridWidth, gridHeight]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 580,
          background: '#0f0f1c',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          borderRadius: 18,
          padding: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          color: '#e2e8f0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: snapshot.info.color,
                boxShadow: `0 0 12px ${snapshot.info.color}`,
              }}
            />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
              {snapshot.info.name}
            </h2>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#a5b4fc',
              }}
            >
              {colormap}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
          {snapshot.info.description}
        </p>

        {/* High Res Canvas */}
        <div
          style={{
            width: '100%',
            aspectRatio: '1',
            borderRadius: 12,
            overflow: 'hidden',
            background: '#05050a',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <canvas
            ref={canvasRef}
            width={gridWidth}
            height={gridHeight}
            style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
          />
        </div>

        {/* Deep Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 10,
            background: 'rgba(255,255,255,0.03)',
            padding: 12,
            borderRadius: 10,
            fontSize: 11,
          }}
        >
          <div>
            <div style={{ color: '#64748b' }}>Min State Value</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1', marginTop: 2 }}>{snapshot.min}</div>
          </div>
          <div>
            <div style={{ color: '#64748b' }}>Max State Value</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1', marginTop: 2 }}>{snapshot.max}</div>
          </div>
          <div>
            <div style={{ color: '#64748b' }}>Mean Activation</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1', marginTop: 2 }}>{snapshot.meanEnergy}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onProject3D}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 10,
              border: 'none',
              background: is3DActive ? '#10b981' : '#6366f1',
              color: '#fff',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {is3DActive ? '🪐 Displaying in 3D (Click to Reset)' : '🪐 Project in 3D Mesh'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: '#94a3b8',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
