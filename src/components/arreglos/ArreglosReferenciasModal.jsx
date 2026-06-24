import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconDrive,
  IconExternalLink,
  IconLoader,
  IconMusic,
  IconPlus,
  IconTrash,
  IconX,
} from "../ui/Icons";
import { toast } from "sonner";
import RepertoireWorkPickerModal from "../repertoire/RepertoireWorkPickerModal";

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

export function resolveReferenciaOpenUrl(ref) {
  const link = (ref?.link || "").trim();
  if (link) return link;
  const drive = (ref?.obra_ref?.link_drive || "").trim();
  if (drive) return drive;
  return null;
}

export default function ArreglosReferenciasModal({
  isOpen,
  onClose,
  work,
  supabase,
  canEdit = false,
  onChanged,
  overlayClassName = "z-[10050]",
  pickerOverlayClassName = "z-[10100]",
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [referencias, setReferencias] = useState([]);
  const [draft, setDraft] = useState({
    titulo: "",
    tipo: "obra",
    id_obra_referencia: "",
    link: "",
  });
  const [obraPreview, setObraPreview] = useState(null);
  const [showWorkPicker, setShowWorkPicker] = useState(false);

  const fetchReferencias = useCallback(async () => {
    if (!work?.id || !supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("arreglos_referencias")
        .select(
          `
          id,
          id_obra,
          titulo,
          link,
          id_obra_referencia,
          orden,
          obra_ref:obras!arreglos_referencias_id_obra_referencia_fkey (
            id,
            titulo,
            link_drive
          )
        `,
        )
        .eq("id_obra", work.id)
        .order("orden", { ascending: true })
        .order("id", { ascending: true });
      if (error) throw error;
      setReferencias(data || []);
    } catch (e) {
      console.error("ArreglosReferenciasModal:", e);
      toast.error(e?.message || "No se pudieron cargar las referencias.");
      setReferencias([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, work?.id]);

  useEffect(() => {
    if (!isOpen || !work?.id) return;
    setDraft({ titulo: "", tipo: "obra", id_obra_referencia: "", link: "" });
    setObraPreview(null);
    fetchReferencias();
  }, [isOpen, work?.id, fetchReferencias]);

  const selectObraFromArchivo = async (obraId) => {
    const id = Number(obraId);
    if (!id || Number.isNaN(id)) return;
    setShowWorkPicker(false);
    try {
      const { data, error } = await supabase
        .from("obras")
        .select("id, titulo, link_drive")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error(`No existe obra #${id} en el archivo.`);
        return;
      }
      setObraPreview(data);
      setDraft((p) => ({
        ...p,
        tipo: "obra",
        id_obra_referencia: String(data.id),
        titulo: p.titulo?.trim()
          ? p.titulo
          : stripHtml(data.titulo)
            ? `Referencia · ${stripHtml(data.titulo).slice(0, 72)}`
            : `Obra #${data.id}`,
      }));
    } catch (e) {
      toast.error(e?.message || "No se pudo cargar la obra seleccionada.");
    }
  };

  const clearObraSeleccionada = () => {
    setObraPreview(null);
    setDraft((p) => ({ ...p, id_obra_referencia: "" }));
  };

  const handleAddReferencia = async () => {
    if (!canEdit || !work?.id) return;
    const titulo = (draft.titulo || "").trim();
    if (!titulo) {
      toast.error("Ingresá un título o descripción para la referencia.");
      return;
    }

    const link = (draft.link || "").trim();
    const obraId = Number(String(draft.id_obra_referencia || "").trim());

    if (draft.tipo === "obra") {
      if (!obraId || Number.isNaN(obraId)) {
        toast.error("Seleccioná una obra del archivo.");
        return;
      }
    } else if (!link) {
      toast.error("Ingresá el enlace de referencia.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id_obra: work.id,
        titulo,
        orden: referencias.length,
        link: draft.tipo === "link" ? link : link || null,
        id_obra_referencia: draft.tipo === "obra" ? obraId : null,
      };

      const { error } = await supabase.from("arreglos_referencias").insert([payload]);
      if (error) throw error;

      toast.success("Referencia agregada.");
      setDraft({ titulo: "", tipo: "obra", id_obra_referencia: "", link: "" });
      setObraPreview(null);
      await fetchReferencias();
      if (typeof onChanged === "function") onChanged(work.id);
    } catch (e) {
      toast.error(e?.message || "No se pudo guardar la referencia.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReferencia = async (refId) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("arreglos_referencias").delete().eq("id", refId);
      if (error) throw error;
      toast.success("Referencia eliminada.");
      await fetchReferencias();
      if (typeof onChanged === "function") onChanged(work.id);
    } catch (e) {
      toast.error(e?.message || "No se pudo eliminar la referencia.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !work) return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${overlayClassName} flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4`}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[min(90vh,36rem)] flex flex-col border border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arreglos-refs-title"
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <h3 id="arreglos-refs-title" className="text-base font-bold text-slate-800">
              Referencias
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate" title={stripHtml(work.titulo)}>
              {stripHtml(work.titulo) || `Obra #${work.id}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg disabled:opacity-40"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {loading ? (
            <div className="py-8 flex flex-col items-center gap-2 text-indigo-600 text-sm">
              <IconLoader className="animate-spin" size={22} />
              Cargando referencias…
            </div>
          ) : referencias.length === 0 ? (
            <p className="text-sm text-slate-500 italic py-4 text-center">
              Sin referencias cargadas.
            </p>
          ) : (
            <ul className="space-y-2">
              {referencias.map((ref) => {
                const openUrl = resolveReferenciaOpenUrl(ref);
                const obraRef = ref.obra_ref;
                return (
                  <li
                    key={ref.id}
                    className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800 leading-snug">
                        {ref.titulo}
                      </div>
                      {obraRef ? (
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <IconMusic size={12} className="shrink-0 text-indigo-500" />
                          <span>
                            #{obraRef.id} · {stripHtml(obraRef.titulo) || "Sin título"}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          Enlace externo
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {openUrl ? (
                        <a
                          href={openUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100"
                          title="Abrir carpeta / enlace"
                        >
                          <IconDrive size={16} />
                        </a>
                      ) : (
                        <span
                          className="p-1.5 rounded-lg text-slate-300 border border-slate-200"
                          title="Sin enlace disponible"
                        >
                          <IconDrive size={16} />
                        </span>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleDeleteReferencia(ref.id)}
                          disabled={saving}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                          title="Quitar referencia"
                        >
                          <IconTrash size={14} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {canEdit && (
            <div className="border-t border-slate-200 pt-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Agregar referencia
              </p>
              <input
                type="text"
                value={draft.titulo}
                onChange={(e) => setDraft((p) => ({ ...p, titulo: e.target.value }))}
                placeholder="Título o descripción breve"
                className="w-full text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2 text-xs">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="ref-tipo"
                    checked={draft.tipo === "obra"}
                    onChange={() => setDraft((p) => ({ ...p, tipo: "obra" }))}
                  />
                  Obra del archivo
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="ref-tipo"
                    checked={draft.tipo === "link"}
                    onChange={() => setDraft((p) => ({ ...p, tipo: "link" }))}
                  />
                  Enlace
                </label>
              </div>
              {draft.tipo === "obra" ? (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setShowWorkPicker(true)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  >
                    <IconMusic size={14} />
                    Buscar obra en archivo
                  </button>
                  {obraPreview && (
                    <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-slate-800 leading-snug">
                          #{obraPreview.id} · {stripHtml(obraPreview.titulo) || "Sin título"}
                        </p>
                        {obraPreview.link_drive ? (
                          <a
                            href={obraPreview.link_drive}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-amber-700 inline-flex items-center gap-0.5 mt-0.5"
                          >
                            <IconExternalLink size={11} /> Drive de la obra
                          </a>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={clearObraSeleccionada}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                        title="Quitar selección"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  )}
                  <input
                    type="url"
                    value={draft.link}
                    onChange={(e) => setDraft((p) => ({ ...p, link: e.target.value }))}
                    placeholder="Enlace opcional (si difiere del Drive de la obra)"
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <input
                  type="url"
                  value={draft.link}
                  onChange={(e) => setDraft((p) => ({ ...p, link: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className="w-full text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500"
                />
              )}
              <button
                type="button"
                onClick={handleAddReferencia}
                disabled={saving}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-bold px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? (
                  <IconLoader size={14} className="animate-spin" />
                ) : (
                  <IconPlus size={14} />
                )}
                Agregar
              </button>
            </div>
          )}
        </div>
      </div>

      {showWorkPicker && (
        <RepertoireWorkPickerModal
          supabase={supabase}
          onClose={() => setShowWorkPicker(false)}
          mode="select"
          title="Buscar obra"
          showCreateRequest={false}
          applyGiraInstrumentationDefaults={false}
          overlayClassName={pickerOverlayClassName}
          onSelectWork={selectObraFromArchivo}
        />
      )}
    </div>,
    document.body,
  );
}
