/**
 * Genera seed SQL para obras Magnolario (Soria, H. - arr. cuerdas).
 * Usa manage-drive + catálogo instrumentos (misma heurística que DriveMatcherModal).
 */
import { writeFileSync } from "fs";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";

const SB_URL = "https://muxrbuivopnawnxlcjxq.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eHJidWl2b3BuYXdueGxjanhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODI5MzIsImV4cCI6MjA4MDM1ODkzMn0._tMDAJg2r5vfR1y0JPYd3LVDB66CcyXtj5dY4RqrxIg";

const ROOT_FOLDER =
  "https://drive.google.com/drive/folders/1UVRL4K3OWhuNGkbqVz3-xdFTk27RHhJq";

const DIRECTOR_ID = "50"; // instrumentos.id para "Director" (no usar fallback 142 del modal)
const TITLE_SUFFIX = " [Magnolario]";

const withMagnolarioSuffix = (titulo) => {
  const t = (titulo || "").trim();
  if (t.endsWith(TITLE_SUFFIX)) return t;
  return `${t}${TITLE_SUFFIX}`;
};

const WORKS = [
  {
    titulo: "A Fuego Lento",
    compositors: [{ apellido: "Salgán", nombre: "Horacio" }],
    folderHint: "A Fuego Lento",
  },
  {
    titulo: "Barrio Sur",
    compositors: [{ apellido: "Gallo", nombre: "R." }],
    folderHint: "Barrio Sur",
  },
  {
    titulo: "Chacarera Vidalera",
    compositors: [{ apellido: "González", nombre: "R." }],
    folderHint: "Chacarera Vidalera",
  },
  {
    titulo: "Chayera",
    compositors: [{ apellido: "Chazarreta", nombre: "L." }],
    folderHint: "Chayera",
  },
  {
    titulo: "Comienzo",
    compositors: [{ apellido: "Medina", nombre: "M." }],
    folderHint: "Comienzo",
  },
  {
    titulo: "Como el aire",
    compositors: [{ apellido: "Falú", nombre: "Juan" }],
    folderHint: "Como el aire",
  },
  {
    titulo: "Coyita mía",
    compositors: [{ apellido: "Pignoni", nombre: "R." }],
    folderHint: "Coyita",
  },
  {
    titulo: "El Misquishitu",
    compositors: [{ apellido: "Palavecino", nombre: "S." }],
    folderHint: "Misquishitu",
  },
  {
    titulo: "Gallo Ciego",
    compositors: [{ apellido: "Bardi", nombre: "A." }],
    folderHint: "Gallo Ciego",
  },
  {
    titulo: "Huella de los Labriegos",
    compositors: [{ apellido: "Barrionuevo", nombre: "R." }],
    folderHint: "Huella de los Labriegos",
  },
  {
    titulo: "Los Pinta",
    compositors: [{ apellido: "Arduh", nombre: "J." }],
    folderHint: "Los Pinta",
  },
  {
    titulo: "Mi pueblo, mi casa, la soledad",
    compositors: [{ apellido: "Spasiuk", nombre: "Ch." }],
    folderHint: "Mi pueblo",
  },
  {
    titulo: "Milonga para el Rata",
    compositors: [{ apellido: "Torres", nombre: "D." }],
    folderHint: "Milonga para el Rata",
  },
  {
    titulo: "Nacida en agua de guerra",
    compositors: [
      { apellido: "Rivella", nombre: "H." },
      { apellido: "Díaz", nombre: "D." },
    ],
    folderHint: "Nacida en agua",
  },
  {
    titulo: "P'al Turco Deb",
    compositors: [{ apellido: "Pignoni", nombre: "R." }],
    folderHint: "Turco Deb",
  },
  {
    titulo: "Se acaba la mufa",
    compositors: [{ apellido: "Soria", nombre: "Hernán" }],
    folderHint: "Se acaba la mufa",
  },
  {
    titulo: "Serenatero de Bombos",
    compositors: [
      { apellido: "Novo", nombre: "I." },
      { apellido: "Cabral", nombre: "P." },
    ],
    folderHint: "Serenatero",
  },
  {
    titulo: "Viaje a Argüello",
    compositors: [
      { apellido: "Ciriaco", nombre: "O." },
      { apellido: "Bayardo", nombre: "L." },
    ],
    folderHint: "Viaje a Arg",
  },
];

