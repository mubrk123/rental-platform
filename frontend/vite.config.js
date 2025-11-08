import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ✅ Final configuration for GitHub Pages + Custom Domain (newbikeworld.in)
export default defineConfig({
  plugins: [react()],
  base: "/", // Correct for custom domain (NOT /rental-platform/)
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: true,
  },
});
