/**
 * Inspecciona PDFs problemáticos (metadata + texto 1ª página).
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.js";

const LOCAL =
  process.env.ARIAS_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\ARIAS";

const folders = [
  "Puccini, G. - E lucevan le stelle ('Tosca')",
  "Verdi, G. - Coro de los Esclavos ('Nabucco')",
];

async function firstPageText(filePath) {
  const data = new Uint8Array(readFileSync(filePath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  const text = content.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
  return text.slice(0, 200);
}

function pdfTitle(filePath) {
  const str = readFileSync(filePath).toString("latin1");
  return str.match(/\/Title\s*\(([^)]+)\)/)?.[1] || "";
}

for (const folder of folders) {
  const dir = join(LOCAL, folder);
  console.log("\n===", folder, "===");
  const pdfs = readdirSync(dir)
    .filter((f) => /\.pdf$/i.test(f))
    .sort((a, b) => a.localeCompare(b, "es"));
  for (const f of pdfs) {
    const fp = join(dir, f);
    const title = pdfTitle(fp);
    let text = "";
    try {
      text = await firstPageText(fp);
    } catch (e) {
      text = `(error: ${e.message})`;
    }
    console.log(`\n${f}`);
    if (title) console.log("  Title:", title);
    console.log("  Page1:", text);
  }
}
