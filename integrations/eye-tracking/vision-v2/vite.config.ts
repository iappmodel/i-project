import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "::",
    port: 8090,
    strictPort: true
  }
});

