/**
 * Sync Cielito Lindo ('Orquesta y Voz') → BD (insert + particellas).
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  CIELITO_LINDO_WORK,
  PARA_ACOMODAR_ROOT,
  driveFolderUrl,
} from "./lib/cielitoLindoCatalog.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  fetchWorkMetadata,
  listFolder,
  personKey,
  personVarSafe,
  sleep,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function dedupeParts(parts) {
  const map = new Map();
  for (const p of parts) {
    const key = `${p.id_instrumento}|${p.nombre_archivo}`;
    if (map.has(key)) {
      const existing = map.get(key);
      const merged = [
        ...JSON.parse(existing.url_archivo || "[]"),
        ...JSON.parse(p.url_archivo || "[]"),
      ];
      existing.url_archivo = JSON.stringify(merged);
    } else {
      map.set(key, { ...p });
    }
  }
  return [...map.values()];
}

function buildPartsFromFiles(files, instrumentos, solistaInstruments = []) {
  const parts = [];
  const pdfs = files
    .filter((f) => /\.pdf$/i.test(f.name || ""))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
  const solista = new Set((solistaInstruments || []).map((s) => foldName(s)));
  for (const file of pdfs) {
    const before = parts.length;
    const n = appendSeedPartsFromFile(parts, file, instrumentos);
    if (!n) {
      console.warn("  Sin match:", file.name);
      continue;
    }
    if (!file.webViewLink) {
      for (let i = before; i < parts.length; i += 1) {
        parts[i].url_archivo = "[]";
      }
    }
    for (let i = before; i < parts.length; i += 1) {
      const label = foldName(
        `${parts[i].nombre_archivo} ${parts[i].instrumento_nombre || ""}`,
      );
      if (
        solista.has(foldName(parts[i].nombre_archivo)) ||
        solista.has(foldName(parts[i].instrumento_nombre)) ||
        /\bvoz\b|\btenor\b|\bsoprano\b/i.test(label)
      ) {
        parts[i].es_solista = true;
      }
    }
    console.log(`  ${file.name} → ${n} particella(s)`);
  }
  return dedupeParts(parts);
}

function localPdfFiles(dir) {
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.pdf$/i.test(f))
    .map((name) => ({ name, webViewLink: null }));
}

function localWorkDir(work) {
  const target = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  if (existsSync(target)) return target;
  const src = join(PARA_ACOMODAR_ROOT, work.sourceFolder);
  if (existsSync(src)) return src;
  if (!existsSync(PARA_ACOMODAR_ROOT)) return null;
  const needle = foldName("cielito lindo");
  const hit = readdirSync(PARA_ACOMODAR_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && foldName(d.name).includes(needle))
    .map((d) => d.name)[0];
  return hit ? join(PARA_ACOMODAR_ROOT, hit) : null;
}

async function main() {
  const work = CIELITO_LINDO_WORK;
  const instrumentos = await fetchInstrumentos();
  const localDir = localWorkDir(work);
  const localFiles = localPdfFiles(localDir);
  console.log(`\n=== ${work.titulo} ===`);
  console.log(`  Local: ${localDir || "(no)"} (${localFiles.length} PDFs)`);

  const driveId = work.driveFolderId;
  const linkDrive = driveFolderUrl(driveId);
  let driveFiles = [];
  if (driveId) {
    try {
      driveFiles = (await listFolder(linkDrive)).filter((f) =>
        /\.pdf$/i.test(f.name || ""),
      );
      console.log(`  Drive: ${linkDrive} (${driveFiles.length} PDFs)`);
    } catch (e) {
      console.warn("  list_folder:", e.message);
    }
  }

  const byName = new Map(
    (driveFiles || []).map((f) => [foldName(f.name), f]),
  );
  const files = localFiles.map((f) => {
    const hit = byName.get(foldName(f.name));
    return hit?.webViewLink ? { ...f, webViewLink: hit.webViewLink, id: hit.id } : f;
  });

  const parts = buildPartsFromFiles(
    files,
    instrumentos,
    work.solistaInstruments,
  );
  const inst = calculateInstrumentation(parts);

  const fetched = await fetchWorkMetadata(
    work.titulo,
    work.compositor,
    `${work.compositor.nombre || ""} ${work.compositor.apellido} ${work.titulo}`.trim(),
  );
  await sleep(250);
  const anio = work.anio ?? fetched.anio ?? null;
  let duracion = fetched.duracion_segundos ?? null;
  if (duracion != null && duracion > 1500) duracion = null;

  console.log(
    `  ${parts.length} partes | ${inst} | anio=${anio ?? "null"} dur=${duracion ?? "null"}s`,
  );

  const workData = [
    {
      titulo: work.titulo,
      compositors: [work.compositor],
      arranger: work.arranger,
      observaciones: work.observaciones,
      link_drive: linkDrive,
      instrumentacion: inst,
      parts,
      anio,
      duracion_segundos: duracion,
    },
  ];

  const insertSql = buildSeedSql({
    outComment: `-- Cielito Lindo ('Orquesta y Voz') — Mendoza y Cortés-Payán (Para acomodar)`,
    workData,
    resolveArrangerVar: (w) =>
      w.arranger ? `_id_arr_${personVarSafe(personKey(w.arranger))}` : "NULL",
  });

  writeSeed("supabase/seed_cielito_lindo_sync.sql", insertSql, workData);
  console.log("\nSeed: supabase/seed_cielito_lindo_sync.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
