import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// Solución para __dirname en módulos ES
const __dirname = path.resolve();

/** Identificador de build embebido en el cliente y servido en /version.json para detectar despliegues nuevos. */
const APP_BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.VITE_APP_BUILD_ID ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function appVersionPlugin(buildId) {
  const versionPayload = JSON.stringify({ buildId });
  return {
    name: "app-version",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/version.json") return next();
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(versionPayload);
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: versionPayload,
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    appVersionPlugin(APP_BUILD_ID),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        
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
    dedupe: ["quill"],
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
    "import.meta.env.VITE_APP_BUILD_ID": JSON.stringify(APP_BUILD_ID),
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

          const vendorEditors =
            id.includes("node_modules/react-quill/") ||
            id.includes("node_modules/quill/") ||
            id.includes("node_modules/konva/") ||
            id.includes("node_modules/react-konva/");
          if (vendorEditors) return "vendor-editors";

          const vendorDocs =
            id.includes("node_modules/exceljs/") ||
            id.includes("node_modules/xlsx/") ||
            id.includes("node_modules/jspdf/") ||
            id.includes("node_modules/html2canvas/") ||
            id.includes("node_modules/html2pdf") ||
            id.includes("node_modules/docxtemplater/");
          if (vendorDocs) return "vendor-docs";

          return undefined;
        },
      },
    },
  },
});