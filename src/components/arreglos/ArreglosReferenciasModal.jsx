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
  IconYoutube,
} from "../ui/Icons";
import { toast } from "sonner";
import RepertoireWorkPickerModal from "../repertoire/RepertoireWorkPickerModal";
import {
  getReferenciaLinkKind,
  getReferenciaLinkLabel,
  getReferenciaOpenKind,
  isYoutubeUrl,
  resolveReferenciaOpenUrl,
} from "../../utils/arreglosReferencias";

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function ReferenciaOpenButton({ kind, url, className = "" }) {
  if (!url) {
    return (
      <span
        className={`p-1.5 rounded-lg text-slate-300 border border-slate-200 ${className}`}
        title="Sin enlace disponible"
      >
        <IconExternalLink size={16} />
      </span>
    );
  }

  if (kind === "youtube") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`p-1.5 rounded-lg text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 ${className}`}
        title="Abrir en YouTube"
      >
        <IconYoutube size={16} />
      </a>
    );
  }

  if (kind === "drive" || kind === "obra") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`p-1.5 rounded-lg text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 ${className}`}
        title="Abrir carpeta en Drive"
      >
        <IconDrive size={16} />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`p-1.5 rounded-lg text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 ${className}`}
      title="Abrir enlace"
    >
      <IconExternalLink size={16} />
    </a>
  );
}

function ReferenciaKindIcon({ kind, size = 12, className = "" }) {
  if (kind === "obra") {
    return <IconMusic size={size} className={`shrink-0 text-indigo-500 ${className}`} />;
  }
  if (kind === "youtube") {
    return <IconYoutube size={size} className={`shrink-0 text-red-600 ${className}`} />;
  }
  if (kind === "drive") {
    return <IconDrive size={size} className={`shrink-0 text-amber-600 ${className}`} />;
  }
  return <IconExternalLink size={size} className={`shrink-0 text-slate-400 ${className}`} />;
}

export { resolveReferenciaOpenUrl };

const REF_TIPO_OPTIONS = [
  { id: "obra", label: "Obra", Icon: IconMusic, activeClass: "bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-200" },
  { id: "youtube", label: "YouTube", Icon: IconYoutube, activeClass: "bg-white text-red-700 shadow-sm ring-1 ring-red-200" },
  { id: "link", label: "Drive", Icon: IconDrive, activeClass: "bg-white text-amber-800 shadow-sm ring-1 ring-amber-200" },
];

function ReferenciaTipoToggle({ value, onChange, disabled = false }) {
  return (
    <div
      className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 gap-0.5"
      role="group"
      aria-label="Tipo de referencia"
    >
      {REF_TIPO_OPTIONS.map(({ id, label, Icon, activeClass }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(id)}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition-all ${
              active
                ? activeClass
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/80"
            } disabled:opacity-50`}
            aria-pressed={active}
          >
            <Icon size={13} className="shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
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

  const setDraftTipo = (tipo) => {
    setDraft((p) => ({
      ...p,
      tipo,
      id_obra_referencia: tipo === "obra" ? p.id_obra_referencia : "",
      link: tipo === "obra" ? p.link : "",
    }));
    if (tipo !== "obra") setObraPreview(null);
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
    } else if (draft.tipo === "youtube") {
      if (!link) {
        toast.error("Ingresá el enlace de YouTube.");
        return;
      }
      if (!isYoutubeUrl(link)) {
        toast.error("El enlace no parece ser de YouTube (youtube.com o youtu.be).");
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
        link:
          draft.tipo === "youtube" || draft.tipo === "link"
            ? link
            : link || null,
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
                const linkKind = getReferenciaLinkKind(ref);
                const openKind = getReferenciaOpenKind(ref, openUrl);
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
                          <ReferenciaKindIcon kind="obra" />
                          <span>
                            #{obraRef.id} · {stripHtml(obraRef.titulo) || "Sin título"}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                          <ReferenciaKindIcon kind={linkKind} />
                          <span>{getReferenciaLinkLabel(linkKind)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <ReferenciaOpenButton kind={openKind} url={openUrl} />
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
              <ReferenciaTipoToggle
                value={draft.tipo}
                onChange={setDraftTipo}
                disabled={saving}
              />
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
                            <IconDrive size={11} /> Drive de la obra
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
              ) : draft.tipo === "youtube" ? (
                <input
                  type="url"
                  value={draft.link}
                  onChange={(e) => setDraft((p) => ({ ...p, link: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=… o https://youtu.be/…"
                  className="w-full text-sm border border-red-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-red-400"
                />
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
