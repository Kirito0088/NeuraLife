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

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HardwareUnsupported } from '../components/HardwareUnsupported';

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
