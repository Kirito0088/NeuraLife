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
  stepMorphogenesisEvolution,
  stabilizeTensorState,
} from '../inference';
import type { DamagePresetType } from '../inference';
import { HardwareUnsupported } from './HardwareUnsupported';
import Plasma from './Plasma';
import { ControlPanel } from './ControlPanel';
import type { ControlState, VisualMode, PaletteMode } from './ControlPanel';
import { HiddenChannelInspector } from './HiddenChannelInspector';

const FALLBACK_VIDEO_PATH = '/assets/fallback.mp4';

type Status =
  | { kind: 'loading' }
  | { kind: 'running' }
  | { kind: 'unsupported'; message: string };

/**
 * Holographic Containment Grid & Base Pedestal Ring
 */
function HolographicContainmentPedestal({ radius = 2.6 }: { radius?: number }) {
  const ringRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <group position={[0, 0, -0.08]}>
      {/* Subtle Coordinate Grid Floor */}
      <gridHelper args={[6.5, 26, '#312e81', '#1e1b4b']} rotation={[Math.PI / 2, 0, 0]} />

      {/* Rotating Cybernetic Outer Ring */}
      <group ref={ringRef}>
        <mesh>
          <ringGeometry args={[radius - 0.02, radius, 64]} />
          <meshBasicMaterial color="#6366f1" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <ringGeometry args={[radius * 0.7 - 0.015, radius * 0.7, 48]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * NCAScene — 3D Shader Rendering & Morphogenesis Simulation Loop
 */
function NCAScene({
  session,
  initialState,
  targetState,
  gridWidth,
  gridHeight,
  brushMode,
  brushRadius,
  heightScale,
  normalStrength,
  paletteMode,
  visualMode,
  simulationEngine,
  paused,
  stepMultiplier,
  damagePresetTrigger,
  active3DChannel,
  onBiomassUpdate,
  liveTensorRef,
}: {
  session: InferenceSession;
  initialState: Tensor;
  targetState: Tensor;
  gridWidth: number;
  gridHeight: number;
  brushMode: 'damage' | 'growth';
  brushRadius: number;
  heightScale: number;
  normalStrength: number;
  paletteMode: PaletteMode;
  visualMode: VisualMode;
  simulationEngine: 'morphogenesis' | 'neural-onnx';
  paused: boolean;
  stepMultiplier: number;
  damagePresetTrigger: { id: DamagePresetType; timestamp: number } | null;
  active3DChannel: number;
  onBiomassUpdate: (metrics: { activeCells: number; totalCells: number; biomassPercent: number }) => void;
  liveTensorRef: React.MutableRefObject<Tensor | null>;
}) {
  const stateRef = useRef<Tensor>(initialState);
  const targetRef = useRef<Tensor>(targetState);
  const isInferringRef = useRef(false);
  const frameCountRef = useRef(0);

  const [brushState, setBrushState] = useState<{
    uv: { x: number; y: number } | null;
    isDown: boolean;
  }>({ uv: null, isDown: false });

  const isPointerDownRef = useRef(false);
  const activeUvRef = useRef<{ x: number; y: number } | null>(null);

  // Sync state & target
  useEffect(() => {
    stateRef.current = initialState;
    liveTensorRef.current = initialState;
  }, [initialState, liveTensorRef]);

  useEffect(() => {
    targetRef.current = targetState;
  }, [targetState]);

  // Create smooth bilinear DataTexture
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
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  }, [gridWidth, gridHeight, initialState]);

  const paletteModeInt = useMemo(() => {
    switch (paletteMode) {
      case 'emerald': return 1;
      case 'solar': return 2;
      case 'hologram': return 3;
      case 'synthwave': return 4;
      default: return 0; // neon
    }
  }, [paletteMode]);

  const visualModeInt = useMemo(() => {
    switch (visualMode) {
      case 'hologram': return 1;
      case 'topographic': return 2;
      case 'slice-2d': return 3;
      default: return 0; // bio-membrane
    }
  }, [visualMode]);

  // Handle Catastrophic Preset Damage
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
      applySeed(stateRef.current, uv.x, uv.y, brushRadius);
    } else {
      applyDamage(stateRef.current, uv.x, uv.y, brushRadius);
    }

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

  // Custom 3D Morphogenesis Shader Material
  const shaderArgs = useMemo(() => {
    return {
      uniforms: {
        uTexture: { value: texture },
        uTexelSize: { value: new THREE.Vector2(1.0 / gridWidth, 1.0 / gridHeight) },
        uHeightScale: { value: heightScale },
        uNormalStrength: { value: normalStrength },
        uPaletteMode: { value: paletteModeInt },
        uVisualMode: { value: visualModeInt },
        uTime: { value: 0 },
      },
      vertexShader: `
        uniform sampler2D uTexture;
        uniform vec2 uTexelSize;
        uniform float uHeightScale;
        uniform int uVisualMode;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vAlpha;

        float getSmoothHeight(vec2 uv) {
          float c = texture2D(uTexture, uv).a;
          float l = texture2D(uTexture, uv - vec2(uTexelSize.x, 0.0)).a;
          float r = texture2D(uTexture, uv + vec2(uTexelSize.x, 0.0)).a;
          float d = texture2D(uTexture, uv - vec2(0.0, uTexelSize.y)).a;
          float u = texture2D(uTexture, uv + vec2(0.0, uTexelSize.y)).a;
          return (c * 4.0 + l + r + d + u) / 8.0;
        }

        void main() {
          vUv = uv;
          float smoothH = getSmoothHeight(uv);
          vAlpha = smoothH;

          // Smooth edge falloff
          float edgeFade = smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x) *
                           smoothstep(0.0, 0.05, uv.y) * smoothstep(1.0, 0.95, uv.y);

          float disp = (uVisualMode == 3) ? 0.0 : (smoothH * uHeightScale * edgeFade);
          vec3 displacedPos = position + vec3(0.0, 0.0, disp);
          vWorldPos = (modelMatrix * vec4(displacedPos, 1.0)).xyz;

          // Finite difference normal estimation in vertex shader
          float hL = getSmoothHeight(uv - vec2(uTexelSize.x, 0.0));
          float hR = getSmoothHeight(uv + vec2(uTexelSize.x, 0.0));
          float hD = getSmoothHeight(uv - vec2(0.0, uTexelSize.y));
          float hU = getSmoothHeight(uv + vec2(0.0, uTexelSize.y));

          vec3 n = normalize(vec3((hL - hR) * 2.5, (hD - hU) * 2.5, 1.0));
          vNormal = normalize(normalMatrix * n);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec2 uTexelSize;
        uniform float uNormalStrength;
        uniform int uPaletteMode;
        uniform int uVisualMode;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vAlpha;

        vec3 applyPalette(vec3 rgb, float alpha) {
          if (uPaletteMode == 1) {
            // Bio Emerald
            return vec3(rgb.r * 0.1, rgb.g * 0.95 + 0.15, rgb.b * 0.6 + 0.4 * alpha);
          } else if (uPaletteMode == 2) {
            // Solar Flare
            return vec3(rgb.r * 1.0 + 0.25 * alpha, rgb.g * 0.65 + 0.1 * alpha, rgb.b * 0.1);
          } else if (uPaletteMode == 3) {
            // Ice Hologram
            return vec3(rgb.r * 0.2 + 0.1 * alpha, rgb.g * 0.75 + 0.2 * alpha, rgb.b * 1.0);
          } else if (uPaletteMode == 4) {
            // Synthwave
            return vec3(rgb.r * 0.95 + 0.2 * alpha, rgb.g * 0.2 + 0.1 * alpha, rgb.b * 0.85);
          }
          // Default Cyber Neon
          return rgb;
        }

        void main() {
          vec4 texel = texture2D(uTexture, vUv);
          vec3 rgb = texel.rgb;
          float alpha = texel.a;

          if (alpha < 0.02) discard;

          // Finite difference normal in fragment
          float hL = texture2D(uTexture, vUv - vec2(uTexelSize.x, 0.0)).a;
          float hR = texture2D(uTexture, vUv + vec2(uTexelSize.x, 0.0)).a;
          float hD = texture2D(uTexture, vUv - vec2(0.0, uTexelSize.y)).a;
          float hU = texture2D(uTexture, vUv + vec2(0.0, uTexelSize.y)).a;

          vec3 normal = normalize(vec3((hL - hR) * uNormalStrength * 4.0, (hD - hU) * uNormalStrength * 4.0, 1.0));
          vec3 baseColor = applyPalette(rgb, alpha);

          // Dual Directional Studio Lighting
          vec3 lightDir1 = normalize(vec3(0.6, 0.8, 1.2));
          vec3 lightDir2 = normalize(vec3(-0.6, -0.4, 0.8));
          vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));

          float diff1 = max(dot(normal, lightDir1), 0.0);
          float diff2 = max(dot(normal, lightDir2), 0.0) * 0.35;

          // Blinn-Phong Specular
          vec3 halfDir1 = normalize(lightDir1 + viewDir);
          float spec1 = pow(max(dot(normal, halfDir1), 0.0), 32.0) * 0.55;

          // Fresnel Bioluminescent Rim Glow
          float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5) * 0.5;

          vec3 ambient = vec3(0.22);
          vec3 emission = baseColor * (alpha * 0.25);

          vec3 finalColor = baseColor * (diff1 * 0.7 + diff2 + ambient) + vec3(spec1) + (baseColor * fresnel) + emission;

          // Visual Modes Processing
          if (uVisualMode == 1) {
            // Holographic Wireframe Grid
            vec2 grid = abs(fract(vUv * 32.0 - 0.5) - 0.5) / fwidth(vUv * 32.0);
            float line = min(grid.x, grid.y);
            float gridPattern = 1.0 - min(line, 1.0);
            finalColor += vec3(0.2, 0.6, 1.0) * gridPattern * 0.8;
          } else if (uVisualMode == 2) {
            // Topographic Contour Lines
            float contour = abs(fract(alpha * 12.0) - 0.5) * 2.0;
            float contourLine = smoothstep(0.85, 0.95, contour);
            finalColor = mix(finalColor, vec3(1.0, 0.9, 0.3), contourLine * 0.7);
          }

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    };
  }, [texture, gridWidth, gridHeight, heightScale, normalStrength, paletteModeInt, visualModeInt]);

  // Simulation & Rendering Step
  useFrame(({ clock }) => {
    shaderArgs.uniforms.uTime.value = clock.getElapsedTime();
    if (paused || !stateRef.current) return;

    frameCountRef.current++;
    if (frameCountRef.current % 1 !== 0) return;

    if (isInferringRef.current) return;
    isInferringRef.current = true;

    const currentInferenceId = ++inferenceIdRef.current;

    (async () => {
      try {
        let currentState = stateRef.current;

        for (let s = 0; s < stepMultiplier; s++) {
          if (simulationEngine === 'morphogenesis') {
            // Biological Morphogenesis Self-Healing Field
            stepMorphogenesisEvolution(currentState, targetRef.current, gridHeight, gridWidth, 0.08);
          } else {
            // Neural ONNX Model Step + Stabilization
            const feeds = { input: currentState };
            const results = await session.run(feeds);
            currentState = results.output;
            stabilizeTensorState(currentState, gridHeight, gridWidth);
          }
        }

        if (currentInferenceId !== inferenceIdRef.current) return;

        stateRef.current = currentState;
        liveTensorRef.current = currentState;

        // Push RGBA / Channel data to GPU Texture
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

        // Periodic biomass metrics update
        if (frameCountRef.current % 8 === 0) {
          const metrics = calculateBiomass(currentState);
          onBiomassUpdate(metrics);
        }
      } catch (err) {
        console.error('[NeuraLife] Simulation step error:', err);
      } finally {
        if (currentInferenceId === inferenceIdRef.current) {
          isInferringRef.current = false;
        }
      }
    })();
  });

  const worldBrushRadius = (brushRadius / gridWidth) * 4.2;

  const brushWorldPos = useMemo(() => {
    if (!brushState.uv) return null;
    return new THREE.Vector3(
      (brushState.uv.x - 0.5) * 4.2,
      (brushState.uv.y - 0.5) * 4.2,
      0.03
    );
  }, [brushState.uv]);

  return (
    <group>
      <HolographicContainmentPedestal radius={2.6} />

      {/* Main 3D Cellular Mesh */}
      <mesh
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onPointerLeave={handlePointerOut}
        onPointerCancel={handlePointerOut}
      >
        <planeGeometry args={[4.2, 4.2, gridWidth, gridHeight]} />
        <shaderMaterial args={[shaderArgs]} />
      </mesh>

      {/* Interactive 3D Brush Halo */}
      {brushWorldPos && (
        <mesh position={brushWorldPos}>
          <ringGeometry args={[Math.max(0.015, worldBrushRadius - 0.02), worldBrushRadius, 36]} />
          <meshBasicMaterial
            color={
              brushMode === 'growth'
                ? brushState.isDown ? '#10b981' : '#34d399'
                : brushState.isDown ? '#ef4444' : '#818cf8'
            }
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * NCACanvas — Main Application Studio Orchestrator
 */
const DEFAULT_CONTROLS: ControlState = {
  pattern: 'morpho-ring',
  brushMode: 'damage',
  brushRadius: 6,
  heightScale: 0.35,
  normalStrength: 0.85,
  paletteMode: 'neon',
  visualMode: 'bio-membrane',
  simulationEngine: 'morphogenesis',
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
  const [targetState, setTargetState] = useState<Tensor | null>(null);

  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [controls, setControls] = useState<ControlState>(DEFAULT_CONTROLS);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [active3DChannel, setActive3DChannel] = useState<number>(-1);
  const [fps, setFps] = useState<number>(60);

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
    const target = createInitialState(controls.gridResolution, controls.gridResolution);
    populateTestPattern(fresh, controls.pattern);
    populateTestPattern(target, controls.pattern);
    liveTensorRef.current = fresh;
    setInitialState(fresh);
    setTargetState(target);
  }, [controls.pattern, controls.gridResolution]);

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
        const target = createInitialState(controls.gridResolution, controls.gridResolution);
        populateFromImage(fresh, img);
        populateFromImage(target, img);
        liveTensorRef.current = fresh;
        setInitialState(fresh);
        setTargetState(target);
      };
      img.src = e.target.result as string;
    };
    reader.readAsDataURL(file);
  }, [controls.gridResolution]);

  const handleCaptureSnapshot = useCallback(() => {
    const canvas = document.querySelector('#nca-canvas-container canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `neuralife_${controls.pattern}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [controls.pattern]);

  // Initialise session & state
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
      const tgtState = createInitialState(controls.gridResolution, controls.gridResolution);
      populateTestPattern(freshState, controls.pattern);
      populateTestPattern(tgtState, controls.pattern);
      liveTensorRef.current = freshState;
      setInitialState(freshState);
      setTargetState(tgtState);
      setStatus({ kind: 'running' });
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [controls.modelPath, controls.gridResolution, controls.pattern]);

  // FPS meter loop
  useEffect(() => {
    let frames = 0;
    let lastTime = performance.now();
    let animId: number;

    function measureFps() {
      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frames * 1000) / (now - lastTime)));
        frames = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(measureFps);
    }
    animId = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(animId);
  }, []);

  if (status.kind === 'unsupported') {
    return <HardwareUnsupported videoSrc={FALLBACK_VIDEO_PATH} errorMessage={status.message} />;
  }

  const canvasWidth = Math.min(gridWidth * 4.6, 720);
  const canvasHeight = Math.min(gridHeight * 4.6, 720);

  return (
    <div
      id="nca-canvas-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        background: '#040409',
        position: 'relative',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Deep Space Background Ambient Plasma */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.35 }}>
        <Plasma
          color="#4f46e5"
          speed={0.25}
          direction="forward"
          scale={1.4}
          opacity={0.4}
          mouseInteractive={false}
          renderScale={0.4}
          maxDpr={1.5}
          targetFps={30}
          iterations={36}
        />
      </div>

      {/* Top Cyber Navigation Studio Bar */}
      <header
        id="neuralife-header"
        style={{
          position: 'fixed',
          top: 16,
          left: 22,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: 'rgba(10, 10, 20, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          padding: '8px 16px',
          borderRadius: 14,
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, filter: 'drop-shadow(0 0 10px #6366f1)' }}>🧬</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.08em', color: '#f8fafc' }}>
              NeuraLife
            </div>
            <div style={{ fontSize: 9, color: '#818cf8', fontWeight: 700, letterSpacing: '0.04em' }}>
              3D Neural Morphogenesis Engine
            </div>
          </div>
        </div>

        {/* Live System Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34d399', fontSize: 10, fontWeight: 700 }}>
            ● WebGPU Active
          </span>
          <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#c7d2fe', fontSize: 10, fontWeight: 700 }}>
            {gridWidth}×{gridHeight} Grid
          </span>
          <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#d8b4fe', fontSize: 10, fontWeight: 700 }}>
            {controls.simulationEngine === 'morphogenesis' ? '🧬 Bio Field' : '🧠 Neural ONNX'}
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 6 }}>
          <button
            id="open-inspector-btn"
            onClick={() => setIsInspectorOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid rgba(99, 102, 241, 0.45)',
              background: 'rgba(99, 102, 241, 0.22)',
              color: '#e0e7ff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
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
            }}
            title="Download PNG snapshot"
          >
            <span>📸</span>
            <span>Snapshot</span>
          </button>
        </div>
      </header>

      {/* Floating Left Telemetry HUD */}
      <aside
        id="telemetry-hud"
        style={{
          position: 'fixed',
          top: 80,
          left: 22,
          zIndex: 90,
          background: 'rgba(10, 10, 18, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 14,
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
          width: 170,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Frame Rate</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: fps >= 55 ? '#34d399' : '#f59e0b' }}>
            {fps} <span style={{ fontSize: 9, color: '#64748b' }}>FPS</span>
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Tissue State</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#c7d2fe' }}>
            {biomass.biomassPercent > 85 ? '🟢 Stable' : '⚡ Healing'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Optics Mode</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', textTransform: 'capitalize' }}>
            {controls.visualMode.replace('-', ' ')}
          </span>
        </div>
      </aside>

      {/* 3D Single Channel Projection Active Indicator */}
      {active3DChannel >= 0 && (
        <div
          id="projection-pill"
          style={{
            position: 'fixed',
            top: 195,
            left: 22,
            zIndex: 99,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 10,
            background: 'rgba(99, 102, 241, 0.3)',
            border: '1px solid #818cf8',
            color: '#ffffff',
            fontSize: 10,
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
          }}
        >
          <span>🪐 3D: Channel {active3DChannel}</span>
          <button
            onClick={() => setActive3DChannel(-1)}
            style={{ background: 'transparent', border: 'none', color: '#c7d2fe', cursor: 'pointer', fontWeight: 800 }}
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
            background: 'rgba(4, 4, 9, 0.95)',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              border: '3px solid rgba(99, 102, 241, 0.2)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'nca-spin 0.8s linear infinite',
            }}
          />
          <p style={{ marginTop: 16, color: '#c7d2fe', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>
            Initialising 3D Morphogenesis Lattice…
          </p>
        </div>
      )}

      {/* R3F 3D WebGL Canvas Container with Cyber Frame */}
      <div
        style={{
          width: canvasWidth,
          height: canvasHeight,
          borderRadius: 22,
          border: '1px solid rgba(99, 102, 241, 0.35)',
          boxShadow: '0 0 100px rgba(99, 102, 241, 0.2), inset 0 0 50px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
          visibility: status.kind === 'running' ? 'visible' : 'hidden',
          background: 'radial-gradient(circle at center, #0e0e1f 0%, #05050b 100%)',
          position: 'relative',
        }}
      >
        {status.kind === 'running' && sessionRef.current && initialState && targetState && (
          <Canvas camera={{ position: [0, -2.4, 3.2], fov: 48 }}>
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              autoRotate={controls.autoRotate}
              autoRotateSpeed={0.4}
              dampingFactor={0.05}
            />
            <ambientLight intensity={0.9} />
            <pointLight position={[3, 3, 4]} intensity={1.2} color="#ffffff" />
            <pointLight position={[-3, -3, 3]} intensity={0.6} color="#818cf8" />

            <NCAScene
              session={sessionRef.current}
              initialState={initialState}
              targetState={targetState}
              gridWidth={gridWidth}
              gridHeight={gridHeight}
              brushMode={controls.brushMode}
              brushRadius={controls.brushRadius}
              heightScale={controls.heightScale}
              normalStrength={controls.normalStrength}
              paletteMode={controls.paletteMode}
              visualMode={controls.visualMode}
              simulationEngine={controls.simulationEngine}
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

      {/* Bottom Floating Interaction Tooltip Bar */}
      <div
        id="interaction-guide-bar"
        style={{
          marginTop: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          color: '#94a3b8',
          fontSize: 11,
          fontFamily: 'var(--nl-font-mono)',
          letterSpacing: '0.04em',
          background: 'rgba(12, 12, 22, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '6px 18px',
          borderRadius: 99,
          border: '1px solid rgba(99, 102, 241, 0.2)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        }}
      >
        <span>🖱️ <strong style={{ color: '#e2e8f0' }}>Left Drag:</strong> Perturb / Cultivate</span>
        <span>·</span>
        <span>🔄 <strong style={{ color: '#e2e8f0' }}>Right Drag:</strong> 3D Orbit</span>
        <span>·</span>
        <span>🔍 <strong style={{ color: '#e2e8f0' }}>Scroll:</strong> Depth Zoom</span>
      </div>

      {/* Floating Right Control Deck */}
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
