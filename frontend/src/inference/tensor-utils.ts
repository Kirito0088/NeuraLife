/**
 * Tensor Utilities for NCA Inference
 *
 * Pure functions for creating the initial NCA state tensor and
 * extracting RGBA pixel data from model output for canvas rendering.
 *
 * Tensor layout: [1, 16, H, W] (batch=1, channels=16, height, width)
 *   Channels 0..3 = RGBA
 *   Channels 4..15 = hidden morphogenetic memory
 */

import * as ort from 'onnxruntime-web';

/**
 * Creates the initial NCA state tensor.
 *
 * All cells start at zero. A single "seed" cell is placed at the
 * center of the grid with alpha = 1.0 and all hidden channels = 1.0.
 * This matches the NCA training protocol from AGENT.md §1.1.
 *
 * @param height - Grid height in cells (e.g. 128)
 * @param width  - Grid width in cells (e.g. 128)
 * @returns An ort.Tensor of shape [1, 16, height, width], dtype float32.
 */
export function createInitialState(
  height: number,
  width: number,
): ort.Tensor {
  const channels = 16;
  const data = new Float32Array(1 * channels * height * width);
  // data is zero-initialised by the TypedArray constructor.

  const centerY = Math.floor(height / 2);
  const centerX = Math.floor(width / 2);

  // Set the seed cell: alpha (channel 3) = 1.0, hidden channels 4..15 = 1.0
  for (let c = 3; c < channels; c++) {
    const index = c * height * width + centerY * width + centerX;
    data[index] = 1.0;
  }

  return new ort.Tensor('float32', data, [1, channels, height, width]);
}

/**
 * Populates a vibrant test pattern on an existing state tensor based on preset ID.
 */
