/** Utilidades compartidas para seeds de repertorio desde Drive. */
import { writeFileSync } from "fs";

export const SB_URL = "https://muxrbuivopnawnxlcjxq.supabase.co";
export const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eHJidWl2b3BuYXdueGxjanhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODI5MzIsImV4cCI6MjA4MDM1ODkzMn0._tMDAJg2r5vfR1y0JPYd3LVDB66CcyXtj5dY4RqrxIg";

export const headers = {
  Authorization: `Bearer ${SB_KEY}`,
  apikey: SB_KEY,
  "Content-Type": "application/json",
};

export const sqlEscape = (s) => String(s ?? "").replace(/'/g, "''");
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function personKey(c) {
  return `${c.apellido}|${c.nombre || ""}`;
}

export function personVarSafe(key) {
  return key.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
}

export function withTitleSuffix(titulo, suffix) {
  const t = (titulo || "").trim();
  if (t.endsWith(suffix)) return t;
  return `${t}${suffix}`;
}

export async function listFolder(folderUrl) {
  const res = await fetch(`${SB_URL}/functions/v1/manage-drive`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "list_folder_files", folderUrl }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(JSON.stringify(data));
  return data.files || [];
}

export async function fetchInstrumentos() {
  const res = await fetch(
    `${SB_URL}/rest/v1/instrumentos?select=id,instrumento,abreviatura&order=id`,
    { headers: { Authorization: `Bearer ${SB_KEY}`, apikey: SB_KEY } },
  );
  return res.json();
}

export async function fetchWorkMetadata(titulo, compositor, durationQueryHint) {
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

  await sleep(350);

  try {
    const label = compositor.nombre
      ? `${compositor.nombre} ${compositor.apellido}`
      : compositor.apellido;
    const query = durationQueryHint || `${label} ${titulo}`.trim();
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

  await sleep(350);
  return { anio, duracion_segundos };
}

export function buildSeedSql({
  outComment,
  workData,
  resolveArrangerVar,
  tagName = null,
}) {
  const composerVars = new Map();
  const arrangerVars = new Map();
  for (const w of workData) {
    for (const c of w.compositors) composerVars.set(personKey(c), c);
    if (w.arranger) arrangerVars.set(personKey(w.arranger), w.arranger);
  }

  const varDecls = [
    "_id_obra bigint",
    ...(tagName ? ["_id_tag bigint"] : []),
    ...[...composerVars.keys()].map((k) => `_id_comp_${personVarSafe(k)} bigint`),
    ...[...arrangerVars.keys()].map((k) => `_id_arr_${personVarSafe(k)} bigint`),
  ];

  let sql = `${outComment}
-- Generado: ${new Date().toISOString().slice(0, 10)}

DO $$
DECLARE
  ${varDecls.join(";\n  ")};
BEGIN
`;

  if (tagName) {
    sql += `  SELECT id INTO _id_tag FROM palabras_clave WHERE tag = '${sqlEscape(tagName)}' LIMIT 1;
  IF _id_tag IS NULL THEN
    INSERT INTO palabras_clave (tag) VALUES ('${sqlEscape(tagName)}') RETURNING id INTO _id_tag;
  END IF;

`;
  }

  for (const [key, c] of composerVars) {
    const safe = personVarSafe(key);
    const ap = sqlEscape(c.apellido);
    const nom = c.nombre ? `'${sqlEscape(c.nombre)}'` : "NULL";
    sql += `  SELECT id INTO _id_comp_${safe} FROM compositores WHERE apellido = '${ap}' AND (nombre = ${nom} OR (nombre IS NULL AND ${nom} IS NULL)) LIMIT 1;
  IF _id_comp_${safe} IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('${ap}', ${nom}) RETURNING id INTO _id_comp_${safe};
  END IF;

`;
  }

  for (const [key, a] of arrangerVars) {
    const safe = personVarSafe(key);
    const ap = sqlEscape(a.apellido);
    const nom = a.nombre ? `'${sqlEscape(a.nombre)}'` : "NULL";
    sql += `  SELECT id INTO _id_arr_${safe} FROM compositores WHERE apellido = '${ap}' AND (nombre = ${nom} OR (nombre IS NULL AND ${nom} IS NULL)) LIMIT 1;
  IF _id_arr_${safe} IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('${ap}', ${nom}) RETURNING id INTO _id_arr_${safe};
  END IF;

`;
  }

  for (const w of workData) {
    const titulo = sqlEscape(w.titulo);
    const arrVar = w.arranger ? resolveArrangerVar(w) : "NULL";
    const anioSql = w.anio != null ? String(w.anio) : "NULL";
    const durSql = w.duracion_segundos != null ? String(w.duracion_segundos) : "NULL";
    const idArregladorSql = w.arranger ? arrVar : "NULL";

    const idempotency = w.arranger
      ? `    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = '${titulo}' AND oc.id_compositor = ${arrVar}`
      : `    WHERE o.titulo = '${titulo}'
      AND o.observaciones = '${sqlEscape(w.observaciones)}'`;

    sql += `  -- ${w.titulo}
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    ${idempotency}
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '${titulo}',
      ${idArregladorSql},
      ${anioSql},
      ${durSql},
      'Oficial',
      '${sqlEscape(w.observaciones)}',
      '${sqlEscape(w.instrumentacion)}',
      '${sqlEscape(w.link_drive)}'
    )
    RETURNING id INTO _id_obra;

`;
    for (const c of w.compositors) {
      const safe = personVarSafe(personKey(c));
      sql += `    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_${safe}, 'compositor');
`;
    }
    if (w.arranger) {
      sql += `    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, ${arrVar}, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = ${arrVar}
    );

`;
    }
    for (const p of w.parts) {
      const solista = p.es_solista ? "true" : "false";
      sql += `    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});
`;
    }
    if (tagName) {
      sql += `    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    SELECT _id_obra, _id_tag
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_palabras_clave opc
      WHERE opc.id_obra = _id_obra AND opc.id_palabra_clave = _id_tag
    );

`;
    }
    sql += `  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): ${titulo}';
  END IF;

`;
  }

  sql += `END $$;
`;
  return sql;
}

export function writeSeed(path, sql, workData) {
  writeFileSync(path, sql, "utf8");
  console.log(`\nEscrito ${path} (${workData.length} obras)`);
}
