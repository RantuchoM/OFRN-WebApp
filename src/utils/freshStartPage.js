import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { freshStartStatusLabel } from "./freshStart.js";

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
  const opening = freshStartStatusLabel("check", "now");
  cached = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>Un momento</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1f5f9;
        color: #0f172a;
        font-family: system-ui, sans-serif;
      }
      main {
        width: min(26rem, calc(100% - 2rem));
        box-sizing: border-box;
        background: #fff;
        border-radius: 1.25rem;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
        padding: 1.35rem 1.35rem 1.4rem;
      }
      h1 { font-size: 1.25rem; margin: 0 0 0.85rem; text-align: center; }
      .bar {
        height: 4px;
        margin: 0 0 1.15rem;
        background: #e2e8f0;
        border-radius: 999px;
        overflow: hidden;
      }
      .bar i {
        display: block;
        height: 100%;
        width: 38%;
        border-radius: inherit;
        background: #4f46e5;
        animation: sweep 1.15s ease-in-out infinite;
      }
      #done {
        margin: 0 0 0.9rem;
        padding: 0;
        list-style: none;
        color: #64748b;
        font-size: 0.92rem;
        line-height: 1.35;
      }
      #done[hidden] { display: none; }
      #done li {
        margin: 0.4rem 0;
        padding-left: 1.45rem;
        position: relative;
      }
      #done li.enter { animation: rise 0.45s ease both; }
      #done li::before {
        content: "✓";
        position: absolute;
        left: 0;
        color: #15803d;
        font-weight: 700;
      }
      #now { display: flex; gap: 0.75rem; align-items: flex-start; }
      #spin {
        width: 1.05rem;
        height: 1.05rem;
        margin-top: 0.2rem;
        flex: none;
        border: 2px solid #c7d2fe;
        border-top-color: #4f46e5;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }
      #spin[hidden] { display: none; }
      #msg { margin: 0; font-size: 1.02rem; font-weight: 600; line-height: 1.45; }
      main[data-busy="false"] .bar i {
        width: 100%;
        animation: none;
        background: #16a34a;
      }
      main[data-phase="stuck"] .bar,
      main[data-phase="error"] .bar { display: none; }
      @keyframes sweep {
        0% { transform: translateX(-130%); }
        100% { transform: translateX(340%); }
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes rise {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: none; }
      }
      @media (prefers-reduced-motion: reduce) {
        .bar i, #spin, #done li.enter { animation: none; }
      }
    </style>
  </head>
  <body>
    <main data-busy="true" data-phase="check">
      <h1>Un momento</h1>
      <div class="bar" aria-hidden="true"><i></i></div>
      <ul id="done" hidden></ul>
      <div id="now">
        <span id="spin" aria-hidden="true"></span>
        <p id="msg" role="status" aria-live="polite">${opening}</p>
      </div>
    </main>
    <script>${js}</script>
  </body>
</html>
`;
  return cached;
}
