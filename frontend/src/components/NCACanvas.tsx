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
  brushRadius,
  paused,
  stepMultiplier,
}: {
  session: InferenceSession;
  initialState: Tensor;
  gridWidth: number;
  gridHeight: number;
  brushRadius: number;
  paused: boolean;
  stepMultiplier: number;
}) {
  const stateRef = useRef<Tensor>(initialState);
  const isInferringRef = useRef(false);
  const frameCountRef = useRef(0);
  
  // Brush state
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

  const applyDamageToState = (uv: { x: number; y: number }) => {
    if (!stateRef.current) return;
    applyDamage(stateRef.current, uv.x, uv.y, BRUSH_RADIUS_CELLS);
    updateTextureFromState(stateRef.current);
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    isPointerDownRef.current = true;
    if (e.uv) {
      activeUvRef.current = { x: e.uv.x, y: e.uv.y };
      setBrushState({ uv: activeUvRef.current, isDown: true });
      applyDamageToState(activeUvRef.current);
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
        applyDamageToState(activeUvRef.current);
      }
    }
  };

  const handlePointerOut = () => {
    isPointerDownRef.current = false;
    activeUvRef.current = null;
    setBrushState({ uv: null, isDown: false });
  };

  // Performance throttling refs
  const skipFramesRef = useRef(0);
  const lastTimeRef = useRef(0);
  const frameTimesRef = useRef<number[]>([]);

  // Initialize DataTexture
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
    tex.magFilter = THREE.NearestFilter; // Preserve pixelated look
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, [gridWidth, gridHeight, initialState]);

  // Custom ShaderMaterial for 3D NCA state
  const shaderArgs = useMemo(() => {
    return {
      uniforms: {
        uTexture: { value: texture },
        uTexelSize: { value: new THREE.Vector2(1.0 / gridWidth, 1.0 / gridHeight) },
      },
      vertexShader: `
        varying vec2 vUv;
        uniform sampler2D uTexture;
        void main() {
          vUv = uv;
          float height = texture2D(uTexture, uv).a;
          vec3 displacedPos = position + normal * (height * 0.4);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec2 uTexelSize;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(uTexture, vUv);
          vec3 rgb = texel.rgb;
          float alpha = texel.a;
          
          float hL = texture2D(uTexture, vUv - vec2(uTexelSize.x, 0.0)).a;
          float hR = texture2D(uTexture, vUv + vec2(uTexelSize.x, 0.0)).a;
          float hD = texture2D(uTexture, vUv - vec2(0.0, uTexelSize.y)).a;
          float hU = texture2D(uTexture, vUv + vec2(0.0, uTexelSize.y)).a;
          
          vec3 normal = normalize(vec3(hL - hR, hD - hU, 0.5));
          
          vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
          float diff = max(dot(normal, lightDir), 0.0);
          vec3 ambient = vec3(0.25);
          
          vec3 finalColor = rgb * (diff * 0.85 + ambient);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    };
  }, [texture, gridWidth, gridHeight]);

  useFrame(({ clock }) => {
    // Dynamic Performance Throttling logic
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
          frameTimesRef.current = []; // allow time to stabilize
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
    // stepMultiplier reduces effective update interval
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

        // Extract RGBA channels
        const rgba = extractRGBA(output, gridHeight, gridWidth);
        
        // Update DataTexture directly to bypass React render cycle
        if (texture.image && texture.image.data) {
          (texture.image.data as Uint8Array).set(rgba);
          texture.needsUpdate = true;
        }

        // If pointer is down during inference, re-apply damage to output before passing forward
        if (isPointerDownRef.current && activeUvRef.current) {
          applyDamage(output, activeUvRef.current.x, activeUvRef.current.y, BRUSH_RADIUS_CELLS);
        }

        // Feed output back as input
        stateRef.current = output;
        isInferringRef.current = false;
      })
      .catch((err) => {
        console.error('[NeuraLife] Inference step error:', err);
        // Do not crash, allow retry or freeze
        isInferringRef.current = false;
      });
  });

  // World coordinates for the visual brush ring
  const brushWorldPos = useMemo(() => {
    if (!brushState.uv) return null;
    return [
      (brushState.uv.x - 0.5) * 4,
      (brushState.uv.y - 0.5) * 4,
      0.02,
    ] as [number, number, number];
  }, [brushState.uv]);

  const worldBrushRadius = (BRUSH_RADIUS_CELLS / gridWidth) * 4;
  // Sync stateRef whenever initialState prop changes (reset)
  useEffect(() => { stateRef.current = initialState; }, [initialState]);

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

      {/* 3D Visual Damage Brush Overlay */}
      {brushWorldPos && (
        <mesh position={brushWorldPos}>
          <ringGeometry args={[Math.max(0.01, worldBrushRadius - 0.015), worldBrushRadius, 32]} />
          <meshBasicMaterial
            color={brushState.isDown ? '#ef4444' : '#818cf8'}
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
  brushRadius: 6,
  paused: false,
  autoRotate: true,
  stepMultiplier: 1,
};

export function NCACanvas() {
  const sessionRef = useRef<InferenceSession | null>(null);
  const [initialState, setInitialState] = useState<Tensor | null>(null);

  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [controls, setControls] = useState<ControlState>(DEFAULT_CONTROLS);

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
              brushRadius={controls.brushRadius}
              paused={controls.paused}
              stepMultiplier={controls.stepMultiplier}
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
        onChange={setControls}
        onReset={handleReset}
        onImageUpload={handleImageUpload}
      />
    </div>
  );
}
