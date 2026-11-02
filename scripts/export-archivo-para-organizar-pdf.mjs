/**
 * PDF catálogo del lote Archivo-para-organizar (#3707–#3740).
 *
 *   node scripts/export-archivo-para-organizar-pdf.mjs
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { SB_URL, headers } from "./lib/repertoireSeedUtils.mjs";

function stripHtml(s) {
  return String(s || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function personLabel(c) {
  if (!c) return "";
  return c.nombre ? `${c.apellido}, ${c.nombre}` : c.apellido;
}

function wrap(text, font, size, maxWidth) {
  const words = String(text || "")
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) line = trial;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

const url =
  `${SB_URL}/rest/v1/obras` +
  "?select=id,titulo,instrumentacion,link_drive," +
  "obras_compositores(rol,compositores(apellido,nombre))" +
  "&id=gte.3707&id=lte.3740&order=id";

const res = await fetch(url, {
  headers: { ...headers, Prefer: "return=representation" },
});
const rows = await res.json();
if (!Array.isArray(rows)) throw new Error(JSON.stringify(rows));

const works = rows.map((o) => {
  const comps = (o.obras_compositores || [])
    .filter((x) => x.rol === "compositor")
    .map((x) => personLabel(x.compositores));
  const arrs = (o.obras_compositores || [])
    .filter((x) => x.rol === "arreglador")
    .map((x) => personLabel(x.compositores));
  let compositor = comps.join(" / ") || "—";
  if (arrs.length) compositor += ` (arr. ${arrs.join(" / ")})`;
  return {
    id: o.id,
    titulo: stripHtml(o.titulo),
    compositor,
    instrumentacion: o.instrumentacion || "—",
    link: o.link_drive || "—",
  };
});

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

const pageW = 595.28;
const pageH = 841.89;
const margin = 40;
const contentW = pageW - margin * 2;
let page = pdf.addPage([pageW, pageH]);
let y = pageH - margin;

function ensureSpace(need) {
  if (y - need < margin) {
    page = pdf.addPage([pageW, pageH]);
    y = pageH - margin;
  }
}

function drawText(
  text,
  {
    x = margin,
    size = 10,
    bold = false,
    color = rgb(0.1, 0.1, 0.12),
    maxW = contentW,
  } = {},
) {
  const f = bold ? fontBold : font;
  const lines = wrap(text, f, size, maxW);
  for (const line of lines) {
    ensureSpace(size + 4);
    page.drawText(line, { x, y: y - size, size, font: f, color });
    y -= size + 3;
  }
}

drawText("OFRN — Obras cargadas (Archivo para organizar)", {
  size: 15,
  bold: true,
});
y -= 2;
drawText(
  `Lote Para acomodar · ${works.length} obras · IDs ${works[0].id}–${works[works.length - 1].id}`,
  { size: 10, color: rgb(0.35, 0.35, 0.4) },
);
drawText(`Generado: ${new Date().toLocaleString("es-AR")}`, {
  size: 9,
  color: rgb(0.45, 0.45, 0.5),
});
y -= 6;
page.drawLine({
  start: { x: margin, y },
  end: { x: pageW - margin, y },
  thickness: 1,
  color: rgb(0.75, 0.75, 0.78),
});
y -= 14;

works.forEach((w, i) => {
  ensureSpace(70);
  drawText(`${i + 1}. ${w.titulo}`, { size: 11, bold: true });
  drawText(`Compositor: ${w.compositor}`, { size: 9.5 });
  drawText(`Instrumentación: ${w.instrumentacion}`, { size: 9.5 });
  drawText(`ID obra: ${w.id}`, {
    size: 8.5,
    color: rgb(0.4, 0.4, 0.45),
  });

  const linkLabel = `Drive: ${w.link}`;
  const linkLines = wrap(linkLabel, font, 8.5, contentW);
  for (let li = 0; li < linkLines.length; li++) {
    ensureSpace(12);
    const lineY = y - 8.5;
    page.drawText(linkLines[li], {
      x: margin,
      y: lineY,
      size: 8.5,
      font,
      color: rgb(0.1, 0.25, 0.65),
    });
    if (li === 0 && w.link.startsWith("http")) {
      const textW = Math.min(
        contentW,
        font.widthOfTextAtSize(linkLines[li], 8.5),
      );
      const annot = pdf.context.register(
        pdf.context.obj({
          Type: "Annot",
          Subtype: "Link",
          Rect: [margin, lineY - 1, margin + textW, lineY + 10],
          Border: [0, 0, 0],
          A: {
            Type: "Action",
            S: "URI",
            URI: pdf.context.obj(w.link),
          },
        }),
      );
      page.node.addAnnot(annot);
    }
    y -= 11.5;
  }
  y -= 8;
});

const outPath = join(
  process.env.USERPROFILE || ".",
  "Downloads",
  "OFRN-obras-archivo-para-organizar-3707-3740.pdf",
);
writeFileSync(outPath, await pdf.save());
console.log(outPath);
console.log(`Obras: ${works.length}`);
