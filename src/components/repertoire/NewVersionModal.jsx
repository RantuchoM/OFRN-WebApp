import React, { useState } from "react";
import { IconX, IconLoader, IconCopy } from "../ui/Icons";
import { toast } from "sonner";

const FLOW_REEMPLAZAR = "reemplazar";
const FLOW_NUEVO_ARREGLO = "nuevo_arreglo";

/**
 * Modal para "Nueva versión" en Dashboard de Arreglos.
 * Permite elegir: REEMPLAZAR la versión actual o CARGAR UN NUEVO ARREGLO (clon).
 * Campos: Link de Drive (obligatorio), Observaciones (textarea).
 */
export default function NewVersionModal({
  isOpen,
  onClose,
  work,
  supabase,
  onSuccess,
}) {
  const [flow, setFlow] = useState(FLOW_REEMPLAZAR);
  const [linkDrive, setLinkDrive] = useState("");
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setFlow(FLOW_REEMPLAZAR);
    setLinkDrive("");
    setObservacion("");
    setSaving(false);
  };

  const handleClose = () => {
    if (!saving) {
      reset();
      onClose();
    }
  };

  const stripHtml = (html) =>
    (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

  const tituloTexto = work ? stripHtml(work.titulo || "") : "";

  const sendMailVersionado = async (tipo, titulo, link, obs) => {
    const { error } = await supabase.functions.invoke("mails_produccion", {
      body: {
        action: "enviar_mail",
        templateId: "versionado_arreglo",
        email: "ofrn.archivo@gmail.com",
        nombre: "Sistema",
        gira: null,
        detalle: {
          tipo,
          titulo: titulo || "Obra",
          link_drive: link,
          observacion: obs || "",
        },
      },
    });
    if (error) console.error("[NewVersionModal] Error enviando mail:", error);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const link = (linkDrive || "").trim();
    if (!link) {
      toast.error("El link de Drive es obligatorio.");
      return;
    }
    if (!work?.id) {
      toast.error("No hay obra seleccionada.");
      return;
    }

    setSaving(true);
    const sb = supabase;

    try {
      if (flow === FLOW_REEMPLAZAR) {
        // Caso 1: Reemplazar — la Edge Function copia/reemplaza archivos en nuestra carpeta y actualiza particellas
        const { data: replaceData, error: replaceError } = await sb.functions.invoke("manage-drive", {
          body: {
            action: "reemplazar_archivos_obra",
            id_obra: work.id,
            link_origen: link,
          },
        });
        if (replaceError) throw replaceError;
        if (replaceData?.error) throw new Error(replaceData.error);

        const comentariosActuales = (work.comentarios || "").trim();
        const observacionTrim = (observacion || "").trim();
        const comentariosNuevos = observacionTrim
          ? (comentariosActuales
              ? `${comentariosActuales}\n\n[Nueva versión] ${observacionTrim}`
              : `[Nueva versión] ${observacionTrim}`)
          : comentariosActuales;

        const sufijoNuevaVersion = " [nueva versión]";
        const tituloConSufijo = tituloTexto.endsWith(sufijoNuevaVersion)
          ? tituloTexto
          : tituloTexto + sufijoNuevaVersion;

        const { error: updateObraError } = await sb
          .from("obras")
          .update({ comentarios: comentariosNuevos || null, titulo: tituloConSufijo })
          .eq("id", work.id);
        if (updateObraError) throw updateObraError;

        const linkNuestraCarpeta = work.link_drive || link;
        await sendMailVersionado("REEMPLAZO", tituloTexto, linkNuestraCarpeta, observacion);
        toast.success("Versión reemplazada. Se actualizaron los archivos en el Archivo y se notificó al archivista.");
      } else {
        // Caso 2: Nuevo arreglo — copia toda la carpeta al Archivo (como entrega nueva) y crea obra con ese link
        const { data: copyData, error: copyError } = await sb.functions.invoke("manage-drive", {
          body: {
            action: "copiar_carpeta_a_archivo",
            link_origen: link,
            nombre_carpeta: tituloTexto || "Obra sin título",
          },
        });
        if (copyError) throw copyError;
        if (copyData?.error) throw new Error(copyData.error);
        const linkArchivo = copyData?.link_drive;
        if (!linkArchivo) throw new Error("No se obtuvo el link de la carpeta copiada.");

        const sufijoNuevoArreglo = " [nuevo arreglo]";
        const tituloNuevoArreglo = tituloTexto.endsWith(sufijoNuevoArreglo)
          ? tituloTexto
          : tituloTexto + sufijoNuevoArreglo;

        const insertObra = {
          titulo: tituloNuevoArreglo,
          duracion_segundos: work.duracion_segundos ?? null,
          instrumentacion: work.instrumentacion ?? null,
          id_integrante_arreglador: work.id_integrante_arreglador ?? null,
          estado: "Entregado",
          link_drive: linkArchivo,
          comentarios: (observacion || "").trim() || null,
          dificultad: work.dificultad ?? null,
          observaciones: work.observaciones ?? null,
          fecha_esperada: work.fecha_esperada ?? null,
        };

        const { data: newObra, error: insertObraError } = await sb
          .from("obras")
          .insert(insertObra)
          .select("id")
          .single();
        if (insertObraError) throw insertObraError;
        const newId = newObra?.id;
        if (!newId) throw new Error("No se obtuvo el ID de la nueva obra.");

        const { data: compositoresRows, error: compError } = await sb
          .from("obras_compositores")
          .select("id_compositor, rol")
          .eq("id_obra", work.id);
        if (compError) throw compError;
        if (compositoresRows?.length > 0) {
          const inserts = compositoresRows.map((r) => ({
            id_obra: newId,
            id_compositor: r.id_compositor,
            rol: r.rol ?? "compositor",
          }));
          const { error: insertCompError } = await sb
            .from("obras_compositores")
            .insert(inserts);
          if (insertCompError) throw insertCompError;
        }

        await sendMailVersionado("NUEVO_ARREGLO", tituloTexto, linkArchivo, observacion);
        toast.success("Nuevo arreglo creado. Se copió la carpeta al Archivo y se notificó al archivista.");
      }

      reset();
      onClose();
      if (typeof onSuccess === "function") onSuccess();
    } catch (err) {
      const msg = err?.message ?? "Error al procesar la nueva versión.";
      console.error("[NewVersionModal]", err);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h3 className="text-sm font-bold text-slate-700">Nueva versión</h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {tituloTexto && (
            <p className="text-xs text-slate-500">
              Obra: <strong className="text-slate-700">{tituloTexto}</strong>
            </p>
          )}

          <p className="text-sm text-slate-600">
            ¿Deseas <strong>reemplazar</strong> la versión actual o <strong>cargar un nuevo arreglo</strong> (clon)?
          </p>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="flow"
                checked={flow === FLOW_REEMPLAZAR}
                onChange={() => setFlow(FLOW_REEMPLAZAR)}
                disabled={saving}
                className="text-indigo-600"
              />
              <span className="text-sm">Reemplazar versión actual</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="flow"
                checked={flow === FLOW_NUEVO_ARREGLO}
                onChange={() => setFlow(FLOW_NUEVO_ARREGLO)}
                disabled={saving}
                className="text-indigo-600"
              />
              <span className="text-sm">Nuevo arreglo (clon)</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Link de Drive <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={linkDrive}
              onChange={(e) => setLinkDrive(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Observaciones
            </label>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Observación del arreglador (opcional)"
              rows={3}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
              disabled={saving}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !linkDrive.trim()}
              className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <IconLoader size={16} className="animate-spin" />
              ) : (
                <IconCopy size={16} />
              )}
              {flow === FLOW_REEMPLAZAR ? "Reemplazar" : "Crear nuevo arreglo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
