import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import type { InferenceSession, Tensor } from 'onnxruntime-web';
import { Canvas, useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import {
  logGPUAdapter,
  createInferenceSession,
  HardwareUnsupportedError,
  createInitialState,
  extractRGBA,
  applyDamage,
  applySeed,
  calculateBiomass,
  populateTestPattern,
  populateFromImage,
  applyDamagePreset,
  extractChannelAsImageData,
} from '../inference';
import type { DamagePresetType } from '../inference';
import { HardwareUnsupported } from './HardwareUnsupported';
import { FPSCounter } from './FPSCounter';
import Plasma from './Plasma';
import { ControlPanel } from './ControlPanel';
import type { ControlState } from './ControlPanel';
import { HiddenChannelInspector } from './HiddenChannelInspector';

const FALLBACK_VIDEO_PATH = '/assets/fallback.mp4';

type Status =
  | { kind: 'loading' }
  | { kind: 'running' }
  | { kind: 'unsupported'; message: string };

/**
 * NCAScene — The WebGL rendering and inference loop.
 */
function NCAScene({
  session,
  initialState,
  gridWidth,
  gridHeight,
  brushMode,
  brushRadius,
  heightScale,
  normalStrength,
  paletteMode,
  paused,
  stepMultiplier,
  damagePresetTrigger,
  active3DChannel,
  onBiomassUpdate,
  liveTensorRef,
}: {
  session: InferenceSession;
  initialState: Tensor;
  gridWidth: number;
  gridHeight: number;
  brushMode: 'damage' | 'growth';
  brushRadius: number;
  heightScale: number;
  normalStrength: number;
  paletteMode: 'neon' | 'emerald' | 'solar' | 'hologram';
  paused: boolean;
  stepMultiplier: number;
  damagePresetTrigger: { id: DamagePresetType; timestamp: number } | null;
  active3DChannel: number;
  onBiomassUpdate: (metrics: { activeCells: number; totalCells: number; biomassPercent: number }) => void;
  liveTensorRef: React.MutableRefObject<Tensor | null>;
}) {
  const stateRef = useRef<Tensor>(initialState);
  const isInferringRef = useRef(false);
  const frameCountRef = useRef(0);
  
  const [brushState, setBrushState] = useState<{
    uv: { x: number; y: number } | null;
    isDown: boolean;
  }>({ uv: null, isDown: false });

  const isPointerDownRef = useRef(false);
  const activeUvRef = useRef<{ x: number; y: number } | null>(null);

  const BRUSH_RADIUS_CELLS = brushRadius;

  const skipFramesRef = useRef(0);
  const lastTimeRef = useRef(0);
  const frameTimesRef = useRef<number[]>([]);

  // Synchronize live tensor reference
  useEffect(() => {
    stateRef.current = initialState;
    liveTensorRef.current = initialState;
  }, [initialState, liveTensorRef]);

  const texture = useMemo(() => {
    const size = gridWidth * gridHeight * 4;
    const data = new Uint8Array(size);
    const rgba = extractRGBA(initialState, gridHeight, gridWidth);
    data.set(rgba);

    const tex = new THREE.DataTexture(
      data,
      gridWidth,
      gridHeight,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, [gridWidth, gridHeight, initialState]);

  const paletteModeInt = useMemo(() => {
    switch (paletteMode) {
      case 'emerald': return 1;
      case 'solar': return 2;
      case 'hologram': return 3;
      default: return 0; // neon
    }
  }, [paletteMode]);

  // Apply catastrophic preset damage when triggered
  useEffect(() => {
    if (!damagePresetTrigger || !stateRef.current) return;
    applyDamagePreset(stateRef.current, damagePresetTrigger.id);
    const rgba = extractRGBA(stateRef.current, gridHeight, gridWidth);
    if (texture.image && texture.image.data) {
      (texture.image.data as Uint8Array).set(rgba);
      texture.needsUpdate = true;
    }
    const metrics = calculateBiomass(stateRef.current);
    onBiomassUpdate(metrics);
  }, [damagePresetTrigger, gridHeight, gridWidth, texture, onBiomassUpdate]);

  const applyBrushToState = (uv: { x: number; y: number }) => {
    if (!stateRef.current) return;
    if (brushMode === 'growth') {
      applySeed(stateRef.current, uv.x, uv.y, BRUSH_RADIUS_CELLS);
    } else {
      applyDamage(stateRef.current, uv.x, uv.y, BRUSH_RADIUS_CELLS);
    }
    // Immediately push brush change to GPU texture
    if (active3DChannel >= 0) {
      const snap = extractChannelAsImageData(stateRef.current, active3DChannel, gridHeight, gridWidth, 'viridis');
      if (texture.image && texture.image.data) {
        (texture.image.data as Uint8Array).set(snap.pixels);
        texture.needsUpdate = true;
      }
    } else {
      const rgba = extractRGBA(stateRef.current, gridHeight, gridWidth);
      if (texture.image && texture.image.data) {
        (texture.image.data as Uint8Array).set(rgba);
        texture.needsUpdate = true;
      }
    }
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    isPointerDownRef.current = true;
    if (e.uv) {
      activeUvRef.current = { x: e.uv.x, y: e.uv.y };
      setBrushState({ uv: activeUvRef.current, isDown: true });
      applyBrushToState(activeUvRef.current);
    }
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
    activeUvRef.current = null;
    setBrushState((prev) => ({ ...prev, isDown: false }));
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.uv) {
      activeUvRef.current = { x: e.uv.x, y: e.uv.y };
      setBrushState({ uv: activeUvRef.current, isDown: isPointerDownRef.current });
      if (isPointerDownRef.current) {
        applyBrushToState(activeUvRef.current);
      }
    }
  };

  const handlePointerOut = () => {
    isPointerDownRef.current = false;
    activeUvRef.current = null;
    setBrushState({ uv: null, isDown: false });
  };

  const inferenceIdRef = useRef(0);

  const shaderArgs = useMemo(() => {
    return {
      uniforms: {
        uTexture: { value: texture },
        uTexelSize: { value: new THREE.Vector2(1.0 / gridWidth, 1.0 / gridHeight) },
        uHeightScale: { value: heightScale },
        uNormalStrength: { value: normalStrength },
        uPaletteMode: { value: paletteModeInt },
      },
      vertexShader: `
        uniform sampler2D uTexture;
        uniform float uHeightScale;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          float height = texture2D(uTexture, uv).a;
          vec3 displacedPos = position + normal * (height * uHeightScale);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec2 uTexelSize;
        uniform float uNormalStrength;
        uniform int uPaletteMode;
        varying vec2 vUv;

        vec3 applyPalette(vec3 rgb, float alpha) {
          if (uPaletteMode == 1) {
            // Emerald Bioluminescence
            return vec3(rgb.r * 0.1, rgb.g * 0.95 + 0.1, rgb.b * 0.6 + 0.3 * alpha);
          } else if (uPaletteMode == 2) {
            // Solar Fire
            return vec3(rgb.r * 1.0 + 0.2 * alpha, rgb.g * 0.65, rgb.b * 0.1);
          } else if (uPaletteMode == 3) {
            // Ice Hologram
            return vec3(rgb.r * 0.2, rgb.g * 0.7 + 0.2, rgb.b * 1.0);
          }
          // Default Cyber Neon
          return rgb;
        }

        void main() {
          vec4 texel = texture2D(uTexture, vUv);
          vec3 rgb = texel.rgb;
          float alpha = texel.a;
          
          float hL = texture2D(uTexture, vUv - vec2(uTexelSize.x, 0.0)).a;
          float hR = texture2D(uTexture, vUv + vec2(uTexelSize.x, 0.0)).a;
          float hD = texture2D(uTexture, vUv - vec2(0.0, uTexelSize.y)).a;
          float hU = texture2D(uTexture, vUv + vec2(0.0, uTexelSize.y)).a;
          
          vec3 normal = normalize(vec3((hL - hR) * uNormalStrength, (hD - hU) * uNormalStrength, 0.5));
          
          vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
          float diff = max(dot(normal, lightDir), 0.0);
          vec3 ambient = vec3(0.25);
          
          vec3 themeColor = applyPalette(rgb, alpha);
          vec3 finalColor = themeColor * (diff * 0.85 + ambient);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    };
  }, [texture, gridWidth, gridHeight, heightScale, normalStrength, paletteModeInt]);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    if (lastTimeRef.current > 0) {
      const delta = now - lastTimeRef.current;
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 30) {
        const sum = frameTimesRef.current.reduce((a, b) => a + b, 0);
        const avgFps = 1 / (sum / 30);
        frameTimesRef.current.shift();

        if (avgFps < 55) {
          skipFramesRef.current = Math.min(skipFramesRef.current + 1, 3);
        } else if (avgFps > 58 && skipFramesRef.current > 0) {
          skipFramesRef.current--;
        }
      }
    }
    lastTimeRef.current = now;

    if (paused) return;

    frameCountRef.current++;
    if (skipFramesRef.current > 0 && frameCountRef.current % (skipFramesRef.current + 1) !== 0) {
      return;
    }

    if (isInferringRef.current || !stateRef.current) return;
    isInferringRef.current = true;

    const currentInferenceId = ++inferenceIdRef.current;

    (async () => {
      try {
        let currentState = stateRef.current;
        for (let i = 0; i < stepMultiplier; i++) {
          const feeds = { input: currentState };
          const results = await session.run(feeds);
          currentState = results.output;
        }

        if (currentInferenceId !== inferenceIdRef.current) {
          return;
        }

        stateRef.current = currentState;
        liveTensorRef.current = currentState;

        // Push to GPU Texture
        if (active3DChannel >= 0) {
          const snap = extractChannelAsImageData(currentState, active3DChannel, gridHeight, gridWidth, 'viridis');
          if (texture.image && texture.image.data) {
            (texture.image.data as Uint8Array).set(snap.pixels);
            texture.needsUpdate = true;
          }
        } else {
          const rgba = extractRGBA(currentState, gridHeight, gridWidth);
          if (texture.image && texture.image.data) {
            (texture.image.data as Uint8Array).set(rgba);
            texture.needsUpdate = true;
          }
        }

        // Live biomass calculation
        if (frameCountRef.current % 10 === 0) {
          const metrics = calculateBiomass(currentState);
          onBiomassUpdate(metrics);
        }
      } catch (err) {
        console.error('[NeuraLife] Inference step error:', err);
      } finally {
        if (currentInferenceId === inferenceIdRef.current) {
          isInferringRef.current = false;
        }
      }
    })();
  });

  const worldBrushRadius = (BRUSH_RADIUS_CELLS / gridWidth) * 4;

  const brushWorldPos = useMemo(() => {
    if (!brushState.uv) return null;
    return new THREE.Vector3(
      (brushState.uv.x - 0.5) * 4,
      (brushState.uv.y - 0.5) * 4,
      0.02
    );
  }, [brushState.uv]);

  return (
    <group>
      <mesh
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onPointerLeave={handlePointerOut}
        onPointerCancel={handlePointerOut}
      >
        <planeGeometry args={[4, 4, gridWidth, gridHeight]} />
        <shaderMaterial args={[shaderArgs]} />
      </mesh>

      {/* 3D Visual Brush Ring */}
      {brushWorldPos && (
        <mesh position={brushWorldPos}>
          <ringGeometry args={[Math.max(0.01, worldBrushRadius - 0.015), worldBrushRadius, 32]} />
          <meshBasicMaterial
            color={
              brushMode === 'growth'
                ? brushState.isDown ? '#10b981' : '#34d399'
                : brushState.isDown ? '#ef4444' : '#818cf8'
            }
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * NCACanvas — Main component orchestrating R3F and ONNX WebGPU.
 */
const DEFAULT_CONTROLS: ControlState = {
  pattern: 'morpho-ring',
  brushMode: 'damage',
  brushRadius: 6,
  heightScale: 0.4,
  normalStrength: 0.8,
  paletteMode: 'neon',
  paused: false,
  autoRotate: true,
  stepMultiplier: 1,
  modelPath: '/models/nca_model.onnx',
  gridResolution: 128,
};

export function NCACanvas() {
  const sessionRef = useRef<InferenceSession | null>(null);
  const liveTensorRef = useRef<Tensor | null>(null);
  const [initialState, setInitialState] = useState<Tensor | null>(null);

  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [controls, setControls] = useState<ControlState>(DEFAULT_CONTROLS);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [active3DChannel, setActive3DChannel] = useState<number>(-1);

  const gridWidth = controls.gridResolution;
  const gridHeight = controls.gridResolution;

  const [biomass, setBiomass] = useState<{ activeCells: number; totalCells: number; biomassPercent: number }>({
    activeCells: 0,
    totalCells: controls.gridResolution * controls.gridResolution,
    biomassPercent: 0,
  });

  const [damagePresetTrigger, setDamagePresetTrigger] = useState<{
    id: DamagePresetType;
    timestamp: number;
  } | null>(null);

  const handleApplyDamagePreset = useCallback((preset: DamagePresetType) => {
    setDamagePresetTrigger({ id: preset, timestamp: Date.now() });
  }, []);

  const handleReset = useCallback(() => {
    const fresh = createInitialState(controls.gridResolution, controls.gridResolution);
    populateTestPattern(fresh, controls.pattern);
    liveTensorRef.current = fresh;
    setInitialState(fresh);
  }, [controls.pattern, controls.gridResolution]);

  // Whenever pattern preset or resolution changes, re-populate the state
  useEffect(() => {
    if (status.kind === 'running') {
      handleReset();
    }
  }, [controls.pattern, controls.gridResolution, status.kind, handleReset]);

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;
      const img = new Image();
      img.onload = () => {
        const fresh = createInitialState(controls.gridResolution, controls.gridResolution);
        populateFromImage(fresh, img);
        liveTensorRef.current = fresh;
        setInitialState(fresh);
      };
      img.src = e.target.result as string;
    };
    reader.readAsDataURL(file);
  }, [controls.gridResolution]);

  const handleCaptureSnapshot = useCallback(() => {
    const canvas = document.querySelector('#nca-canvas-container canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `neuralife_morphogenesis_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  // Load / Switch ONNX inference session
  useEffect(() => {
    let cancelled = false;

    async function init() {
      await logGPUAdapter();
      if (cancelled) return;

      try {
        const { session } = await createInferenceSession(controls.modelPath);
        if (cancelled) {
          session.release();
          return;
        }
        if (sessionRef.current) {
          sessionRef.current.release();
        }
        sessionRef.current = session;
      } catch (err) {
        if (cancelled) return;
        if (err instanceof HardwareUnsupportedError) {
          setStatus({ kind: 'unsupported', message: err.message });
        } else {
          setStatus({ kind: 'unsupported', message: String(err) });
        }
        return;
      }

      const freshState = createInitialState(controls.gridResolution, controls.gridResolution);
      populateTestPattern(freshState, controls.pattern);
      liveTensorRef.current = freshState;
      setInitialState(freshState);
      setStatus({ kind: 'running' });
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [controls.modelPath, controls.gridResolution, controls.pattern]);

  if (status.kind === 'unsupported') {
    return (
      <HardwareUnsupported
        videoSrc={FALLBACK_VIDEO_PATH}
        errorMessage={status.message}
      />
    );
  }

  const canvasWidth = Math.min(gridWidth * 4.4, 660);
  const canvasHeight = Math.min(gridHeight * 4.4, 660);

  return (
    <div
      id="nca-canvas-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        background: '#07070c',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Plasma background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <Plasma
          color="#6366f1"
          speed={0.4}
          direction="forward"
          scale={1.2}
          opacity={0.5}
          mouseInteractive={false}
          renderScale={0.45}
          maxDpr={1.5}
          targetFps={30}
          iterations={48}
        />
      </div>

      {/* Sleek Top Cyber Navigation Bar */}
      <header
        id="neuralife-header"
        style={{
          position: 'fixed',
          top: 16,
          left: 24,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: 'rgba(12, 12, 22, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '10px 18px',
          borderRadius: 14,
          border: '1px solid rgba(99, 102, 241, 0.25)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20, filter: 'drop-shadow(0 0 8px #6366f1)' }}>🧬</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', color: '#f8fafc' }}>
              NeuraLife
            </div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>
              3D Morphogenesis Engine
            </div>
          </div>
        </div>

        {/* Live System Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            ● WebGPU
          </span>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              color: '#c7d2fe',
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {gridWidth}×{gridHeight} Lattice
          </span>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(168, 85, 247, 0.12)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              color: '#d8b4fe',
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {controls.modelPath === '/models/nca_model.onnx' ? '✦ Trained NCA (24KB)' : '⚙ Baseline (52KB)'}
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
          <button
            id="open-inspector-btn"
            onClick={() => setIsInspectorOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid rgba(99, 102, 241, 0.4)',
              background: 'rgba(99, 102, 241, 0.2)',
              color: '#e0e7ff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.35)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)')}
          >
            <span>🔬</span>
            <span>16-Channel Inspector</span>
          </button>

          <button
            id="snapshot-btn"
            onClick={handleCaptureSnapshot}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#cbd5e1',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            title="Download high-res PNG snapshot of 3D surface"
          >
            <span>📸</span>
            <span>Snapshot</span>
          </button>
        </div>
      </header>

      <FPSCounter />

      {/* 3D Single Channel Projection Active Indicator */}
      {active3DChannel >= 0 && (
        <div
          id="projection-pill"
          style={{
            position: 'fixed',
            top: 80,
            left: 24,
            zIndex: 99,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 10,
            background: 'rgba(99, 102, 241, 0.25)',
            border: '1px solid #818cf8',
            color: '#ffffff',
            fontSize: 11,
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
          }}
        >
          <span>🪐 3D Projection: Channel {active3DChannel} (Viridis Colormap)</span>
          <button
            onClick={() => setActive3DChannel(-1)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#c7d2fe',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 800,
            }}
            title="Reset to RGBA view"
          >
            ✕ Reset
          </button>
        </div>
      )}

      {status.kind === 'loading' && (
        <div
          id="nca-loading"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            background: 'rgba(7, 7, 12, 0.92)',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: '3px solid rgba(99, 102, 241, 0.2)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'nca-spin 0.8s linear infinite',
            }}
          />
          <p
            style={{
              marginTop: 16,
              color: '#94a3b8',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Initialising 3D WebGPU inference lattice…
          </p>
        </div>
      )}

      {/* R3F WebGL Container with Cyber Glow Frame */}
      <div
        style={{
          width: canvasWidth,
          height: canvasHeight,
          borderRadius: 18,
          border: '1px solid rgba(99, 102, 241, 0.25)',
          boxShadow: '0 0 80px rgba(99, 102, 241, 0.15), inset 0 0 40px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          visibility: status.kind === 'running' ? 'visible' : 'hidden',
          background: 'radial-gradient(circle at center, #111122 0%, #080811 100%)',
        }}
      >
        {status.kind === 'running' && sessionRef.current && initialState && (
          <Canvas camera={{ position: [0, -3.5, 3], fov: 50 }}>
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              autoRotate={controls.autoRotate}
              autoRotateSpeed={0.5}
            />
            <ambientLight intensity={1.0} />
            <NCAScene
              session={sessionRef.current}
              initialState={initialState}
              gridWidth={gridWidth}
              gridHeight={gridHeight}
              brushMode={controls.brushMode}
              brushRadius={controls.brushRadius}
              heightScale={controls.heightScale}
              normalStrength={controls.normalStrength}
              paletteMode={controls.paletteMode}
              paused={controls.paused}
              stepMultiplier={controls.stepMultiplier}
              damagePresetTrigger={damagePresetTrigger}
              active3DChannel={active3DChannel}
              onBiomassUpdate={setBiomass}
              liveTensorRef={liveTensorRef}
            />
          </Canvas>
        )}
      </div>

      {/* Bottom Interaction Guide Tooltip Bar */}
      <div
        id="interaction-guide-bar"
        style={{
          marginTop: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          color: '#64748b',
          fontSize: 11,
          fontFamily: 'var(--nl-font-mono)',
          letterSpacing: '0.04em',
          background: 'rgba(15, 15, 26, 0.6)',
          padding: '6px 16px',
          borderRadius: 99,
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <span>🖱️ Left Drag: Perturb & Damage / Seed</span>
        <span>·</span>
        <span>🔄 Right Drag: 3D Orbit</span>
        <span>·</span>
        <span>🔍 Scroll: Depth Zoom</span>
      </div>

      {/* Floating Control Panel */}
      <ControlPanel
        controls={controls}
        biomass={biomass}
        onChange={setControls}
        onReset={handleReset}
        onImageUpload={handleImageUpload}
        onApplyDamagePreset={handleApplyDamagePreset}
      />

      {/* 16-Channel Latent Memory Inspector Modal */}
      <HiddenChannelInspector
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        stateTensor={liveTensorRef.current}
        gridWidth={gridWidth}
        gridHeight={gridHeight}
        active3DChannel={active3DChannel}
        onSelect3DChannel={(ch) => {
          setActive3DChannel(ch);
          if (ch >= 0) setIsInspectorOpen(false);
        }}
      />
    </div>
  );
}
