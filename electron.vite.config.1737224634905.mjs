// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
var __electron_vite_injected_dirname = "C:\\Users\\George\\Documents\\Dev\\C++\\TrackAudio";
var electron_vite_config_default = defineConfig({
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
        "@renderer": resolve("src/renderer/src"),
        "~bootstrap": resolve(__electron_vite_injected_dirname, "node_modules/bootstrap"),
        "~bootstrap-icons": resolve(__electron_vite_injected_dirname, "node_modules/bootstrap-icons"),
        "~bootstrap-typeahead": resolve(__electron_vite_injected_dirname, "node_modules/react-bootstrap-typeahead")
      }
    },
    plugins: [react()],
    build: {
      sourcemap: true
    }
  }
});
export {
  electron_vite_config_default as default
};
