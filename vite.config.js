import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// Solución para __dirname en módulos ES (por si tu proyecto lo requiere)
const __dirname = path.resolve();

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Opcional: Esto ayuda a que el nuevo service worker tome el control rápido
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false, // Importante: lo manejaremos nosotros con el botón
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
  // --- AQUÍ ESTÁ LA SOLUCIÓN REFORZADA ---
  optimizeDeps: {
    // Forzamos la inclusión de todas las dependencias problemáticas
    include: [
      "react-filerobot-image-editor",
      "@scaleflex/ui/core",
      "react-konva",
      "konva",
      "styled-components",
    ],
    esbuildOptions: {
      // Inyectamos el shim en TODAS ellas
      inject: [path.resolve(__dirname, "./src/react-shim.js")],
    },
  },
  define: {
    global: "window", // Polyfill adicional
  },
});
