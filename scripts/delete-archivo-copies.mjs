/**
 * Elimina carpetas duplicadas del Archivo (copiar_carpeta_a_archivo).
 */
import { headers, SB_URL } from "./lib/repertoireSeedUtils.mjs";
import {
  ARCHIVO_COPIES_TO_DELETE,
} from "./lib/ariasCatalog.mjs";

const PARA_ACOMODAR_DELETE = [
  { obraId: 3490, folderId: "1uf2qAGjKK6d4cts1i8Q3WbqJknSF69Js" },
  { obraId: 3494, folderId: "1320-8NjiLCLkLoMaSuZR4Su-XQC6R_US" },
  { obraId: 3497, folderId: "1igMJPTxpRWAgv-wTuin3yXdw3In9R87K" },
  { obraId: 3498, folderId: "13wx5S99W5CoJLaxjHBBYJxk71BRNAZsR" },
];

const STUB_FOLDERS = [
  "1sWRk5nQhzE-pqbkZs6o0fpBRBa_PjzeL",
];

async function deleteFolder(fileId) {
  const res = await fetch(`${SB_URL}/functions/v1/manage-drive`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "delete_file", fileId }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(JSON.stringify(data));
}

const all = [...ARCHIVO_COPIES_TO_DELETE, ...PARA_ACOMODAR_DELETE];
for (const id of STUB_FOLDERS) all.push({ folderId: id, obraId: null });

for (const item of all) {
  console.log("Eliminando copia:", item.folderId, item.obraId ? `(obra ${item.obraId})` : "");
  await deleteFolder(item.folderId);
}
console.log("Listo:", all.length, "carpetas eliminadas.");
