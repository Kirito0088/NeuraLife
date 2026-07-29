# AGENT.md: NeuralLife Project Context & Guidelines

## 1. System Overview
**Project:** NeuralLife - Neural Cellular Automata (NCA) system for pattern generation, morphogenesis, regeneration, and multi-target conditioning.
**Context:** B.E. 3rd Year (Sem 6) CSE (AIML) Group Project under Mumbai University (SPPU / PHN Technologies collaboration).

### 1.1 Architecture & Core Mechanics
- **State Vector:** 16-channel cell state vector (RGBA + 12 hidden perception states). Hidden states are initialized to zero, except for a single 'seed' cell in the center with alpha=1.0 and a learned embedding (or 1.0) for hidden states.
- **Perception:** 3x3 Sobel filters.
- **Update Mechanism:** 1x1 Conv update neural network (e.g., 16 -> 128 -> 16) kept very small to hit the ~50KB ONNX export target natively (FP32, no quantization).
- **Training Constraints:** BPTT steps sampled between 64-96 steps. Sample Pool size of 1024 to maintain long-term persistence. Gradient clipping (max norm 1.0) and spectral normalization on the 1x1 Conv layers prevent exploding gradients.
- **Loss Function:** L2 (MSE) on RGBA channels vs target image + L2 penalty on hidden states for sparsity.
- **Boundary Handling:** Zero padding (absorbing boundaries) to prevent infinite outward growth.

### 1.2 Frontend & Inference
- **Runtime:** `onnxruntime-web` using the WebGPU execution provider, with a WebGL fallback.
- **Rendering:** Three.js with a custom ShaderMaterial on a 2D plane, reading CA state from a texture and simulating 3D via heightmaps/normals to maintain 60 FPS on Intel UHD.
- **Interactions:** Three.js Raycaster maps mouse events to grid coordinates, zeroing out state channels in a radius for the damage brush.
- **Performance Fallback:** If inference+rendering drops below 60 FPS, the CA update frequency is dynamically reduced (step model every 2nd/3rd frame) while maintaining 60 FPS camera rendering. If WebGL/WebGPU fails to initialize, log to Sentry and show a pre-rendered video UI fallback.

## 2. Team, Hardware & Skills Matrix

| Member | Role | Hardware | Core Focus | Assigned Skills | Assigned MCP Servers |
|--------|------|----------|------------|-----------------|----------------------|
| **Jayesh (Lead)** | ML Model & Backend | Dell G15 5530 (i5, RTX 3050 6GB) | JAX/PyTorch, BPTT, ONNX, FastAPI | `ai-ml-developer`, `karpathy-guidelines`, `full-output-enforcement`, `google-antigravity-sdk`, `grill-with-docs`, `improve-codebase-architecture`, `resolving-merge-conflicts` | `huggingface`, `github-mcp-server`, `context7`, `render-deployment` |
| **Yash** | UI/UX & Frontend | i5 P-Series, Intel UHD (No GPU) | WebGL/Three.js, ONNX runtime, Brush, UI | `3d-web-experience`, `ui-ux-pro-max`, `frontend-design`, `framer-motion-animator`, `vercel-react-best-practices`, `web-design-guidelines` | `vercel`, `21st`, `mui-mcp`, `StitchMCP` |
| **Omkar** | QA & Testing Lead | ASUS TUF (i5, RTX 3050 6GB) | Edge cases, gradients, Playwright | `agent-browser`, `code-reviewer`, `tdd` | `playwright`, `chrome-devtools-mcp`, `semgrep`, `sentry` |
| **Pavitra**| Docs & Project Lead | i5 P-Series, Intel UHD (No GPU) | SPPU/PHN Reports, Diagrams, Docs | `humanizer`, `brandkit` | `context7`, `github-mcp-server` |

*Note: MCP servers are distributed in isolated environments. Team members should only install and run MCP servers assigned to their role to prevent context pollution.*

## 3. Repository File Tree Layout
```text
NeuralLife/
├── .github/
│   └── workflows/          # CI/CD pipelines (Playwright, Pytest)
├── ml_engine/              # Jayesh's domain
│   ├── models/             # PyTorch/JAX NCA models
│   ├── training/           # BPTT loops, sample pool logic
│   └── export/             # ONNX export scripts (target: dummy_model.onnx to real model)
├── frontend/               # Yash's domain
│   ├── src/
│   │   ├── components/     # React UI components, WebGL canvas fallback
│   │   ├── gl/             # Three.js ShaderMaterial, shaders, heightmap logic
│   │   └── inference/      # onnxruntime-web integration
│   └── public/
│       └── assets/         # Pre-rendered video fallback, UI assets
├── tests/                  # Omkar's domain
│   ├── ml/                 # Pytest for gradients, boundaries
│   └── e2e/                # Playwright average FPS assertion tests
├── docs/                   # Pavitra's domain
│   ├── architecture/       # ADRs, diagrams
│   └── sppu_reports/       # Academic reports
└── AGENT.md                # This file (Context & Guidelines)
```

## 4. Coding Guidelines

### 4.1 PyTorch/JAX (ML Engine)
- Use strict tensor shapes and documented dimensions (e.g., `[B, 16, H, W]`).
- Apply spectral normalization on 1x1 Convs and max norm clipping for gradients.
- Export to ONNX strictly using FP32, monitoring the final `.onnx` byte size to stay ~50KB.

### 4.2 React/WebGL (Frontend)
- Use standard functional components.
- The Three.js simulation runs outside the React render cycle to prevent UI blocking.
- Handle WebGPU/WebGL initialization gracefully. Dispatch a Sentry error and mount the video fallback if unsupported.

### 4.3 QA & Testing (Pytest & Playwright)
- Pytests must assert that boundaries don't leak (zero padding validation).
- Playwright tests must spawn a browser, run the CA simulation for 1000 frames, and assert the average FPS stays above 30, failing the CI/CD pipeline if it drops below.

## 5. Token Management & Git Branch Protocol

### 5.1 Token Optimization
- **Enforce strict PR scoping**: Keep pull requests focused on single features.
- **Maintain a highly summarized `AGENT.md`**: AI coding tools will use this file for context rather than indexing the entire repository.
- **Avoid pasting full stack traces**: Use Sentry links instead to save tokens.

### 5.2 Branch Isolation & Handoffs
- **Feature Branches**: Branch names must reflect the role and feature (e.g., `feat/ml-engine/onnx-export`, `feat/ui-renderer/shader-material`).
- **PR Approval**: Merging to `main` requires passing CI (Playwright/pytest) and PR approval from Omkar (QA Lead).
- **Interface Contracts**: Jayesh will provide a `dummy_model.onnx` with correct I/O tensors immediately so Yash can build the frontend. The real model will be swapped in once training is complete.

## 6. Matt Pocock Workflow & Skill Execution
We follow a strict ticket-driven engineering workflow using our installed AI skill suite.

1. `setup-matt-pocock-skills`: Run this to configure the GitHub issue tracker, establish triage label vocabulary, and generate the foundational doc structure.
2. `to-spec`: Synthesize context into a formal Product Requirements Document (PRD) and publish it as GitHub issues/specs.
3. `to-tickets`: Break down the PRD into tracer-bullet tickets assigned per team member. This includes dependency mapping (e.g., Yash depends on Jayesh's dummy ONNX).
4. `tdd`: Implement feature tickets using test-driven development (red-green-refactor loops).

## Agent skills

### Issue tracker

Issues and PRDs for this repo live as GitHub issues (using the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context repository layout (`CONTEXT.md` and `docs/adr/` at root). See `docs/agents/domain.md`.

