import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

// 14-digit UTC timestamp, computed once so client and worker bundles share it.
const BUILD_ID = new Date().toISOString().replace(/\D/g, "").slice(0, 14);

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
});