export function populateTestPattern(tensor: ort.Tensor, patternId: string = 'morpho-ring'): void {
  const dims = tensor.dims;
  if (dims.length !== 4) return;
  const channels = dims[1];
  const height = dims[2];
  const width = dims[3];

  const data = tensor.data as Float32Array;
  data.fill(0.0); // Reset all cells

  const planeSize = height * width;
  const centerY = Math.floor(height / 2);
  const centerX = Math.floor(width / 2);
  const radius = Math.floor(Math.min(height, width) / 3.5);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dy = y - centerY;
      const dx = x - centerX;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const spatialIdx = y * width + x;

      if (patternId === 'morpho-ring') {
        if (dist <= radius) {
          const normDist = dist / radius;
          const ringHarmonic = 0.5 + 0.5 * Math.sin(normDist * Math.PI * 4);
          data[spatialIdx] = 0.2 + 0.5 * ringHarmonic;                            // Red (Cyber Magenta)
          data[1 * planeSize + spatialIdx] = 0.6 * (1 - normDist * 0.7);          // Green (Cyan glow)
          data[2 * planeSize + spatialIdx] = 0.95;                                 // Blue
          data[3 * planeSize + spatialIdx] = Math.max(0, 1.0 - normDist * normDist * 0.4); // Smooth Alpha
          for (let c = 4; c < channels; c++) {
            data[c * planeSize + spatialIdx] = Math.sin(normDist * Math.PI + (c * 0.3));
          }
        }
      } else if (patternId === 'glowing-emblem') {
        const angle = Math.atan2(dy, dx);
        const petalRadius = radius * (0.65 + 0.35 * Math.cos(angle * 6));
        if (dist <= petalRadius) {
          const normDist = dist / petalRadius;
          data[spatialIdx] = 1.0 - 0.3 * normDist;                                // Gold Amber
          data[1 * planeSize + spatialIdx] = 0.8 - 0.4 * normDist;
          data[2 * planeSize + spatialIdx] = 0.3 + 0.4 * Math.sin(normDist * Math.PI * 3);
          data[3 * planeSize + spatialIdx] = Math.max(0, 1.0 - normDist * 0.3);
          for (let c = 4; c < channels; c++) {
            data[c * planeSize + spatialIdx] = Math.cos(angle * 3 + (c * 0.4));
          }
        }
      } else if (patternId === 'shield') {
        const halfSide = radius * 0.8;
        if (Math.abs(dx) <= halfSide && Math.abs(dy) <= halfSide) {
          const cornerDist = Math.max(Math.abs(dx), Math.abs(dy)) / halfSide;
          data[spatialIdx] = 0.85 * (1.0 - cornerDist * 0.5);                     // Violet/Emerald
          data[1 * planeSize + spatialIdx] = 0.3 + 0.6 * (1.0 - cornerDist);
          data[2 * planeSize + spatialIdx] = 0.8;
          data[3 * planeSize + spatialIdx] = 1.0;
          for (let c = 4; c < channels; c++) {
            data[c * planeSize + spatialIdx] = Math.sin(cornerDist * Math.PI * 2);
          }
        }
      } else if (patternId === 'bio-lizard') {
        // Salamander / Lizard Morphogenesis Pattern
        const bodyDist = Math.sqrt((dx * 0.8) * (dx * 0.8) + (dy * 2.2) * (dy * 2.2));
        const headDist = Math.sqrt(dx * dx + (dy + radius * 0.7) * (dy + radius * 0.7));
        const tailDist = Math.sqrt((dx + Math.sin(dy * 0.15) * 4) * (dx + Math.sin(dy * 0.15) * 4) + (dy - radius * 0.8) * (dy - radius * 0.8));
        const leg1 = Math.sqrt((Math.abs(dx) - radius * 0.6) ** 2 + (dy + radius * 0.3) ** 2);
        const leg2 = Math.sqrt((Math.abs(dx) - radius * 0.7) ** 2 + (dy - radius * 0.3) ** 2);
        
        const isLizard = bodyDist <= radius * 0.65 || headDist <= radius * 0.45 || (tailDist <= radius * 0.7 && dy > 0) || leg1 <= radius * 0.3 || leg2 <= radius * 0.35;
        if (isLizard) {
          data[spatialIdx] = 0.1;                                                 // Emerald Green Body
          data[1 * planeSize + spatialIdx] = 0.95;
          data[2 * planeSize + spatialIdx] = 0.5 + 0.3 * Math.sin(dy * 0.3);
          data[3 * planeSize + spatialIdx] = 1.0;
          for (let c = 4; c < channels; c++) {
            data[c * planeSize + spatialIdx] = 0.8;
          }
        }
      } else if (patternId === 'dna-spiral') {
        const angle = Math.atan2(dy, dx);
        const spiralDist = Math.abs(dist - ((angle + Math.PI) / (Math.PI * 2)) * radius * 0.9);
        const spiralDist2 = Math.abs(dist - (((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * radius * 0.9);
        if (spiralDist <= radius * 0.25 || spiralDist2 <= radius * 0.25 || dist <= radius * 0.2) {
          data[spatialIdx] = 0.2;                                                 // Cyan / Electric Blue Helix
          data[1 * planeSize + spatialIdx] = 0.85;
          data[2 * planeSize + spatialIdx] = 1.0;
          data[3 * planeSize + spatialIdx] = 1.0;
          for (let c = 4; c < channels; c++) {
            data[c * planeSize + spatialIdx] = Math.sin(angle * 2 + c);
          }
        }
      }
    }
  }
}

/**
 * Loads a custom HTMLImageElement into an ort.Tensor state.
 */
export function populateFromImage(
  tensor: ort.Tensor,
  image: HTMLImageElement
): void {
  const dims = tensor.dims;
  if (dims.length !== 4) return;
  const channels = dims[1];
  const height = dims[2];
  const width = dims[3];

  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(image, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const pixels = imgData.data;

  const data = tensor.data as Float32Array;
  data.fill(0.0);
  const planeSize = height * width;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const spatialIdx = y * width + x;
      const pxIdx = spatialIdx * 4;

      const r = pixels[pxIdx + 0] / 255.0;
      const g = pixels[pxIdx + 1] / 255.0;
      const b = pixels[pxIdx + 2] / 255.0;
      const a = pixels[pxIdx + 3] / 255.0;

      data[spatialIdx] = r;
      data[1 * planeSize + spatialIdx] = g;
      data[2 * planeSize + spatialIdx] = b;
      data[3 * planeSize + spatialIdx] = a;

      if (a > 0.1) {
        for (let c = 4; c < channels; c++) {
          data[c * planeSize + spatialIdx] = 1.0;
        }
      }
    }
  }
}

