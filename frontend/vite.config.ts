import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function serveOnnxWasmPlugin(): Plugin {
  return {
    name: 'serve-onnx-wasm',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url.endsWith('.wasm') || req.url.endsWith('.mjs'))) {
          const fileName = path.basename(req.url.split('?')[0]);
          const wasmPath = path.resolve(
            __dirname,
            'node_modules/onnxruntime-web/dist',
            fileName
          );
          if (fs.existsSync(wasmPath)) {
            const contentType = req.url.endsWith('.wasm')
              ? 'application/wasm'
              : 'application/javascript';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
            fs.createReadStream(wasmPath).pipe(res);
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serveOnnxWasmPlugin()],

  server: {
    host: true,
    port: 5173,
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

