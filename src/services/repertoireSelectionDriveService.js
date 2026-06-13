/**
 * Drive: sincronizar selección del archivo y cargar preselección desde Misceláneos.
 */

export function extractDriveFileId(url) {
  if (!url) return null;
  const match = String(url).match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

export function buildDriveIdToWorkIdMap(works) {
  const map = new Map();
  for (const work of works || []) {
    const driveId = extractDriveFileId(work.link_drive);
    if (driveId && !map.has(driveId)) {
      map.set(driveId, work.id);
    }
  }
  return map;
}

export function matchSelectionItemsToWorkIds(items, works) {
  const driveMap = buildDriveIdToWorkIdMap(works);
  const orderedIds = [];
  const seen = new Set();
  const unmatched = [];

  for (const item of items || []) {
    const workId = driveMap.get(item.targetDriveId);
    if (workId) {
      if (!seen.has(workId)) {
        seen.add(workId);
        orderedIds.push(workId);
      }
    } else {
      unmatched.push(item);
    }
  }

  return { orderedIds, unmatched };
}

async function invokeManageDrive(supabase, body) {
  const { data, error } = await supabase.functions.invoke("manage-drive", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.success) {
    throw new Error(data?.message || "Error en la operación de Drive.");
  }
  return data;
}

export async function listArchivoMiscFolders(supabase) {
  const data = await invokeManageDrive(supabase, { action: "list_archivo_misc_folders" });
  return data.folders || [];
}

export async function loadArchivoSelectionFromDrive(supabase, folderId) {
  const data = await invokeManageDrive(supabase, {
    action: "load_archivo_selection_from_drive",
    selectionFolderId: folderId,
  });
  return data;
}

/**
 * Crea/actualiza carpeta en Misceláneos y accesos directos numerados por obra.
 */
export async function syncArchivoSelectionToDrive(supabase, { selectionName, works }) {
  const data = await invokeManageDrive(supabase, {
    action: "sync_archivo_selection_shortcuts",
    selectionName,
    works: works.map((w) => ({
      id: w.id,
      link_drive: w.link_drive || "",
      titulo: w.titulo || "",
    })),
  });
  return data;
}
