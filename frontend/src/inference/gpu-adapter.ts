/**
 * GPU Adapter Detection Utility
 *
 * Probes the browser for WebGPU or WebGL support and logs the active
 * GPU adapter name/vendor to the console. This lets us verify during
 * development that Chrome is using the dedicated RTX 3050 rather than
 * the integrated Intel UHD.
 */

export interface GPUAdapterInfo {
  backend: 'webgpu' | 'webgl' | 'none';
  adapterName: string;
  vendor: string;
}

/**
 * Detects the available GPU backend and logs adapter details.
 *
 * WebGPU path: uses `navigator.gpu.requestAdapter()` to get the adapter
 * info (device name, vendor).
 *
 * WebGL path: creates an offscreen canvas, gets a WebGL2 (or WebGL1)
 * context, and queries the `WEBGL_debug_renderer_info` extension for
 * the unmasked renderer/vendor strings.
 *
 * Returns `{ backend: 'none', ... }` if neither is available.
 */
export async function logGPUAdapter(): Promise<GPUAdapterInfo> {
  // --- WebGPU probe ---
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        const info = adapter.info;
        const result: GPUAdapterInfo = {
          backend: 'webgpu',
          adapterName: info.device || 'Unknown Device',
          vendor: info.vendor || 'Unknown Vendor',
        };
        console.log(
          `[NeuraLife] GPU Adapter: ${result.adapterName} (${result.vendor})`,
        );
        console.log('[NeuraLife] GPU Backend: webgpu');
        return result;
      }
    } catch {
      // WebGPU available but adapter request failed — fall through to WebGL.
    }
  }

  // --- WebGL probe ---
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ??
      (canvas.getContext('webgl') as WebGLRenderingContext | null);

    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : 'Unknown Renderer';
      const vendor = debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
        : 'Unknown Vendor';

      const result: GPUAdapterInfo = {
        backend: 'webgl',
        adapterName: String(renderer),
        vendor: String(vendor),
      };
      console.log(
        `[NeuraLife] GPU Adapter: ${result.adapterName} (${result.vendor})`,
      );
      console.log('[NeuraLife] GPU Backend: webgl');

      // Clean up the throwaway context.
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();

      return result;
    }
  } catch {
    // WebGL probe failed — fall through.
  }

  // --- No GPU backend available ---
  const result: GPUAdapterInfo = {
    backend: 'none',
    adapterName: 'None',
    vendor: 'None',
  };
  console.warn('[NeuraLife] No WebGPU or WebGL backend available.');
  return result;
}
