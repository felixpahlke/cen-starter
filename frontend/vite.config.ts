import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // The API port lives in the root .env so backend and proxy can't drift apart.
  const env = loadEnv(mode, path.resolve(import.meta.dirname, ".."), "");
  const apiPort = env.API_PORT || "3000";

  return {
    plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "src") },
    },
    server: {
      port: Number(env.WEB_PORT) || 5173,
      proxy: { "/api": `http://localhost:${apiPort}` },
    },
  };
});
