/**
 * Recorta And the Glory of the Lord desde las partes de Messiah (obra 3643).
 */
import { mkdirSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import {
  CROPS,
  PARA_ACOMODAR_ROOT,
  SOURCE_DIR,
  TARGET_FOLDER,
  partFilename,
} from "./lib/handelGloryCatalog.mjs";

const extractPy = join("scripts", "lib", "extract_pdf_pages.py");
const outDir = join(PARA_ACOMODAR_ROOT, TARGET_FOLDER);
mkdirSync(outDir, { recursive: true });

for (const crop of CROPS) {
  const src = join(SOURCE_DIR, crop.file);
  const dst = join(outDir, partFilename(crop.instrument));
  const pages = crop.pages.join(",");
  const run = spawnSync("python", [extractPy, "extract", src, dst, pages], {
    stdio: "inherit",
  });
  if (run.status !== 0) process.exit(run.status ?? 1);
  console.log(`${crop.instrument}: páginas ${pages}`);
}
