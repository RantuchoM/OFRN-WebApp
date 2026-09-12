/**
 * Sync Farías Nocturno → BD: UPDATE in-place de placeholders existentes.
 * NUNCA DELETE / INSERT de particellas (seating gira 17 usa esos ids).
 * SCORE / Perc Percusión 1–2 quedan en Drive pero no se insertan hasta decisión.
 *
 *   node scripts/generate-farias-nocturno-sync.mjs
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import {
  attachDriveLinksByFilename,
  parsePartSlot,
} from "./lib/drivePartMatcher.mjs";
import {
  FARIAS_NOCTURNO_WORK,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  driveFolderUrl,
} from "./lib/fariasNocturnoCatalog.mjs";
import {
  SB_URL,
  fetchInstrumentos,
  headers,
  listFolder,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

const EXTRA_KEEP_IN_DRIVE = new Set([
  "score",
  "perc percusion 1",
  "perc percusion 2",
]);

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function slotKey(name) {
  const slot = parsePartSlot(name);
  const base = String(slot.baseNorm || "")
    .replace(/\btimbal(es)?\b/g, "timp")
    .replace(/\btimpani\b/g, "timp")
    .replace(/\bviolonchelo\b/g, "violoncello")
    .replace(/\s+/g, " ")
    .trim();
  const num = slot.slotNumber != null ? String(slot.slotNumber) : "x";
  return `${base}|${num}`;
}

async function fetchExistingParts(obraId) {
  const res = await fetch(
    `${SB_URL}/rest/v1/obras_particellas?id_obra=eq.${obraId}&select=id,id_instrumento,nombre_archivo,url_archivo,es_solista,instrumentos(instrumento)`,
    { headers: { Authorization: headers.Authorization, apikey: headers.apikey } },
  );
  const rows = await res.json();
  return (rows || []).map((p) => ({
    ...p,
    instrumento_nombre: p.instrumentos?.instrumento || "",
    links: [],
  }));
}

async function discoverDriveFolderId() {
  if (FARIAS_NOCTURNO_WORK.driveFolderId) {
    return FARIAS_NOCTURNO_WORK.driveFolderId;
  }
  const parentUrl = driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
  const files = await listFolder(parentUrl);
  const needle = foldName(FARIAS_NOCTURNO_WORK.targetFolder);
  const hit = files.find(
    (f) =>
      f.mimeType?.includes("folder") && foldName(f.name) === needle,
  );
  if (hit?.id) return hit.id;
  const loose = files.find(
    (f) =>
      f.mimeType?.includes("folder") &&
      /farias/i.test(foldName(f.name)) &&
      /nocturno/i.test(foldName(f.name)),
  );
  return loose?.id || null;
}

function localPdfFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.pdf$/i.test(f))
    .map((name) => ({ name, webViewLink: null, id: `local:${name}` }));
}

function extraKeepKey(fileName) {
  const prefix = String(fileName || "")
    .replace(/\.pdf$/i, "")
    .split(/\s+-\s+/)[0]
    .trim();
  return foldName(prefix);
}

async function main() {
  const work = FARIAS_NOCTURNO_WORK;
  const instrumentos = await fetchInstrumentos();
  if (!Array.isArray(instrumentos)) {
    throw new Error("No se pudo leer instrumentos");
  }

  const existing = await fetchExistingParts(work.obraId);
  console.log(`Placeholders obra ${work.obraId}: ${existing.length}`);

  const localDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  const localFiles = localPdfFiles(localDir);
  console.log(`Local: ${localDir} (${localFiles.length} PDFs)`);

  let folderId = null;
  let driveFiles = [];
  try {
    folderId = await discoverDriveFolderId();
    if (folderId) {
      driveFiles = (await listFolder(driveFolderUrl(folderId))).filter((f) =>
        /\.pdf$/i.test(f.name || ""),
      );
      console.log(`Drive folder ${folderId}: ${driveFiles.length} PDFs`);
    } else {
      console.warn("  Carpeta Drive aún no visible (File Stream).");
    }
  } catch (e) {
    console.warn("  list_folder:", e.message);
  }

  const byName = new Map(driveFiles.map((f) => [foldName(f.name), f]));
  const files = (
    localFiles.length
      ? localFiles.map((f) => {
          const hit = byName.get(foldName(f.name));
          return hit?.webViewLink ? { ...f, ...hit } : f;
        })
      : driveFiles
  ).sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));

  const linked = attachDriveLinksByFilename(existing, files);
  const usedFileIds = new Set();
  for (const p of linked) {
    for (const l of p.links || []) {
      const hit = files.find((f) => f.webViewLink === l.url);
      if (hit?.id) usedFileIds.add(hit.id);
    }
  }

  const stillUnlinked = linked.filter((p) => !(p.links || []).length);
  const unusedFiles = files.filter((f) => {
    if (usedFileIds.has(f.id)) return false;
    if (EXTRA_KEEP_IN_DRIVE.has(extraKeepKey(f.name))) return true;
    return true;
  });

  const existingByKey = new Map(linked.map((p) => [slotKey(p.nombre_archivo), p]));
  for (const file of unusedFiles) {
    if ((file.links && file.links.length) || usedFileIds.has(file.id)) continue;
    if (EXTRA_KEEP_IN_DRIVE.has(extraKeepKey(file.name))) continue;
    const key = slotKey(file.name);
    const part = existingByKey.get(key);
    if (!part || (part.links || []).length) continue;
    if (file.webViewLink) {
      part.links = [{ url: file.webViewLink, description: file.name }];
      usedFileIds.add(file.id);
    }
  }

  const matched = linked.filter((p) => (p.links || []).length);
  const unmatchedParts = linked.filter((p) => !(p.links || []).length);
  const extraFiles = files.filter(
    (f) => EXTRA_KEEP_IN_DRIVE.has(extraKeepKey(f.name)) || !usedFileIds.has(f.id),
  ).filter((f) => !usedFileIds.has(f.id));

  console.log(`\nMatched placeholders: ${matched.length}/${existing.length}`);
  for (const p of matched) {
    console.log(`  ✓ ${p.id} ${p.nombre_archivo} ← ${p.links[0]?.description}`);
  }
  console.log(`\nPlaceholders sin PDF (no tocar):`);
  for (const p of unmatchedParts) {
    console.log(`  • ${p.id} ${p.nombre_archivo}`);
  }
  console.log(`\nPDFs extra (Drive only, no INSERT):`);
  for (const f of extraFiles) {
    console.log(`  • ${f.name}`);
  }

  const linkDrive = folderId ? driveFolderUrl(folderId) : null;
  const obs = `Para acomodar — ${work.targetFolder}. Pendiente decisión de orgánico: ZIP tiene Perc 1/2 + SCORE y no tiene Trombón 3 (placeholder ocupado).`;

  let sql = `-- Farías — Nocturno → obra ${work.obraId}
-- Generado: ${new Date().toISOString().slice(0, 10)}
-- UPDATE in-place de url_archivo. NO borra particellas ni cambia seating.
-- NO inserta SCORE / Perc Percusión 1–2. NO elimina Trombón 3.

DO $$
BEGIN
`;

  sql += `  UPDATE obras SET\n`;
  if (linkDrive) {
    sql += `    link_drive = '${sqlEscape(linkDrive)}',\n`;
  }
  sql += `    observaciones = '${sqlEscape(obs)}'\n`;
  sql += `  WHERE id = ${work.obraId};\n\n`;

  for (const p of matched) {
    const url = JSON.stringify(p.links);
    sql += `  UPDATE obras_particellas SET
    url_archivo = '${sqlEscape(url)}'
  WHERE id = ${p.id} AND id_obra = ${work.obraId};

`;
  }

  sql += `END $$;
`;

  writeSeed("supabase/seed_farias_nocturno_sync.sql", sql, [work]);
  console.log("\nSeed: supabase/seed_farias_nocturno_sync.sql");
  if (!folderId) {
    console.warn(
      "link_drive vacío: re-ejecutar generate cuando File Stream publique la carpeta.",
    );
  }
  if (matched.some((p) => !p.links?.[0]?.url)) {
    console.warn("Algunos matches no tienen webViewLink aún (sync Drive).");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