const normalizeInstrumentString = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(1ra|2da|3ra|ppal|principal|score|partitura)\b/gi, "")
    .replace(/\d+/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const levenshtein = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[0][i] = i;
  for (let j = 0; j <= b.length; j++) dp[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j][i] = Math.min(dp[j - 1][i] + 1, dp[j][i - 1] + 1, dp[j - 1][i - 1] + cost);
    }
  }
  return dp[b.length][a.length];
};

const isCoreInstrumentId = (id) => {
  const match = String(id).match(/\d+/);
  if (!match) return false;
  const num = parseInt(match[0], 10);
  return num >= 1 && num <= 29;
};

const isDriveFileExcluded = (rawName) => {
  const upper = (rawName || "").toUpperCase();
  return upper.startsWith("PORTADA") || upper.startsWith("AUDIO");
};

const isScoreLike = (text) =>
  /\b(director|conductor|score|partitura)\b/i.test(String(text || ""));

const suggestPartFromDriveFile = (file, catalog) => {
  const rawName = file.name || "";
  if (!rawName || isDriveFileExcluded(rawName)) return null;

  const normalizedCatalog = catalog
    .filter((i) => isCoreInstrumentId(i.id))
    .map((i) => ({
      ...i,
      norm: normalizeInstrumentString(i.instrumento),
    }));

  const base = rawName.split(".")[0];
  const prefix = base.split("-")[0].trim();
  const lowerPrefix = prefix.toLowerCase();

  if (isScoreLike(lowerPrefix)) {
    const instrObj = normalizedCatalog.find((i) => i.id === DIRECTOR_ID);
    return {
      id_instrumento: DIRECTOR_ID,
      nombre_archivo: prefix || "SCORE",
      instrumento_nombre: instrObj?.instrumento || "Director",
      instrumento_abreviatura: instrObj?.abreviatura ?? null,
      es_solista: false,
    };
  }

  let normPrefix = normalizeInstrumentString(prefix);
  if (!normPrefix) return null;

  const rawL = lowerPrefix;
  if (
    /picc|piccolo|^fp\b|^fi\b/.test(rawL) ||
    /\bfl\s+picc/i.test(rawL) ||
    normPrefix.includes("piccolo")
  ) {
    normPrefix = "flauta";
  }

  let best = null;
  for (const instr of normalizedCatalog) {
    if (!instr.norm) continue;
    if (
      normPrefix === instr.norm ||
      normPrefix.includes(instr.norm) ||
      instr.norm.includes(normPrefix)
    ) {
      best = instr;
      break;
    }
    const dist = levenshtein(normPrefix, instr.norm);
    const maxLen = Math.max(normPrefix.length, instr.norm.length) || 1;
    const sim = 1 - dist / maxLen;
    if (!best || sim > best.sim) best = { ...instr, sim };
  }

  if (normPrefix === "corno") {
    const plainHorn =
      normalizedCatalog.find((i) => i.norm === "corno") ||
      normalizedCatalog.find((i) => i.norm.startsWith("corno") && !i.norm.includes("ingl"));
    if (plainHorn) best = plainHorn;
  }

  if (!best) return null;
  if (best.sim !== undefined && best.sim < 0.4) return null;

  const es_solista = /\bsolo\b/i.test(prefix);
  return {
    id_instrumento: best.id,
    nombre_archivo: prefix,
    instrumento_nombre: best.instrumento,
    instrumento_abreviatura: best.abreviatura ?? null,
    es_solista,
  };
};

