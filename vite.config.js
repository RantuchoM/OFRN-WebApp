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
        maximumFileSizeToCacheInBytes: 8000000,
        
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
  build: {
    // Reduce ruido en consola durante builds grandes
    chunkSizeWarningLimit: 2000,
    // Ahorra espacio/despliegue; evita sourcemaps en producción
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          const vendorPdf =
            id.includes("node_modules/pdfjs-dist") || id.includes("pdfjs-dist") ||
            id.includes("node_modules/pdf-lib") || id.includes("pdf-lib");
          if (vendorPdf) return "vendor-pdf";

          const vendorReact =
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router-dom/");
          if (vendorReact) return "vendor-react";

          const vendorUi =
            id.includes("node_modules/lucide-react/") ||
            id.includes("node_modules/framer-motion/");
          if (vendorUi) return "vendor-ui";

          return undefined;
        },
      },
    },
  },
});