/**
 * Suite Mujeres Argentinas → seed BD:
 * - 9 obras archivo (Oficial, particellas, link_drive = carpeta canción)
 * - 9 encargos de arreglo (Para arreglar, Lema 4340365, fecha 2026-09-16)
 *   sin Drive/particellas; referencias obra-origen + Drive de la canción.
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartFromDriveFile } from "./lib/drivePartMatcher.mjs";
import {
  ENCARGO_OBS_ALFONSINA,
  ENCARGO_OBS_BASE,
  FECHA_ESPERADA_ARREGLO,
  LEMA,
  LEMA_INTEGRANTE_ID,
  PARA_ACOMODAR_ROOT,
  RAMIREZ_ZIGARAN_WORKS,
  SUITE_PARENT_FOLDER,
  driveFolderUrl,
  inferInstrumentFromFilename,
  targetFolderName,
  tituloDb,
  tituloPlain,
} from "./lib/ramirezZigaranCatalog.mjs";
import {
  fetchInstrumentos,
  fetchWorkMetadata,
  listFolder,
  personKey,
  personVarSafe,
  sleep,
  sqlEscape,
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

function suiteParentDir() {
  const exact = join(PARA_ACOMODAR_ROOT, SUITE_PARENT_FOLDER);
  if (existsSync(exact)) return exact;
  if (!existsSync(PARA_ACOMODAR_ROOT)) return null;
  const hit = readdirSync(PARA_ACOMODAR_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .find((n) => /ramirez/i.test(foldName(n)) && /zigar/i.test(foldName(n)));
  return hit ? join(PARA_ACOMODAR_ROOT, hit) : null;
}

function localWorkDir(work) {
  const parent = suiteParentDir();
  if (!parent) return null;
  const target = join(parent, targetFolderName(work));
  if (existsSync(target)) return target;
  const hit = readdirSync(parent, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .find(
      (n) =>
        foldName(n) === foldName(targetFolderName(work)) ||
        foldName(n).includes(foldName(work.sourceFolder)),
    );
  return hit ? join(parent, hit) : null;
}

function localPdfFiles(dir) {
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.pdf$/i.test(f))
    .map((name) => ({ name, webViewLink: null }));
}

function matchDriveFile(localName, driveFiles) {
  const want = foldName(localName);
  const exact = driveFiles.find((f) => foldName(f.name) === want);
  if (exact) return exact;
  const inst = inferInstrumentFromFilename(localName);
  if (!inst) return null;
  return (
    driveFiles.find((f) => inferInstrumentFromFilename(f.name) === inst) || null
  );
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

function buildParts(localFiles, driveFiles, instrumentos) {
  const parts = [];
  const unmatched = [];
  const pdfs = [...localFiles].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "es"),
  );
  for (const local of pdfs) {
    const drive = matchDriveFile(local.name, driveFiles);
    const file = {
      name: local.name,
      webViewLink: drive?.webViewLink || null,
    };
    const suggested = suggestPartFromDriveFile(file, instrumentos);
    if (!suggested) {
      unmatched.push(local.name);
      console.warn("  Sin match:", local.name);
      continue;
    }
    const nombre = suggested.nombre_archivo || inferInstrumentFromFilename(local.name);
    parts.push({
      ...suggested,
      nombre_archivo: nombre,
      url_archivo: JSON.stringify(
        file.webViewLink
          ? [{ url: file.webViewLink, description: local.name }]
          : [],
      ),
    });
    console.log(
      `  ${local.name} → ${nombre}${file.webViewLink ? "" : " (sin URL Drive)"}`,
    );
  }
  return { parts: dedupeParts(parts), unmatched };
}

function sqlUpsertComposer(varName, person) {
  const ap = sqlEscape(person.apellido);
  const nom = person.nombre ? `'${sqlEscape(person.nombre)}'` : "NULL";
  return `  SELECT id INTO ${varName} FROM compositores WHERE apellido = '${ap}' AND (nombre = ${nom} OR (nombre IS NULL AND ${nom} IS NULL)) LIMIT 1;
  IF ${varName} IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('${ap}', ${nom}) RETURNING id INTO ${varName};
  END IF;

`;
}

function obsArchivo(work) {
  const sop = work.hasSopranoInScore
    ? " Partitura incluye soprano (sin particella de voz extraída)."
    : "";
  return `Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — ${targetFolderName(work)}. Arr. cuerdas Juan Cruz Zigarán.${sop}`;
}

function obsEncargo(work) {
  return work.key === "alfonsina" ? ENCARGO_OBS_ALFONSINA : ENCARGO_OBS_BASE;
}

function sqlInsertParticellas(obraVar, parts) {
  let sql = "";
  for (const p of parts) {
    const solista = p.es_solista ? "true" : "false";
    sql += `    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (${obraVar}, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});
`;
  }
  return sql;
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const prepared = [];

  for (const work of RAMIREZ_ZIGARAN_WORKS) {
    const folderUrl = driveFolderUrl(work.driveFolderId);
    const localDir = localWorkDir(work);
    const localFiles = localPdfFiles(localDir);
    let driveFiles = [];
    try {
      driveFiles = (await listFolder(folderUrl)).filter((f) =>
        /\.pdf$/i.test(f.name || ""),
      );
    } catch (e) {
      console.warn(`  list_folder ${work.songTitle}:`, e.message);
    }

    console.log(`\n=== ${work.songTitle} ===`);
    console.log(`  Local: ${localDir || "(no)"} (${localFiles.length} PDFs)`);
    console.log(`  Drive: ${folderUrl} (${driveFiles.length} PDFs)`);

    const sourceFiles = localFiles.length ? localFiles : driveFiles;
    const { parts, unmatched } = buildParts(
      sourceFiles,
      driveFiles,
      instrumentos,
    );
    const inst = calculateInstrumentation(parts);

    let fetched = { anio: null, duracion_segundos: null };
    try {
      fetched = await fetchWorkMetadata(
        work.songTitle,
        work.compositors[0],
        `${work.compositors[0].nombre || ""} ${work.compositors[0].apellido} ${work.songTitle}`.trim(),
      );
    } catch (e) {
      console.warn("  metadata:", e.message);
    }
    await sleep(200);

    const anio = work.anio ?? fetched.anio ?? null;
    let duracion = work.duracion_segundos ?? fetched.duracion_segundos ?? null;
    if (duracion != null && duracion > 900) duracion = work.duracion_segundos ?? null;

    console.log(
      `  ${parts.length} partes | ${inst} | anio=${anio ?? "null"} dur=${duracion ?? "null"}s`,
    );
    if (unmatched.length) console.warn("  Unmatched:", unmatched.join(", "));

    prepared.push({
      work,
      folderUrl,
      parts,
      inst,
      anio,
      duracion,
      titulo: tituloDb(work.songTitle),
      tituloPlain: tituloPlain(work.songTitle),
    });
  }

  const composerVars = new Map();
  const arrangerVars = new Map();
  for (const row of prepared) {
    for (const c of row.work.compositors) composerVars.set(personKey(c), c);
    arrangerVars.set(personKey(row.work.arranger), row.work.arranger);
  }
  arrangerVars.set(personKey(LEMA), LEMA);
  const lemaArrVar = `_id_arr_${personVarSafe(personKey(LEMA))}`;

  const varDecls = [
    "_id_obra bigint",
    "_id_arr_obra bigint",
    ...[...composerVars.keys()].map((k) => `_id_comp_${personVarSafe(k)} bigint`),
    ...[...arrangerVars.keys()].map((k) => `_id_arr_${personVarSafe(k)} bigint`),
  ];

  let sql = `-- Ramírez / Zigarán — Suite Mujeres Argentinas (9 archivo + 9 encargos)
-- Generado: ${new Date().toISOString().slice(0, 10)}
-- Parent Drive: ${driveFolderUrl("12GOBbDTk0ScrqVy_0VT72a0e7x242GOO")}
-- No envía mail encargo_arreglo.

DO $$
DECLARE
  ${varDecls.join(";\n  ")};
BEGIN
`;

  for (const [key, c] of composerVars) {
    sql += sqlUpsertComposer(`_id_comp_${personVarSafe(key)}`, c);
  }
  for (const [key, a] of arrangerVars) {
    sql += sqlUpsertComposer(`_id_arr_${personVarSafe(key)}`, a);
  }

  for (const row of prepared) {
    const w = row.work;
    const titulo = sqlEscape(row.titulo);
    const arrVar = `_id_arr_${personVarSafe(personKey(w.arranger))}`;
    const anioSql = row.anio != null ? String(row.anio) : "NULL";
    const durSql = row.duracion != null ? String(row.duracion) : "NULL";
    const obsArch = sqlEscape(obsArchivo(w));
    const obsEnc = sqlEscape(obsEncargo(w));
    const instSql = sqlEscape(row.inst);
    const linkSql = sqlEscape(row.folderUrl);

    sql += `  -- ${row.tituloPlain}
  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = '${titulo}'
    AND o.estado = 'Oficial'
    AND o.observaciones LIKE '%Suite Mujeres Argentinas%'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (
      titulo, id_arreglador, anio_composicion, duracion_segundos, estado,
      observaciones, instrumentacion, link_drive
    ) VALUES (
      '${titulo}',
      ${arrVar},
      ${anioSql},
      ${durSql},
      'Oficial',
      '${obsArch}',
      '${instSql}',
      '${linkSql}'
    )
    RETURNING id INTO _id_obra;
  ELSE
    UPDATE obras SET
      id_arreglador = ${arrVar},
      anio_composicion = COALESCE(${anioSql}, anio_composicion),
      duracion_segundos = COALESCE(${durSql}, duracion_segundos),
      observaciones = '${obsArch}',
      instrumentacion = '${instSql}',
      link_drive = '${linkSql}'
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
  END IF;

`;
    for (const c of w.compositors) {
      const cVar = `_id_comp_${personVarSafe(personKey(c))}`;
      sql += `  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, ${cVar}, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = ${cVar} AND oc.rol = 'compositor'
  );

`;
    }
    sql += `  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, ${arrVar}, 'arreglador'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = ${arrVar} AND oc.rol = 'arreglador'
  );

`;
    sql += sqlInsertParticellas("_id_obra", row.parts);

    sql += `  SELECT o.id INTO _id_arr_obra
  FROM obras o
  WHERE o.titulo = '${titulo}'
    AND o.estado = 'Para arreglar'
    AND o.id_integrante_arreglador = ${LEMA_INTEGRANTE_ID}
    AND o.fecha_esperada = '${FECHA_ESPERADA_ARREGLO}'
  LIMIT 1;

  IF _id_arr_obra IS NULL THEN
    INSERT INTO obras (
      titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones,
      instrumentacion, fecha_esperada, id_integrante_arreglador
    ) VALUES (
      '${titulo}',
      ${lemaArrVar},
      ${anioSql},
      ${durSql},
      'Para arreglar',
      '${obsEnc}',
      '${instSql}',
      '${FECHA_ESPERADA_ARREGLO}',
      ${LEMA_INTEGRANTE_ID}
    )
    RETURNING id INTO _id_arr_obra;
  ELSE
    UPDATE obras SET
      id_arreglador = ${lemaArrVar},
      observaciones = '${obsEnc}',
      instrumentacion = '${instSql}',
      anio_composicion = COALESCE(${anioSql}, anio_composicion),
      duracion_segundos = COALESCE(${durSql}, duracion_segundos)
    WHERE id = _id_arr_obra;
  END IF;

`;
    for (const c of w.compositors) {
      const cVar = `_id_comp_${personVarSafe(personKey(c))}`;
      sql += `  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_arr_obra, ${cVar}, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_arr_obra AND oc.id_compositor = ${cVar} AND oc.rol = 'compositor'
  );

`;
    }
    sql += `  DELETE FROM obras_compositores
  WHERE id_obra = _id_arr_obra AND rol = 'arreglador';

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  VALUES (_id_arr_obra, ${lemaArrVar}, 'arreglador');

`;

    const refOrigen = sqlEscape(`Obra original · ${row.tituloPlain}`);
    const refDrive = sqlEscape(`Drive · particellas (Para acomodar)`);
    sql += `  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, '${refOrigen}', _id_obra, NULL, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.id_obra_referencia = _id_obra
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, '${refDrive}', NULL, '${linkSql}', 1
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.link = '${linkSql}'
  );

  RAISE NOTICE 'Suite % → archivo % / encargo %', '${sqlEscape(w.songTitle)}', _id_obra, _id_arr_obra;

`;
  }

  sql += `END $$;
`;

  writeSeed("supabase/seed_ramirez_zigaran_sync.sql", sql, prepared);
  console.log("\nSeed: supabase/seed_ramirez_zigaran_sync.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