/**
 * Extracts RGBA pixel data from the model output tensor.
 *
 * Reads channels 0..3 from the [1, 16, H, W] tensor, clamps each
 * value to [0, 1], scales to [0, 255], and packs into a
 * Uint8ClampedArray suitable for an HTML Canvas `ImageData`.
 *
 * The pixel order is row-major (top-left to bottom-right), with each
 * pixel stored as [R, G, B, A] — matching the Canvas API expectation.
 *
 * @param output - The raw ort.Tensor output from the model.
 * @param height - Expected grid height.
 * @param width  - Expected grid width.
 * @returns Uint8ClampedArray of length height * width * 4.
 */
export function extractRGBA(
  output: ort.Tensor,
  height: number,
  width: number,
): Uint8ClampedArray {
  const data = output.data as Float32Array;
  const pixels = new Uint8ClampedArray(height * width * 4);
  const planeSize = height * width;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const spatialIdx = y * width + x;
      const pixelOffset = spatialIdx * 4;

      // Channels are stored as [batch][channel][height][width].
      // Batch dimension is 0, so offset for channel c is c * planeSize.
      for (let c = 0; c < 4; c++) {
        const value = data[c * planeSize + spatialIdx];
        // Clamp to [0, 1] then scale to [0, 255].
        // Uint8ClampedArray automatically clamps the assigned value to [0, 255].
        pixels[pixelOffset + c] = Math.round(
          Math.max(0, Math.min(1, value)) * 255,
        );
      }
    }
  }

  return pixels;
}

/**
 * Mutates the tensor in-place to zero out state channels within a radius
 * of the given (u, v) UV coordinate.
 *
 * @param tensor - The NCA state tensor (shape [1, channels, height, width]).
 * @param u - The X coordinate in [0, 1] UV space.
 * @param v - The Y coordinate in [0, 1] UV space.
 * @param radius - The damage radius in grid cells.
 */
export function applyDamage(
  tensor: ort.Tensor,
  u: number,
  v: number,
  radius: number
): void {
  const dims = tensor.dims;
  if (dims.length !== 4) return;
  
  const channels = dims[1];
  const height = dims[2];
  const width = dims[3];

  const data = tensor.data as Float32Array;
  const planeSize = height * width;

  const cx = u * width;
  const cy = v * height;
  const radiusSq = radius * radius;

  // Determine bounding box to avoid looping over the entire grid
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(height - 1, Math.ceil(cy + radius));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      // Use pixel center for distance calculation
      const dx = (x + 0.5) - cx;
      const dy = (y + 0.5) - cy;
      
      if (dx * dx + dy * dy <= radiusSq) {
        const spatialIdx = y * width + x;
        // Zero out all channels
        for (let c = 0; c < channels; c++) {
          data[c * planeSize + spatialIdx] = 0.0;
        }
      }
    }
  }
}

export type DamagePresetType = 'cut_half' | 'cut_center' | 'scatter' | 'small_hole';

/**
 * Kills the right half of the cell grid (x >= width / 2).
 */
export function damageCutHalf(tensor: ort.Tensor): void {
  const dims = tensor.dims;
  if (dims.length !== 4) return;
  const channels = dims[1];
  const height = dims[2];
  const width = dims[3];
  const data = tensor.data as Float32Array;
  const planeSize = height * width;
  const midX = Math.floor(width / 2);

  for (let y = 0; y < height; y++) {
    for (let x = midX; x < width; x++) {
      const spatialIdx = y * width + x;
      for (let c = 0; c < channels; c++) {
        data[c * planeSize + spatialIdx] = 0.0;
      }
    }
  }
}

/**
 * Kills the central 50% region of the grid.
 */
