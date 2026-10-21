import { defineConfig } from "vite";
import { compressedAssets, modelChunkName } from "./scripts/cacheable_build.js";
export default defineConfig({
  base: "./",
  server: { host: "127.0.0.1", port: 5178 },
  plugins: [compressedAssets()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: modelChunkName },
            { name: "engine", test: /node_modules\/three\// },
          ],
        },
      },
    },
  },
});
