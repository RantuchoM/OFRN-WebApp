/**
 * Sync particellas gira 305 (Garcia) → obras 3886–3889.
 * UPDATE in-place: no crea obras nuevas ni toca repertorio_obras.
 */
import { existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  CORO_UNRN_GARCIA_WORKS,
  PARA_ACOMODAR_ROOT,
  driveFolderUrl,
} from "./lib/coroUnrnGarciaCatalog.mjs";
import {
  fetchInstrumentos,
  listFolder,
  personKey,
  personVarSafe,
  sqlEscape,
} from "./lib/repertoireSeedUtils.mjs";

const allowEmptyUrls = process.argv.includes("--allow-empty-urls");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function localPdfFiles(dir) {
  return readdirSync(dir)
    .filter((name) => /\.pdf$/i.test(name))
    .map((name) => ({ name, webViewLink: null }));
}

function mergeDriveLinks(localFiles, driveFiles) {
  const byName = new Map(
    (driveFiles || []).map((file) => [foldName(file.name), file]),
  );
  return localFiles.map((file) => {
    const hit = byName.get(foldName(file.name));
    if (!hit?.webViewLink) return file;
    return { ...file, webViewLink: hit.webViewLink, id: hit.id };
  });
}

function buildParts(files, instrumentos) {
  const parts = [];
  for (const file of files.sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "es"),
  )) {
    const before = parts.length;
    appendSeedPartsFromFile(parts, file, instrumentos);
    if (parts.length === before) {
      console.warn(`  Sin match: ${file.name}`);
      continue;
    }
    if (!file.webViewLink) {
      for (let i = before; i < parts.length; i += 1) {
        parts[i].url_archivo = "[]";
      }
    }
    console.log(`  ${file.name} → ${parts.length - before}`);
  }
  return parts;
}

async function processWork(work, instrumentos) {
  const workDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  if (!existsSync(workDir)) throw new Error(`No existe ${workDir}`);
  const localFiles = localPdfFiles(workDir);
  console.log(`\n=== ${work.titulo} (obra ${work.obraId}) ===`);
  console.log(`  Local PDFs: ${localFiles.length}`);

  const link = driveFolderUrl(work.driveFolderId);
  let driveFiles = [];
  try {
    driveFiles = (await listFolder(link)).filter((f) =>
      /\.pdf$/i.test(f.name || ""),
    );
    console.log(`  Drive PDFs: ${driveFiles.length}`);
  } catch (e) {
    console.warn(`  listFolder: ${e.message}`);
  }

  const files = mergeDriveLinks(localFiles, driveFiles);
  const withUrl = files.filter((f) => f.webViewLink).length;
  if (withUrl < localFiles.length && !allowEmptyUrls) {
    throw new Error(
      `${work.titulo}: URLs Drive incompletas (${withUrl}/${localFiles.length}). Esperá sync File Stream o usá --allow-empty-urls.`,
    );
  }
  if (withUrl < localFiles.length) {
    console.warn(
      `  URLs incompletas ${withUrl}/${localFiles.length} (allow-empty-urls)`,
    );
  }

  const parts = buildParts(files, instrumentos);
  const inst = calculateInstrumentation(parts);
  console.log(`  → ${parts.length} particellas | ${inst}`);
  return { work, link, parts, inst };
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const selected = only
    ? CORO_UNRN_GARCIA_WORKS.filter(
        (w) =>
          String(w.obraId) === only ||
          w.titulo.toLowerCase().includes(only.toLowerCase()),
      )
    : CORO_UNRN_GARCIA_WORKS;

  if (!selected.length) {
    console.error("Ninguna obra coincide con --only=", only);
    process.exit(1);
  }

  const results = [];
  for (const work of selected) {
    results.push(await processWork(work, instrumentos));
  }

  const arrKey = personKey(CORO_UNRN_GARCIA_WORKS[0].arranger);
  const arrVar = `_id_arr_${personVarSafe(arrKey)}`;
  const arr = CORO_UNRN_GARCIA_WORKS[0].arranger;

  let sql = `-- Gira 305 «Con el coro UNRN» — arreglos Garcia (cuerdas)
-- UPDATE in-place obras ${results.map((r) => r.work.obraId).join(", ")}.
-- No crea obras nuevas. No toca repertorio_obras.
-- Generado: ${new Date().toISOString().slice(0, 10)}

DO $$
DECLARE
  ${arrVar} bigint;
BEGIN
  SELECT id INTO ${arrVar}
  FROM compositores
  WHERE apellido = '${sqlEscape(arr.apellido)}'
    AND nombre = '${sqlEscape(arr.nombre)}'
  LIMIT 1;
  IF ${arrVar} IS NULL THEN
    RAISE EXCEPTION 'No se encontró arreglador Garcia, Anibal';
  END IF;
END $$;

`;

  for (const { work, link, parts, inst } of results) {
    sql += `-- ${work.titulo} → obra ${work.obraId} (${parts.length} partes | ${inst})
UPDATE obras
SET estado = 'Oficial',
    id_arreglador = (SELECT id FROM compositores WHERE apellido = 'Garcia' AND nombre = 'Anibal' LIMIT 1),
    link_drive = '${sqlEscape(link)}',
    observaciones = '${sqlEscape(work.observaciones)}',
    instrumentacion = '${sqlEscape(inst)}'
WHERE id = ${work.obraId};

DELETE FROM obras_particellas WHERE id_obra = ${work.obraId};

`;
    for (const part of parts) {
      sql += `INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (${work.obraId}, '${sqlEscape(part.id_instrumento)}', '${sqlEscape(part.nombre_archivo)}', '${sqlEscape(part.url_archivo)}', ${part.es_solista ? "true" : "false"});
`;
    }
    sql += `\n`;
  }

  sql += `-- Trigger obras_particellas_sync_instrumentacion puede recalcular instrumentacion.
`;

  const out = "supabase/seed_coro_unrn_garcia_sync.sql";
  writeFileSync(out, sql, "utf8");
  console.log(`\nSeed: ${out}`);
  for (const { work, parts, inst } of results) {
    console.log(`  ${work.obraId} ${work.titulo}: ${parts.length} | ${inst}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
