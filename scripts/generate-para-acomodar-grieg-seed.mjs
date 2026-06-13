/**
 * Seed append: Peer Gynt Suite 1 y 2 (dos obras separadas).
 */
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartFromDriveFile } from "./lib/drivePartMatcher.mjs";
import {
  SB_URL,
  buildSeedSql,
  fetchInstrumentos,
  fetchWorkMetadata,
  headers,
  listFolder,
  sleep,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

const PARA_ACOMODAR =
  "https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

const GRIEG_WORKS = [
  {
    folderName: "Grieg, E. - Peer Gynt (Suite 1)",
    titulo: "Peer Gynt (Suite 1)",
    anio: 1875,
  },
  {
    folderName: "Grieg, E. - Peer Gynt (Suite 2)",
    titulo: "Peer Gynt (Suite 2)",
    anio: 1891,
  },
];

const COMPOSITOR = { apellido: "Grieg", nombre: "Edvard" };

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

async function main() {
  const rootItems = await listFolder(PARA_ACOMODAR);
  const instrumentos = await fetchInstrumentos();
  const workData = [];

  for (const spec of GRIEG_WORKS) {
    const folder = rootItems.find((f) => f.name === spec.folderName);
    if (!folder) throw new Error(`Carpeta no encontrada: ${spec.folderName}`);

    const files = (await listFolder(folder.webViewLink)).filter((f) =>
      /\.pdf$/i.test(f.name || ""),
    );
    const parts = [];
    for (const file of files.sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "es"),
    )) {
      const suggested = suggestPartFromDriveFile(file, instrumentos);
      if (!suggested) {
        console.warn("  Sin match:", file.name);
        continue;
      }
      parts.push({
        ...suggested,
        url_archivo: JSON.stringify([
          { url: file.webViewLink, description: file.name },
        ]),
      });
    }

    const meta = await fetchWorkMetadata(
      spec.titulo,
      COMPOSITOR,
      `Edvard Grieg ${spec.titulo}`,
    );
    if (meta.anio == null) meta.anio = spec.anio;
    if (meta.duracion_segundos != null && meta.duracion_segundos > 900) {
      meta.duracion_segundos = null;
    }

    console.log(`Copiando al Archivo: ${spec.folderName}…`);
    const linkArchivo = await copyToArchivo(folder.webViewLink, spec.folderName);
    await sleep(400);

    const inst = calculateInstrumentation(parts);
    console.log(`  ${spec.titulo}: ${parts.length} partes | ${inst}`);

    workData.push({
      titulo: spec.titulo,
      compositors: [COMPOSITOR],
      arranger: null,
      observaciones: `Para acomodar — ${spec.folderName}`,
      link_drive: linkArchivo,
      instrumentacion: inst,
      parts,
      ...meta,
    });
  }

  const sql = buildSeedSql({
    outComment: `-- Peer Gynt: ${workData.length} obras (Suite 1 y Suite 2)`,
    workData,
    resolveArrangerVar: () => "NULL",
  });
  writeSeed("supabase/seed_para_acomodar_grieg.sql", sql, workData);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
