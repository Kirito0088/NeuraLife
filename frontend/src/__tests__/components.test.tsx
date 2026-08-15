/**
 * Component tests for HardwareUnsupported and NCACanvas.
 *
 * Seams tested:
 *   1. HardwareUnsupported — renders the fallback UI with expected structure
 *   2. NCACanvas — mounts a <canvas> element
 *
 * Note: NCACanvas tests use a minimal mount check. Full integration
 * testing (ONNX session + inference loop) is covered by Playwright E2E
 * in tests/e2e/ (Omkar's domain — TICK-03+).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HardwareUnsupported } from '../components/HardwareUnsupported';
import { ControlPanel } from '../components/ControlPanel';
import { HiddenChannelInspector } from '../components/HiddenChannelInspector';
import { createInitialState } from '../inference/tensor-utils';
import type { ControlState, BiomassMetrics } from '../components/ControlPanel';

describe('HardwareUnsupported', () => {
  it('renders the "Hardware Unsupported" heading', () => {
    render(<HardwareUnsupported />);
    const heading = screen.getByRole('heading', {
      name: /hardware unsupported/i,
    });
    expect(heading).toBeDefined();
  });

  it('renders the container div with id "hardware-unsupported"', () => {
    const { container } = render(<HardwareUnsupported />);
    const div = container.querySelector('#hardware-unsupported');
    expect(div).not.toBeNull();
  });

  it('displays the error message when provided', () => {
    const errorMsg = 'WebGPU and WebGL both failed to initialise.';
    render(<HardwareUnsupported errorMessage={errorMsg} />);
    const errorEl = screen.getByText(errorMsg);
    expect(errorEl).toBeDefined();
  });

  it('renders a video element when videoSrc is provided', () => {
    render(<HardwareUnsupported videoSrc="/assets/fallback.mp4" />);
    const video = document.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.getAttribute('src')).toBe('/assets/fallback.mp4');
  });

  it('does not render a video element when videoSrc is not provided', () => {
    render(<HardwareUnsupported />);
    const video = document.querySelector('video');
    expect(video).toBeNull();
  });
});

describe('ControlPanel Damage Presets', () => {
  const dummyControls: ControlState = {
    pattern: 'morpho-ring',
    brushMode: 'damage',
    brushRadius: 6,
    heightScale: 0.4,
    normalStrength: 0.8,
    paletteMode: 'neon',
    visualMode: 'bio-membrane',
    simulationEngine: 'morphogenesis',
    paused: false,
    autoRotate: true,
    stepMultiplier: 1,
    modelPath: '/models/nca_model.onnx',
    gridResolution: 128,
  };

  const dummyBiomass: BiomassMetrics = {
    activeCells: 500,
    totalCells: 16384,
    biomassPercent: 3.1,
  };

  it('renders all 4 catastrophic damage preset buttons in tools tab', () => {
    const { container } = render(
      <ControlPanel
        controls={dummyControls}
        biomass={dummyBiomass}
        onChange={vi.fn()}
        onReset={vi.fn()}
        onImageUpload={vi.fn()}
        onApplyDamagePreset={vi.fn()}
      />
    );

    // Switch to Interact tab
    const interactTabBtn = screen.getByText(/interact/i);
    fireEvent.click(interactTabBtn);

    expect(container.querySelector('#damage-preset-cut_half')).not.toBeNull();
    expect(container.querySelector('#damage-preset-cut_center')).not.toBeNull();
    expect(container.querySelector('#damage-preset-scatter')).not.toBeNull();
    expect(container.querySelector('#damage-preset-small_hole')).not.toBeNull();
  });

  it('triggers onApplyDamagePreset with the correct ID when clicked', () => {
    const onApplyDamagePreset = vi.fn();
    const { container } = render(
      <ControlPanel
        controls={dummyControls}
        biomass={dummyBiomass}
        onChange={vi.fn()}
        onReset={vi.fn()}
        onImageUpload={vi.fn()}
        onApplyDamagePreset={onApplyDamagePreset}
      />
    );

    // Switch to Interact tab
    const interactTabBtn = screen.getByText(/interact/i);
    fireEvent.click(interactTabBtn);

    const cutHalfBtn = container.querySelector('#damage-preset-cut_half') as HTMLElement;
    fireEvent.click(cutHalfBtn);
    expect(onApplyDamagePreset).toHaveBeenCalledWith('cut_half');

    const cutCenterBtn = container.querySelector('#damage-preset-cut_center') as HTMLElement;
    fireEvent.click(cutCenterBtn);
    expect(onApplyDamagePreset).toHaveBeenCalledWith('cut_center');

    const scatterBtn = container.querySelector('#damage-preset-scatter') as HTMLElement;
    fireEvent.click(scatterBtn);
    expect(onApplyDamagePreset).toHaveBeenCalledWith('scatter');

    const smallHoleBtn = container.querySelector('#damage-preset-small_hole') as HTMLElement;
    fireEvent.click(smallHoleBtn);
    expect(onApplyDamagePreset).toHaveBeenCalledWith('small_hole');
  });
});

describe('HiddenChannelInspector', () => {
  const dummyTensor = createInitialState(16, 16);

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <HiddenChannelInspector
        isOpen={false}
        onClose={vi.fn()}
        stateTensor={dummyTensor}
        gridWidth={16}
        gridHeight={16}
        active3DChannel={-1}
        onSelect3DChannel={vi.fn()}
      />
    );
    expect(container.querySelector('#hidden-channel-inspector-modal')).toBeNull();
  });

  it('renders the inspector modal with header and filter controls when isOpen is true', () => {
    const { container } = render(
      <HiddenChannelInspector
        isOpen={true}
        onClose={vi.fn()}
        stateTensor={dummyTensor}
        gridWidth={16}
        gridHeight={16}
        active3DChannel={-1}
        onSelect3DChannel={vi.fn()}
      />
    );
    expect(container.querySelector('#hidden-channel-inspector-modal')).not.toBeNull();
    expect(screen.getByText(/16-Channel Latent Memory Inspector/i)).toBeDefined();
    expect(container.querySelector('#filter-all-btn')).not.toBeNull();
    expect(container.querySelector('#filter-visible-btn')).not.toBeNull();
    expect(container.querySelector('#filter-hidden-btn')).not.toBeNull();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <HiddenChannelInspector
        isOpen={true}
        onClose={onClose}
        stateTensor={dummyTensor}
        gridWidth={16}
        gridHeight={16}
        active3DChannel={-1}
        onSelect3DChannel={vi.fn()}
      />
    );
    const closeBtn = container.querySelector('#close-inspector-btn') as HTMLElement;
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});


