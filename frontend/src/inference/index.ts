export { logGPUAdapter } from './gpu-adapter';
export type { GPUAdapterInfo } from './gpu-adapter';

export { createInferenceSession, HardwareUnsupportedError } from './session';
export type { SessionResult } from './session';

export { createInitialState, extractRGBA, applyDamage, applySeed, calculateBiomass, populateTestPattern, populateFromImage } from './tensor-utils';
