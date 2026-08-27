/**
 * Process FreeSVG / OpenClipart SVGs for stage-plot:
 * sanitize XSS vectors only — preserve original fills/strokes/gradients.
 *
 * Usage: node temp_freesvg/process_string_icons.cjs
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const iconsDir = path.join(root, "public", "stage-plot", "icons");
const downloads = path.join(process.env.USERPROFILE || "", "Downloads");

const SOURCES = [
  {
    out: "violin.svg",
    src: path.join(downloads, "publicdomainq-0008893doscnq.svg"),
    note: "FreeSVG publicdomainq-0008893doscnq (original colors)",
  },
  {
    out: "viola.svg",
    src: path.join(downloads, "publicdomainq-violin2.svg"),
    note: "FreeSVG publicdomainq-violin2 (original colors)",
  },
  {
    out: "cello.svg",
    src: path.join(downloads, "papapishu_cello_1.svg"),
    note: "FreeSVG cello-vector-image papapishu (original colors)",
  },
  {
    out: "bass.svg",
    src: path.join(downloads, "double-bass-3253216.svg"),
    note: "FreeSVG double-bass-3253216 (original colors)",
  },
  {
    out: "guitar.svg",
    src: path.join(downloads, "papapishu_guitar_1.svg"),
    note: "papapishu acoustic guitar (original colors)",
  },
  {
    out: "flute.svg",
    src: path.join(downloads, "Gerald_G_Flute_3.svg"),
    note: "Gerald_G Flute Openclipart (original colors)",
  },
];

function stripForbidden(svg) {
  let s = svg.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<!DOCTYPE[\s\S]*?>/gi, "");
  s = s.replace(/<\?xml[\s\S]*?\?>/gi, "");
  s = s.replace(
    /<(script|foreignObject|foreignobject|iframe|object|embed|link|meta|base|use)\b[\s\S]*?<\/\1>/gi,
    "",
  );
  s = s.replace(
    /<(script|foreignObject|foreignobject|iframe|object|embed|link|meta|base|use)\b[^>]*\/?>/gi,
    "",
  );
  s = s.replace(/<metadata[\s\S]*?<\/metadata>/gi, "");
  s = s.replace(/<sodipodi:namedview[\s\S]*?<\/sodipodi:namedview>/gi, "");
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  return s.trim();
}

function normalizeViewBox(svg) {
  return svg.replace(/viewBox\s*=\s*["']([^"']+)["']/i, (_, vb) => {
    const parts = vb.split(/[\s,]+/).filter(Boolean);
    return `viewBox="${parts.join(" ")}"`;
  });
}

/** Drop full-canvas white/near-white background rects often present in clipart. */
function stripCanvasBackground(svg) {
  return svg.replace(
    /<rect\b[^>]*(?:fill\s*=\s*["'](?:#fff(?:fff)?|#ffffff|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))["'][^>]*)?(?:width=["'](?:100%|1(?:\.0+)?)["'][^>]*height=["'](?:100%|1(?:\.0+)?)["']|height=["'](?:100%|1(?:\.0+)?)["'][^>]*width=["'](?:100%|1(?:\.0+)?)["'])[^>]*\/?>/gi,
    (m) => {
      if (/fill\s*=\s*["'](?:#fff(?:fff)?|#ffffff|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))["']/i.test(m)) {
        return "";
      }
      // bare full-size rect with no fill often paints white default — drop if no stroke
      if (!/\bfill\s*=/i.test(m) && !/\bstroke\s*=/i.test(m)) return "";
      return m;
    },
  );
}

function compactSvg(svg) {
  return svg.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
}

function ensureXmlns(svg) {
  if (/xmlns\s*=/i.test(svg)) return svg;
  return svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
}

function processOne(srcPath, outName, note) {
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Missing source: ${srcPath}`);
  }
  let svg = fs.readFileSync(srcPath, "utf8");
  if (!/<svg[\s>]/i.test(svg)) {
    throw new Error(`Not an SVG: ${srcPath}`);
  }
  // Keep a raw copy under temp_freesvg for debugging
  const rawName = outName.replace(/\.svg$/i, "_raw.svg");
  fs.writeFileSync(path.join(__dirname, rawName), svg, "utf8");

  svg = stripForbidden(svg);
  svg = normalizeViewBox(svg);
  svg = stripCanvasBackground(svg);
  svg = ensureXmlns(svg);
  svg = compactSvg(svg);

  const out = `<!-- ${note}; sanitize-only (fills preserved) -->\n${svg}\n`;

  const dest = path.join(iconsDir, outName);
  fs.writeFileSync(dest, out, "utf8");
  const vb = (out.match(/viewBox="([^"]+)"/i) || [])[1] || "?";
  const cc = (out.match(/currentColor/gi) || []).length;
  const hex = (out.match(/fill\s*=\s*["']#[0-9a-fA-F]{3,8}/gi) || []).length;
  console.log(
    `${outName}: ${out.length} bytes, viewBox=${vb}, currentColor=${cc}, hexFills≈${hex}`,
  );
  return { outName, dest, bytes: out.length, vb, currentColor: cc, hexFills: hex };
}

const results = SOURCES.map((s) => processOne(s.src, s.out, s.note));
console.log(JSON.stringify(results, null, 2));
