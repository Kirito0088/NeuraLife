/**
 * ONNX Inference Session Factory
 *
 * Creates an `onnxruntime-web` InferenceSession with a two-stage
 * execution provider fallback chain:
 *   1. WebGPU  (best performance on dedicated GPUs)
 *   2. WebGL   (fallback for older browsers / integrated GPUs)
 *
 * If both fail, throws `HardwareUnsupportedError` so the UI layer
 * can mount the static fallback component.
 */

import * as ort from 'onnxruntime-web';

export class HardwareUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HardwareUnsupportedError';
  }
}

export interface SessionResult {
  session: ort.InferenceSession;
  backend: 'webgpu' | 'webgl';
}

/**
 * Attempts to create an ONNX InferenceSession with WebGPU, falling
 * back to WebGL, then throwing if neither works.
 *
 * @param modelPath - URL path to the .onnx model (e.g. '/models/dummy_model.onnx')
 * @returns The created session and the backend that succeeded.
 * @throws {HardwareUnsupportedError} if no backend could initialise.
 */
export async function createInferenceSession(
  modelPath: string,
): Promise<SessionResult> {
  // --- Try WebGPU ---
  try {
    const session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['webgpu'],
    });
    console.log('[NeuraLife] ONNX Backend: webgpu');
    return { session, backend: 'webgpu' };
  } catch (e) {
    console.warn(
      '[NeuraLife] WebGPU execution provider failed, trying WebGL…',
      e,
    );
  }

  // --- Try WebGL ---
  try {
    const session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['webgl'],
    });
    console.log('[NeuraLife] ONNX Backend: webgl');
    return { session, backend: 'webgl' };
  } catch (e) {
    console.warn('[NeuraLife] WebGL execution provider also failed.', e);
  }

  // --- Both failed ---
  throw new HardwareUnsupportedError(
    'Neither WebGPU nor WebGL execution providers could initialise. ' +
      'This device does not support GPU-accelerated inference.',
  );
}
