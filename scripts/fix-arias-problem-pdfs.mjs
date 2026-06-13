/**
 * Renombra PDFs problemáticos en ARIAS (E lucevan + Nabucco).
 */
import { existsSync, readdirSync, readFileSync, renameSync } from "fs";
import { join } from "path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.js";
import {
  canonicalPartFilename,
  safeFileName,
} from "./lib/pdfPartsRenaming.mjs";
import {
  instrumentFromProblematicPdf,
  NABUCCO_IMSLP_INSTRUMENTS,
} from "./lib/ariasPdfFixes.mjs";
import { LOCAL_ARIAS } from "./lib/ariasCatalog.mjs";

const WORKS = [
  {
    folder: "Puccini, G. - E lucevan le stelle ('Tosca')",
    workNumber: "03",
    workTitle: "E lucevan le stelle ('Tosca')",
    composerTag: "Puccini, G",
    match: (name) =>
      /^Tosca E lucevan le/i.test(name) ||
      (/^(Oboe|Violoncello|SCORE)\s-/i.test(name) &&
        !/^\w+\s-\s03\./.test(name)),
  },
  {
    folder: "Verdi, G. - Coro de los Esclavos ('Nabucco')",
    workNumber: "15 BIS",
    workTitle: "Coro de los Esclavos ('Nabucco')",
    composerTag: "Verdi, G",
    match: (name) => /^IMSLP\d+/i.test(name),
  },
];

async function firstPageText(filePath) {
  const data = new Uint8Array(readFileSync(filePath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  return content.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
}

const dryRun = process.argv.includes("--dry-run");
const used = new Map();

for (const work of WORKS) {
  const dir = join(LOCAL_ARIAS, work.folder);
  if (!existsSync(dir)) {
    console.warn("No existe:", dir);
    continue;
  }
  console.log(`\n=== ${work.folder} ===`);
  const pdfs = readdirSync(dir)
    .filter((f) => /\.pdf$/i.test(f))
    .sort((a, b) => a.localeCompare(b, "es"));

  for (const file of pdfs) {
    if (!work.match(file)) continue;

    const fp = join(dir, file);
    let instrument = null;
    if (work.match === WORKS[1].match || /^IMSLP/i.test(file)) {
      const id = file.match(/IMSLP(\d+)/i)?.[1];
      instrument = NABUCCO_IMSLP_INSTRUMENTS[Number(id)];
    } else {
      const text = await firstPageText(fp);
      instrument = instrumentFromProblematicPdf(file, text);
    }
    if (!instrument) {
      console.warn("  Sin instrumento:", file);
      continue;
    }

    let target = canonicalPartFilename(
      instrument,
      work.workNumber,
      work.workTitle,
      work.composerTag,
    );
    const key = `${work.folder}|${target}`;
    if (used.has(key)) {
      const n = used.get(key) + 1;
      used.set(key, n);
      target = canonicalPartFilename(
        `${instrument} (${n})`,
        work.workNumber,
        work.workTitle,
        work.composerTag,
      );
    } else {
      used.set(key, 1);
    }

    if (file === target) {
      console.log("  OK:", file);
      continue;
    }
    const dst = join(dir, target);
    if (existsSync(dst)) {
      console.warn("  Colisión:", file, "→", target);
      continue;
    }
    console.log(`  ${file}`);
    console.log(`    → ${target}`);
    if (!dryRun) renameSync(fp, dst);
  }
}

console.log(dryRun ? "\n(dry run)" : "\nListo.");
