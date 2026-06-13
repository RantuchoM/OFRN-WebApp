/**
 * Seed: arreglos Barnes (Walter) para quinteto de metales.
 * Drive → obras + particellas + metadata (año/duración).
 */
import { writeFileSync } from "fs";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartFromDriveFile } from "./lib/drivePartMatcher.mjs";

const SB_URL = "https://muxrbuivopnawnxlcjxq.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eHJidWl2b3BuYXdueGxjanhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODI5MzIsImV4cCI6MjA4MDM1ODkzMn0._tMDAJg2r5vfR1y0JPYd3LVDB66CcyXtj5dY4RqrxIg";

const ROOT_FOLDER =
  "https://drive.google.com/open?id=1_le2MfO2mDb_vcjuwaDkv-AN3Tb53Cma";

const TITLE_SUFFIX = " [Quinteto metales]";
const OBSERVACIONES = "Quinteto metales — arr. Walter Barnes";

/** Año original estimado cuando ask-ai no responde (obras canónicas). */
const FALLBACK_YEARS = {
  "Contrapunctus I": 1745,
  "My Heart Ever Faithful": 1727,
  "Toreador Song": 1875,
  "Trumpet Voluntary": 1700,
  "Largo": 1738,
  "Andante": 1791,
  "Rondeau": 1709,
  "Cor Royal": 1849,
  "Canon": 1680,
  "Trumpet Tune and Ayre": 1695,
};

const COMPOSER_MAP = {
  Bach: { apellido: "Bach", nombre: "Johann Sebastian" },
  Bizet: { apellido: "Bizet", nombre: "Georges" },
  Clarke: { apellido: "Clarke", nombre: "Jeremiah" },
  Handel: { apellido: "Handel", nombre: "George Frideric" },
  Haydn: { apellido: "Haydn", nombre: "Franz Joseph" },
  Mouret: { apellido: "Mouret", nombre: "Jean Joseph" },
  Nicolai: { apellido: "Nicolai", nombre: "Otto" },
  Pachelbel: { apellido: "Pachelbel", nombre: "Johann" },
  Purcell: { apellido: "Purcell", nombre: "Henry" },
  Tradicional: { apellido: "Tradicional", nombre: null },
};

const headers = {
  Authorization: `Bearer ${SB_KEY}`,
  apikey: SB_KEY,
  "Content-Type": "application/json",
};

const sqlEscape = (s) => String(s ?? "").replace(/'/g, "''");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const withSuffix = (titulo) => {
  const t = (titulo || "").trim();
  if (t.endsWith(TITLE_SUFFIX)) return t;
  return `${t}${TITLE_SUFFIX}`;
};

function parseFolderName(name) {
  const m = (name || "").match(/^(.+?)-Barnes\s*-\s*(.+?)\s*\[para quinteto de metales\]/i);
  if (!m) return null;
  const composerKey = m[1].trim();
  const compositor = COMPOSER_MAP[composerKey];
  if (!compositor) return null;
  return {
    composerKey,
    titulo: m[2].trim(),
    compositors: [compositor],
  };
}

async function listFolder(folderUrl) {
  const res = await fetch(`${SB_URL}/functions/v1/manage-drive`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "list_folder_files", folderUrl }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(JSON.stringify(data));
  return data.files || [];
}

async function fetchInstrumentos() {
  const res = await fetch(
    `${SB_URL}/rest/v1/instrumentos?select=id,instrumento,abreviatura&order=id`,
    { headers: { Authorization: `Bearer ${SB_KEY}`, apikey: SB_KEY } },
  );
  return res.json();
}

async function fetchWorkMetadata(titulo, compositor) {
  let anio = null;
  let duracion_segundos = null;

  try {
    const res = await fetch(`${SB_URL}/functions/v1/ask-ai`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "FIND_WORK_METADATA",
        titulo,
        compositorApellido: compositor.apellido,
        compositorNombre: compositor.nombre || "",
      }),
    });
    const data = await res.json();
    const y = data?.year;
    if (typeof y === "number" && y >= 1000 && y <= 2100) anio = Math.floor(y);
  } catch (e) {
    console.warn("  metadata year:", titulo, e.message);
  }

  await sleep(400);

  try {
    const label = compositor.nombre
      ? `${compositor.nombre} ${compositor.apellido}`
      : compositor.apellido;
    const query = `${label} ${titulo} brass quintet`.trim();
    const res = await fetch(`${SB_URL}/functions/v1/youtube-search`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    const sec = data?.results?.[0]?.durationSeconds;
    if (typeof sec === "number" && sec > 0 && sec < 3600) {
      duracion_segundos = Math.floor(sec);
    }
  } catch (e) {
    console.warn("  metadata duration:", titulo, e.message);
  }

  await sleep(400);
  return { anio, duracion_segundos };
}

