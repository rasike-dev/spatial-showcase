

import { optimizeGLTF } from '@iwsdk/vite-plugin-gltf-optimizer';
import { injectIWER } from '@iwsdk/vite-plugin-iwer';

import { compileUIKit } from '@iwsdk/vite-plugin-uikitml';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  plugins: [
    mkcert(),
    injectIWER({
      device: 'metaQuest3',
      activation: 'localhost',
      verbose: true 
    }),
    
    compileUIKit({ sourceDir: 'ui', outputDir: 'public/ui', verbose: true }),
    optimizeGLTF({
      level: 'medium'
    }),
  ],
  server: { 
    host: '0.0.0.0', 
    port: 8081, 
    open: true,
    https: true, // mkcert enables HTTPS
    strictPort: true,
    // Disable caching in development to ensure latest code is loaded
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 8081,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    target: 'esnext',
    rollupOptions: {
      input: './index.html',
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  esbuild: { target: 'esnext' },
  optimizeDeps: {
    exclude: ['@babylonjs/havok'],
    esbuildOptions: { target: 'esnext' }
  },
  publicDir: 'public',
  base: '/'
});
