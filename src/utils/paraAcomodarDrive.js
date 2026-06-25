import { FunctionsHttpError } from "@supabase/supabase-js";

/** Carpeta Drive «Para acomodar» (staging antes de archivo oficial). */
export const PARA_ACOMODAR_DRIVE_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const ARCHIVO_OBRAS_DRIVE_FOLDER_ID = "10JQJW7YX7UNmWciqgJ-EiqaldM_e0Tvi";

export async function readManageDriveResponseBody(fnError, fnData) {
  if (fnData && (fnData.code || fnData.error || fnData.success)) return fnData;
  if (fnError instanceof FunctionsHttpError && fnError.context?.json) {
    try {
      return await fnError.context.json();
    } catch {
      /* ignore */
    }
  }
  return fnData ?? null;
}

export const stripHtmlPlain = (html) =>
  (html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

export const getTituloPrimeraLinea = (htmlTitulo) =>
  stripHtmlPlain(htmlTitulo).split(/\r?\n/)[0]?.trim() || "";

export const parseComposerFromOption = (opt) => {
  if (!opt?.label) return { apellido: "", nombre: "" };
  const idx = opt.label.indexOf(",");
  if (idx === -1) return { apellido: opt.label.trim(), nombre: "" };
  return {
    apellido: opt.label.slice(0, idx).trim(),
    nombre: opt.label.slice(idx + 1).trim(),
  };
};

export function buildParaAcomodarFolderName(tituloHtml, composerIds, arrangerIds, composersOptions) {
  const titulo = getTituloPrimeraLinea(tituloHtml);
  if (!titulo || !composerIds?.length) return null;

  const compOpt = composersOptions.find((c) => c.id === composerIds[0]);
  const { apellido: compApellido, nombre: compNombre } = parseComposerFromOption(compOpt);
  if (!compApellido) return null;

  if (arrangerIds?.length > 0) {
    const arrOpt = composersOptions.find((c) => c.id === arrangerIds[0]);
    const arrApellido = parseComposerFromOption(arrOpt).apellido;
    if (!arrApellido) return null;
    return `${compApellido}-${arrApellido} - ${titulo}`;
  }

  const inicial = compNombre ? `${compNombre.charAt(0).toUpperCase()}.` : "";
  const prefijo = inicial ? `${compApellido}, ${inicial}` : compApellido;
  return `${prefijo} - ${titulo}`;
}

export function buildParaAcomodarFolderNameFromRelations(tituloHtml, obrasCompositores = []) {
  const titulo = getTituloPrimeraLinea(tituloHtml);
  const compRow = obrasCompositores.find((r) => r.rol === "compositor");
  const comp = compRow?.compositores;
  if (!titulo || !comp?.apellido) return null;

  const arrRow = obrasCompositores.find((r) => r.rol === "arreglador");
  const arrApellido = arrRow?.compositores?.apellido;
  if (arrApellido) {
    return `${comp.apellido}-${arrApellido} - ${titulo}`;
  }

  const inicial = comp.nombre ? `${comp.nombre.charAt(0).toUpperCase()}.` : "";
  const prefijo = inicial ? `${comp.apellido}, ${inicial}` : comp.apellido;
  return `${prefijo} - ${titulo}`;
}
