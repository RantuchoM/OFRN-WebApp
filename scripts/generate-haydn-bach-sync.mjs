/**
 * Sync Haydn trumpet concerto + Bach orchestral suite 2 → BD (insert + particellas).
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  HAYDN_BACH_WORKS,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  driveFolderUrl,
} from "./lib/haydnBachCatalog.mjs";
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
      if (solista.has(foldName(parts[i].nombre_archivo))) {
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
  if (!existsSync(PARA_ACOMODAR_ROOT)) return null;
  const needle = foldName(work.targetFolder).slice(0, 18);
  const hit = readdirSync(PARA_ACOMODAR_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && foldName(d.name).includes(needle))
    .map((d) => d.name)[0];
  return hit ? join(PARA_ACOMODAR_ROOT, hit) : null;
}

async function discoverDriveFolderId(work) {
  if (work.driveFolderId) return work.driveFolderId;
  const parentUrl = driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
  try {
    const files = await listFolder(parentUrl);
    const needle = foldName(work.targetFolder);
    const hit =
      files.find((f) => foldName(f.name) === needle) ||
      files.find((f) => foldName(f.name).includes(needle.slice(0, 24)));
    if (hit?.id) {
      console.log(`  Drive folder: ${hit.name} (${hit.id})`);
      return hit.id;
    }
    console.warn(`  Para acomodar Drive aún no lista: ${work.targetFolder}`);
  } catch (e) {
    console.warn("  No se pudo listar Para acomodar:", e.message);
  }
  return null;
}

function inferInstrument(fileName, work) {
  const n = foldName(fileName);
  const hit = (work.renames || []).find(
    (r) =>
      foldName(r.pdf) === n ||
      foldName(canonicalPartFilename(r.instrument, work.workNumber, work.titulo, work.composerTag)) === n ||
      n.startsWith(foldName(`${r.instrument} - `)),
  );
  return hit?.instrument || null;
}

function mergeDriveLinks(localFiles, driveFiles, work) {
  const byName = new Map(
    (driveFiles || []).map((f) => [foldName(f.name), f]),
  );
  const used = new Set();
  return localFiles.map((f) => {
    const exact = byName.get(foldName(f.name));
    if (exact?.webViewLink) {
      used.add(exact.id || exact.name);
      return { ...f, webViewLink: exact.webViewLink, id: exact.id };
    }
    const inst = inferInstrument(f.name, work);
    if (!inst) return f;
    const driveHit = (driveFiles || []).find((d) => {
      if (used.has(d.id || d.name)) return false;
      return inferInstrument(d.name, work) === inst;
    });
    if (!driveHit?.webViewLink) return f;
    used.add(driveHit.id || driveHit.name);
    return { ...f, webViewLink: driveHit.webViewLink, id: driveHit.id };
  });
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const workData = [];

  for (const work of HAYDN_BACH_WORKS) {
    const localDir = localWorkDir(work);
    const localFiles = localPdfFiles(localDir);
    console.log(`\n=== ${work.titulo} ===`);
    console.log(`  Local: ${localDir || "(no)"} (${localFiles.length} PDFs)`);

    const driveId = await discoverDriveFolderId(work);
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

    const files = mergeDriveLinks(localFiles, driveFiles, work);
    const withUrl = files.filter((f) => f.webViewLink).length;
    if (localFiles.length && withUrl < localFiles.length) {
      console.warn(`  URLs Drive incompletas (${withUrl}/${localFiles.length})`);
    }

    const parts = buildPartsFromFiles(
      files,
      instrumentos,
      work.solistaInstruments,
    );
    const inst = calculateInstrumentation(parts);

    const fetched = await fetchWorkMetadata(
      work.titulo,
      work.compositor,
      `${work.compositor.nombre || ""} ${work.compositor.apellido} ${work.titulo} ${work.workNumber}`.trim(),
    );
    await sleep(250);
    const anio = work.anio ?? fetched.anio ?? null;
    let duracion = fetched.duracion_segundos ?? null;
    if (duracion != null && duracion > 1500) duracion = null;

    console.log(
      `  ${parts.length} partes | ${inst} | anio=${anio ?? "null"} dur=${duracion ?? "null"}s`,
    );

    workData.push({
      titulo: work.titulo,
      compositors: [work.compositor],
      arranger: work.arranger,
      observaciones: work.observaciones,
      link_drive: linkDrive,
      instrumentacion: inst,
      parts,
      anio,
      duracion_segundos: duracion,
    });
  }

  const insertSql = buildSeedSql({
    outComment: `-- Haydn Hob.VIIe1 + Bach BWV 1067 (Para acomodar)`,
    workData,
    resolveArrangerVar: (w) =>
      w.arranger ? `_id_arr_${personVarSafe(personKey(w.arranger))}` : "NULL",
  });

  writeSeed("supabase/seed_haydn_bach_sync.sql", insertSql, workData);
  console.log("\nSeed: supabase/seed_haydn_bach_sync.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
