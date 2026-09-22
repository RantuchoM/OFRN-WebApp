import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";
import path from "path";

// Solución para __dirname en módulos ES
const __dirname = path.resolve();

/** Identificador de build embebido en el cliente y servido en /version.json para detectar despliegues nuevos. */
export default defineConfig(({ command }) => {
  const APP_BUILD_ID =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.VITE_APP_BUILD_ID ||
    // `vite` (serve): estable — evita falsos «Nueva versión» si el cliente sobrevive un restart.
    // `vite build`: único por build.
    (command === "serve"
      ? "local-dev"
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

  /**
   * Sirve @ffmpeg/core ST (dist/esm) + worker estático en /ffmpeg.
   * Evita jsDelivr (~32 MB) y no usa COOP/COEP (romperían Google login / Drive).
   * El worker se sirve crudo: Vite inyecta env.mjs (`window`) en `?worker_file`
   * y Chrome queda colgado en ffmpeg.load().
   */
  function ffmpegCorePlugin() {
    const coreDir = path.resolve(
      __dirname,
      "node_modules/@ffmpeg/core/dist/esm",
    );
    const ffmpegEsmDir = path.resolve(
      __dirname,
      "node_modules/@ffmpeg/ffmpeg/dist/esm",
    );
    const assets = [
      {
        url: "/ffmpeg/ffmpeg-core.js",
        abs: path.join(coreDir, "ffmpeg-core.js"),
        dest: "ffmpeg-core.js",
        mime: "text/javascript",
      },
      {
        url: "/ffmpeg/ffmpeg-core.wasm",
        abs: path.join(coreDir, "ffmpeg-core.wasm"),
        dest: "ffmpeg-core.wasm",
        mime: "application/wasm",
      },
      {
        url: "/ffmpeg/worker.js",
        abs: path.join(ffmpegEsmDir, "worker.js"),
        dest: "worker.js",
        mime: "text/javascript",
      },
      {
        url: "/ffmpeg/const.js",
        abs: path.join(ffmpegEsmDir, "const.js"),
        dest: "const.js",
        mime: "text/javascript",
      },
      {
        url: "/ffmpeg/errors.js",
        abs: path.join(ffmpegEsmDir, "errors.js"),
        dest: "errors.js",
        mime: "text/javascript",
      },
    ];
    const serveAsset = (req, res, next) => {
      const url = req.url?.split("?")[0];
      const hit = assets.find((a) => a.url === url);
      if (!hit) return next();
      if (!fs.existsSync(hit.abs)) {
        res.statusCode = 404;
        res.end("ffmpeg asset missing — npm install @ffmpeg/core @ffmpeg/ffmpeg");
        return;
      }
      const stat = fs.statSync(hit.abs);
      res.setHeader("Content-Type", hit.mime);
      res.setHeader("Content-Length", String(stat.size));
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      fs.createReadStream(hit.abs).pipe(res);
    };
    const copyToOutDir = (outDir) => {
      const destDir = path.join(outDir, "ffmpeg");
      fs.mkdirSync(destDir, { recursive: true });
      for (const a of assets) {
        fs.copyFileSync(a.abs, path.join(destDir, a.dest));
      }
    };
    return {
      name: "ffmpeg-core-assets",
      configureServer(server) {
        server.middlewares.use(serveAsset);
      },
      configurePreviewServer(server) {
        server.middlewares.use(serveAsset);
      },
      writeBundle(options) {
        copyToOutDir(options.dir || path.resolve(__dirname, "dist"));
      },
    };
  }

  function appVersionPlugin(buildId) {
    const versionPayload = JSON.stringify({ buildId });
    const mainChunkRecoveryScript = `<script>(function(){var k="ofrn:main-chunk-reload";window.addEventListener("error",function(ev){var t=ev.target;if(!t||t.tagName!=="SCRIPT"||!t.src||t.src.indexOf("/assets/")===-1)return;try{var n=Number(sessionStorage.getItem(k)||0);if(n>=2)return;sessionStorage.setItem(k,String(n+1))}catch(e){}window.location.reload()},true)})();</script>`;
    return {
      name: "app-version",
      transformIndexHtml(html) {
        // Solo en build: en DEV el HMR puede fallar temporalmente un script.
        if (command === "serve") return html;
        return html.replace("<div id=\"root\"></div>", `<div id="root"></div>${mainChunkRecoveryScript}`);
      },
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

  return {
  plugins: [
    react(),
    appVersionPlugin(APP_BUILD_ID),
    ffmpegCorePlugin(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png", "pwa-512x512-maskable.png"],
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globIgnores: ["**/ffmpeg/**"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        navigateFallbackDenylist: [
          /^\/manifest\.webmanifest$/,
          /^\/version\.json$/,
          /^\/ffmpeg\//,
          /^\/assets\//,
          /^\/sw\.js$/,
          /^\/workbox-/,
          /\.[a-zA-Z0-9]+$/,
        ],
        // Push + local inicio/salida ensayo + notificationclick
        importScripts: [
          "/sw-push-handlers.js",
          "/sw-local-salida-reminders.js",
        ],
      },
      manifest: {
        id: "/",
        name: "OFRN - App",
        short_name: "OFRN",
        description: "",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        lang: "es",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "pwa-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
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
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util", "@ffmpeg/core"],
    esbuildOptions: {
      inject: [path.resolve(__dirname, "./src/react-shim.js")],
    },
  },
  define: {
    global: "window",
    "import.meta.env.VITE_APP_BUILD_ID": JSON.stringify(APP_BUILD_ID),
  },
  worker: {
    format: "es",
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
};
});