export function damageCutCenter(tensor: ort.Tensor): void {
  const dims = tensor.dims;
  if (dims.length !== 4) return;
  const channels = dims[1];
  const height = dims[2];
  const width = dims[3];
  const data = tensor.data as Float32Array;
  const planeSize = height * width;

  const h1 = Math.floor(height / 4);
  const h2 = Math.floor((3 * height) / 4);
  const w1 = Math.floor(width / 4);
  const w2 = Math.floor((3 * width) / 4);

  for (let y = h1; y < h2; y++) {
    for (let x = w1; x < w2; x++) {
      const spatialIdx = y * width + x;
      for (let c = 0; c < channels; c++) {
        data[c * planeSize + spatialIdx] = 0.0;
      }
    }
  }
}

/**
 * Randomly kills a percentage of cells (default 40%) across the grid.
 */
export function damageScatter(tensor: ort.Tensor, scatterRatio: number = 0.4): void {
  const dims = tensor.dims;
  if (dims.length !== 4) return;
  const channels = dims[1];
  const height = dims[2];
  const width = dims[3];
  const data = tensor.data as Float32Array;
  const planeSize = height * width;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.random() < scatterRatio) {
        const spatialIdx = y * width + x;
        for (let c = 0; c < channels; c++) {
          data[c * planeSize + spatialIdx] = 0.0;
        }
      }
    }
  }
}

/**
 * Excavates a circular cavity in the center of the grid.
 */
export function damageSmallHole(tensor: ort.Tensor, radius?: number): void {
  const dims = tensor.dims;
  if (dims.length !== 4) return;
  const channels = dims[1];
  const height = dims[2];
  const width = dims[3];
  const data = tensor.data as Float32Array;
  const planeSize = height * width;

  const cy = height / 2;
  const cx = width / 2;
  const rad = radius ?? Math.min(height, width) / 5;
  const radiusSq = rad * rad;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dy = (y + 0.5) - cy;
      const dx = (x + 0.5) - cx;
      if (dx * dx + dy * dy <= radiusSq) {
        const spatialIdx = y * width + x;
        for (let c = 0; c < channels; c++) {
          data[c * planeSize + spatialIdx] = 0.0;
        }
      }
    }
  }
}

/**
 * Unified dispatcher to apply damage presets to an NCA state tensor.
 */
export function applyDamagePreset(
  tensor: ort.Tensor,
  damageType: DamagePresetType
): void {
  switch (damageType) {
    case 'cut_half':
      damageCutHalf(tensor);
      break;
    case 'cut_center':
      damageCutCenter(tensor);
      break;
    case 'scatter':
      damageScatter(tensor);
      break;
    case 'small_hole':
      damageSmallHole(tensor);
      break;
  }
}

/**
 * Plants fresh high-energy seed cells in a radius for the Growth/Seed brush.
 */
export function applySeed(
  tensor: ort.Tensor,
  u: number,
  v: number,
  radius: number
): void {
  const dims = tensor.dims;
  if (dims.length !== 4) return;

  const channels = dims[1];
  const height = dims[2];
  const width = dims[3];

  const data = tensor.data as Float32Array;
  const planeSize = height * width;

  const cx = u * width;
  const cy = v * height;
  const radiusSq = radius * radius;

  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(height - 1, Math.ceil(cy + radius));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = (x + 0.5) - cx;
      const dy = (y + 0.5) - cy;

      if (dx * dx + dy * dy <= radiusSq) {
        const spatialIdx = y * width + x;
        // Plant cell: RGB vibrant cyan/violet, Alpha = 1.0, hidden states = 1.0
        data[spatialIdx] = 0.4;
        data[1 * planeSize + spatialIdx] = 0.8;
        data[2 * planeSize + spatialIdx] = 1.0;
        data[3 * planeSize + spatialIdx] = 1.0;

        for (let c = 4; c < channels; c++) {
          data[c * planeSize + spatialIdx] = 1.0;
        }
      }
    }
  }
}

/**
 * Calculates live biomass metrics (active cell count and biomass percentage).
 */
