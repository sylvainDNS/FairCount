import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const gitSha = process.env.VITE_GIT_SHA || execSync('git rev-parse HEAD').toString().trim();
const buildDate = process.env.VITE_BUILD_DATE || new Date().toISOString();

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
      manifest: false, // We use our own manifest.json in public/
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/features': resolve(__dirname, './src/features'),
      '@/shared': resolve(__dirname, './src/shared'),
      '@/db': resolve(__dirname, './src/db'),
    },
  },
  server: {
    port: 3000,
  },
  define: {
    __GIT_SHA__: JSON.stringify(gitSha),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
