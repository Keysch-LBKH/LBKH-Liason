import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

// Plugin: copy dist/index.html → dist/404.html for Cloudflare Pages SPA routing
function spaFallback(): import('vite').Plugin {
  return {
    name: 'spa-fallback',
    closeBundle() {
      const src = path.resolve(__dirname, 'dist/index.html');
      const dest = path.resolve(__dirname, 'dist/404.html');
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log('✓ Copied dist/index.html → dist/404.html (SPA fallback)');
      }
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), spaFallback()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3001,
      host: true,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
