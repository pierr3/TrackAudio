import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      sourcemap: true
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
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
