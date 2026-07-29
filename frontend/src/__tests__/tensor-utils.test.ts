/**
 * Tests for tensor-utils.ts
 *
 * Seams tested:
 *   1. createInitialState — correct shape, seed placement, zero background
 *   2. extractRGBA — correct RGBA pixel extraction from synthetic tensor
 */

import { describe, it, expect } from 'vitest';
import { Tensor } from 'onnxruntime-web';
import { createInitialState, extractRGBA, applyDamage } from '../inference/tensor-utils';

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
