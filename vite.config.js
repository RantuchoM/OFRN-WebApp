import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// Solución para __dirname en módulos ES
const __dirname = path.resolve();

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      workbox: {
        // CORRECCIÓN: Aquí es donde debe estar el aumento de límite
        // 6 MiB = 6 * 1024 * 1024 bytes (aprox 6.3 millones de bytes)
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, 
        
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
      },
      manifest: {
        name: "OFRN - App",
        short_name: "OFRN",
        description: "",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "react-filerobot-image-editor",
      "@scaleflex/ui/core",
      "react-konva",
      "konva",
      "styled-components",
    ],
    esbuildOptions: {
      inject: [path.resolve(__dirname, "./src/react-shim.js")],
    },
  },
  define: {
    global: "window",
  },
});