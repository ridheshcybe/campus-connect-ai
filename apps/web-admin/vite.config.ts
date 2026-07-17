import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev server proxies /api to the api-server so there is no CORS in dev
// and the frontend can use relative URLs.
//
// Workspace packages are aliased to their TypeScript source so Vite/esbuild
// transpiles them natively (avoids CJS named-export interop issues). The
// api-server consumes the same packages via their built `dist` output.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@campus/types": fileURLToPath(
        new URL("../../packages/types/src/index.ts", import.meta.url),
      ),
      "@campus/config": fileURLToPath(
        new URL("../../packages/config/src/index.ts", import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
