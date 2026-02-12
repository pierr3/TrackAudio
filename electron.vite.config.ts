import { resolve } from 'path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: {
      externalizeDeps: {
        exclude: ['electron-updater', 'builder-util-runtime', 'debug', 'ms']
      },
      sourcemap: true
    }
  },
  preload: {
    build: {
      externalizeDeps: true,
      sourcemap: true
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '~bootstrap': resolve(__dirname, 'node_modules/bootstrap'),
        '~bootstrap-icons': resolve(__dirname, 'node_modules/bootstrap-icons'),
        '~bootstrap-typeahead': resolve(__dirname, 'node_modules/react-bootstrap-typeahead')
      }
    },
    plugins: [react()],
    build: {
      sourcemap: true
    }
  }
});
