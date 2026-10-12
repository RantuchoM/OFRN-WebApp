/**
 * Extrae avemaria.zip a Para acomodar y deja PDFs canónicos.
 * No hay portada IMSLP que recortar: la página 1 de cada PDF ya es música.
 *
 *   node scripts/process-piazzolla-ave-maria-local.mjs --dry-run
 *   node scripts/process-piazzolla-ave-maria-local.mjs
 */
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  PARA_ACOMODAR_ROOT,
  PIAZZOLLA_AVE_MARIA_WORK,
  ZIP_PATH,
} from "./lib/piazzollaAveMariaCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const work = PIAZZOLLA_AVE_MARIA_WORK;
const dest = join(PARA_ACOMODAR_ROOT, work.targetFolder);

const plan = work.fileMap.map((row) => ({
  match: row.match.source,
  flags: row.match.flags,
  instrument: row.instrument,
  filename: canonicalPartFilename(
    row.instrument,
    work.workNumber,
    work.workTitle,
    work.composerTag,
  ),
}));

if (!existsSync(ZIP_PATH)) {
  throw new Error(`No existe el zip: ${ZIP_PATH}`);
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log(`Zip: ${ZIP_PATH}`);
console.log(`Destino: ${dest}`);
for (const row of plan) {
  console.log(`  /${row.match}/${row.flags} → ${row.filename}`);
}

if (dryRun) process.exit(0);

mkdirSync(dest, { recursive: true });

const helper = join(dest, "_extract_avemaria.py");
writeFileSync(
  helper,
  `import json, sys, zipfile
from pathlib import Path

zip_path, dest, plan_path = sys.argv[1:]
plan = json.loads(Path(plan_path).read_text(encoding="utf-8"))
dest = Path(dest)
used = set()
with zipfile.ZipFile(zip_path) as z:
    names = z.namelist()
    claimed = set()
    for row in plan:
        import re
        rx = re.compile(row["match"], re.IGNORECASE)
        hits = [n for n in names if n not in claimed and rx.search(n)]
        if len(hits) != 1:
            raise SystemExit(f"Match {row['match']!r} → {hits!r}")
        src = hits[0]
        claimed.add(src)
        target = row["filename"]
        if target in used:
            raise SystemExit(f"Nombre duplicado: {target}")
        used.add(target)
        data = z.read(src)
        if not data.startswith(b"%PDF-"):
            raise SystemExit(f"No es PDF: {src}")
        (dest / target).write_bytes(data)
        print(f"  OK {target} ({len(data)} bytes)")
    leftover = [n for n in names if n not in claimed and n.lower().endswith(".pdf")]
    if leftover:
        raise SystemExit("PDFs sin mapear: " + ", ".join(leftover))
`,
  "utf8",
);

const planPath = join(dest, "_extract_avemaria.plan.json");
writeFileSync(planPath, JSON.stringify(plan), "utf8");

try {
  execFileSync("python", [helper, ZIP_PATH, dest, planPath], {
    stdio: "inherit",
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
} finally {
  for (const f of [helper, planPath]) {
    if (existsSync(f)) unlinkSync(f);
  }
}

const pdfs = readdirSync(dest).filter((f) => /\.pdf$/i.test(f));
console.log(`\n${pdfs.length} PDFs en ${dest}`);
for (const name of pdfs.sort((a, b) => a.localeCompare(b, "es"))) {
  console.log(`  ${name}`);
}
