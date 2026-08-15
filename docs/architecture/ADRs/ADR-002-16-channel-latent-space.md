# ADR-002: 16-Channel Latent Space Formulation & Absorbing Boundaries

## Status
Accepted

## Context
Neural Cellular Automata requires persistent memory across spatial cells to coordinate pattern morphogenesis, self-organization, and regeneration following catastrophic damage. Standard 4-channel RGBA state vectors are mathematically insufficient to store spatial directional vectors, gradient histories, and cell differentiation states.

## Decision
1. **State Tensor Dimension:** Each spatial cell $(y, x)$ is assigned a 16-dimensional continuous state vector:
   - Channels 0..3: $[R, G, B, A]$ visible rendering channels and alive alpha gating.
   - Channels 4..15: 12 hidden latent channels encoding morphogenetic gradient memory.
2. **Perception Loop:** 3x3 depthwise Sobel perception filters compute horizontal ($\nabla_x$) and vertical ($\nabla_y$) spatial gradients across all 16 channels, yielding 48 perception features per cell.
3. **Absorbing Boundary Conditions:** Hard zero-padding border masks are applied on every forward pass (rows 0 & $H-1$, cols 0 & $W-1$) to prevent state leaking and infinite outward growth.

## Consequences
- **Positive:** Enables long-term self-healing, morphogenetic symmetry, and hidden state inspection.
- **Negative:** Increased tensor buffer size from 4 to 16 floats per cell (mitigated by FP32 flat TypedArrays in JavaScript).
