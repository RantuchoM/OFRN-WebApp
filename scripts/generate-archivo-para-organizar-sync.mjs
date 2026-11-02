/**
 * Seed BD desde carpetas locales en Para acomodar (lote Archivo-para-organizar).
 *
 *   node scripts/generate-archivo-para-organizar-sync.mjs [--only=queen,hook]
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  ARCHIVO_PARA_ORGANIZAR_WORKS,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  driveFolderUrl,
} from "./lib/archivoParaOrganizarCatalog.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  listFolder,
  personKey,
  personVarSafe,
  sleep,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

const only = process.argv
  .filter((a) => a.startsWith("--only="))
  .flatMap((a) => a.slice("--only=".length).toLowerCase().split(","))
  .filter(Boolean);

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[—–−]/g, "-")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function matchesOnly(work) {
  if (!only.length) return true;
  const hay = `${work.key} ${work.targetFolder}`.toLowerCase();
  return only.some((o) => hay.includes(o));
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
  const needle = foldName(work.targetFolder);
  const hit = readdirSync(PARA_ACOMODAR_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && foldName(d.name) === needle)
    .map((d) => d.name)[0];
  return hit ? join(PARA_ACOMODAR_ROOT, hit) : null;
}

async function discoverDriveFolderId(work, parentFiles) {
  if (work.driveFolderId) return work.driveFolderId;
  const needle = foldName(work.targetFolder);
  const exact = (parentFiles || []).find((f) => foldName(f.name) === needle);
  if (exact?.id) return exact.id;
  const prefix = needle.slice(0, Math.min(36, needle.length));
  const cands = (parentFiles || []).filter((f) =>
    foldName(f.name).startsWith(prefix),
  );
  return cands.length === 1 ? cands[0].id : null;
}

function mergeDriveLinks(localFiles, driveFiles) {
  const byName = new Map((driveFiles || []).map((f) => [foldName(f.name), f]));
  return localFiles.map((f) => {
    const hit = byName.get(foldName(f.name));
    if (!hit?.webViewLink) return f;
    return { ...f, webViewLink: hit.webViewLink, id: hit.id };
  });
}

function buildPartsFromFiles(files, instrumentos) {
  const parts = [];
  const pdfs = files
    .filter((f) => /\.pdf$/i.test(f.name || ""))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
  for (const file of pdfs) {
    const before = parts.length;
    const n = appendSeedPartsFromFile(parts, file, instrumentos);
    if (!n) console.warn("  Sin match:", file.name);
    if (!file.webViewLink) {
      for (let i = before; i < parts.length; i += 1) {
        parts[i].url_archivo = "[]";
      }
    }
  }
  return dedupeParts(parts);
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  let parentFiles = [];
  try {
    parentFiles = await listFolder(driveFolderUrl(PARA_ACOMODAR_FOLDER_ID));
    console.log(`Para acomodar Drive: ${parentFiles.length} entradas`);
  } catch (e) {
    console.warn("No se pudo listar Para acomodar en Drive:", e.message);
  }

  const workData = [];
  for (const work of ARCHIVO_PARA_ORGANIZAR_WORKS) {
    if (!matchesOnly(work)) continue;
    const dir = localWorkDir(work);
    console.log(`\n=== ${work.key}: ${work.targetFolder} ===`);
    if (!dir) {
      console.error("  Sin carpeta local");
      continue;
    }
    let files = localPdfFiles(dir);
    const folderId = await discoverDriveFolderId(work, parentFiles);
    if (folderId) {
      try {
        const driveFiles = await listFolder(driveFolderUrl(folderId));
        files = mergeDriveLinks(files, driveFiles);
        await sleep(200);
      } catch (e) {
        console.warn("  Drive list:", e.message);
      }
    } else {
      console.warn("  Sin Drive folder id aún (File Stream pendiente)");
    }

    const parts = buildPartsFromFiles(files, instrumentos);
    const instrumentacion = calculateInstrumentation(parts, instrumentos);
    console.log(
      `  PDFs=${files.length} particellas=${parts.length} org=${instrumentacion}`,
    );

    workData.push({
      titulo: work.tituloHtml || work.titulo,
      compositors: work.compositors,
      arranger: work.arranger || null,
      anio: work.anio ?? null,
      duracion_segundos: null,
      observaciones: work.observaciones,
      instrumentacion,
      link_drive: folderId
        ? driveFolderUrl(folderId)
        : driveFolderUrl(PARA_ACOMODAR_FOLDER_ID),
      parts,
    });
  }

  const sql = buildSeedSql({
    outComment:
      "-- Seed Archivo-para-organizar → Para acomodar (sin duplicar Homenajes/cine ya en archivo)",
    workData,
    resolveArrangerVar: (w) =>
      w.arranger
        ? `_id_arr_${personVarSafe(personKey(w.arranger))}`
        : "NULL",
  });

  writeSeed("supabase/seed_archivo_para_organizar_sync.sql", sql, workData);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
