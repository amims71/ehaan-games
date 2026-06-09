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
      workbox: {
        // Precache only the app shell — NOT the many audio clips (keeps first load light).
        globPatterns: ['**/*.{js,css,html,png,json}'],
        // Audio is fetched on demand the first time a clip plays, then cached at runtime.
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.endsWith('.m4a'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-clips',
              expiration: { maxEntries: 250, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
