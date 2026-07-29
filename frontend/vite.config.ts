import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    headers: {
      // Required by onnxruntime-web for SharedArrayBuffer / WebGPU.
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  optimizeDeps: {
    // Prevent Vite from trying to pre-bundle onnxruntime-web's WASM files.
    exclude: ['onnxruntime-web'],
  },

  assetsInclude: ['**/*.onnx'],
});
