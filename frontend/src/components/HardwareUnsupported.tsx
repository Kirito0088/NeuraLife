/**
 * HardwareUnsupported — Fallback UI for when both WebGPU and WebGL fail.
 *
 * Displays an editorial-style error page consistent with the NeuraLife light
 * design system. Shows an optional pre-rendered video and Chrome/Edge upgrade hint.
 */

interface HardwareUnsupportedProps {
  /** Optional path to a pre-rendered fallback video */
  videoSrc?: string;
  /** The error message from the hardware detection */
  errorMessage?: string;
}

export function HardwareUnsupported({
  videoSrc,
  errorMessage,
}: HardwareUnsupportedProps) {
  return (
    <div
      id="hardware-unsupported"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        padding: '48px 24px',
        textAlign: 'center',
        background: '#f8f7f5',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      {/* GPU chip icon — minimal, editorial */}
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ marginBottom: 28, opacity: 0.55 }}
      >
        <rect x="14" y="14" width="44" height="44" rx="6" stroke="#0a0a0a" strokeWidth="1.6" />
        <rect
          x="22"
          y="22"
          width="28"
          height="28"
          rx="4"
          fill="#0a0a0a"
          fillOpacity="0.06"
          stroke="#0a0a0a"
          strokeWidth="1.2"
        />
        {/* Top pins */}
        <line x1="24" y1="8"  x2="24" y2="14" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="32" y1="8"  x2="32" y2="14" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="40" y1="8"  x2="40" y2="14" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="48" y1="8"  x2="48" y2="14" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" />
        {/* Bottom pins */}
        <line x1="24" y1="58" x2="24" y2="64" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="32" y1="58" x2="32" y2="64" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="40" y1="58" x2="40" y2="64" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="48" y1="58" x2="48" y2="64" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" />
        {/* Left pins */}
        <line x1="8"  y1="24" x2="14" y2="24" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8"  y1="32" x2="14" y2="32" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8"  y1="40" x2="14" y2="40" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8"  y1="48" x2="14" y2="48" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" />
        {/* Right pins */}
        <line x1="58" y1="24" x2="64" y2="24" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="58" y1="32" x2="64" y2="32" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="58" y1="40" x2="64" y2="40" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="58" y1="48" x2="64" y2="48" stroke="#0a0a0a" strokeWidth="1.4" strokeLinecap="round" />
        {/* X mark */}
        <line x1="28" y1="28" x2="44" y2="44" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" />
        <line x1="44" y1="28" x2="28" y2="44" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* Eyebrow label */}
      <span
        style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: '#9a9a9a',
          marginBottom: 16, display: 'block',
        }}
      >
        Hardware Incompatible
      </span>

      <h1
        style={{
          fontFamily: "'Outfit', 'Inter', sans-serif",
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: 900, lineHeight: 0.95,
          letterSpacing: '-0.035em', color: '#0a0a0a',
          marginBottom: 20,
        }}
      >
        WebGPU Unavailable
      </h1>

      <p
        style={{
          maxWidth: 440, fontSize: 15, lineHeight: 1.7,
          color: '#3d3d3d', marginBottom: 28,
        }}
      >
        NeuraLife requires WebGPU or WebGL to simulate Neural Cellular Automata
        in real time. Your current browser or device does not support either
        rendering backend.
      </p>

      {/* Error detail (collapsible-looking pre block) */}
      {errorMessage && (
        <pre
          style={{
            maxWidth: 520, padding: '12px 18px',
            borderRadius: 12, marginBottom: 28,
            background: 'rgba(192, 57, 43, 0.06)',
            border: '1px solid rgba(192, 57, 43, 0.18)',
            color: '#8b1a10', fontSize: 12, lineHeight: 1.55,
            textAlign: 'left', whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          }}
        >
          {errorMessage}
        </pre>
      )}

      {/* Optional pre-rendered video preview */}
      {videoSrc && (
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          aria-label="Pre-rendered NCA simulation preview"
          style={{
            maxWidth: '100%', width: 460,
            borderRadius: 16,
            border: '1px solid #e2e0db',
            boxShadow: '0 8px 32px rgba(0,0,0,0.07)',
            marginBottom: 28,
          }}
        />
      )}

      {/* Upgrade hint */}
      <p style={{ fontSize: 13, color: '#9a9a9a' }}>
        Try Chrome 113+ or Edge 113+ with WebGPU enabled, on a supported GPU.
      </p>
    </div>
  );
}
