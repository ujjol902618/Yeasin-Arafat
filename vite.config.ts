import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          admin: path.resolve(__dirname, 'admin.html'),
          login: path.resolve(__dirname, 'login.html'),
        },
        output: {
          manualChunks(id) {
            if (id.includes('firebase/auth') || id.includes('@firebase/auth')) {
              return 'firebase-auth';
            }
            if (id.includes('firebase/storage') || id.includes('@firebase/storage')) {
              return 'firebase-storage';
            }
            if (id.includes('firebase/firestore') || id.includes('@firebase/firestore')) {
              return 'firebase-firestore';
            }
            if (id.includes('node_modules/firebase') || id.includes('@firebase/')) {
              return 'firebase-core';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
