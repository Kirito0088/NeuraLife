# PRD: Neural UI Cellular Automata (NeuralLife) - Morphogenesis, Regeneration & 3D WebGL Inference

> **Status**: Ready for Agent  
> **Labels**: `ready-for-agent`, `prd`, `specification`  
> **Target Repo**: Kirito0088/NeuraLife  

---

## Problem Statement

Standard pattern generation and procedural graphics systems rely either on pre-rendered video assets or heavy 3D physics engines, making them unsuitable for low-power edge hardware (e.g., Intel UHD integrated graphics). Furthermore, static graphics cannot dynamically regenerate or adapt when damaged or perturbed. A client-side, self-healing Neural Cellular Automata (NCA) system is required that runs in real-time within strict compute (~50KB FP32 ONNX model payload) and frame-rate (60 FPS rendering, minimum 30 FPS inference) constraints.

---

## Solution

NeuralLife is a WebGL/WebGPU-accelerated Neural Cellular Automata system featuring:
1. A **16-channel cell state vector** (RGBA channels + 12 hidden perception/morphogenesis states).
2. A lightweight **1x1 Conv update neural network** (16 -> 128 -> 16 architecture, FP32 ONNX export $\le 50\text{KB}$) trained via PyTorch/JAX Backpropagation Through Time (BPTT).
3. Client-side inference via **`onnxruntime-web`** (WebGPU provider with WebGL fallback).
4. **Three.js rendering** with custom `ShaderMaterial` mapping 2D CA state textures as simulated 3D heightmaps and normal maps.
5. An interactive **Raycaster damage brush** for real-time perturbation and morphogenetic self-healing.
6. Automated **performance monitoring & video UI fallbacks** for low-end devices.

---

## User Stories

1. As an ML Engineer (Jayesh), I want a 16-channel PyTorch/JAX NCA model architecture (RGBA + 12 hidden perception states), so that the system can encode complex morphogenetic patterns and hidden state persistence.
2. As an ML Engineer (Jayesh), I want 3x3 Sobel perception filters applied across all channels, so that each cell can observe surrounding spatial gradients and state transitions.
3. As an ML Engineer (Jayesh), I want a 1x1 Conv update neural network (16 -> 128 -> 16 architecture) with spectral normalization and gradient clipping (max norm 1.0), so that training remains stable during Backpropagation Through Time (BPTT) without exploding gradients.
4. As an ML Engineer (Jayesh), I want a Sample Pool of size 1024 and BPTT steps sampled between 64 and 96 steps, so that the model learns long-term persistence and self-healing behavior.
5. As an ML Engineer (Jayesh), I want to export the trained NCA model into FP32 ONNX format under 50KB byte size (`nca_model.onnx`) along with an immediate `dummy_model.onnx`, so that the frontend team can integrate inference without waiting for full model convergence.
6. As a Frontend Developer (Yash), I want to load `onnxruntime-web` using WebGPU execution provider with WebGL fallback, so that the CA model runs client-side at high performance.
7. As a Frontend Developer (Yash), I want a Three.js canvas with custom ShaderMaterial rendering 2D CA state textures as simulated 3D heightmaps and normal maps, so that the UI delivers a rich 3D aesthetic on Intel UHD graphics.
8. As a Web App User, I want a Raycaster damage brush tool that zeros out state channels within a selectable cursor radius, so that I can interactively damage the pattern and observe real-time neural regeneration.
9. As a Web App User, I want a dynamic performance fallback system that throttles CA update frequency if FPS drops below 60 while preserving 60 FPS camera controls, so that the UI remains smooth even under heavy GPU load.
10. As a Web App User, I want a pre-rendered video UI fallback if WebGL/WebGPU fails to initialize, so that the application remains functional and visually informative on unsupported devices.
11. As a QA Lead (Omkar), I want Pytest suites verifying zero-padding absorbing boundaries and tensor shape integrity, so that state values do not leak across grid borders.
12. As a QA Lead (Omkar), I want Playwright E2E browser tests that run 1000 CA simulation frames and assert average frame rates exceed 30 FPS, so that performance regressions fail CI/CD builds automatically.
13. As a Project Lead (Pavitra), I want structured academic reports (SPPU format) and architecture diagrams, so that project documentation satisfies university and partner requirements.

---

## Implementation Decisions

### Modules & Architecture Boundaries
- **`ml_engine/`**: Contains PyTorch/JAX model definitions, Sobel perception filters, 1x1 Conv update network, BPTT trainer with 1024 sample pool, and ONNX exporter.
- **`frontend/`**: React single-page app containing Three.js canvas, `onnxruntime-web` engine manager, heightmap/normal custom shaders, Raycaster damage brush component, and video fallback UI.
- **`tests/`**: Pytest regression suite (`tests/ml/`) for tensor shapes, boundary zeroing, and model byte size; Playwright E2E suite (`tests/e2e/`) for 30+ FPS browser benchmarks over 1000 frames.
- **`docs/`**: SPPU project reports, architecture diagrams, and ADR records.

### Interfaces & Contracts
- **ONNX Model Contract**: Model accepts input tensor `[1, 16, H, W]` (FP32) and outputs tensor `[1, 16, H, W]` (FP32). State channel 0..3 represent RGBA; channels 4..15 represent hidden morphogenetic memory.
- **Boundary Handling**: Hard zero-padding (absorbing boundaries) applied at tensor edges to prevent state amplification.
- **Frontend Unblocking**: Jayesh provides `dummy_model.onnx` immediately so Yash can build the WebGL canvas before full model convergence.

---

## Testing Decisions

### Seams & Principles
- **Testing Seam 1 (Primary System Seam)**: E2E Playwright Browser testing (`tests/e2e/`). Tests observable web behavior (canvas load, FPS counter $\ge 30$ over 1000 frames, raycaster interaction, video fallback trigger).
- **Testing Seam 2 (Model Contract Seam)**: Pytest ML testing (`tests/ml/`). Tests tensor bounds, zero-padding absorption, gradient stability, and ONNX binary size ($\le 50\text{KB}$).
- **Prior Art**: Pytest tensor assertion patterns and Playwright canvas performance benchmarking.

---

## Out of Scope

- Distributed multi-GPU training clusters.
- Server-side neural inference endpoints (all inference is strictly client-side via ONNX Web).
- FP16/INT8 post-training quantization (model must natively fit $\le 50\text{KB}$ in FP32).
- Multi-user real-time state synchronization over WebSockets.

---

## Further Notes

- **Team Ownership Matrix**:
  - Jayesh: `ml_engine/`, PyTorch/JAX, BPTT, ONNX Export
  - Yash: `frontend/`, Three.js, `onnxruntime-web`, Shaders, Damage Brush
  - Omkar: `tests/`, Pytest, Playwright E2E benchmarks
  - Pavitra: `docs/`, SPPU Reports, Architecture Diagrams
- Next step in Matt Pocock workflow: Run `/to-tickets` to break down this PRD into tracer-bullet GitHub tickets for each team member.