export function calculateBiomass(tensor: ort.Tensor): {
  activeCells: number;
  totalCells: number;
  biomassPercent: number;
} {
  const dims = tensor.dims;
  if (dims.length !== 4) return { activeCells: 0, totalCells: 0, biomassPercent: 0 };

  const height = dims[2];
  const width = dims[3];
  const totalCells = height * width;
  const data = tensor.data as Float32Array;
  const planeSize = totalCells;

  let activeCells = 0;

  // Alpha is channel 3
  const alphaOffset = 3 * planeSize;
  for (let i = 0; i < totalCells; i++) {
    if (data[alphaOffset + i] > 0.1) {
      activeCells++;
    }
  }

  const biomassPercent = Number(((activeCells / totalCells) * 100).toFixed(1));
  return { activeCells, totalCells, biomassPercent };
}

export interface ChannelInfo {
  index: number;
  name: string;
  category: 'visible' | 'hidden';
  description: string;
  color: string;
}

export const CHANNEL_METADATA: ChannelInfo[] = [
  { index: 0, name: 'Red (R)', category: 'visible', description: 'Visible Red Channel (RGBA)', color: '#ef4444' },
  { index: 1, name: 'Green (G)', category: 'visible', description: 'Visible Green Channel (RGBA)', color: '#10b981' },
  { index: 2, name: 'Blue (B)', category: 'visible', description: 'Visible Blue Channel (RGBA)', color: '#3b82f6' },
  { index: 3, name: 'Alpha (A)', category: 'visible', description: 'Living Boundary Mask', color: '#a855f7' },
  { index: 4, name: 'Hidden 1 (h₁)', category: 'hidden', description: 'Emergent X-Spatial Gradient', color: '#06b6d4' },
  { index: 5, name: 'Hidden 2 (h₂)', category: 'hidden', description: 'Emergent Y-Spatial Gradient', color: '#0ea5e9' },
  { index: 6, name: 'Hidden 3 (h₃)', category: 'hidden', description: 'Morphogenetic Density Core', color: '#6366f1' },
  { index: 7, name: 'Hidden 4 (h₄)', category: 'hidden', description: 'Radial Boundary Attractor', color: '#8b5cf6' },
  { index: 8, name: 'Hidden 5 (h₅)', category: 'hidden', description: 'Regenerative Memory Signal', color: '#ec4899' },
  { index: 9, name: 'Hidden 6 (h₆)', category: 'hidden', description: 'Harmonic Phase Alignment', color: '#f43f5e' },
  { index: 10, name: 'Hidden 7 (h₇)', category: 'hidden', description: 'Bilateral Symmetry Anchor', color: '#f97316' },
  { index: 11, name: 'Hidden 8 (h₈)', category: 'hidden', description: 'Damage Sensing Potential', color: '#eab308' },
  { index: 12, name: 'Hidden 9 (h₉)', category: 'hidden', description: 'Mitotic Flow Direction', color: '#84cc16' },
  { index: 13, name: 'Hidden 10 (h₁₀)', category: 'hidden', description: 'Long-term Memory Buffer', color: '#14b8a6' },
  { index: 14, name: 'Hidden 11 (h₁₁)', category: 'hidden', description: 'Latent Homeostatic Field', color: '#38bdf8' },
  { index: 15, name: 'Hidden 12 (h₁₂)', category: 'hidden', description: 'Stem Cell Differentiation', color: '#c084fc' },
];

export type ColormapType = 'viridis' | 'plasma' | 'turbo' | 'grayscale';

/**
 * Maps a normalized float [0, 1] to RGB components [0, 255] using standard scientific false-color gradients.
 */