function composerKey(c) {
  return `${c.apellido}|${c.nombre || ""}`;
}

function composerVarSafe(key) {
  return key.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
}

async function main() {
  const [rootItems, instrumentos] = await Promise.all([
    listFolder(ROOT_FOLDER),
    fetchInstrumentos(),
  ]);

  const folders = rootItems.filter(
    (f) => f.mimeType === "application/vnd.google-apps.folder",
  );

  const workData = [];
  for (const folder of folders.sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "es"),
  )) {
    const parsed = parseFolderName(folder.name);
    if (!parsed) {
      console.warn("Carpeta no parseada:", folder.name);
      continue;
    }

    const files = (await listFolder(folder.webViewLink)).filter((f) =>
      /\.pdf$/i.test(f.name || ""),
    );
    const parts = [];
    for (const file of files.sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "es"),
    )) {
      const suggested = suggestPartFromDriveFile(file, instrumentos);
      if (!suggested) {
        console.warn("Sin match:", parsed.titulo, file.name);
        continue;
      }
      parts.push({
        ...suggested,
        url_archivo: JSON.stringify([
          { url: file.webViewLink, description: file.name },
        ]),
      });
    }

    const meta = await fetchWorkMetadata(parsed.titulo, parsed.compositors[0]);
    if (meta.anio == null && FALLBACK_YEARS[parsed.titulo] != null) {
      meta.anio = FALLBACK_YEARS[parsed.titulo];
    }
    console.log(
      `  ${parsed.titulo}: año=${meta.anio ?? "—"} dur=${meta.duracion_segundos ?? "—"}s inst=${calculateInstrumentation(parts)}`,
    );

    workData.push({
      ...parsed,
      titulo: withSuffix(parsed.titulo),
      link_drive: folder.webViewLink,
      instrumentacion: calculateInstrumentation(parts),
      parts,
      ...meta,
    });
    await sleep(150);
  }

  const composerVars = new Map();
  for (const w of workData) {
    for (const c of w.compositors) composerVars.set(composerKey(c), c);
  }

  const varDecls = [
    "_id_barnes bigint",
    "_id_obra bigint",
    ...[...composerVars.keys()].map((k) => `_id_comp_${composerVarSafe(k)} bigint`),
  ];

  let sql = `-- Barnes (Walter): ${workData.length} obras quinteto metales
-- Origen: ${ROOT_FOLDER}
-- Generado: ${new Date().toISOString().slice(0, 10)}

DO $$
DECLARE
  ${varDecls.join(";\n  ")};
BEGIN
  SELECT id INTO _id_barnes FROM compositores WHERE apellido = 'Barnes' AND nombre = 'Walter' LIMIT 1;
  IF _id_barnes IS NULL THEN
    RAISE EXCEPTION 'Arreglador Walter Barnes no encontrado en compositores';
  END IF;

`;

  for (const [key, c] of composerVars) {
    const safe = composerVarSafe(key);
    const ap = sqlEscape(c.apellido);
    const nom = c.nombre ? `'${sqlEscape(c.nombre)}'` : "NULL";
    sql += `  SELECT id INTO _id_comp_${safe} FROM compositores WHERE apellido = '${ap}' AND (nombre = ${nom} OR (nombre IS NULL AND ${nom} IS NULL)) LIMIT 1;
  IF _id_comp_${safe} IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('${ap}', ${nom}) RETURNING id INTO _id_comp_${safe};
  END IF;

`;
  }

  for (const w of workData) {
    const titulo = sqlEscape(w.titulo);
    const anioSql = w.anio != null ? String(w.anio) : "NULL";
    const durSql = w.duracion_segundos != null ? String(w.duracion_segundos) : "NULL";

    sql += `  -- ${w.titulo}
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = '${titulo}' AND oc.id_compositor = _id_barnes
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '${titulo}',
      _id_barnes,
      ${anioSql},
      ${durSql},
      'Oficial',
      '${sqlEscape(OBSERVACIONES)}',
      '${sqlEscape(w.instrumentacion)}',
      '${sqlEscape(w.link_drive)}'
    )
    RETURNING id INTO _id_obra;

`;
    for (const c of w.compositors) {
      const safe = composerVarSafe(composerKey(c));
      sql += `    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_${safe}, 'compositor');
`;
    }
    sql += `    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_barnes, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_barnes
    );

`;
    for (const p of w.parts) {
      const solista = p.es_solista ? "true" : "false";
      sql += `    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});
`;
    }
    sql += `  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): ${titulo}';
  END IF;

`;
  }

  sql += `END $$;
`;

  const outPath = "supabase/seed_barnes_quinteto_metales.sql";
  writeFileSync(outPath, sql, "utf8");
  console.log(`\nEscrito ${outPath} (${workData.length} obras)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
