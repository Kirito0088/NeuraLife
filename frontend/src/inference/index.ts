export { logGPUAdapter } from './gpu-adapter';
export type { GPUAdapterInfo } from './gpu-adapter';

export { createInferenceSession, HardwareUnsupportedError } from './session';
export type { SessionResult } from './session';

export {
  createInitialState,
  extractRGBA,
  applyDamage,
  applySeed,
  calculateBiomass,
  populateTestPattern,
  populateFromImage,
  applyDamagePreset,
  damageCutHalf,
  damageCutCenter,
  damageScatter,
  damageSmallHole,
  sampleColormap,
  extractChannelAsImageData,
  extractAllChannelSnapshots,
  CHANNEL_METADATA,
} from './tensor-utils';
export type { DamagePresetType, ColormapType, ChannelInfo, ChannelSnapshot } from './tensor-utils';
