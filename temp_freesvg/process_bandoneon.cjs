/**
 * Process FreeSVG Bandoneón (SVG ID 50642 / OpenClipart 216369):
 * expand <use>, light sanitize, preserve fills — no currentColor rewrite.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(
  process.env.USERPROFILE || "",
  "Downloads",
  "1427255129.svg",
);
const outPath = path.join(root, "public", "stage-plot", "icons", "bandoneon.svg");
const rawPath = path.join(__dirname, "bandoneon_raw.svg");

function stripMeta(s) {
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<!DOCTYPE[\s\S]*?>/gi, "");
  s = s.replace(/<\?xml[\s\S]*?\?>/gi, "");
  s = s.replace(/<metadata[\s\S]*?<\/metadata>/gi, "");
  s = s.replace(/<sodipodi:namedview[\s\S]*?<\/sodipodi:namedview>/gi, "");
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  return s;
}

function buildIdMap(s) {
  const idMap = new Map();
  const selfClose =
    /<(path|rect|circle|ellipse|polygon|polyline|line)\b([^>]*\bid="([^"]+)"[^>]*)\/>/gi;
  let m;
  while ((m = selfClose.exec(s))) {
    idMap.set(m[3], m[0]);
  }
  const paired =
    /<(path|g|rect|circle|ellipse|polygon|polyline|line)\b([^>]*\bid="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/gi;
  while ((m = paired.exec(s))) {
    if (!idMap.has(m[3])) idMap.set(m[3], m[0]);
  }
  return idMap;
}

function expandUses(s) {
  const idMap = buildIdMap(s);
  let n = 0;
  let missing = 0;
  s = s.replace(/<use\b([^>]*)\/>/gi, (full, attrs) => {
    const href = (attrs.match(/(?:xlink:)?href=["']#([^"']+)["']/i) || [])[1];
    const transform = (attrs.match(/transform=["']([^"']+)["']/i) || [])[1];
    const srcEl = href && idMap.get(href);
    if (!srcEl) {
      missing++;
      return "";
    }
    n++;
    const clone = srcEl.replace(/\bid="[^"]+"/i, "");
    if (transform) return `<g transform="${transform}">${clone}</g>`;
    return clone;
  });
  // multi-line use with closing tag
  s = s.replace(/<use\b([^>]*)><\/use>/gi, (full, attrs) => {
    const href = (attrs.match(/(?:xlink:)?href=["']#([^"']+)["']/i) || [])[1];
    const transform = (attrs.match(/transform=["']([^"']+)["']/i) || [])[1];
    const srcEl = href && idMap.get(href);
    if (!srcEl) {
      missing++;
      return "";
    }
    n++;
    const clone = srcEl.replace(/\bid="[^"]+"/i, "");
    if (transform) return `<g transform="${transform}">${clone}</g>`;
    return clone;
  });
  return { svg: s, n, missing, hasTarget: idMap.has("path2796") };
}

function stripForbiddenTags(s) {
  s = s.replace(
    /<(script|foreignObject|foreignobject|iframe|object|embed|link|meta|base|use)\b[\s\S]*?<\/\1>/gi,
    "",
  );
  s = s.replace(
    /<(script|foreignObject|foreignobject|iframe|object|embed|link|meta|base|use)\b[^>]*\/?>/gi,
    "",
  );
  return s;
}

function stripInkscapeNoise(s) {
  s = s.replace(/\s+xmlns:(?:inkscape|sodipodi|cc|dc|rdf|svg|ns1)="[^"]*"/gi, "");
  s = s.replace(/\s+(?:inkscape|sodipodi):[\w:.-]+="[^"]*"/gi, "");
  s = s.replace(/<(?:rdf:RDF)[\s\S]*?<\/(?:rdf:RDF)>/gi, "");
  return s;
}

function stripCanvasBackground(svg) {
  return svg.replace(
    /<rect\b[^>]*(?:fill\s*=\s*["'](?:#fff(?:fff)?|#ffffff|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))["'][^>]*)?(?:width=["'](?:100%|1(?:\.0+)?)["'][^>]*height=["'](?:100%|1(?:\.0+)?)["']|height=["'](?:100%|1(?:\.0+)?)["'][^>]*width=["'](?:100%|1(?:\.0+)?)["'])[^>]*\/?>/gi,
    (m) => {
      if (
        /fill\s*=\s*["'](?:#fff(?:fff)?|#ffffff|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))["']/i.test(
          m,
        )
      ) {
        return "";
      }
      if (!/\bfill\s*=/i.test(m) && !/\bstroke\s*=/i.test(m)) return "";
      return m;
    },
  );
}

if (!fs.existsSync(src)) {
  throw new Error(`Missing source: ${src}`);
}

fs.copyFileSync(src, rawPath);
let svg = fs.readFileSync(src, "utf8");
svg = stripMeta(svg);
const expanded = expandUses(svg);
svg = expanded.svg;
console.log(
  `expanded uses=${expanded.n} missing=${expanded.missing} path2796=${expanded.hasTarget}`,
);
svg = stripForbiddenTags(svg);
svg = stripInkscapeNoise(svg);
svg = stripCanvasBackground(svg);
svg = svg.replace(/viewBox\s*=\s*["']([^"']+)["']/i, (_, vb) => {
  return `viewBox="${vb.split(/[\s,]+/).filter(Boolean).join(" ")}"`;
});
if (!/<svg[^>]*\sxmlns=/i.test(svg)) {
  svg = svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
}
// drop leftover xlink xmlns if no xlink left
if (!/xlink:/i.test(svg)) {
  svg = svg.replace(/\s+xmlns:xlink="[^"]*"/i, "");
}
svg = svg.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();

const note =
  "<!-- FreeSVG Bandoneón SVG ID 50642 / OpenClipart 216369 (CC0); sanitize-only (fills preserved) -->";
const out = `${note}\n${svg}\n`;

const cc = (out.match(/currentColor/gi) || []).length;
const use = (out.match(/<use\b/gi) || []).length;
const hex = (out.match(/fill\s*[:=]\s*["']?#[0-9a-fA-F]{3,8}/gi) || []).length;
const vb = (out.match(/viewBox="([^"]+)"/i) || [])[1] || "?";

console.log(
  `bandoneon.svg: ${out.length} chars, viewBox=${vb}, currentColor=${cc}, use=${use}, hexFills≈${hex}`,
);

if (use > 0) throw new Error("Still has <use> — cannot store safely");
if (cc > 0) console.warn("WARNING: currentColor present");
if (out.length > 100000) {
  console.warn(
    `WARNING: ${out.length} > 100000 — will try extra compact of style attrs`,
  );
}

function roundPathNumbers(d, decimals = 2) {
  return String(d).replace(/-?\d*\.\d+/g, (n) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return n;
    const r = x.toFixed(decimals).replace(/\.?0+$/, "");
    return r === "-0" ? "0" : r;
  });
}

function compactForDbLimit(markup) {
  // Short attribution comment (full credit in ATTRIBUTION.md)
  const note =
    "<!-- FreeSVG 50642 / OCL 216369 CC0; fills preserved -->";
  let s = markup.replace(/^<!--[\s\S]*?-->\n?/, "");

  s = s.replace(/\sstyle="([^"]*)"/gi, (full, style) => {
    const parts = style
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean);
    const keep = [];
    const attrs = [];
    for (const part of parts) {
      const i = part.indexOf(":");
      if (i < 0) {
        keep.push(part);
        continue;
      }
      const k = part.slice(0, i).trim().toLowerCase();
      let v = part.slice(i + 1).trim();
      if (k === "stroke-width") v = v.replace(/px$/i, "");
      if (
        k === "fill" ||
        k === "stroke" ||
        k === "fill-rule" ||
        k === "stroke-width" ||
        k === "stroke-linecap" ||
        k === "stroke-linejoin" ||
        k === "opacity" ||
        k === "fill-opacity" ||
        k === "stroke-opacity"
      ) {
        attrs.push(`${k}="${v}"`);
      } else {
        keep.push(part);
      }
    }
    let outAttrs = "";
    if (attrs.length) outAttrs += ` ${attrs.join(" ")}`;
    if (keep.length) outAttrs += ` style="${keep.join(";")}"`;
    return outAttrs;
  });
  s = s.replace(/\sstyle="\s*"/g, "");
  s = s.replace(/\sid="[^"]*"/g, "");
  s = s.replace(/\sinkscape:connector-curvature="[^"]*"/gi, "");
  s = s.replace(/\ssodipodi:nodetypes="[^"]*"/gi, "");
  s = s.replace(/\sversion="[^"]*"/gi, "");
  s = s.replace(/\s(?:width|height)="[^"]*"/gi, "");
  s = s.replace(/\sxmlns:xlink="[^"]*"/gi, "");
  // Round path data (largest savings)
  s = s.replace(/\sd="([^"]*)"/gi, (_, d) => ` d="${roundPathNumbers(d, 2)}"`);
  s = s.replace(
    /\stransform="translate\(([^)]+)\)"/gi,
    (_, nums) => {
      const parts = nums.split(/[\s,]+/).filter(Boolean).map((n) => {
        const x = Number(n);
        if (!Number.isFinite(x)) return n;
        return String(Number(x.toFixed(3))).replace(/\.?0+$/, "");
      });
      return ` transform="translate(${parts.join(" ")})"`;
    },
  );
  s = s.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
  return `${note}\n${s}\n`;
}

let finalOut = out;
if (finalOut.length > 100000) {
  finalOut = compactForDbLimit(finalOut);
  console.log(
    `after compact: ${finalOut.length} chars (limit 100000), currentColor=${(finalOut.match(/currentColor/gi) || []).length}, use=${(finalOut.match(/<use\b/gi) || []).length}`,
  );
}
if (finalOut.length > 100000) {
  // one more pass with 1-decimal path rounding
  finalOut = finalOut.replace(/\sd="([^"]*)"/gi, (_, d) => {
    const rounded = String(d).replace(/-?\d*\.\d+/g, (n) => {
      const x = Number(n);
      if (!Number.isFinite(x)) return n;
      const r = x.toFixed(1).replace(/\.0$/, "");
      return r === "-0" ? "0" : r;
    });
    return ` d="${rounded}"`;
  });
  finalOut = finalOut.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim() + "\n";
  console.log(`after 1dp paths: ${finalOut.length}`);
}
if (finalOut.length > 100000) {
  throw new Error(`SVG still ${finalOut.length} chars > 100000`);
}

fs.writeFileSync(outPath, finalOut, "utf8");
console.log(`Wrote ${outPath}`);
