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
 * Populates a vibrant test pattern on an existing state tensor
 * so the initial canvas state is visually bright and clear for testing/damaging.
 */
export function populateTestPattern(tensor: ort.Tensor): void {
  const dims = tensor.dims;
  if (dims.length !== 4) return;
  const channels = dims[1];
  const height = dims[2];
  const width = dims[3];

  const data = tensor.data as Float32Array;
  const planeSize = height * width;
  const centerY = Math.floor(height / 2);
  const centerX = Math.floor(width / 2);
  const radius = Math.floor(Math.min(height, width) / 3.5);
  const radiusSq = radius * radius;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dy = y - centerY;
      const dx = x - centerX;
      if (dx * dx + dy * dy <= radiusSq) {
        const spatialIdx = y * width + x;
        const normDist = Math.sqrt(dx * dx + dy * dy) / radius;
        
        // Vibrant cyan-magenta-green gradient
        data[0 * planeSize + spatialIdx] = 0.4 + 0.5 * (1 - normDist); // Red
        data[1 * planeSize + spatialIdx] = 0.7 * (1 - normDist);       // Green
        data[2 * planeSize + spatialIdx] = 0.9;                        // Blue
        data[3 * planeSize + spatialIdx] = 1.0;                        // Alpha

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
