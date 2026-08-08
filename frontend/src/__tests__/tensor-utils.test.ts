/**
 * Tests for tensor-utils.ts
 *
 * Seams tested:
 *   1. createInitialState — correct shape, seed placement, zero background
 *   2. extractRGBA — correct RGBA pixel extraction from synthetic tensor
 */

import { describe, it, expect } from 'vitest';
import { Tensor } from 'onnxruntime-web';
import {
  createInitialState,
  extractRGBA,
  applyDamage,
  damageCutHalf,
  damageCutCenter,
  damageScatter,
  damageSmallHole,
  applyDamagePreset,
  sampleColormap,
  extractChannelAsImageData,
  extractAllChannelSnapshots,
  CHANNEL_METADATA,
} from '../inference/tensor-utils';

describe('createInitialState', () => {
  const H = 16;
  const W = 16;

  it('returns a tensor with shape [1, 16, H, W]', () => {
    const tensor = createInitialState(H, W);
    expect(tensor.dims).toEqual([1, 16, H, W]);
  });

  it('returns a float32 tensor', () => {
    const tensor = createInitialState(H, W);
    expect(tensor.type).toBe('float32');
  });

  it('has a seed cell at the center with alpha = 1.0', () => {
    const tensor = createInitialState(H, W);
    const data = tensor.data as Float32Array;
    const centerY = Math.floor(H / 2);
    const centerX = Math.floor(W / 2);
    const planeSize = H * W;

    // Channel 3 (alpha) at the center should be 1.0
    const alphaIndex = 3 * planeSize + centerY * W + centerX;
    expect(data[alphaIndex]).toBe(1.0);
  });

  it('has hidden channels 4..15 set to 1.0 at the seed cell', () => {
    const tensor = createInitialState(H, W);
    const data = tensor.data as Float32Array;
    const centerY = Math.floor(H / 2);
    const centerX = Math.floor(W / 2);
    const planeSize = H * W;

    for (let c = 4; c < 16; c++) {
      const idx = c * planeSize + centerY * W + centerX;
      expect(data[idx]).toBe(1.0);
    }
  });

  it('has RGB channels 0..2 at the seed cell as 0.0', () => {
    const tensor = createInitialState(H, W);
    const data = tensor.data as Float32Array;
    const centerY = Math.floor(H / 2);
    const centerX = Math.floor(W / 2);
    const planeSize = H * W;

    for (let c = 0; c < 3; c++) {
      const idx = c * planeSize + centerY * W + centerX;
      expect(data[idx]).toBe(0.0);
    }
  });

  it('has all non-seed cells as zero', () => {
    const tensor = createInitialState(H, W);
    const data = tensor.data as Float32Array;
    const centerY = Math.floor(H / 2);
    const centerX = Math.floor(W / 2);
    const planeSize = H * W;

    for (let c = 0; c < 16; c++) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (y === centerY && x === centerX) continue;
          const idx = c * planeSize + y * W + x;
          expect(data[idx]).toBe(0.0);
        }
      }
    }
  });
});

describe('extractRGBA', () => {
  const H = 4;
  const W = 4;
  const CHANNELS = 16;

  /**
   * Helper: builds a synthetic [1, 16, H, W] tensor with a known
   * RGBA pattern. Channel c at pixel (y, x) = a deterministic value
   * derived from c, y, x — so we can independently verify the output.
   */
  function buildSyntheticTensor(): Tensor {
    const data = new Float32Array(1 * CHANNELS * H * W);
    const planeSize = H * W;

    for (let c = 0; c < CHANNELS; c++) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          // Deterministic value in [0, 1] range for RGBA channels.
          // Hidden channels (4..15) can have arbitrary values.
          const val = c < 4 ? (c * 0.1 + y * 0.05 + x * 0.02) : 0.5;
          data[c * planeSize + y * W + x] = val;
        }
      }
    }

    return new Tensor('float32', data, [1, CHANNELS, H, W]);
  }

  it('returns a Uint8ClampedArray of length H * W * 4', () => {
    const tensor = buildSyntheticTensor();
    const rgba = extractRGBA(tensor, H, W);
    expect(rgba).toBeInstanceOf(Uint8ClampedArray);
    expect(rgba.length).toBe(H * W * 4);
  });

  it('correctly maps channel values to 0–255 range', () => {
    const tensor = buildSyntheticTensor();
    const data = tensor.data as Float32Array;
    const rgba = extractRGBA(tensor, H, W);
    const planeSize = H * W;

    // Verify a few known pixels.
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const pixelOffset = (y * W + x) * 4;
        for (let c = 0; c < 4; c++) {
          const raw = data[c * planeSize + y * W + x];
          const clamped = Math.max(0, Math.min(1, raw));
          const expected = Math.round(clamped * 255);
          expect(rgba[pixelOffset + c]).toBe(expected);
        }
      }
    }
  });

  it('clamps negative values to 0', () => {
    const data = new Float32Array(1 * CHANNELS * H * W);
    // Set channel 0 (R) at pixel (0, 0) to -0.5
    data[0] = -0.5;
    // Set alpha to 1.0 for visibility
    data[3 * H * W] = 1.0;
    const tensor = new Tensor('float32', data, [1, CHANNELS, H, W]);

    const rgba = extractRGBA(tensor, H, W);
    // R at pixel (0,0) should be clamped to 0
    expect(rgba[0]).toBe(0);
  });

  it('clamps values above 1.0 to 255', () => {
    const data = new Float32Array(1 * CHANNELS * H * W);
    // Set channel 1 (G) at pixel (0, 0) to 2.5
    data[1 * H * W] = 2.5;
    const tensor = new Tensor('float32', data, [1, CHANNELS, H, W]);

    const rgba = extractRGBA(tensor, H, W);
    // G at pixel (0,0) should be clamped to 255
    expect(rgba[1]).toBe(255);
  });
});

