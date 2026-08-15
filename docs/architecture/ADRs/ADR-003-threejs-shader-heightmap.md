# ADR-003: Three.js Custom ShaderMaterial Heightmap & Normal Map on Integrated Graphics

## Status
Accepted

## Context
Rendering a 2D cellular automata grid as a flat canvas lacks visual depth and tactile responsiveness. However, generating full 3D polygonal geometry (e.g. 16,384 distinct voxels or cubes) degrades frame rates below 20 FPS on integrated Intel UHD GPUs.

## Decision
We utilize a single high-resolution plane geometry with a custom Three.js `ShaderMaterial`:
1. **Vertex Shader:** Displaces plane vertices along their normals based on the cellular alpha / energy channel ($z = \text{heightScale} \times A$).
2. **Fragment Shader:** Dynamically computes surface normals on the GPU using finite difference texel sampling:
   $$\vec{n} = \text{normalize}\left(\begin{bmatrix} (h_L - h_R) \cdot \sigma \\ (h_D - h_U) \cdot \sigma \\ 0.5 \end{bmatrix}\right)$$
3. **Colormapping & Palettes:** Dynamically remaps cellular state into cyber neon, bioluminescent emerald, solar fire, or ice hologram themes on the fly.

## Consequences
- **Positive:** Delivers full 3D lighting, specular highlights, and organic height contours at continuous 60 FPS on Intel UHD graphics.
- **Negative:** Requires GPU vertex texture fetching capability (supported by WebGL 2.0 and WebGPU).
