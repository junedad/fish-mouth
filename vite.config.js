import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ponytail: config minimale ; le build sort dans dist/ (preset Vercel "Vite")
export default defineConfig({
  plugins: [react()],
  server: { host: true },
});