export function sampleColormap(t: number, cmap: ColormapType): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));

  if (cmap === 'grayscale') {
    const v = Math.round(c * 255);
    return [v, v, v];
  }

  if (cmap === 'plasma') {
    // Plasma colormap polynomial approximation: dark violet -> magenta -> gold
    const r = Math.round(Math.min(255, Math.max(0, 255 * (0.05 + 1.8 * c - 0.9 * c * c))));
    const g = Math.round(Math.min(255, Math.max(0, 255 * (0.02 + 0.3 * c + 1.2 * c * c * c))));
    const b = Math.round(Math.min(255, Math.max(0, 255 * (0.55 + 0.8 * Math.sin(c * Math.PI) - 1.2 * c * c))));
    return [r, g, b];
  }

  if (cmap === 'turbo') {
    // Turbo thermal: Deep Blue -> Cyan -> Green -> Yellow -> Red
    const r = Math.round(Math.min(255, Math.max(0, 255 * (0.13 + 3.1 * c - 2.8 * c * c))));
    const g = Math.round(Math.min(255, Math.max(0, 255 * (255 * Math.sin(c * Math.PI)) / 255)));
    const b = Math.round(Math.min(255, Math.max(0, 255 * (0.8 - 2.0 * c + 1.5 * c * c))));
    return [r, g, b];
  }

  // Default Viridis: Deep purple -> Teal -> Vibrant Yellow
  // Standard 5-point piecewise linear approximation of Viridis
  if (c < 0.25) {
    const u = c / 0.25;
    return [
      Math.round(68 + (49 - 68) * u),
      Math.round(1 + (104 - 1) * u),
      Math.round(84 + (142 - 84) * u),
    ];
  } else if (c < 0.5) {
    const u = (c - 0.25) / 0.25;
    return [
      Math.round(49 + (33 - 49) * u),
      Math.round(104 + (145 - 104) * u),
      Math.round(142 + (140 - 142) * u),
    ];
  } else if (c < 0.75) {
    const u = (c - 0.5) / 0.25;
    return [
      Math.round(33 + (115 - 33) * u),
      Math.round(145 + (197 - 145) * u),
      Math.round(140 + (96 - 140) * u),
    ];
  } else {
    const u = (c - 0.75) / 0.25;
    return [
      Math.round(115 + (253 - 115) * u),
      Math.round(197 + (231 - 197) * u),
      Math.round(96 + (36 - 96) * u),
    ];
  }
}

export interface ChannelSnapshot {
  index: number;
  info: ChannelInfo;
  pixels: Uint8ClampedArray;
  min: number;
  max: number;
  meanEnergy: number;
  activePercent: number;
}

/**
 * Extracts a single channel from the NCA state tensor and converts it into a false-colored ImageData pixel array.
 */
export function extractChannelAsImageData(
  tensor: ort.Tensor,
  channelIdx: number,
  height: number,
  width: number,
  colormap: ColormapType = 'viridis'
): ChannelSnapshot {
  const totalCells = height * width;
  const pixels = new Uint8ClampedArray(totalCells * 4);
  const data = tensor.data as Float32Array;
  const planeOffset = channelIdx * totalCells;

  let minVal = Infinity;
  let maxVal = -Infinity;
  let sumAbs = 0;
  let activeCells = 0;

  // First pass: compute min, max, sumAbs
  for (let i = 0; i < totalCells; i++) {
    const val = data[planeOffset + i];
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
    const absVal = Math.abs(val);
    sumAbs += absVal;
    if (absVal > 0.05) activeCells++;
  }

  if (minVal === Infinity) minVal = 0;
  if (maxVal === -Infinity) maxVal = 1;
  const range = maxVal - minVal > 1e-6 ? maxVal - minVal : 1.0;

  // Second pass: apply false-color mapping
  for (let i = 0; i < totalCells; i++) {
    const rawVal = data[planeOffset + i];
    const norm = (rawVal - minVal) / range;
    const [r, g, b] = sampleColormap(norm, colormap);
    const pxIdx = i * 4;
    pixels[pxIdx + 0] = r;
    pixels[pxIdx + 1] = g;
    pixels[pxIdx + 2] = b;
    pixels[pxIdx + 3] = 255;
  }

  const info = CHANNEL_METADATA[channelIdx] ?? {
    index: channelIdx,
    name: `Channel ${channelIdx}`,
    category: channelIdx < 4 ? 'visible' : 'hidden',
    description: `State channel ${channelIdx}`,
    color: '#818cf8',
  };

  return {
    index: channelIdx,
    info,
    pixels,
    min: Number(minVal.toFixed(3)),
    max: Number(maxVal.toFixed(3)),
    meanEnergy: Number((sumAbs / totalCells).toFixed(3)),
    activePercent: Number(((activeCells / totalCells) * 100).toFixed(1)),
  };
}

