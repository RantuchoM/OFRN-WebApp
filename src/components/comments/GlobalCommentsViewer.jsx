import React, { useState, useEffect } from "react";
import {
  IconCheckCircle,
  IconX,
  IconLoader,
  IconAlertCircle,
  IconArrowRight,
  IconArchive,
  IconClock,
  IconEdit,
  IconSend,
  IconAtSign,
  IconLink,
  IconBed,
  IconMusic,
  IconCalendar,
} from "../ui/Icons";
import { format, isBefore, isToday, addDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "../../context/AuthContext";

// --- COMPONENTE DE ITEM GLOBAL ---
const GlobalCommentItem = ({
  comment,
  user,
  onReply,
  onResolve,
  onDelete,
  onUpdateDate,
  onNavigate,
  editingDateId,
  setEditingDateId,
  isGlobalView,
}) => {
  const isMine = comment.id_autor === user.id;
  const isMentioned = comment.etiquetados?.includes(user.id);
  const [tempDate, setTempDate] = useState(
    comment.fecha_limite ? comment.fecha_limite.split("T")[0] : ""
  );

  useEffect(() => {
    setTempDate(comment.fecha_limite ? comment.fecha_limite.split("T")[0] : "");
  }, [comment.fecha_limite]);

  const handleSaveDate = () => {
    onUpdateDate(comment.id, tempDate);
    setEditingDateId(null);
  };
  const handleClearDate = () => {
    onUpdateDate(comment.id, null);
    setEditingDateId(null);
  };

  const getContextIcon = (type) => {
    if (type === "EVENTO") return <IconCalendar size={14} />;
    if (type === "OBRA") return <IconMusic size={14} />;
    if (type === "HABITACION") return <IconBed size={14} />;
    return <IconLink size={14} />;
  };

  // LÓGICA DE NAVEGACIÓN
  const handleNavigate = () => {
    if (!onNavigate) return;

    let targetView = "AGENDA";
    if (comment.entidad_tipo === "OBRA") targetView = "REPERTOIRE";
    if (comment.entidad_tipo === "HABITACION") targetView = "LOGISTICS";
    if (comment.entidad_tipo === "GIRA") targetView = "AGENDA";

    // Usamos el ID de gira enriquecido si existe, o el ID de la entidad si es tipo GIRA
    const targetGiraId =
      comment.gira_id ||
      (comment.entidad_tipo === "GIRA" ? comment.entidad_id : null);

    if (targetGiraId) {
      onNavigate(targetGiraId, targetView);
    } else {
      alert("No se pudo determinar la gira asociada.");
    }
  };

  let deadlineClass = "bg-slate-100 text-slate-500 border-slate-200";
  if (comment.fecha_limite && !comment.resuelto) {
    const d = parseISO(comment.fecha_limite);
    const now = new Date();
    if (isBefore(d, new Date(now.setHours(0, 0, 0, 0))))
      deadlineClass = "bg-red-100 text-red-600 border-red-200 font-bold";
    else if (isToday(d))
      deadlineClass =
        "bg-orange-100 text-orange-600 border-orange-200 font-bold";
    else if (isBefore(d, addDays(now, 3)))
      deadlineClass = "bg-amber-100 text-amber-600 border-amber-200";
    else deadlineClass = "bg-indigo-50 text-indigo-600 border-indigo-200";
  }

  return (
    <div
      className={`bg-white p-4 rounded-lg border shadow-sm flex flex-col gap-2 transition-all hover:shadow-md ${
        comment.resuelto
          ? "opacity-60 bg-slate-50"
          : isMentioned
          ? "border-l-4 border-l-indigo-500 ring-1 ring-indigo-50"
          : "border-slate-200"
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1 max-w-[75%]">
          {/* BREADCRUMB DE CONTEXTO */}
          <div className="flex items-center gap-2 flex-wrap text-[10px] uppercase font-bold text-slate-400">
            {isGlobalView && comment.nombre_gira ? (
              <>
                <span className="text-indigo-600 bg-indigo-50 px-1.5 rounded">
                  {comment.nombre_gira}
                </span>
                {comment.nomenclador && (
                  <span className="text-slate-500 hidden sm:inline">
                    {comment.nomenclador}
                  </span>
                )}
                <span>•</span>
              </>
            ) : null}
            <span>{comment.entidad_tipo}</span>
          </div>

          <span
            className="text-sm font-bold text-slate-800 truncate"
            title={comment.contexto || "General"}
          >
            {comment.contexto || "General"}
          </span>
        </div>

        <div className="flex gap-1 shrink-0">
          {onNavigate && (
            <button
              onClick={handleNavigate}
              className="p-1.5 rounded bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-transparent hover:border-indigo-100 transition-all mr-1"
              title="Ir al detalle"
            >
              {getContextIcon(comment.entidad_tipo)}
            </button>
          )}

          {!comment.resuelto && (
            <button
              onClick={() => onReply(comment)}
              className="p-1.5 rounded hover:bg-indigo-50 text-indigo-500"
              title="Responder"
            >
              <IconArrowRight size={16} />
            </button>
          )}
          <button
            onClick={() => onResolve(comment)}
            className={`p-1.5 rounded hover:bg-emerald-50 ${
              comment.resuelto
                ? "text-emerald-600"
                : "text-slate-300 hover:text-emerald-600"
            }`}
            title={comment.resuelto ? "Reabrir" : "Resolver"}
          >
            <IconCheckCircle size={16} />
          </button>
          {(isMine || user.rol_sistema === "admin") && (
            <button
              onClick={() => onDelete(comment.id)}
              className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50"
              title="Archivar"
            >
              <IconArchive size={16} />
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-600 whitespace-pre-wrap ml-1">
        {comment.contenido}
      </p>

      <div className="mt-1 flex flex-wrap justify-between items-center gap-2 border-t border-slate-50 pt-2">
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px]">
              {comment.integrantes?.nombre?.[0]}
              {comment.integrantes?.apellido?.[0]}
            </div>
            {comment.integrantes?.nombre} {comment.integrantes?.apellido}
          </div>
          <span className="text-[10px] text-slate-300">
            •{" "}
            {format(new Date(comment.created_at), "dd/MM HH:mm", {
              locale: es,
            })}
          </span>

          {!comment.resuelto && (
            <div className="flex items-center group/date ml-2">
              {editingDateId === comment.id ? (
                <div className="flex items-center gap-1 bg-white border border-indigo-300 rounded px-1 shadow-sm z-10">
                  <input
                    type="date"
                    className="text-[10px] py-0.5 bg-transparent outline-none w-24"
                    value={tempDate}
                    onChange={(e) => setTempDate(e.target.value)}
                    onBlur={handleSaveDate}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveDate()}
                    autoFocus
                  />
                  <button
                    onMouseDown={handleClearDate}
                    className="text-red-400 hover:text-red-600 p-0.5 hover:bg-red-50 rounded"
                  >
                    <IconX size={12} />
                  </button>
                </div>
              ) : (
                <div
                  className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 cursor-pointer hover:shadow-sm ${deadlineClass}`}
                  onClick={() => {
                    if (isMine || user.rol_sistema === "admin")
                      setEditingDateId(comment.id);
                  }}
                  title="Clic para editar fecha"
                >
                  <IconClock size={10} />
                  {comment.fecha_limite
                    ? `Vence: ${format(
                        parseISO(comment.fecha_limite),
                        "dd/MM"
                      )}`
                    : "Fecha límite"}
                  {(isMine || user.rol_sistema === "admin") && (
                    <IconEdit
                      size={8}
                      className="opacity-0 group-hover/date:opacity-50 ml-1"
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {isMentioned && (
          <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <IconAtSign size={10} /> Para mí
          </span>
        )}
      </div>
    </div>
  );
};

export default function GlobalCommentsViewer({
  supabase,
  giraId = null,
  onClose,
  onNavigate,
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [filteredComments, setFilteredComments] = useState([]);
  const [loading, setLoading] = useState(false);

  // FILTROS
  const [filterMentioned, setFilterMentioned] = useState(false);

  const [replyingTo, setReplyingTo] = useState(null);
  const [newResponse, setNewResponse] = useState("");
  const [sending, setSending] = useState(false);
  const [editingDateId, setEditingDateId] = useState(null);
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    fetchGlobalComments();
    fetchUsers();
  }, [giraId]);

  useEffect(() => {
    if (!filterMentioned) {
      setFilteredComments(comments);
    } else {
      setFilteredComments(
        comments.filter((c) => c.etiquetados?.includes(user.id))
      );
    }
  }, [filterMentioned, comments, user.id]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("integrantes")
      .select("id, nombre, apellido, rol_sistema")
      .order("nombre");
    if (data) setUsersList(data);
  };

  const fetchGlobalComments = async () => {
    setLoading(true);
    try {
      // 1. Fetch Comentarios Básicos
      let query = supabase
        .from("sistema_comentarios")
        .select("*, integrantes(nombre, apellido)")
        .eq("resuelto", false)
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      const { data: allComments } = await query;
      let enrichedComments = allComments || [];

      // 2. ENRIQUECIMIENTO DE DATOS
      if (giraId) {
        // MODO GIRA ESPECIFICA
        const contextMap = await buildContextMapForGira(giraId);
        enrichedComments = enrichedComments.filter((c) => {
          if (c.entidad_tipo === "GIRA" && c.entidad_id === giraId.toString()) {
            c.contexto = "General de Gira";
            return true;
          }
          const key = `${c.entidad_tipo}_${c.entidad_id}`;
          if (contextMap[key]) {
            c.contexto = contextMap[key];
            return true;
          }
          return false;
        });
      } else {
        // MODO GLOBAL: Recolectar IDs y hacer Fetch Bulk
        const eventIds = enrichedComments
          .filter((c) => c.entidad_tipo === "EVENTO")
          .map((c) => c.entidad_id);
        const workIds = enrichedComments
          .filter((c) => c.entidad_tipo === "OBRA")
          .map((c) => c.entidad_id);
        const roomIds = enrichedComments
          .filter((c) => c.entidad_tipo === "HABITACION")
          .map((c) => c.entidad_id);

        // A. PROGRAMAS (Base)
        const { data: progs } = await supabase
          .from("programas")
          .select("id, nombre_gira, nomenclador, mes_letra");
        const progMap = {};
        progs?.forEach((p) => (progMap[p.id] = p));

        // B. DETALLES DE ENTIDADES RELACIONADAS
        const contextMap = {}; // Key: "TIPO_ID" => { contexto, gira_id }

        // -- Eventos
        if (eventIds.length > 0) {
          const { data: evs } = await supabase
            .from("eventos")
            .select("id, descripcion, fecha, id_gira")
            .in("id", eventIds);
          evs?.forEach((e) => {
            contextMap[`EVENTO_${e.id}`] = {
              contexto: `${e.descripcion} (${format(
                new Date(e.fecha),
                "dd/MM"
              )})`,
              gira_id: e.id_gira,
            };
          });
        }

        if (workIds.length > 0) {
          const { data: reps } = await supabase
            .from("programas_repertorios")
            .select(
              `
                            id, 
                            id_programa, 
                            repertorio_obras (
                                obras (
                                    titulo,
                                    obras_compositores (
                                        compositores ( nombre, apellido )
                                    )
                                )
                            )
                        `
            )
            .in("id", workIds);

          reps?.forEach((r) => {
            let titulo = "Obra";
            let autor = "";

            // 1. Acceder a la obra (defensivo)
            const ro = r.repertorio_obras;
            let obraData = null;
            if (Array.isArray(ro)) obraData = ro[0]?.obras;
            else if (ro && ro.obras) obraData = ro.obras;

            if (obraData) {
              titulo = obraData.titulo || "Obra";

              // 2. Acceder al compositor a través de la tabla intermedia
              // obras_compositores es un array de relaciones
              const relaciones = obraData.obras_compositores;

              if (Array.isArray(relaciones) && relaciones.length > 0) {
                // Tomamos el primer compositor encontrado
                const comp = relaciones[0]?.compositores;
                if (comp && comp.apellido) {
                  autor = `${comp.apellido}, ${comp.nombre}`;
                }
              }
            }

            const label = autor ? `${titulo} - ${autor}` : titulo;
            contextMap[`OBRA_${r.id}`] = {
              contexto: `Obra: ${label}`,
              gira_id: r.id_programa,
            };
          });
        }

        // -- Habitaciones
        if (roomIds.length > 0) {
          const { data: rooms } = await supabase
            .from("hospedaje_habitaciones")
            .select(
              "id, orden, programas_hospedajes(id_programa, hoteles(nombre))"
            )
            .in("id", roomIds);
          rooms?.forEach((r) => {
            contextMap[`HABITACION_${r.id}`] = {
              contexto: `Hab. ${r.orden} (${r.programas_hospedajes?.hoteles?.nombre})`,
              gira_id: r.programas_hospedajes?.id_programa,
            };
          });
        }

        // C. UNIFICAR
        enrichedComments = enrichedComments.map((c) => {
          let info = {
            contexto: `${c.entidad_tipo} #${c.entidad_id}`,
            gira_id: null,
          };

          if (c.entidad_tipo === "GIRA") {
            info.gira_id = parseInt(c.entidad_id);
            info.contexto = "General";
          } else {
            const key = `${c.entidad_tipo}_${c.entidad_id}`;
            if (contextMap[key]) info = contextMap[key];
          }

          // Enriquecer con datos de la Gira Padre
          const progData = progMap[info.gira_id];

          return {
            ...c,
            contexto: info.contexto,
            gira_id: info.gira_id,
            nombre_gira: progData
              ? progData.nombre_gira
              : info.gira_id
              ? `Gira #${info.gira_id}`
              : "Sin Asignar",
            nomenclador: progData
              ? `${progData.mes_letra} | ${progData.nomenclador}`
              : "",
          };
        });
      }

      setComments(enrichedComments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const buildContextMapForGira = async (targetId) => {
    const map = {};
    const { data: evs } = await supabase
      .from("eventos")
      .select("id, descripcion, fecha")
      .eq("id_gira", targetId);
    evs?.forEach((e) => {
      map[`EVENTO_${e.id}`] = `${e.descripcion} (${format(
        new Date(e.fecha),
        "dd/MM"
      )})`;
    });

    // CORREGIDO: Lógica de Obras con Compositor
    // CORREGIDO: Lógica de Obras con Compositor (Relación N:M)
    const { data: reps } = await supabase
      .from("programas_repertorios")
      .select(
        `
                id, 
                repertorio_obras (
                    obras (
                        titulo, 
                        obras_compositores (
                            compositores ( nombre, apellido )
                        )
                    )
                )
            `
      )
      .eq("id_programa", targetId);

    reps?.forEach((r) => {
      let titulo = "Obra";
      let autor = "";

      const ro = r.repertorio_obras;
      let obraData = null;

      if (Array.isArray(ro)) obraData = ro[0]?.obras;
      else if (ro?.obras) obraData = ro.obras;

      if (obraData) {
        titulo = obraData.titulo || "Obra";

        // Extracción desde tabla intermedia
        const relaciones = obraData.obras_compositores;
        if (Array.isArray(relaciones) && relaciones.length > 0) {
          const comp = relaciones[0]?.compositores;
          if (comp && comp.apellido) {
            autor = `${comp.apellido}, ${comp.nombre}`;
          }
        }
      }

      const label = autor ? `${titulo} - ${autor}` : titulo;
      map[`OBRA_${r.id}`] = `Obra: ${label}`;
    });
    const { data: hosp } = await supabase
      .from("programas_hospedajes")
      .select("id, hoteles(nombre), hospedaje_habitaciones(id, orden)")
      .eq("id_programa", targetId);
    hosp?.forEach((h) => {
      h.hospedaje_habitaciones?.forEach((room) => {
        map[
          `HABITACION_${room.id}`
        ] = `Hab. ${room.orden} (${h.hoteles?.nombre})`;
      });
    });
    return map;
  };

  // ... (Handlers restantes sin cambios)
  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!newResponse.trim() || !replyingTo) return;
    setSending(true);
    const taggedIds = usersList
      .filter((u) => newResponse.includes(`@${u.nombre}${u.apellido}`))
      .map((u) => u.id);
    const payload = {
      entidad_tipo: replyingTo.entidad_tipo,
      entidad_id: replyingTo.entidad_id,
      id_autor: user.id,
      contenido: newResponse,
      etiquetados: taggedIds,
      parent_id: replyingTo.id,
    };
    await supabase.from("sistema_comentarios").insert([payload]);
    setNewResponse("");
    setReplyingTo(null);
    fetchGlobalComments();
    setSending(false);
  };

  const handleResolve = async (comment) => {
    const idsToUpdate = [comment.id];
    const { data: children } = await supabase
      .from("sistema_comentarios")
      .select("id")
      .eq("parent_id", comment.id);
    children?.forEach((c) => idsToUpdate.push(c.id));
    await supabase
      .from("sistema_comentarios")
      .update({ resuelto: true, fecha_resolucion: new Date().toISOString() })
      .in("id", idsToUpdate);
    fetchGlobalComments();
  };

  const handleArchive = async (id) => {
    if (!confirm("¿Archivar?")) return;
    await supabase
      .from("sistema_comentarios")
      .update({ deleted: true })
      .eq("id", id);
    fetchGlobalComments();
  };

  const handleUpdateDate = async (id, date) => {
    await supabase
      .from("sistema_comentarios")
      .update({ fecha_limite: date || null })
      .eq("id", id);
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, fecha_limite: date } : c))
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-full text-amber-600">
              <IconAlertCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">
                {giraId ? "Pendientes de Gira" : "Gestor General de Pendientes"}
              </h3>
              <p className="text-xs text-slate-500">
                {filteredComments.length} tareas activas{" "}
                {filterMentioned ? "(Filtrado: Mis menciones)" : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterMentioned(!filterMentioned)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                filterMentioned
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <IconAtSign size={14} />{" "}
              {filterMentioned ? "Viendo Menciones" : "Solo menciones"}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <IconX size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
          {loading && (
            <div className="text-center py-10">
              <IconLoader className="animate-spin inline text-indigo-500" />
            </div>
          )}
          {!loading && filteredComments.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
              <IconCheckCircle size={64} className="text-emerald-200 mb-4" />
              <p className="font-medium">¡Todo al día!</p>
              <p className="text-sm">
                No hay pendientes con los filtros actuales.
              </p>
            </div>
          )}

          {filteredComments.map((c) => (
            <GlobalCommentItem
              key={c.id}
              comment={c}
              user={user}
              onReply={setReplyingTo}
              onResolve={handleResolve}
              onDelete={handleArchive}
              onUpdateDate={handleUpdateDate}
              onNavigate={onNavigate}
              editingDateId={editingDateId}
              setEditingDateId={setEditingDateId}
              isGlobalView={!giraId}
            />
          ))}
        </div>

        {replyingTo && (
          <div className="p-4 bg-white border-t border-slate-200 shadow-lg animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center mb-2 text-xs text-indigo-600">
              <span>
                Respondiendo a: <b>{replyingTo.contexto || "Comentario"}</b>
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-slate-400 hover:text-red-500"
              >
                <IconX size={16} />
              </button>
            </div>
            <form onSubmit={handleReplySubmit} className="flex gap-2">
              <input
                autoFocus
                type="text"
                className="flex-1 border p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Escribe tu respuesta..."
                value={newResponse}
                onChange={(e) => setNewResponse(e.target.value)}
              />
              <button
                disabled={sending}
                className="bg-indigo-600 text-white px-4 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                {sending ? (
                  <IconLoader className="animate-spin" />
                ) : (
                  <IconSend />
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
