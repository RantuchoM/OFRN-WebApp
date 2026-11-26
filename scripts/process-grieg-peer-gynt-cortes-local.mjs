/**
 * Extrae La mañana y La muerte de Åse desde la Suite 1, por páginas enteras.
 */
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import {
  ASE_PARTS,
  GRIEG_CORTES,
  MANANA_HORN_PAGES,
  MANANA_PARTS,
  PARA_ACOMODAR_ROOT,
  SUITE1_DIR,
} from "./lib/griegPeerGyntCortesCatalog.mjs";

const EXTRACT = join("scripts", "lib", "extract_pdf_pages.py");
const MERGE = join("scripts", "lib", "merge_pdfs.py");

function outName(instrument, workTitle) {
  return `${instrument} - ${workTitle} - op.46 - Grieg, E.pdf`;
}

function extract(srcName, pages, dest) {
  const src = join(SUITE1_DIR, srcName);
  if (!existsSync(src)) throw new Error(`No está la fuente: ${srcName}`);
  execSync(
    `python "${EXTRACT}" extract "${src}" "${dest}" "${pages.join(",")}"`,
    { stdio: "inherit" },
  );
}

const manana = GRIEG_CORTES[0];
const ase = GRIEG_CORTES[1];
const mananaDir = join(PARA_ACOMODAR_ROOT, manana.targetFolder);
const aseDir = join(PARA_ACOMODAR_ROOT, ase.targetFolder);
mkdirSync(mananaDir, { recursive: true });
mkdirSync(aseDir, { recursive: true });

console.log("--- La mañana ---");
for (const part of MANANA_PARTS) {
  const dest = join(mananaDir, outName(part.instrument, manana.workTitle));
  extract(part.file, part.pages, dest);
  console.log(`  ${part.instrument} p.${part.pages.join("-")}`);
}

const hornTmp = MANANA_HORN_PAGES.map((name, i) =>
  join(mananaDir, `_horn_${i + 1}.pdf`),
);
MANANA_HORN_PAGES.forEach((name, i) => extract(name, [1], hornTmp[i]));
const hornOut = join(mananaDir, outName("Corno F 1y2y3y4", manana.workTitle));
execSync(`python "${MERGE}" "${hornOut}" ${hornTmp.map((p) => `"${p}"`).join(" ")}`, {
  stdio: "inherit",
});
for (const tmp of hornTmp) execSync(`del /f /q "${tmp}"`, { shell: "cmd.exe" });
console.log("  Corno F 1y2y3y4 p.1-2 (hoja conjunta Siemens)");

console.log("\n--- La muerte de Åse ---");
for (const part of ASE_PARTS) {
  const dest = join(aseDir, outName(part.instrument, ase.workTitle));
  extract(part.file, part.pages, dest);
  console.log(`  ${part.instrument} p.${part.pages.join("-")}`);
}

console.log("\nListo.");
