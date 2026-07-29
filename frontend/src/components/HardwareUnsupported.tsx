/**
 * HardwareUnsupported — Fallback UI rendered when both WebGPU and
 * WebGL execution providers fail to initialise.
 *
 * Displays a static message with optional pre-rendered video.
 * When `fallback.mp4` is available in `/assets/`, it auto-plays as
 * a muted looping background. Otherwise shows a minimal SVG illustration.
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
        padding: '32px 24px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
        color: '#e0e0e6',
        fontFamily:
          '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* SVG illustration — a simplified GPU chip icon */}
      <svg
        width="96"
        height="96"
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ marginBottom: 24, opacity: 0.6 }}
      >
        <rect
          x="20"
          y="20"
          width="56"
          height="56"
          rx="6"
          stroke="#6366f1"
          strokeWidth="2"
        />
        <rect
          x="30"
          y="30"
          width="36"
          height="36"
          rx="4"
          fill="#6366f1"
          fillOpacity="0.15"
          stroke="#6366f1"
          strokeWidth="1.5"
        />
        {/* Top pins */}
        <line x1="32" y1="12" x2="32" y2="20" stroke="#6366f1" strokeWidth="2" />
        <line x1="42" y1="12" x2="42" y2="20" stroke="#6366f1" strokeWidth="2" />
        <line x1="52" y1="12" x2="52" y2="20" stroke="#6366f1" strokeWidth="2" />
        <line x1="62" y1="12" x2="62" y2="20" stroke="#6366f1" strokeWidth="2" />
        {/* Bottom pins */}
        <line x1="32" y1="76" x2="32" y2="84" stroke="#6366f1" strokeWidth="2" />
        <line x1="42" y1="76" x2="42" y2="84" stroke="#6366f1" strokeWidth="2" />
        <line x1="52" y1="76" x2="52" y2="84" stroke="#6366f1" strokeWidth="2" />
        <line x1="62" y1="76" x2="62" y2="84" stroke="#6366f1" strokeWidth="2" />
        {/* Left pins */}
        <line x1="12" y1="32" x2="20" y2="32" stroke="#6366f1" strokeWidth="2" />
        <line x1="12" y1="42" x2="20" y2="42" stroke="#6366f1" strokeWidth="2" />
        <line x1="12" y1="52" x2="20" y2="52" stroke="#6366f1" strokeWidth="2" />
        <line x1="12" y1="62" x2="20" y2="62" stroke="#6366f1" strokeWidth="2" />
        {/* Right pins */}
        <line x1="76" y1="32" x2="84" y2="32" stroke="#6366f1" strokeWidth="2" />
        <line x1="76" y1="42" x2="84" y2="42" stroke="#6366f1" strokeWidth="2" />
        <line x1="76" y1="52" x2="84" y2="52" stroke="#6366f1" strokeWidth="2" />
        <line x1="76" y1="62" x2="84" y2="62" stroke="#6366f1" strokeWidth="2" />
        {/* X mark inside chip */}
        <line x1="38" y1="38" x2="58" y2="58" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="58" y1="38" x2="38" y2="58" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 12,
          background: 'linear-gradient(90deg, #6366f1, #a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1.3,
        }}
      >
        Hardware Unsupported
      </h1>

      <p
        style={{
          maxWidth: 480,
          fontSize: 15,
          lineHeight: 1.6,
          color: '#9ca3af',
          marginBottom: 24,
        }}
      >
        NeuraLife requires WebGPU or WebGL to run the Neural Cellular Automata
        simulation in real-time. Your current browser or device does not support
        either backend.
      </p>

      {errorMessage && (
        <pre
          style={{
            maxWidth: 560,
            padding: '12px 16px',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#fca5a5',
            fontSize: 12,
            lineHeight: 1.5,
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: 24,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          }}
        >
          {errorMessage}
        </pre>
      )}

      {videoSrc && (
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          aria-label="Pre-rendered NCA simulation preview"
          style={{
            maxWidth: '100%',
            width: 480,
            borderRadius: 12,
            border: '1px solid rgba(99, 102, 241, 0.2)',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.1)',
          }}
        />
      )}

      <p
        style={{
          marginTop: 24,
          fontSize: 13,
          color: '#6b7280',
        }}
      >
        Try opening this page in Chrome 113+ or Edge 113+ with WebGPU enabled.
      </p>
    </div>
  );
}
