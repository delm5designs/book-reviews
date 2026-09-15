import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves project sites from /<repo>/. The deploy workflow sets
// VITE_BASE_PATH to match the repository name; local dev falls back to "/".
const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
