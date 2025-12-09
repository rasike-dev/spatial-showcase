

import { optimizeGLTF } from '@iwsdk/vite-plugin-gltf-optimizer';
import { injectIWER } from '@iwsdk/vite-plugin-iwer';
import { compileUIKit } from '@iwsdk/vite-plugin-uikitml';
import { defineConfig } from 'vite';

// Conditionally import mkcert only in development
const isProduction = process.env.NODE_ENV === 'production';

// Determine activation URL based on environment
const getActivationUrl = () => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NODE_ENV === 'production') {
    // Use environment variable or fallback
    return process.env.VITE_ACTIVATION_URL || 'https://your-app.vercel.app';
  }
  return 'localhost';
};

// Build plugins array - mkcert will be added conditionally in async config
const basePlugins = [
  injectIWER({
    device: 'metaQuest3',
    activation: getActivationUrl(),
    verbose: !isProduction // Only verbose in development
  }),
  compileUIKit({ sourceDir: 'ui', outputDir: 'public/ui', verbose: !isProduction }),
  optimizeGLTF({
    level: 'medium'
  })
];

export default defineConfig(async () => {
  // Only import mkcert in development
  const plugins = [...basePlugins];
  
  if (!isProduction) {
    try {
      const mkcert = (await import('vite-plugin-mkcert')).default;
      plugins.unshift(mkcert()); // Add at the beginning
    } catch (e) {
      // mkcert not available, skip
      console.warn('mkcert not available, skipping HTTPS in development');
    }
  }

  return {
    plugins,
    server: { 
      host: '0.0.0.0', 
      port: 8081, 
      open: true,
      https: !isProduction, // Only use HTTPS in development (with mkcert if available)
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
      sourcemap: false, // Disable sourcemaps in production for smaller builds
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
  };
});
