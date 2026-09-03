/**
 * Genera seed SQL para particellas Spatocco desde las carpetas Archivo (backup).
 *
 * Flujo:
 *   1. (opcional) `copiar_carpeta_a_archivo` desde sourceDriveFolderId → Archivo
 *   2. Lista PDFs de driveFolderId (Archivo) y arma particellas
 *   3. Escribe supabase/seed_spatocco_sync.sql
 *
 * Uso:
 *   node scripts/generate-spatocco-sync.mjs              # usa driveFolderId del catálogo
 *   node scripts/generate-spatocco-sync.mjs --copy       # re-copia origen → Archivo y actualiza IDs
 *
 * Produce: supabase/seed_spatocco_sync.sql
 */
import { writeFileSync } from "fs";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartFromDriveFile } from "./lib/drivePartMatcher.mjs";
import { normalizeInstrumentLabel } from "./lib/pdfPartsRenaming.mjs";
import {
  SB_URL,
  fetchInstrumentos,
  headers,
  listFolder,
  sleep,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";
import { ALL_SPATOCCO_WORKS } from "./lib/spatoccoCatalog.mjs";

const DRIVE_ROOT = "https://drive.google.com/drive/folders/";
const doCopy = process.argv.includes("--copy");

const SPATOCCO_INSTRUMENT_ALIASES = new Map([
  ["glockenspiel, drum set", "Percusión"],
  ["voice", "Voz"],
]);

function extractDriveId(urlOrId) {
  if (!urlOrId) return null;
  const s = String(urlOrId).trim();
  if (/^[-\w]{25,}$/.test(s)) return s;
  const m = s.match(/[-\w]{25,}/);
  return m ? m[0] : null;
}

async function copyToArchivo(linkOrigen, nombreCarpeta) {
  const res = await fetch(`${SB_URL}/functions/v1/manage-drive`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      action: "copiar_carpeta_a_archivo",
      link_origen: linkOrigen,
      nombre_carpeta: nombreCarpeta.slice(0, 200).replace(/[/\\?*:[\]]/g, "_"),
    }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(JSON.stringify(data));
  return data.link_drive;
}

function normalizeSpatoccoFileName(fileName, work) {
  const base = String(fileName || "").replace(/\.pdf$/i, "").trim();
  const segments = base.split(/\s+-\s+/).map((s) => s.trim()).filter(Boolean);
  const canonicalSuffix = ` - ${work.titulo} - ${work.composerTag}`;
  const rawInstrument =
    base.endsWith(canonicalSuffix) && segments.length >= 1
      ? segments[0]
      : segments.length >= 2
        ? segments.slice(1).join(" - ")
        : base;
  const aliasKey = rawInstrument.toLowerCase();
  const instrument =
    SPATOCCO_INSTRUMENT_ALIASES.get(aliasKey) ||
    normalizeInstrumentLabel(rawInstrument);
  return `${instrument} - ${work.titulo} - ${work.composerTag}.pdf`;
}

async function buildParts(folderId, instrumentos, work) {
  if (!folderId) {
    console.warn("  ⚠ driveFolderId no definido, omitiendo particellas.");
    return [];
  }
  const files = (await listFolder(`${DRIVE_ROOT}${folderId}`)).filter((f) =>
    /\.pdf$/i.test(f.name || ""),
  );
  const parts = [];
  for (const file of files.sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "es"),
  )) {
    const suggested = suggestPartFromDriveFile(
      {
        ...file,
        name: normalizeSpatoccoFileName(file.name, work),
      },
      instrumentos,
    );
    if (!suggested) {
      console.warn("  Sin match:", file.name);
      continue;
    }
    parts.push({
      ...suggested,
      url_archivo: JSON.stringify([
        { url: file.webViewLink, description: file.name },
      ]),
      driveFileId: file.id || extractDriveId(file.webViewLink),
    });
  }
  const seen = new Map();
  for (const part of parts) {
    const key = `${part.id_instrumento}|${part.nombre_archivo}`;
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    if (n > 1) part.nombre_archivo = `${part.nombre_archivo} ${n}`;
    if (/\bvoz\b/i.test(part.nombre_archivo)) part.es_solista = true;
  }
  return parts;
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const resolvedWorks = [];

  let sql = `-- Spatocco — Arreglos para OFRN → particellas (Archivo backup)
-- Generado: ${new Date().toISOString().slice(0, 10)}
-- Actualiza link_drive (carpeta Archivo), instrumentacion y obras_particellas.
-- Fuente: copias en Archivo OFRN (copiar_carpeta_a_archivo), no carpetas origen Spatocco.

`;

  for (const work of ALL_SPATOCCO_WORKS) {
    if (!work.obraId) {
      sql += `-- ⚠ PENDIENTE: ${work.titulo} — obraId no definido. Completar spatoccoCatalog.mjs.\n\n`;
      continue;
    }

    console.log(`\nProcesando: ${work.titulo} (obra ${work.obraId})`);
    let folderId = work.driveFolderId;

    if (doCopy) {
      const sourceId = work.sourceDriveFolderId || work.driveFolderId;
      if (!sourceId) {
        console.warn("  Sin sourceDriveFolderId; no se puede copiar.");
      } else {
        const originUrl = `${DRIVE_ROOT}${sourceId}`;
        console.log(`  Copiando al Archivo desde ${sourceId}…`);
        const link = await copyToArchivo(originUrl, work.targetFolder);
        folderId = extractDriveId(link);
        console.log(`  Archivo → ${folderId}`);
        await sleep(500);
      }
    }

    const parts = await buildParts(folderId, instrumentos, work);
    const inst = calculateInstrumentation(parts);
    console.log(`  ${parts.length} partes | ${inst} | folder=${folderId}`);

    const driveUrl = folderId ? `${DRIVE_ROOT}${folderId}` : null;

    sql += `-- ${work.titulo} → obra ${work.obraId} (Archivo ${folderId})\n`;
    sql += `DO $$\nBEGIN\n`;
    sql += `  UPDATE obras SET\n`;
    if (driveUrl) sql += `    link_drive = '${sqlEscape(driveUrl)}',\n`;
    sql += `    instrumentacion = '${sqlEscape(inst)}'\n`;
    sql += `  WHERE id = ${work.obraId};\n\n`;
    sql += `  DELETE FROM obras_particellas WHERE id_obra = ${work.obraId};\n\n`;

    for (const p of parts) {
      const solista = p.es_solista ? "true" : "false";
      sql += `  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)\n`;
      sql += `  VALUES (${work.obraId}, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});\n\n`;
    }

    sql += `END $$;\n\n`;

    resolvedWorks.push({
      ...work,
      driveFolderId: folderId,
      partsCount: parts.length,
      partFileIds: parts.map((p) => p.driveFileId).filter(Boolean),
    });
  }

  writeSeed("supabase/seed_spatocco_sync.sql", sql, resolvedWorks);

  // Si --copy, reescribir catálogo con los nuevos driveFolderId de Archivo
  if (doCopy) {
    const catalogPath = new URL("./lib/spatoccoCatalog.mjs", import.meta.url);
    let catalog = await (await import("fs")).promises.readFile(catalogPath, "utf8");
    for (const w of resolvedWorks) {
      if (!w.driveFolderId || !w.obraId) continue;
      // Replace driveFolderId only for the matching obra block by obraId vicinity is fragile;
      // instead patch by unique previous id if present, else leave manual.
      const re = new RegExp(
        `(obraId:\\s*${w.obraId}[\\s\\S]*?driveFolderId:\\s*")[^"]+(")`,
      );
      if (re.test(catalog)) {
        catalog = catalog.replace(re, `$1${w.driveFolderId}$2`);
      }
    }
    writeFileSync(catalogPath, catalog, "utf8");
    console.log("\nCatálogo actualizado con driveFolderId Archivo.");
  }

  console.log("\nSeed: supabase/seed_spatocco_sync.sql");
  for (const w of resolvedWorks) {
    console.log(
      `  #${w.obraId} ${w.titulo}: Archivo ${w.driveFolderId} · ${w.partsCount} particellas`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
