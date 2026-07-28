import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/apply-flow/",
  plugins: [react()],
  define: {
    "process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL": JSON.stringify(""),
    "process.env.VITE_GOOGLE_APPS_SCRIPT_URL": JSON.stringify(""),
  },
  build: {
    outDir: "dist-pages",
    emptyOutDir: true,
  },
});
