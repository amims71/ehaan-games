import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  build: { outDir: 'dist' },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // Use the static manifest in public/; do not inject a generated one.
      manifest: false,
      workbox: { globPatterns: ['**/*.{js,css,html,png,json,m4a,ogg}'] },
    }),
  ],
});