describe('applyDamage', () => {
  const H = 10;
  const W = 10;
  const CHANNELS = 16;

  it('zeroes out all channels within the specified radius', () => {
    const data = new Float32Array(1 * CHANNELS * H * W).fill(1.0);
    const tensor = new Tensor('float32', data, [1, CHANNELS, H, W]);

    // u=0.5, v=0.5 -> center (5, 5). Radius 2.
    // pixels affected (x, y): dx^2 + dy^2 <= 4
    // where dx = x + 0.5 - 5.0, dy = y + 0.5 - 5.0
    applyDamage(tensor, 0.5, 0.5, 2);

    // Check center pixel (5, 5)
    // dx = 5.5 - 5.0 = 0.5, dy = 0.5 -> dist^2 = 0.5 <= 4 (damaged)
    expect(data[0 * H * W + 5 * W + 5]).toBe(0.0);
    expect(data[15 * H * W + 5 * W + 5]).toBe(0.0);

    // Check pixel (3, 5)
    // dx = 3.5 - 5.0 = -1.5, dy = 0.5 -> dist^2 = 2.25 + 0.25 = 2.5 <= 4 (damaged)
    expect(data[0 * H * W + 5 * W + 3]).toBe(0.0);

    // Check pixel (2, 2)
    // dx = 2.5 - 5.0 = -2.5, dy = 2.5 - 5.0 = -2.5 -> dist^2 = 12.5 > 4 (untouched)
    expect(data[0 * H * W + 2 * W + 2]).toBe(1.0);
  });

  it('handles bounds correctly (u, v outside 0-1 range gracefully)', () => {
    const data = new Float32Array(1 * CHANNELS * H * W).fill(1.0);
    const tensor = new Tensor('float32', data, [1, CHANNELS, H, W]);

    // Apply damage off-screen should not crash and may not affect anything 
    // unless radius overlaps the edge.
    applyDamage(tensor, -1.0, -1.0, 1);
    
    // 0, 0 is far from -1, -1
    expect(data[0]).toBe(1.0);
  });
});

