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
  populateTestPattern,
  populateFromImage,
} from '../inference';
import { HardwareUnsupported } from './HardwareUnsupported';
import { FPSCounter } from './FPSCounter';
import Plasma from './Plasma';
import { ControlPanel } from './ControlPanel';
import type { ControlState } from './ControlPanel';

const GRID_HEIGHT = 128;
const GRID_WIDTH = 128;
const MODEL_PATH = '/models/dummy_model.onnx';
const FALLBACK_VIDEO_PATH = '/assets/fallback.mp4';

type Status =
  | { kind: 'loading' }
  | { kind: 'running' }
  | { kind: 'unsupported'; message: string };

/**
 * NCAScene — The WebGL rendering and inference loop.
 * 
 * - Handles the DataTexture for raw channel extraction.
 * - Uses a custom ShaderMaterial.
 * - Runs the inference inside `useFrame` using a throttling stub.
 * - Bypasses standard React renders.
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
  onBiomassUpdate,
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
  onBiomassUpdate: (metrics: { activeCells: number; totalCells: number; biomassPercent: number }) => void;
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

  const updateTextureFromState = (tensor: Tensor) => {
    const rgba = extractRGBA(tensor, gridHeight, gridWidth);
    if (texture.image && texture.image.data) {
      (texture.image.data as Uint8Array).set(rgba);
      texture.needsUpdate = true;
    }
  };

  const applyBrushToState = (uv: { x: number; y: number }) => {
    if (!stateRef.current) return;
    if (brushMode === 'growth') {
      applySeed(stateRef.current, uv.x, uv.y, BRUSH_RADIUS_CELLS);
    } else {
      applyDamage(stateRef.current, uv.x, uv.y, BRUSH_RADIUS_CELLS);
    }
    updateTextureFromState(stateRef.current);
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

  const skipFramesRef = useRef(0);
  const lastTimeRef = useRef(0);
  const frameTimesRef = useRef<number[]>([]);

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

        if (avgFps < 55 && skipFramesRef.current < 5) {
          skipFramesRef.current += 1;
          frameTimesRef.current = [];
        } else if (avgFps > 58 && skipFramesRef.current > 0) {
          skipFramesRef.current -= 1;
          frameTimesRef.current = [];
        }
      }
    }
    lastTimeRef.current = now;

    if (isInferringRef.current) return;
    if (paused) return;

    frameCountRef.current += 1;
    const runEvery = Math.max(1, Math.round((skipFramesRef.current + 1) / stepMultiplier));
    if (frameCountRef.current % runEvery !== 0) {
      return;
    }

    isInferringRef.current = true;

    session
      .run({ input: stateRef.current })
      .then((results) => {
        const output = results['output'];
        if (!output) {
          isInferringRef.current = false;
          return;
        }

        const rgba = extractRGBA(output, gridHeight, gridWidth);
        
        if (texture.image && texture.image.data) {
          (texture.image.data as Uint8Array).set(rgba);
          texture.needsUpdate = true;
        }

        if (isPointerDownRef.current && activeUvRef.current) {
          if (brushMode === 'growth') {
            applySeed(output, activeUvRef.current.x, activeUvRef.current.y, BRUSH_RADIUS_CELLS);
          } else {
            applyDamage(output, activeUvRef.current.x, activeUvRef.current.y, BRUSH_RADIUS_CELLS);
          }
        }

        stateRef.current = output;
        
        // Report biomass metrics periodically
        if (frameCountRef.current % 10 === 0) {
          const metrics = calculateBiomass(output);
          onBiomassUpdate(metrics);
        }

        isInferringRef.current = false;
      })
      .catch((err) => {
        console.error('[NeuraLife] Inference step error:', err);
        isInferringRef.current = false;
      });
  });

  const brushWorldPos = useMemo(() => {
    if (!brushState.uv) return null;
    return [
      (brushState.uv.x - 0.5) * 4,
      (brushState.uv.y - 0.5) * 4,
      0.02,
    ] as [number, number, number];
  }, [brushState.uv]);

  const worldBrushRadius = (BRUSH_RADIUS_CELLS / gridWidth) * 4;
  useEffect(() => {
    stateRef.current = initialState;
    const metrics = calculateBiomass(initialState);
    onBiomassUpdate(metrics);
  }, [initialState, onBiomassUpdate]);

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

      {/* 3D Visual Damage / Seed Growth Brush Ring */}
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
};

