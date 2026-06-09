/**
 * Crea/actualiza carpeta en Misceláneos y accesos directos numerados por obra.
 */
export async function syncArchivoSelectionToDrive(supabase, { selectionName, works }) {
  const { data, error } = await supabase.functions.invoke("manage-drive", {
    body: {
      action: "sync_archivo_selection_shortcuts",
      selectionName,
      works: works.map((w) => ({
        id: w.id,
        link_drive: w.link_drive || "",
        titulo: w.titulo || "",
      })),
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.success) {
    throw new Error(data?.message || "No se pudo sincronizar con Drive.");
  }
  return data;
}