describe('damage presets', () => {
  const H = 20;
  const W = 20;
  const CHANNELS = 16;

  function createFullTensor(): Tensor {
    const data = new Float32Array(1 * CHANNELS * H * W).fill(1.0);
    return new Tensor('float32', data, [1, CHANNELS, H, W]);
  }

  it('damageCutHalf zeroes the right half (x >= W/2) and preserves the left half', () => {
    const tensor = createFullTensor();
    const data = tensor.data as Float32Array;
    damageCutHalf(tensor);

    const midX = Math.floor(W / 2);
    // Left half (x < midX) should be untouched (1.0)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < midX; x++) {
        expect(data[0 * H * W + y * W + x]).toBe(1.0);
        expect(data[3 * H * W + y * W + x]).toBe(1.0);
        expect(data[15 * H * W + y * W + x]).toBe(1.0);
      }
    }

    // Right half (x >= midX) should be zeroed (0.0)
    for (let y = 0; y < H; y++) {
      for (let x = midX; x < W; x++) {
        expect(data[0 * H * W + y * W + x]).toBe(0.0);
        expect(data[3 * H * W + y * W + x]).toBe(0.0);
        expect(data[15 * H * W + y * W + x]).toBe(0.0);
      }
    }
  });

  it('damageCutCenter zeroes the central 50% box', () => {
    const tensor = createFullTensor();
    const data = tensor.data as Float32Array;
    damageCutCenter(tensor);

    const h1 = Math.floor(H / 4);
    const h2 = Math.floor((3 * H) / 4);
    const w1 = Math.floor(W / 4);
    const w2 = Math.floor((3 * W) / 4);

    // Center box should be zeroed
    for (let y = h1; y < h2; y++) {
      for (let x = w1; x < w2; x++) {
        expect(data[0 * H * W + y * W + x]).toBe(0.0);
        expect(data[3 * H * W + y * W + x]).toBe(0.0);
      }
    }

    // Outer corner (0, 0) should be untouched
    expect(data[0 * H * W + 0 * W + 0]).toBe(1.0);
    expect(data[3 * H * W + 0 * W + 0]).toBe(1.0);
  });

  it('damageScatter randomly zeroes out cells roughly around the specified ratio', () => {
    const tensor = createFullTensor();
    const data = tensor.data as Float32Array;
    damageScatter(tensor, 0.5);

    let zeroCount = 0;
    const totalCells = H * W;
    for (let i = 0; i < totalCells; i++) {
      if (data[0 * H * W + i] === 0.0) {
        zeroCount++;
      }
    }

    // Expect between 30% and 70% of cells to be zeroed for a 50% scatter
    const ratio = zeroCount / totalCells;
    expect(ratio).toBeGreaterThan(0.25);
    expect(ratio).toBeLessThan(0.75);
  });

  it('damageSmallHole zeroes out the center circular cavity', () => {
    const tensor = createFullTensor();
    const data = tensor.data as Float32Array;
    damageSmallHole(tensor, 4);

    const cy = H / 2;
    const cx = W / 2;
    // Center pixel (10, 10)
    expect(data[0 * H * W + 10 * W + 10]).toBe(0.0);
    expect(data[3 * H * W + 10 * W + 10]).toBe(0.0);

    // Corner pixel (0, 0) is far away and must remain 1.0
    expect(data[0 * H * W + 0 * W + 0]).toBe(1.0);
  });

  it('applyDamagePreset correctly routes all damage types', () => {
    const tHalf = createFullTensor();
    applyDamagePreset(tHalf, 'cut_half');
    expect((tHalf.data as Float32Array)[0 * H * W + 0 * W + (W - 1)]).toBe(0.0);

    const tCenter = createFullTensor();
    applyDamagePreset(tCenter, 'cut_center');
    expect((tCenter.data as Float32Array)[0 * H * W + 10 * W + 10]).toBe(0.0);

    const tHole = createFullTensor();
    applyDamagePreset(tHole, 'small_hole');
    expect((tHole.data as Float32Array)[0 * H * W + 10 * W + 10]).toBe(0.0);
  });
});

describe('Hidden Channel Extraction & Colormapping', () => {
  const H = 8;
  const W = 8;
  const CHANNELS = 16;

  function createTestTensor(): Tensor {
    const data = new Float32Array(1 * CHANNELS * H * W);
    for (let c = 0; c < CHANNELS; c++) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          data[c * H * W + y * W + x] = (c + 1) * 0.1;
        }
      }
    }
    return new Tensor('float32', data, [1, CHANNELS, H, W]);
  }

  it('CHANNEL_METADATA contains 16 correctly indexed channels', () => {
    expect(CHANNEL_METADATA.length).toBe(16);
    expect(CHANNEL_METADATA[0].name).toContain('Red');
    expect(CHANNEL_METADATA[3].name).toContain('Alpha');
    expect(CHANNEL_METADATA[4].category).toBe('hidden');
    expect(CHANNEL_METADATA[15].category).toBe('hidden');
  });

  it('sampleColormap generates RGB triples in [0, 255] range across all colormap modes', () => {
    const colormaps = ['viridis', 'plasma', 'turbo', 'grayscale'] as const;
    colormaps.forEach((cm) => {
      const [r0, g0, b0] = sampleColormap(0.0, cm);
      const [r5, g5, b5] = sampleColormap(0.5, cm);
      const [r1, g1, b1] = sampleColormap(1.0, cm);

      [r0, g0, b0, r5, g5, b5, r1, g1, b1].forEach((val) => {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(255);
      });
    });
  });

  it('extractChannelAsImageData correctly extracts pixel data and computes stats', () => {
    const tensor = createTestTensor();
    const snap = extractChannelAsImageData(tensor, 4, H, W, 'viridis');

    expect(snap.index).toBe(4);
    expect(snap.pixels).toBeInstanceOf(Uint8ClampedArray);
    expect(snap.pixels.length).toBe(H * W * 4);
    expect(snap.meanEnergy).toBeGreaterThan(0);
    expect(snap.info.category).toBe('hidden');
  });

  it('extractAllChannelSnapshots extracts all 16 channels in order', () => {
    const tensor = createTestTensor();
    const all = extractAllChannelSnapshots(tensor, H, W, 'plasma');

    expect(all.length).toBe(16);
    expect(all[0].index).toBe(0);
    expect(all[15].index).toBe(15);
  });
});

