import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite builds the SPA into ./dist, which Cloudflare Pages serves statically.
// The /functions directory is picked up automatically by Pages (no bundling config needed here).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 5173,
  },
});
