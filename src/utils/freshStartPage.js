import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

let cached = null;

/** HTML autónomo de /refrescar.html. El script va inline para no depender de /assets. */
export function renderFreshStartHtml() {
  if (cached) return cached;
  const bundled = esbuild.buildSync({
    entryPoints: [path.join(dir, "freshStartBrowser.js")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2018",
    charset: "utf8",
    write: false,
  });
  const js = bundled.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
  cached = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>Actualizar la app</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f8fafc;
        color: #0f172a;
        font-family: system-ui, sans-serif;
      }
      main { max-width: 26rem; padding: 1.5rem 1.25rem; }
      h1 { font-size: 1.15rem; margin: 0 0 1rem; text-align: center; }
      #done {
        margin: 0 0 0.85rem;
        padding: 0;
        list-style: none;
        color: #64748b;
        font-size: 0.92rem;
        line-height: 1.4;
      }
      #done[hidden] { display: none; }
      #done li { margin: 0.35rem 0; padding-left: 1.35rem; position: relative; }
      #done li::before {
        content: "✓";
        position: absolute;
        left: 0;
        color: #15803d;
        font-weight: 700;
      }
      #msg {
        margin: 0;
        font-size: 1rem;
        font-weight: 650;
        line-height: 1.45;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Actualizar la app</h1>
      <ul id="done" hidden></ul>
      <p id="msg" role="status" aria-live="polite">Revisando si esta pestaña tiene una versión guardada.</p>
    </main>
    <script>${js}</script>
  </body>
</html>
`;
  return cached;
}