export function NCACanvas() {
  const sessionRef = useRef<InferenceSession | null>(null);
  const [initialState, setInitialState] = useState<Tensor | null>(null);

  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [controls, setControls] = useState<ControlState>(DEFAULT_CONTROLS);
  const [biomass, setBiomass] = useState<{ activeCells: number; totalCells: number; biomassPercent: number }>({
    activeCells: 0,
    totalCells: GRID_WIDTH * GRID_HEIGHT,
    biomassPercent: 0,
  });

  const handleReset = useCallback(() => {
    const fresh = createInitialState(GRID_HEIGHT, GRID_WIDTH);
    populateTestPattern(fresh, controls.pattern);
    setInitialState(fresh);
  }, [controls.pattern]);

  // Whenever pattern preset selection changes, re-populate the state
  useEffect(() => {
    if (status.kind === 'running') {
      handleReset();
    }
  }, [controls.pattern, status.kind, handleReset]);

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;
      const img = new Image();
      img.onload = () => {
        const fresh = createInitialState(GRID_HEIGHT, GRID_WIDTH);
        populateFromImage(fresh, img);
        setInitialState(fresh);
      };
      img.src = e.target.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      await logGPUAdapter();
      if (cancelled) return;

      try {
        const { session } = await createInferenceSession(MODEL_PATH);
        if (cancelled) {
          session.release();
          return;
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

      const freshState = createInitialState(GRID_HEIGHT, GRID_WIDTH);
      populateTestPattern(freshState);
      setInitialState(freshState);
      setStatus({ kind: 'running' });
    }

    init();

    return () => {
      cancelled = true;
      if (sessionRef.current) {
        sessionRef.current.release();
        sessionRef.current = null;
      }
    };
  }, []);


  if (status.kind === 'unsupported') {
    return (
      <HardwareUnsupported
        videoSrc={FALLBACK_VIDEO_PATH}
        errorMessage={status.message}
      />
    );
  }

  const canvasWidth = Math.min(GRID_WIDTH * 4, 640);
  const canvasHeight = Math.min(GRID_HEIGHT * 4, 640);

  return (
    <div
      id="nca-canvas-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        background: '#0a0a0f',
        position: 'relative',
      }}
    >
      {/* Plasma background — fullscreen, behind everything */}
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
          speed={0.5}
          direction="forward"
          scale={1.2}
          opacity={0.55}
          mouseInteractive={false}
          renderScale={0.45}
          maxDpr={1.5}
          targetFps={30}
          iterations={48}
        />
      </div>

      <FPSCounter />

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
            background: 'rgba(10, 10, 15, 0.9)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: '3px solid rgba(99, 102, 241, 0.2)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'nca-spin 0.8s linear infinite',
            }}
          />
          <p
            style={{
              marginTop: 16,
              color: '#9ca3af',
              fontSize: 14,
              fontFamily:
                '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
            }}
          >
            Initialising 3D inference engine…
          </p>
          <style>{`
            @keyframes nca-spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* R3F WebGL Container */}
      <div
        style={{
          width: canvasWidth,
          height: canvasHeight,
          borderRadius: 12,
          border: '1px solid rgba(99, 102, 241, 0.15)',
          boxShadow: '0 0 60px rgba(99, 102, 241, 0.08)',
          overflow: 'hidden', // Contain Canvas corners
          visibility: status.kind === 'running' ? 'visible' : 'hidden',
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
              gridWidth={GRID_WIDTH}
              gridHeight={GRID_HEIGHT}
              brushMode={controls.brushMode}
              brushRadius={controls.brushRadius}
              heightScale={controls.heightScale}
              normalStrength={controls.normalStrength}
              paletteMode={controls.paletteMode}
              paused={controls.paused}
              stepMultiplier={controls.stepMultiplier}
              onBiomassUpdate={setBiomass}
            />
          </Canvas>
        )}
      </div>

      <p
        style={{
          marginTop: 16,
          color: '#4b5563',
          fontSize: 12,
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          letterSpacing: '0.03em',
        }}
      >
        {GRID_WIDTH}×{GRID_HEIGHT} · 3D WebGL Pipeline · TICK-03
      </p>

      {/* Floating Control Panel */}
      <ControlPanel
        controls={controls}
        biomass={biomass}
        onChange={setControls}
        onReset={handleReset}
        onImageUpload={handleImageUpload}
      />
    </div>
  );
}
