/**
 * Contrato PNG/WebP del plano: alpha, lado largo y rechazo de JPEG.
 * node scripts/verify-stage-plot-raster.mjs
 */
import sharp from "sharp";
import {
  stagePlotRasterObjectPath,
  stagePlotRasterDownloadExt,
  stagePlotIconDownloadBasename,
  stagePlotSvgSaveClearsRaster,
  validateStagePlotRasterBytes,
} from "../src/utils/stagePlotRaster.js";

let failed = 0;

function assert(cond, message) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", message);
  } else {
    console.log("ok", message);
  }
}

const transparentPng = await sharp({
  create: {
    width: 1024,
    height: 80,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .png()
  .toBuffer();

const smallPng = await sharp({
  create: {
    width: 200,
    height: 200,
    channels: 4,
    background: { r: 10, g: 10, b: 10, alpha: 0.5 },
  },
})
  .png()
  .toBuffer();

const opaquePng = await sharp({
  create: {
    width: 1024,
    height: 64,
    channels: 3,
    background: { r: 255, g: 255, b: 255 },
  },
})
  .png()
  .toBuffer();

const jpeg = await sharp({
  create: {
    width: 1024,
    height: 64,
    channels: 3,
    background: { r: 20, g: 20, b: 20 },
  },
})
  .jpeg()
  .toBuffer();

const webpAlpha = await sharp(transparentPng).webp({ lossless: true }).toBuffer();
const webpOpaque = await sharp(opaquePng).webp({ lossless: false, quality: 80 }).toBuffer();

const okPng = validateStagePlotRasterBytes(new Uint8Array(transparentPng));
assert(okPng.ok === true && okPng.mime === "image/png", "PNG 1024 con alpha");

const small = validateStagePlotRasterBytes(new Uint8Array(smallPng));
assert(small.ok === false && /1024/.test(small.error), "PNG chico rechazado");

const opaque = validateStagePlotRasterBytes(new Uint8Array(opaquePng));
assert(opaque.ok === false && /alpha/i.test(opaque.error), "PNG sin alpha rechazado");

const jpg = validateStagePlotRasterBytes(new Uint8Array(jpeg));
assert(jpg.ok === false && /JPEG/i.test(jpg.error), "JPEG rechazado");

const okWebp = validateStagePlotRasterBytes(new Uint8Array(webpAlpha));
assert(
  okWebp.ok === true && okWebp.mime === "image/webp" && okWebp.width === 1024,
  `WebP con alpha (${okWebp.ok ? `${okWebp.width}×${okWebp.height}` : okWebp.error})`,
);

const opaqueWebp = validateStagePlotRasterBytes(new Uint8Array(webpOpaque));
assert(
  opaqueWebp.ok === false && /alpha/i.test(opaqueWebp.error || ""),
  `WebP sin alpha rechazado (${opaqueWebp.ok ? "aceptó" : opaqueWebp.error})`,
);

const huge = new Uint8Array(1_048_577);
huge.set(transparentPng.subarray(0, 32));
const tooBig = validateStagePlotRasterBytes(huge);
assert(tooBig.ok === false && /1 MB/.test(tooBig.error), "más de 1 MB rechazado");

const path = stagePlotRasterObjectPath(
  "https://muxrbuivopnawnxlcjxq.supabase.co/storage/v1/object/public/stage-plot-icons/instrumentos/01/abc.png",
);
assert(path === "instrumentos/01/abc.png", "path del bucket");
assert(
  stagePlotRasterObjectPath("https://example.com/otro.png") == null,
  "URL ajena no se borra",
);
assert(
  stagePlotSvgSaveClearsRaster("<svg></svg>", "https://cdn.example/a.png") === true,
  "SVG nuevo quita el PNG",
);
assert(
  stagePlotSvgSaveClearsRaster("   ", "https://cdn.example/a.png") === false,
  "quitar el SVG deja el PNG",
);
assert(
  stagePlotSvgSaveClearsRaster("<svg></svg>", "  ") === false,
  "SVG nuevo sin PNG no marca borrado",
);
assert(stagePlotIconDownloadBasename("Flauta Traversa") === "flauta-traversa", "nombre de descarga");
assert(stagePlotIconDownloadBasename("  ") === "icono", "nombre vacío");
assert(
  stagePlotRasterDownloadExt("https://cdn.example/a.webp?v=1") === "webp",
  "extensión webp",
);
assert(stagePlotRasterDownloadExt("https://cdn.example/a.png") === "png", "extensión png");

if (failed) {
  console.error(`${failed} checks failed`);
  process.exit(1);
}
console.log("stage-plot raster checks passed");