const sqlEscape = (s) => String(s ?? "").replace(/'/g, "''");

const headers = {
  Authorization: `Bearer ${SB_KEY}`,
  apikey: SB_KEY,
  "Content-Type": "application/json",
};

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

function matchFolder(work, folders) {
  const hint = work.folderHint.toLowerCase();
  return folders.find((f) => (f.name || "").toLowerCase().includes(hint));
}

function composerKey(c) {
  return `${c.apellido}|${c.nombre || ""}`;
}

async function main() {
  const [rootItems, instrumentos] = await Promise.all([
    listFolder(ROOT_FOLDER),
    fetchInstrumentos(),
  ]);

  const folders = rootItems.filter(
    (f) => f.mimeType === "application/vnd.google-apps.folder",
  );

  const composerVars = new Map();
  for (const w of WORKS) {
    for (const c of w.compositors) {
      composerVars.set(composerKey(c), c);
    }
  }

  const workData = [];
  for (const work of WORKS) {
    const folder = matchFolder(work, folders);
    if (!folder) {
      console.warn("Carpeta no encontrada:", work.titulo);
      continue;
    }
    const files = (await listFolder(folder.webViewLink)).filter((f) =>
      /\.pdf$/i.test(f.name || ""),
    );
    const parts = [];
    for (const file of files.sort((a, b) => a.name.localeCompare(b.name, "es"))) {
      const suggested = suggestPartFromDriveFile(file, instrumentos);
      if (!suggested) {
        console.warn("Sin match:", work.titulo, file.name);
        continue;
      }
      parts.push({
        ...suggested,
        url_archivo: JSON.stringify([
          { url: file.webViewLink, description: file.name },
        ]),
      });
    }
    workData.push({
      ...work,
      titulo: withMagnolarioSuffix(work.titulo),
      link_drive: folder.webViewLink,
      instrumentacion: calculateInstrumentation(parts),
      parts,
    });
    await new Promise((r) => setTimeout(r, 150));
  }

  const varDecls = [
    "_id_soria bigint",
    "_id_obra bigint",
    ...[...composerVars.keys()].map((k) => {
      const safe = k.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
      return `_id_comp_${safe} bigint`;
    }),
  ];

  let sql = `-- Magnolario: 18 obras arr. cuerdas (Hernán Soria) → catálogo obras + particellas Drive
-- Origen: ${ROOT_FOLDER}
-- Generado: ${new Date().toISOString().slice(0, 10)}
-- Idempotente por título con sufijo [Magnolario] + arreglador Soria.

DO $$
DECLARE
  ${varDecls.join(";\n  ")};
BEGIN
  -- Arreglador Hernán Soria
  SELECT id INTO _id_soria FROM compositores WHERE apellido = 'Soria' AND nombre = 'Hernán' LIMIT 1;
  IF _id_soria IS NULL THEN
    RAISE EXCEPTION 'Compositor arreglador Hernán Soria no encontrado en compositores';
  END IF;

`;

  for (const [key, c] of composerVars) {
    const safe = key.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
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
    sql += `  -- ${w.titulo}
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = '${titulo}' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '${titulo}',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      '${sqlEscape(w.instrumentacion)}',
      '${sqlEscape(w.link_drive)}'
    )
    RETURNING id INTO _id_obra;

`;
    for (const c of w.compositors) {
      const safe = composerKey(c).replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
      sql += `    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_${safe}, 'compositor');
`;
    }
    sql += `    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
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

  const outPath = "supabase/seed_magnolario_soria_cuerdas.sql";
  writeFileSync(outPath, sql, "utf8");
  console.log(`Escrito ${outPath} (${workData.length} obras)`);
  for (const w of workData) {
    console.log(`  ${w.titulo}: ${w.parts.length} particellas — ${w.instrumentacion}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
