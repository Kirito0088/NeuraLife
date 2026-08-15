# ADR-001: Client-Side WebGPU/WebGL Neural Cellular Automata Inference

## Status
Accepted

## Context
Standard neural cellular automata systems and morphogenetic simulations rely on server-side GPU clusters or Python backends (PyTorch/JAX) communicating over WebSockets or HTTP streams. However, for interactive real-time simulation (60 FPS rendering, minimum 30 FPS neural stepping) on low-power student edge devices (e.g., Intel UHD integrated graphics on Dell/ASUS laptops), server roundtrips introduce unacceptable network latency (>50ms) and high cloud operational costs.

## Decision
We execute the entire NCA neural inference client-side inside the browser using `onnxruntime-web` with a tiered execution provider fallback chain:
1. **Primary Provider:** WebGPU execution provider for maximum hardware acceleration on dedicated or modern integrated GPUs.
2. **Fallback Provider:** WebGL execution provider for older browsers / hardware.
3. **Graceful Fallback UI:** If both GPU providers fail, gracefully display a pre-rendered fallback video and log telemetry.

## Consequences
- **Positive:** Zero server-side compute cost; instantaneous sub-5ms local step latency; offline capability.
- **Negative:** Strict constraint on neural network size ($\le 50\text{KB}$ in FP32 format) to ensure sub-second initial download and execution on edge hardware.