/**
 * Extracts all 16 state channels for the Live Hidden Channel Inspector.
 */
export function extractAllChannelSnapshots(
  tensor: ort.Tensor,
  height: number,
  width: number,
  colormap: ColormapType = 'viridis'
): ChannelSnapshot[] {
  const dims = tensor.dims;
  const channels = dims.length === 4 ? dims[1] : 16;
  const snapshots: ChannelSnapshot[] = [];

  for (let c = 0; c < channels; c++) {
    snapshots.push(extractChannelAsImageData(tensor, c, height, width, colormap));
  }

  return snapshots;
}

/**
 * Executes a single biological morphogenesis self-healing step on the state tensor.
 * Propagates regeneration signals from intact perimeter cells into damaged areas.
 */
export function stepMorphogenesisEvolution(
  current: ort.Tensor,
  target: ort.Tensor,
  height: number,
  width: number,
  regenRate: number = 0.12
): void {
  const cData = current.data as Float32Array;
  const tData = target.data as Float32Array;
  const planeSize = height * width;
  const channels = current.dims[1];

  // 1. Compute 3x3 living cell neighborhood mask
  const aliveNeighbors = new Float32Array(planeSize);
  const alphaOffset = 3 * planeSize;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (cData[alphaOffset + (y + dy) * width + (x + dx)] > 0.1) {
            sum++;
          }
        }
      }
      aliveNeighbors[idx] = sum;
    }
  }

  // 2. Diffuse & regenerate towards target state where neighbors are alive
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const currentAlpha = cData[alphaOffset + idx];
      const targetAlpha = tData[alphaOffset + idx];
      const neighbors = aliveNeighbors[idx];

      // If cell is damaged (alpha < target) and has living neighbors, grow
      if (neighbors > 0 && targetAlpha > 0.05) {
        const growthStep = regenRate * (neighbors / 8.0);
        const newAlpha = Math.min(targetAlpha, currentAlpha + growthStep);
        cData[alphaOffset + idx] = newAlpha;

        // Propagate RGB and hidden channels proportionally to alpha growth
        for (let c = 0; c < channels; c++) {
          if (c === 3) continue;
          const cOff = c * planeSize + idx;
          const targetVal = tData[cOff];
          const currVal = cData[cOff];
          cData[cOff] = currVal + (targetVal - currVal) * regenRate * 1.2;
        }
      } else if (targetAlpha < 0.05 && currentAlpha > 0.01) {
        // Cells outside target boundaries naturally decay (absorbing boundary)
        cData[alphaOffset + idx] *= 0.85;
      }
    }
  }

  // 3. Apply absorbing zero boundary condition
  for (let x = 0; x < width; x++) {
    for (let c = 0; c < channels; c++) {
      cData[c * planeSize + x] = 0.0;
      cData[c * planeSize + (height - 1) * width + x] = 0.0;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let c = 0; c < channels; c++) {
      cData[c * planeSize + y * width] = 0.0;
      cData[c * planeSize + y * width + (width - 1)] = 0.0;
    }
  }
}

/**
 * Stabilizes neural tensor outputs by clamping state channels and applying boundary absorption.
 */
export function stabilizeTensorState(
  tensor: ort.Tensor,
  height: number,
  width: number
): void {
  const data = tensor.data as Float32Array;
  const planeSize = height * width;
  const channels = tensor.dims[1];

  // Clamp RGB to [0, 1], Alpha to [0, 1], Hidden channels to [-3, 3]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      // Border cells must be hard zeroed
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        for (let c = 0; c < channels; c++) {
          data[c * planeSize + idx] = 0.0;
        }
        continue;
      }

      // RGBA
      for (let c = 0; c < 4; c++) {
        const off = c * planeSize + idx;
        data[off] = Math.max(0.0, Math.min(1.0, data[off]));
      }

      // Latent channels
      for (let c = 4; c < channels; c++) {
        const off = c * planeSize + idx;
        data[off] = Math.max(-3.0, Math.min(3.0, data[off]));
      }
    }
  }
}
