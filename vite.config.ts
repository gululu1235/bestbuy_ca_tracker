import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // base: './' ensures assets are loaded correctly on GitHub Pages (e.g. username.github.io/repo/)
  base: './', 
  build: {
    outDir: 'dist',
  }
});