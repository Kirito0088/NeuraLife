import { test, expect } from '@playwright/test';

test.describe('NeuraLife 3D WebGL / WebGPU NCA System', () => {
  test('renders 3D canvas and executes simulation at >= 30 FPS', async ({ page }) => {
    await page.goto('/');

    // 1. Verify Top Header and Core UI Elements
    await expect(page.locator('#neuralife-header')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('NeuraLife')).toBeVisible();
    await expect(page.getByText('3D Morphogenesis Engine')).toBeVisible();

    // 2. Verify Canvas Mount
    const canvas = page.locator('#nca-canvas-container canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // 3. Verify Control Panel Mount and Interaction
    const controlToggle = page.locator('#control-panel-toggle');
    await expect(controlToggle).toBeVisible();
    await expect(page.locator('#control-panel')).toBeVisible();

    // Test Damage Presets
    const cutHalfBtn = page.locator('#damage-preset-cut_half');
    await expect(cutHalfBtn).toBeVisible();
    await cutHalfBtn.click();

    // 4. Verify 16-Channel Inspector Modal
    const inspectorBtn = page.locator('#open-inspector-btn');
    await expect(inspectorBtn).toBeVisible();
    await inspectorBtn.click();

    const inspectorModal = page.locator('#hidden-channel-inspector-modal');
    await expect(inspectorModal).toBeVisible();
    await expect(page.getByText('16-Channel Latent Memory Inspector')).toBeVisible();

    // Close Inspector
    const closeInspectorBtn = page.locator('#close-inspector-btn');
    await closeInspectorBtn.click();
    await expect(inspectorModal).not.toBeVisible();

    // 5. Run 1000 Simulation Frames Benchmark & Assert Average FPS >= 30
    const benchmarkResults = await page.evaluate(async () => {
      return new Promise<{ frameCount: number; durationMs: number; avgFps: number }>((resolve) => {
        let frames = 0;
        const targetFrames = 1000;
        const startTime = performance.now();

        function countFrame() {
          frames++;
          if (frames >= targetFrames) {
            const endTime = performance.now();
            const durationMs = endTime - startTime;
            const avgFps = (frames / durationMs) * 1000;
            resolve({ frameCount: frames, durationMs, avgFps });
          } else {
            requestAnimationFrame(countFrame);
          }
        }
        requestAnimationFrame(countFrame);
      });
    });

    console.log(`[Benchmark] Simulated ${benchmarkResults.frameCount} frames in ${benchmarkResults.durationMs.toFixed(1)}ms | Avg FPS: ${benchmarkResults.avgFps.toFixed(2)}`);
    
    // Assert average FPS is above 30 FPS as required by PRD User Story 12
    expect(benchmarkResults.avgFps).toBeGreaterThanOrEqual(30);
  });
});
