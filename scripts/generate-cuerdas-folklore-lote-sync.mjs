/**
 * Seed CUERDAS — Abuelita Lorenza, Pastorcita de Antinaco, La Nochera
 * + particellas de cuerdas que faltaban en Si Llega A Ser Tucumana (obra 1432).
 *
 *   node scripts/generate-cuerdas-folklore-lote-sync.mjs
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  CUERDAS_FOLKLORE_WORKS,
  CUERDAS_ROOT,
  TUCUMANA_CUERDAS_PARTS,
  TUCUMANA_DRIVE_FOLDER_ID,
  TUCUMANA_OBRA_ID,
} from "./lib/cuerdasFolkloreLoteCatalog.mjs";
import {
  SB_URL,
  buildSeedSql,
  fetchInstrumentos,
  headers,
  listFolder,
  personKey,
  personVarSafe,
  sleep,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

const DVORAK_FOLDER_ID = "1Uv4vvVa0b0qMMWbgM8MjD2E0dxeML9Ve";

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function driveFolderUrl(id) {
  return `https://drive.google.com/drive/folders/${id}`;
}

async function driveGet(token, path) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function cuerdasFolderId() {
  const tokenRes = await fetch(`${SB_URL}/functions/v1/manage-drive`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "get_temp_token" }),
  });
  const tokenBody = await tokenRes.json();
  if (!tokenBody.accessToken) {
    throw new Error(tokenBody.error || "sin access token");
  }
  const meta = await driveGet(
    tokenBody.accessToken,
    `files/${DVORAK_FOLDER_ID}?fields=parents&supportsAllDrives=true`,
  );
  const parent = meta.parents?.[0];
  if (!parent) throw new Error("CUERDAS sin parent en Drive");
  return parent;
}

function localPdfs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => /\.pdf$/i.test(name))
    .map((name) => ({ name, webViewLink: null }));
}

function mergeLinks(localFiles, driveFiles) {
  const byName = new Map((driveFiles || []).map((f) => [foldName(f.name), f]));
  return localFiles.map((f) => {
    const hit = byName.get(foldName(f.name));
    if (!hit?.webViewLink) return f;
    return { ...f, webViewLink: hit.webViewLink, id: hit.id };
  });
}

function buildParts(files, instrumentos) {
  const parts = [];
  for (const file of files.sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "es"),
  )) {
    const before = parts.length;
    const n = appendSeedPartsFromFile(parts, file, instrumentos);
    if (!n) console.warn("  Sin match:", file.name);
    if (!file.webViewLink) {
      for (let i = before; i < parts.length; i += 1) parts[i].url_archivo = "[]";
    }
  }
  return parts;
}

const TUCUMANA_EXISTING_LINKS = [
  { nombre: "Bajo", file: "Bajo - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf" },
  { nombre: "Marimba 1", file: "Marimba 1 - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf" },
  { nombre: "Marimba 2", file: "Marimba 2 - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf" },
  { nombre: "SCORE", file: "SCORE - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf" },
  { nombre: "Vibráfono", file: "Vibráfono - Si Llega A Ser Tucumana - Leguizamón-Lema.pdf" },
];

function linkJson(file, hit) {
  if (!hit?.webViewLink) return null;
  return JSON.stringify([{ url: hit.webViewLink, description: file }]);
}

function tucumanaSql(driveFiles) {
  const byName = new Map((driveFiles || []).map((f) => [foldName(f.name), f]));
  const nombres = TUCUMANA_CUERDAS_PARTS.map((n) => `'${sqlEscape(n)}'`).join(", ");
  let sql = `
-- Si Llega A Ser Tucumana (obra ${TUCUMANA_OBRA_ID}): vibráfono, marimba y bajo.
-- El arreglo de cuerdas es otra obra. Estas partes no vuelven a 1432.
DELETE FROM obras_particellas
WHERE id_obra = ${TUCUMANA_OBRA_ID}
  AND nombre_archivo IN (${nombres});

UPDATE obras
SET link_drive = '${driveFolderUrl(TUCUMANA_DRIVE_FOLDER_ID)}'
WHERE id = ${TUCUMANA_OBRA_ID};
`;
  for (const part of TUCUMANA_EXISTING_LINKS) {
    const url = linkJson(part.file, byName.get(foldName(part.file)));
    if (!url) {
      console.warn("  Sin url Tucumana:", part.file);
      continue;
    }
    sql += `
UPDATE obras_particellas
SET url_archivo = '${sqlEscape(url)}'
WHERE id_obra = ${TUCUMANA_OBRA_ID}
  AND nombre_archivo = '${sqlEscape(part.nombre)}';
`;
  }
  return sql;
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const parentId = await cuerdasFolderId();
  console.log("CUERDAS", parentId);
  const parentFiles = await listFolder(driveFolderUrl(parentId));
  console.log(`Carpetas/archivos en CUERDAS: ${parentFiles.length}`);

  const workData = [];
  for (const work of CUERDAS_FOLKLORE_WORKS) {
    const dir = join(CUERDAS_ROOT, work.targetFolder);
    console.log(`\n=== ${work.targetFolder} ===`);
    const folder = parentFiles.find(
      (f) => foldName(f.name) === foldName(work.targetFolder),
    );
    let files = localPdfs(dir);
    if (folder?.id) {
      const driveFiles = await listFolder(driveFolderUrl(folder.id));
      files = mergeLinks(files, driveFiles);
      await sleep(200);
      console.log(`  Drive ${folder.id} (${driveFiles.length} archivos)`);
    } else {
      console.warn("  Sin carpeta en Drive todavía");
    }
    const parts = buildParts(files, instrumentos);
    const instrumentacion = calculateInstrumentation(parts);
    console.log(`  particellas=${parts.length} org=${instrumentacion}`);
    for (const p of parts) {
      const linked = p.url_archivo && p.url_archivo !== "[]";
      console.log(`   ${p.id_instrumento} ${p.nombre_archivo}${linked ? "" : " (sin url)"}`);
    }
    workData.push({
      titulo: work.titulo,
      compositors: work.compositors,
      arranger: work.arranger,
      anio: null,
      duracion_segundos: null,
      observaciones: work.observaciones,
      instrumentacion,
      link_drive: folder?.id
        ? driveFolderUrl(folder.id)
        : driveFolderUrl(parentId),
      parts,
    });
  }

  const tucuFiles = await listFolder(driveFolderUrl(TUCUMANA_DRIVE_FOLDER_ID));
  const sql =
    buildSeedSql({
      outComment:
        "-- CUERDAS — Abuelita Lorenza, Pastorcita de Antinaco, La Nochera, Tucumana [cuerdas]",
      workData,
      resolveArrangerVar: (w) => `_id_arr_${personVarSafe(personKey(w.arranger))}`,
    }) + tucumanaSql(tucuFiles);

  writeSeed("supabase/seed_cuerdas_folklore_lote_sync.sql", sql, workData);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
