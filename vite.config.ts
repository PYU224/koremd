import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tsconfigPaths from 'vite-tsconfig-paths'; // ← これが必要
import path from 'path';

export default defineConfig({
  plugins: [
    vue(),
    tsconfigPaths(), // これが重要
    ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8100,
  },
});
