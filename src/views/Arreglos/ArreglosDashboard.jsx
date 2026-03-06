import React, { useState, useEffect, useMemo } from "react";
import {
  IconMusicNote,
  IconLoader,
  IconDrive,
  IconEdit,
  IconExternalLink,
  IconFilter,
  IconCheck,
  IconPlus,
  IconX,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabase";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import WorkForm from "../Repertoire/WorkForm";

const RichTextPreview = ({ content, className = "" }) => {
  if (!content) return null;
  return (
    <div
      className={`whitespace-pre-wrap [&_ul]:list-disc [&_ul]:pl-5 ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};


const fieldStatusKey = (workId, field) => `${workId}-${field}`;

function getFieldStatusClass(status) {
  if (status === "saving") return "bg-yellow-100 text-yellow-900 border-yellow-300 ring-1 ring-yellow-300 transition-colors duration-200";
  if (status === "error") return "bg-red-100 text-red-900 border-red-300 ring-1 ring-red-300 font-bold transition-colors duration-200";
  if (status === "saved") return "bg-green-200 text-green-900 border-green-400 ring-1 ring-green-400 font-medium transition-colors duration-1000";
  return "border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
}

export default function ArreglosDashboard({ supabase: supabaseClient, onViewInRepertoire, catalogoInstrumentos }) {
  const { user, isEditor, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sb = supabaseClient || supabase;
  const canEditFields = isEditor || isAdmin;

  const [loading, setLoading] = useState(true);
  const [works, setWorks] = useState([]);
  const [arregladoresOptions, setArregladoresOptions] = useState([]);
  const [filterArregladorId, setFilterArregladorId] = useState("");
  const [myCompositorId, setMyCompositorId] = useState(null);
  const [sortFechaEsperada, setSortFechaEsperada] = useState("asc"); // "asc" | "desc"

  // Modal WorkForm: abrir por encima de la vista sin cambiar de tab
  const [workFormModalOpen, setWorkFormModalOpen] = useState(false);
  const [workFormInitialData, setWorkFormInitialData] = useState({});

  // Inline edit state: workId -> { link_drive, nota_entrega, fecha_esperada, instrumentacion, dificultad, observaciones }
  const [rowDraft, setRowDraft] = useState({});
  const [savingId, setSavingId] = useState(null);
  // Por celda: 'idle' | 'saving' | 'saved' | 'error' (rojo/amarillo/verde)
  const [fieldStatus, setFieldStatus] = useState({});

  const fetchWorks = async () => {
    setLoading(true);
    try {
      const { data: obras, error } = await sb
        .from("obras")
        .select(
          `
          id,
          titulo,
          estado,
          link_drive,
          instrumentacion,
          dificultad,
          observaciones,
          comentarios,
          duracion_segundos,
          id_integrante_arreglador,
          fecha_esperada,
          obras_compositores (rol, compositores (apellido, nombre))
        `
        )
        .in("estado", ["Para arreglar", "Entregado"])
        .order("estado", { ascending: true })
        .order("titulo");

      if (error) throw error;

      const { data: integrantes } = await sb
        .from("integrantes")
        .select("id, apellido, nombre")
        .order("apellido");

      const intMap = new Map((integrantes || []).map((i) => [i.id, `${i.apellido || ""}, ${i.nombre || ""}`.trim() || `ID ${i.id}`]));
      const arregladorIds = new Set((obras || []).map((w) => w.id_integrante_arreglador).filter(Boolean));
      const options = Array.from(arregladorIds)
        .map((id) => ({ id, label: intMap.get(id) || `ID ${id}` }))
        .sort((a, b) => (a.label || "").localeCompare(b.label || ""));
      setArregladoresOptions(options);

      const list = (obras || []).map((w) => {
        const compositoresList = (w.obras_compositores || [])
          .filter((oc) => oc.rol === "compositor")
          .map((oc) => oc.compositores)
          .filter(Boolean)
          .map((c) => `${c.apellido}, ${c.nombre}`)
          .join(" / ");
        return {
          ...w,
          compositor_full: compositoresList,
          arreglador_label: w.id_integrante_arreglador ? intMap.get(w.id_integrante_arreglador) : null,
        };
      });
      setWorks(list);
      setRowDraft({});
      setFieldStatus({});
    } catch (err) {
      const msg = err?.message ?? (typeof err === "string" ? err : "Error al cargar encargos.");
      console.error("ArreglosDashboard:", msg);
      setWorks([]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorks();
  }, [sb]);

  useEffect(() => {
    if (!user || arregladoresOptions.length === 0) return;
    const apellido = (user.apellido || "").trim().toLowerCase();
    const nombre = (user.nombre || "").trim().toLowerCase();
    const myId = arregladoresOptions.find((opt) => {
      const parts = (opt.label || "").split(",").map((s) => s.trim().toLowerCase());
      const ap = parts[0] || "";
      const nom = parts[1] || "";
      return ap === apellido && nom === nombre;
    })?.id;
    setMyCompositorId(myId ?? null);
  }, [user, arregladoresOptions]);

  const filteredWorks = useMemo(() => {
    let list = works;
    if (filterArregladorId) {
      list = works.filter((w) => String(w.id_integrante_arreglador) === String(filterArregladorId));
    }
    if (sortFechaEsperada) {
      list = [...list].sort((a, b) => {
        const fa = a.fecha_esperada || "";
        const fb = b.fecha_esperada || "";
        if (!fa && !fb) return 0;
        if (!fa) return 1;
        if (!fb) return -1;
        const cmp = fa.localeCompare(fb);
        return sortFechaEsperada === "desc" ? -cmp : cmp;
      });
    }
    return list;
  }, [works, filterArregladorId, sortFechaEsperada]);

  const getDraft = (workId) => rowDraft[workId] || {};

  const setDraftField = (workId, field, value) => {
    setRowDraft((prev) => ({
      ...prev,
      [workId]: { ...(prev[workId] || {}), [field]: value },
    }));
  };

  const saveEditorField = async (work, field, value) => {
    if (!canEditFields) return;
    const key = fieldStatusKey(work.id, field);
    setFieldStatus((prev) => ({ ...prev, [key]: "saving" }));
    try {
      const payload = {};
      if (field === "titulo") payload.titulo = value != null ? String(value).trim() || null : null;
      else if (field === "fecha_esperada") payload.fecha_esperada = value && value.trim() ? value.trim() : null;
      else if (field === "instrumentacion") payload.instrumentacion = value != null ? String(value).trim() || null : null;
      else if (field === "dificultad") payload.dificultad = value != null ? String(value).trim() || null : null;
      else if (field === "observaciones") payload.observaciones = value != null ? String(value).trim() || null : null;
      const { error } = await sb.from("obras").update(payload).eq("id", work.id);
      if (error) throw error;
      setWorks((prev) => prev.map((w) => (w.id === work.id ? { ...w, ...payload } : w)));
      setRowDraft((prev) => {
        const next = { ...prev };
        if (next[work.id]) {
          next[work.id] = { ...next[work.id], [field]: undefined };
          if (Object.keys(next[work.id]).every((k) => next[work.id][k] === undefined)) delete next[work.id];
        }
        return next;
      });
      setFieldStatus((prev) => ({ ...prev, [key]: "saved" }));
      setTimeout(() => setFieldStatus((p) => ({ ...p, [key]: "idle" })), 2000);
    } catch (e) {
      setFieldStatus((prev) => ({ ...prev, [key]: "error" }));
      toast.error(e?.message || "Error al guardar.");
      setTimeout(() => setFieldStatus((p) => ({ ...p, [key]: "idle" })), 3000);
    }
  };

  const saveLinkDrive = async (work) => {
    const draft = getDraft(work.id);
    const link = (draft.link_drive !== undefined ? draft.link_drive : work.link_drive) || "";
    if (!link.trim()) {
      toast.error("Ingresá el link de Drive antes de guardar.");
      return;
    }
    setSavingId(work.id);
    try {
      const { error } = await sb.from("obras").update({ link_drive: link.trim() }).eq("id", work.id);
      if (error) throw error;
      setWorks((prev) => prev.map((w) => (w.id === work.id ? { ...w, link_drive: link.trim() } : w)));
      setRowDraft((prev) => {
        const next = { ...prev };
        if (next[work.id]) {
          next[work.id] = { ...next[work.id], link_drive: undefined };
          if (Object.keys(next[work.id]).every((k) => next[work.id][k] === undefined)) delete next[work.id];
        }
        return next;
      });
      toast.success("Link de Drive guardado.");
    } catch (e) {
      toast.error(e.message || "Error al guardar.");
    } finally {
      setSavingId(null);
    }
  };

  const pasarAEntregado = async (work) => {
    const draft = getDraft(work.id);
    const link = (draft.link_drive !== undefined ? draft.link_drive : work.link_drive) || "";
    if (!link.trim()) {
      toast.error("Cargá el link de Drive antes de pasar a Entregado.");
      return;
    }
    const notaEntrega = draft.nota_entrega !== undefined ? draft.nota_entrega : "";
    const comentariosActuales = (work.comentarios || "").trim();
    const comentariosNuevos = notaEntrega.trim()
      ? (comentariosActuales ? `${comentariosActuales}\n\n[Entrega] ${notaEntrega.trim()}` : `[Entrega] ${notaEntrega.trim()}`)
      : comentariosActuales;

    setSavingId(work.id);
    try {
      if (comentariosNuevos !== comentariosActuales) {
        const { error: commentError } = await sb
          .from("obras")
          .update({ comentarios: comentariosNuevos || null })
          .eq("id", work.id);
        if (commentError) throw commentError;
      }

      const { data, error: efError } = await sb.functions.invoke("manage-drive", {
        body: {
          action: "entregar_obra_archivo",
          id_obra: work.id,
          link_origen: link.trim(),
          titulo: stripHtml(work.titulo),
        },
      });
      if (efError) throw efError;
      if (data?.error) throw new Error(data.error);

      setWorks((prev) =>
        prev.map((w) =>
          w.id === work.id
            ? { ...w, estado: "Entregado", link_drive: data?.link_drive || link.trim(), comentarios: comentariosNuevos || w.comentarios }
            : w
        )
      );
      setRowDraft((prev) => {
        const next = { ...prev };
        delete next[work.id];
        return next;
      });
      toast.success("Obra entregada. Se copió al Archivo y se notificó al archivista.");
    } catch (e) {
      toast.error(e?.message || "Error al entregar.");
    } finally {
      setSavingId(null);
    }
  };

  const goToRepertoire = (workId = null) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "repertorio");
    if (workId) next.set("editId", String(workId));
    setSearchParams(next);
    if (typeof onViewInRepertoire === "function") onViewInRepertoire(workId);
  };

  const openWorkFormModal = (workId = null) => {
    setWorkFormInitialData(workId != null ? { id: workId } : {});
    setWorkFormModalOpen(true);
  };

  const closeWorkFormModal = () => {
    setWorkFormModalOpen(false);
    setWorkFormInitialData({});
  };

  const handleSaveWorkForm = async (savedId = null, shouldClose = true) => {
    if (shouldClose) closeWorkFormModal();
    await fetchWorks();
    return savedId;
  };

  const formatDuration = (secs) => {
    if (!secs && secs !== 0) return "-";
    const m = Math.floor(secs / 60);
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const stripHtml = (html) =>
    (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <IconMusicNote className="text-indigo-600" /> Encargos de arreglo
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Tabla de obras en &quot;Para arreglar&quot; o &quot;Entregado&quot;. Cargá el link de Drive, una observación opcional y pasá a Entregado.
            </p>
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <button
              type="button"
              onClick={() => openWorkFormModal()}
              className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm shrink-0"
            >
              <IconPlus size={16} />
              Nueva Obra
            </button>
            <IconFilter size={18} className="text-slate-400 shrink-0" />
            <select
              value={String(filterArregladorId)}
              onChange={(e) => setFilterArregladorId(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-indigo-500 min-w-0 max-w-[220px]"
              title="Filtrar por arreglador"
            >
              <option value="">Todos los arregladores</option>
              {arregladoresOptions.map((opt) => (
                <option key={opt.id} value={String(opt.id)}>
                  {opt.label}
                  {myCompositorId === opt.id ? " (vos)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white rounded-xl border border-slate-200 shadow-sm">
        {loading ? (
          <div className="p-20 text-center text-indigo-500 flex flex-col items-center gap-2">
            <IconLoader className="animate-spin" size={28} />
            <span>Cargando...</span>
          </div>
        ) : works.length === 0 ? (
          <div className="p-12 text-center text-slate-500 italic">
            No hay obras en &quot;Para arreglar&quot; ni &quot;Entregado&quot;.
          </div>
        ) : filteredWorks.length === 0 ? (
          <div className="p-12 text-center text-slate-500 italic">
            Ninguna obra para el arreglador seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-3 font-bold text-slate-600 uppercase text-xs">Obra / Compositor · Arreglador</th>
                  <th
                    className="text-left py-3 px-3 font-bold text-slate-600 uppercase text-xs cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => setSortFechaEsperada((s) => (s === "asc" ? "desc" : "asc"))}
                    title={sortFechaEsperada === "asc" ? "Ordenar por fecha (asc); clic para desc" : "Ordenar por fecha (desc); clic para asc"}
                  >
                    F. estimada entrega {sortFechaEsperada === "asc" ? "↑" : "↓"}
                  </th>
                  <th className="text-left py-3 px-3 font-bold text-slate-600 uppercase text-xs">Orgánico</th>
                  <th className="text-left py-3 px-3 font-bold text-slate-600 uppercase text-xs">Dificultad</th>
                  <th className="text-left py-3 px-3 font-bold text-slate-600 uppercase text-xs">Observación</th>
                  <th className="text-left py-3 px-3 font-bold text-slate-600 uppercase text-xs w-36 max-w-[10rem]">Link Drive</th>
                  <th className="text-left py-3 px-3 font-bold text-slate-600 uppercase text-xs">Nota entrega (opc.)</th>
                  <th className="text-left py-3 px-3 font-bold text-slate-600 uppercase text-xs min-w-[8rem]">Estado</th>
                  <th className="text-left py-3 px-3 font-bold text-slate-600 uppercase text-xs w-40">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWorks.map((work) => {
                  const draft = getDraft(work.id);
                  const linkValue = draft.link_drive !== undefined ? draft.link_drive : (work.link_drive || "");
                  const notaValue = draft.nota_entrega !== undefined ? draft.nota_entrega : "";
                  const isSaving = savingId === work.id;
                  const isParaArreglar = work.estado === "Para arreglar";
                  return (
                    <tr
                      key={work.id}
                      className={`hover:bg-slate-50/50 ${isParaArreglar ? "bg-amber-50/30" : "bg-sky-50/20"}`}
                    >
                      <td className="py-2 px-3 align-top">
                        {canEditFields && isParaArreglar ? (
                          <input
                            type="text"
                            value={(draft.titulo !== undefined ? draft.titulo : stripHtml(work.titulo || "")) || ""}
                            onChange={(e) => setDraftField(work.id, "titulo", e.target.value)}
                            onBlur={(e) => {
                              const v = e.target.value;
                              if (v !== stripHtml(work.titulo || "")) saveEditorField(work, "titulo", v);
                            }}
                            placeholder="Título"
                            className={`w-full text-sm font-bold border rounded px-2 py-1 ${getFieldStatusClass(fieldStatus[fieldStatusKey(work.id, "titulo")] || "idle")}`}
                          />
                        ) : (
                          <div className="font-bold text-slate-800 leading-tight">
                            <RichTextPreview content={work.titulo} />
                          </div>
                        )}
                        {work.compositor_full && (
                          <div className="text-xs text-slate-500 mt-0.5">{work.compositor_full}</div>
                        )}
                        {work.arreglador_label && (
                          <div className="text-xs text-slate-600 mt-0.5">
                            {work.arreglador_label}
                            {myCompositorId === work.id_integrante_arreglador && (
                              <span className="text-indigo-500 ml-1">(vos)</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 align-top text-xs whitespace-nowrap">
                        {canEditFields && isParaArreglar ? (
                          <input
                            type="date"
                            value={(draft.fecha_esperada !== undefined ? draft.fecha_esperada : work.fecha_esperada) || ""}
                            onChange={(e) => setDraftField(work.id, "fecha_esperada", e.target.value || "")}
                            onBlur={(e) => {
                              const v = e.target.value || "";
                              const current = work.fecha_esperada || "";
                              if (v !== current) saveEditorField(work, "fecha_esperada", v);
                            }}
                            className={`w-full min-w-[110px] text-xs border rounded px-2 py-1 ${getFieldStatusClass(fieldStatus[fieldStatusKey(work.id, "fecha_esperada")] || "idle")}`}
                          />
                        ) : (
                          <span className="text-slate-600">
                            {work.fecha_esperada
                              ? new Date(work.fecha_esperada + "T12:00:00").toLocaleDateString("es-AR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "-"}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 align-top">
                        {canEditFields && isParaArreglar ? (
                          <input
                            type="text"
                            value={(draft.instrumentacion !== undefined ? draft.instrumentacion : work.instrumentacion) || ""}
                            onChange={(e) => setDraftField(work.id, "instrumentacion", e.target.value)}
                            onBlur={(e) => {
                              const v = e.target.value;
                              if (v !== (work.instrumentacion || "")) saveEditorField(work, "instrumentacion", v);
                            }}
                            placeholder="Orgánico"
                            className={`w-full min-w-[100px] font-mono text-xs border rounded px-2 py-1 ${getFieldStatusClass(fieldStatus[fieldStatusKey(work.id, "instrumentacion")] || "idle")}`}
                          />
                        ) : (
                          <span className="font-mono text-xs text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            {work.instrumentacion || "-"}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 align-top text-xs">
                        {canEditFields && isParaArreglar ? (
                          <input
                            type="text"
                            value={(draft.dificultad !== undefined ? draft.dificultad : work.dificultad) || ""}
                            onChange={(e) => setDraftField(work.id, "dificultad", e.target.value)}
                            onBlur={(e) => {
                              const v = e.target.value;
                              if (v !== (work.dificultad || "")) saveEditorField(work, "dificultad", v);
                            }}
                            placeholder="Dificultad"
                            className={`w-full min-w-[80px] border rounded px-2 py-1 ${getFieldStatusClass(fieldStatus[fieldStatusKey(work.id, "dificultad")] || "idle")}`}
                          />
                        ) : (
                          <span className="text-slate-600">{work.dificultad || "-"}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 align-top text-xs max-w-[180px]">
                        {canEditFields && isParaArreglar ? (
                          <textarea
                            rows={2}
                            value={(draft.observaciones !== undefined ? draft.observaciones : stripHtml(work.observaciones || "")) || ""}
                            onChange={(e) => setDraftField(work.id, "observaciones", e.target.value)}
                            onBlur={(e) => {
                              const v = e.target.value;
                              if (v !== stripHtml(work.observaciones || "")) saveEditorField(work, "observaciones", v);
                            }}
                            placeholder="Observación"
                            className={`w-full min-w-[120px] border rounded px-2 py-1 resize-y ${getFieldStatusClass(fieldStatus[fieldStatusKey(work.id, "observaciones")] || "idle")}`}
                          />
                        ) : (
                          <div className="text-slate-600 line-clamp-3" title={stripHtml(work.observaciones)}>
                            {stripHtml(work.observaciones) || "-"}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 align-top w-36 max-w-[10rem]">
                        {isParaArreglar ? (
                          <div className="flex flex-col gap-1 min-w-0">
                            <input
                              type="url"
                              value={linkValue}
                              onChange={(e) => setDraftField(work.id, "link_drive", e.target.value)}
                              placeholder="Pegar URL..."
                              className="w-full min-w-0 text-xs border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {work.link_drive && (
                              <a
                                href={work.link_drive}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-green-600 hover:underline flex items-center gap-1"
                              >
                                <IconDrive size={12} /> Abrir actual
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            {work.link_drive ? (
                              <a
                                href={work.link_drive}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:bg-green-50 rounded p-1"
                                title="Abrir carpeta"
                              >
                                <IconDrive size={18} />
                              </a>
                            ) : "-"}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 align-top">
                        {isParaArreglar ? (
                          <input
                            type="text"
                            value={notaValue}
                            onChange={(e) => setDraftField(work.id, "nota_entrega", e.target.value)}
                            placeholder="Opcional"
                            className="w-full min-w-[140px] text-xs border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 align-top min-w-[8rem]">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            work.estado === "Para arreglar"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-sky-100 text-sky-800 border-sky-200"
                          }`}
                        >
                          {work.estado}
                        </span>
                      </td>
                      <td className="py-2 px-3 align-top">
                        {isParaArreglar ? (
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => saveLinkDrive(work)}
                              disabled={isSaving || !linkValue.trim()}
                              className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                            >
                              {isSaving ? <IconLoader size={12} className="animate-spin inline" /> : "Guardar link"}
                            </button>
                            <button
                              type="button"
                              onClick={() => pasarAEntregado(work)}
                              disabled={isSaving || !linkValue.trim()}
                              className="text-[10px] font-bold px-2 py-1 rounded bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 flex items-center gap-1"
                            >
                              {isSaving ? <IconLoader size={12} className="animate-spin" /> : <IconCheck size={12} />}
                              Entregado
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openWorkFormModal(work.id)}
                            className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center gap-1"
                          >
                            <IconEdit size={12} />
                            Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="shrink-0 flex justify-end">
        <button
          type="button"
          onClick={() => goToRepertoire()}
          className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          <IconExternalLink size={16} />
          Ir al Archivo de Obras
        </button>
      </div>

      {/* Modal WorkForm por encima de la vista de arreglador */}
      {workFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="relative w-full max-w-4xl my-8 bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between shrink-0 px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <h3 className="text-sm font-bold text-slate-700">
                {workFormInitialData?.id ? "Editar obra" : "Nueva obra"}
              </h3>
              <button
                type="button"
                onClick={closeWorkFormModal}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                <IconX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <WorkForm
                key={`workform-${workFormInitialData?.id ?? "new"}`}
                supabase={sb}
                formData={workFormInitialData}
                setFormData={(fn) => {
                  if (typeof fn === "function") setWorkFormInitialData((prev) => fn(prev));
                }}
                onSave={handleSaveWorkForm}
                onCancel={closeWorkFormModal}
                isNew={!workFormInitialData?.id}
                catalogoInstrumentos={catalogoInstrumentos || []}
                context="archive"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
