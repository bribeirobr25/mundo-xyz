import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { LOCAL_ORIGIN } from "./src/local-dev.js";

export default defineConfig({
  plugins: [react()],
  build: { sourcemap: false },
  server: {
    proxy: { "/api": LOCAL_ORIGIN, "/share": LOCAL_ORIGIN },
  },
});
