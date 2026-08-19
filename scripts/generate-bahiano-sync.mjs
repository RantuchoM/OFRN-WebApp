/**
 * Bahiano → seed BD: 16 obras Marley (Oficial), particellas, audios Drive,
 * copia al Archivo, bloque "Bahiano" al final de gira 12.
 *
 * Uso: esperar sync Drive File Stream, luego:
 *   node scripts/generate-bahiano-sync.mjs
 *   node scripts/generate-bahiano-sync.mjs --skip-copy   (link_drive = Para acomodar)
 */
import { execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartFromDriveFile } from "./lib/drivePartMatcher.mjs";
import {
  BAHIANO_PARENT_DRIVE_ID,
  BAHIANO_PARENT_FOLDER,
  BAHIANO_WORKS,
  BLOQUE_NOMBRE,
  COMPOSER_TAG,
  GIRA_ID,
  MARLEY,
  PARA_ACOMODAR_ROOT,
  driveFolderUrl,
  inferInstrumentFromFilename,
  targetFolderName,
} from "./lib/bahianoCatalog.mjs";
import {
  SB_URL,
  fetchInstrumentos,
  headers,
  listFolder,
  sleep,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

const skipCopy = process.argv.includes("--skip-copy");

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function localWorkDir(work) {
  const parent = join(PARA_ACOMODAR_ROOT, BAHIANO_PARENT_FOLDER);
  const target = join(parent, targetFolderName(work));
  if (existsSync(target)) return target;
  if (!existsSync(parent)) return null;
  const hit = readdirSync(parent, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .find((n) => foldName(n) === foldName(targetFolderName(work)));
  return hit ? join(parent, hit) : null;
}

function mp3DurationSeconds(dir) {
  if (!dir || !existsSync(dir)) return null;
  const mp3 = readdirSync(dir).find((f) => /\.mp3$/i.test(f));
  if (!mp3) return null;
  const path = join(dir, mp3);
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${path}"`,
      { encoding: "utf8" },
    );
    const n = Number.parseFloat(out);
    if (Number.isFinite(n) && n > 0 && n < 3600) return Math.round(n);
  } catch {
    /* ignore */
  }
  return null;
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

function extractDriveId(urlOrId) {
  if (!urlOrId) return null;
  const s = String(urlOrId).trim();
  if (/^[-\w]{25,}$/.test(s)) return s;
  const m = s.match(/[-\w]{25,}/);
  return m ? m[0] : null;
}

function audioEntryFromFile(file) {
  const id = file?.id || extractDriveId(file?.webViewLink);
  if (!id) return null;
  const name = file.name || "Audio";
  let label = name.replace(/\.[^.]+$/, "").replace(/^AUDIO\s*[-–—:]?\s*/i, "").trim();
  return {
    drive_file_id: id,
    name,
    url: file.webViewLink || `https://drive.google.com/file/d/${id}/view`,
    label: label || name,
  };
}

function buildParts(driveFiles, instrumentos) {
  const parts = [];
  const unmatched = [];
  const pdfs = driveFiles
    .filter((f) => /\.pdf$/i.test(f.name || ""))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
  for (const file of pdfs) {
    const suggested = suggestPartFromDriveFile(file, instrumentos);
    if (!suggested) {
      unmatched.push(file.name);
      console.warn("  Sin match:", file.name, "infer=", inferInstrumentFromFilename(file.name));
      continue;
    }
    parts.push({
      ...suggested,
      url_archivo: JSON.stringify(
        file.webViewLink
          ? [{ url: file.webViewLink, description: file.name }]
          : [],
      ),
    });
    console.log(`  ${file.name} → ${suggested.nombre_archivo}`);
  }
  return { parts, unmatched };
}

function sqlAudios(audios) {
  if (!audios?.length) return "'[]'::jsonb";
  return `'${sqlEscape(JSON.stringify(audios))}'::jsonb`;
}

function buildSql(workData) {
  let sql = `-- Bahiano: 16 arreglos sinfónicos de Bob Marley → Archivo + bloque gira ${GIRA_ID}
-- Generado: ${new Date().toISOString().slice(0, 10)}

DO $$
DECLARE
  _id_programa bigint := ${GIRA_ID};
  _block_id bigint;
  _orden_block int;
  _id_obra bigint;
  _id_marley bigint;
  _id_tag bigint;
BEGIN
  SELECT id INTO _id_marley FROM compositores
  WHERE apellido = 'Marley' AND (nombre = 'Bob' OR nombre IS NULL)
  LIMIT 1;
  IF _id_marley IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Marley', 'Bob') RETURNING id INTO _id_marley;
  END IF;

  SELECT id INTO _id_tag FROM palabras_clave WHERE tag = 'Bahiano' LIMIT 1;
  IF _id_tag IS NULL THEN
    INSERT INTO palabras_clave (tag) VALUES ('Bahiano') RETURNING id INTO _id_tag;
  END IF;

  SELECT id INTO _block_id
  FROM programas_repertorios
  WHERE id_programa = _id_programa AND nombre = '${sqlEscape(BLOQUE_NOMBRE)}'
  LIMIT 1;

  IF _block_id IS NULL THEN
    SELECT COALESCE(MAX(orden), 0) + 1 INTO _orden_block
    FROM programas_repertorios WHERE id_programa = _id_programa;
    INSERT INTO programas_repertorios (id_programa, nombre, orden)
    VALUES (_id_programa, '${sqlEscape(BLOQUE_NOMBRE)}', _orden_block)
    RETURNING id INTO _block_id;
  END IF;

`;

  for (const w of workData) {
    const titulo = sqlEscape(w.titulo);
    const anioSql = w.anio != null ? String(w.anio) : "NULL";
    const durSql = w.duracion_segundos != null ? String(w.duracion_segundos) : "NULL";
    sql += `  -- ${w.orden}. ${w.titulo}
  _id_obra := NULL;
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor' AND oc.id_compositor = _id_marley
  WHERE o.titulo = '${titulo}'
    AND COALESCE(o.observaciones, '') = '${sqlEscape(w.observaciones)}'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, audios)
    VALUES (
      '${titulo}',
      ${anioSql},
      ${durSql},
      'Oficial',
      '${sqlEscape(w.observaciones)}',
      '${sqlEscape(w.instrumentacion)}',
      '${sqlEscape(w.link_drive)}',
      ${sqlAudios(w.audios)}
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, _id_marley, 'compositor');

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    VALUES (_id_obra, _id_tag);

`;
    for (const p of w.parts) {
      const solista = p.es_solista ? "true" : "false";
      sql += `    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});
`;
    }
    sql += `  ELSE
    UPDATE obras SET
      anio_composicion = COALESCE(${anioSql}, anio_composicion),
      duracion_segundos = COALESCE(${durSql}, duracion_segundos),
      instrumentacion = '${sqlEscape(w.instrumentacion)}',
      link_drive = '${sqlEscape(w.link_drive)}',
      audios = ${sqlAudios(w.audios)}
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
`;
    for (const p of w.parts) {
      const solista = p.es_solista ? "true" : "false";
      sql += `    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});
`;
    }
    sql += `  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_obra, ${w.orden});
  ELSE
    UPDATE repertorio_obras SET orden = ${w.orden}
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

`;
  }

  sql += `END $$;
`;
  return sql;
}

async function waitForDriveFolders(maxAttempts = 12) {
  const parentUrl = driveFolderUrl(BAHIANO_PARENT_DRIVE_ID);
  for (let i = 1; i <= maxAttempts; i++) {
    const items = await listFolder(parentUrl);
    const folders = items.filter(
      (f) =>
        (f.mimeType || "").includes("folder") &&
        foldName(f.name).startsWith("marley"),
    );
    console.log(`Drive parent (${i}/${maxAttempts}): ${folders.length} carpetas Marley`);
    if (folders.length >= BAHIANO_WORKS.length) return folders;
    await sleep(8000);
  }
  return listFolder(parentUrl).then((items) =>
    items.filter(
      (f) =>
        (f.mimeType || "").includes("folder") &&
        foldName(f.name).startsWith("marley"),
    ),
  );
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  console.log(skipCopy ? "=== SIN COPIA AL ARCHIVO ===" : "=== COPIAR AL ARCHIVO ===");

  const driveFolders = await waitForDriveFolders();
  const byName = new Map(driveFolders.map((f) => [foldName(f.name), f]));

  const workData = [];
  for (const work of BAHIANO_WORKS) {
    const folderName = targetFolderName(work);
    const driveFolder = byName.get(foldName(folderName));
    console.log(`\n=== ${work.orden}. ${work.titulo} ===`);
    if (!driveFolder) {
      console.warn(`  Sin carpeta Drive aún: ${folderName}`);
      continue;
    }

    const originUrl =
      driveFolder.webViewLink || driveFolderUrl(driveFolder.id);
    let linkDrive = originUrl;
    if (!skipCopy) {
      console.log(`  Copiando al Archivo: ${folderName}…`);
      try {
        linkDrive = await copyToArchivo(originUrl, folderName);
        await sleep(500);
      } catch (e) {
        console.warn(`  Copia falló, se usa origen: ${e.message}`);
        linkDrive = originUrl;
      }
    }

    let files = [];
    try {
      files = await listFolder(linkDrive);
    } catch (e) {
      console.warn(`  list_folder: ${e.message}`);
      if (linkDrive !== originUrl) {
        files = await listFolder(originUrl);
      }
    }

    const { parts, unmatched } = buildParts(files, instrumentos);
    const audioFiles = files.filter((f) => /\.(mp3|wav|m4a)$/i.test(f.name || ""));
    const audios = audioFiles.map(audioEntryFromFile).filter(Boolean);
    const inst = calculateInstrumentation(parts);
    const localDir = localWorkDir(work);
    const duracion_segundos = mp3DurationSeconds(localDir);

    console.log(
      `  ${parts.length} partes | ${inst} | audio=${audios.length} | ${duracion_segundos ?? "—"}s | unmatched=${unmatched.length}`,
    );

    workData.push({
      ...work,
      compositors: [MARLEY],
      observaciones: `Para acomodar — Bahiano — ${folderName}. Arreglo sinfónico (audio ref. Orq. REFE).`,
      link_drive: linkDrive,
      instrumentacion: inst,
      parts,
      audios,
      duracion_segundos,
      composerTag: COMPOSER_TAG,
    });
    await sleep(250);
  }

  if (workData.length !== BAHIANO_WORKS.length) {
    console.warn(
      `\nSolo ${workData.length}/${BAHIANO_WORKS.length} obras con carpeta Drive. Esperar sync y re-ejecutar.`,
    );
  }

  const sql = buildSql(workData);
  writeSeed("supabase/seed_bahiano_sync.sql", sql, workData);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
