import React, { useState, useEffect, useRef } from "react";
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
  IconUser,
  IconEye,
  IconEyeOff,
  IconMessageCircle,
} from "../ui/Icons";
import { format, isBefore, isToday, addDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "../../context/AuthContext";

// --- HELPER PARA NORMALIZAR IDs ---
const normalizeId = (id) => {
  if (id === null || id === undefined) return "";
  return String(id).trim();
};

const getThreadKey = (tipo, id) => {
  return `${tipo}_${normalizeId(id)}`;
};

// --- COMPONENTE DE AVATAR ---
const UserAvatar = ({ user, size = "sm", onClick }) => {
  if (!user)
    return (
      <div
        className={`rounded-full bg-slate-200 flex items-center justify-center ${size === "sm" ? "w-6 h-6" : "w-8 h-8"}`}
      >
        <IconUser size={size === "sm" ? 14 : 16} className="text-slate-400" />
      </div>
    );

  const initials =
    `${user.nombre?.[0] || ""}${user.apellido?.[0] || ""}`.toUpperCase();
  const bgColor = user.avatar_color || "#6366f1";
  const hasImage = !!user.avatar_url;

  return (
    <div
      onClick={(e) => {
        if (hasImage && onClick) {
          e.stopPropagation();
          onClick(user.avatar_url);
        }
      }}
      className={`rounded-full flex items-center justify-center text-white font-bold shrink-0 overflow-hidden border border-white shadow-sm transition-transform hover:scale-105 
          ${size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-xs"}
          ${hasImage ? "cursor-zoom-in" : "cursor-default"}
      `}
      style={{ backgroundColor: hasImage ? "transparent" : bgColor }}
      title={hasImage ? "Clic para ampliar" : ""}
    >
      {hasImage ? (
        <img
          src={user.avatar_url}
          alt={initials}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

// --- NUEVO COMPONENTE RECURSIVO PARA MENSAJES (Tree Node) ---
const MessageNode = ({
  msg,
  user,
  lastReadAt,
  onDelete,
  onPreviewImage,
  isChild = false,
}) => {
  const isMine = msg.id_autor === user.id;
  const isMsgUnread = new Date(msg.created_at) > lastReadAt;

  return (
    <div
      className={`flex flex-col ${isChild ? "ml-6 mt-1 pl-3 border-l-2 border-slate-100" : "mt-2"}`}
    >
      <div
        className={`flex gap-3 group/msg transition-colors rounded p-2 -mx-1 ${isMsgUnread ? "bg-blue-50/50" : ""}`}
      >
        {/* AVATAR */}
        <div className="mt-0.5">
          <UserAvatar
            user={msg.integrantes}
            size={isChild ? "sm" : "sm"} // Siempre sm en lista compacta
            onClick={onPreviewImage}
          />
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 flex flex-col gap-0.5 min-w-0">
          <div className="flex justify-between items-baseline">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs font-bold ${isMine ? "text-indigo-700" : "text-slate-700"}`}
              >
                {msg.integrantes?.nombre} {msg.integrantes?.apellido}
              </span>
              <span className="text-[10px] text-slate-400">
                {format(new Date(msg.created_at), "dd/MM HH:mm", {
                  locale: es,
                })}
              </span>
              {isMsgUnread && (
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0"></span>
              )}
            </div>

            {(isMine || user.rol_sistema === "admin") && (
              <button
                onClick={() => onDelete(msg.id)}
                className="opacity-0 group-hover/msg:opacity-100 text-slate-300 hover:text-red-400 transition-opacity p-1"
                title="Eliminar mensaje"
              >
                <IconArchive size={12} />
              </button>
            )}
          </div>

          <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">
            {msg.contenido}
          </p>
        </div>
      </div>

      {/* RECURSIVIDAD: Renderizar hijos si existen */}
      {msg.children && msg.children.length > 0 && (
        <div className="flex flex-col">
          {msg.children.map((child) => (
            <MessageNode
              key={child.id}
              msg={child}
              user={user}
              lastReadAt={lastReadAt}
              onDelete={onDelete}
              onPreviewImage={onPreviewImage}
              isChild={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE DE HILO (CONTENEDOR DE CONTEXTO) ---
const GlobalThreadItem = ({
  thread,
  user,
  onReply,
  onResolve,
  onDelete,
  onUpdateDate,
  onNavigate,
  onMarkRead,
  onMarkUnread,
  editingDateId,
  setEditingDateId,
  isGlobalView,
  lastReadMap,
  onPreviewImage,
}) => {
  const contextData = thread.contextData;
  const messages = thread.messages; // Lista plana original

  // Encontrar el último mensaje real para la fecha límite
  const lastMessage = messages[messages.length - 1];

  const threadKey = getThreadKey(
    contextData.entidad_tipo,
    contextData.entidad_id,
  );

  const lastReadAt = lastReadMap[threadKey]
    ? new Date(lastReadMap[threadKey])
    : new Date(0);

  const hasUnreadMessages = messages.some(
    (m) => new Date(m.created_at) > lastReadAt,
  );

  const isMentionedInThread = messages.some((m) =>
    m.etiquetados?.includes(user.id),
  );

  // --- LÓGICA DE ÁRBOL ---
  // Convertimos la lista plana 'messages' en un árbol basado en parent_id
  const rootMessages = React.useMemo(() => {
    const map = {};
    const roots = [];
    // 1. Inicializar mapa
    messages.forEach((m) => {
      map[m.id] = { ...m, children: [] };
    });
    // 2. Conectar padres e hijos
    messages.forEach((m) => {
      if (m.parent_id && map[m.parent_id]) {
        map[m.parent_id].children.push(map[m.id]);
      } else {
        roots.push(map[m.id]);
      }
    });
    // 3. Retornar raíces (ordenadas por fecha si es necesario, aunque ya vienen ordenadas del query)
    return roots;
  }, [messages]);

  const [tempDate, setTempDate] = useState(
    lastMessage.fecha_limite ? lastMessage.fecha_limite.split("T")[0] : "",
  );

  useEffect(() => {
    setTempDate(
      lastMessage.fecha_limite ? lastMessage.fecha_limite.split("T")[0] : "",
    );
  }, [lastMessage.fecha_limite]);

  const handleSaveDate = () => {
    onUpdateDate(lastMessage.id, tempDate);
    setEditingDateId(null);
  };

  const handleClearDate = () => {
    onUpdateDate(lastMessage.id, null);
    setEditingDateId(null);
  };

  const getContextIcon = (type) => {
    if (type === "EVENTO") return <IconCalendar size={14} />;
    if (type === "OBRA") return <IconMusic size={14} />;
    if (type === "HABITACION") return <IconBed size={14} />;
    return <IconLink size={14} />;
  };

  const handleNavigate = () => {
    if (!onNavigate) return;
    if (hasUnreadMessages) onMarkRead(thread);

    let targetView = "AGENDA";
    if (contextData.entidad_tipo === "OBRA") targetView = "REPERTOIRE";
    if (contextData.entidad_tipo === "HABITACION") targetView = "LOGISTICS";
    if (contextData.entidad_tipo === "GIRA") targetView = "AGENDA";

    const targetGiraId =
      contextData.gira_id ||
      (contextData.entidad_tipo === "GIRA" ? contextData.entidad_id : null);

    if (targetGiraId) {
      onNavigate(targetGiraId, targetView);
    } else {
      alert("No se pudo determinar la gira asociada.");
    }
  };

  let deadlineClass = "bg-slate-100 text-slate-500 border-slate-200";
  if (lastMessage.fecha_limite && !lastMessage.resuelto) {
    const d = parseISO(lastMessage.fecha_limite);
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
      className={`bg-white rounded-lg border shadow-sm flex flex-col transition-all hover:shadow-md relative ${
        hasUnreadMessages
          ? "border-l-4 border-l-blue-500 ring-1 ring-blue-50"
          : isMentionedInThread
            ? "border-l-4 border-l-indigo-300"
            : "border-slate-200"
      }`}
    >
      {hasUnreadMessages && (
        <span className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm z-10 animate-pulse"></span>
      )}

      {/* HEADER CONTEXTO */}
      <div
        className={`p-3 border-b border-slate-100 flex justify-between items-start rounded-t-lg ${
          hasUnreadMessages ? "bg-blue-50/30" : "bg-slate-50/50"
        }`}
      >
        <div className="flex flex-col gap-1 max-w-[70%]">
          <div className="flex items-center gap-2 flex-wrap text-[10px] uppercase font-bold text-slate-400">
            {isGlobalView && contextData.nombre_gira ? (
              <>
                <span className="text-indigo-600 bg-indigo-50 px-1.5 rounded">
                  {contextData.nombre_gira}
                </span>
                {contextData.nomenclador && (
                  <span className="text-slate-500 hidden sm:inline">
                    {contextData.nomenclador}
                  </span>
                )}
                <span>•</span>
              </>
            ) : null}
            <span>{contextData.entidad_tipo}</span>
          </div>
          <span
            className={`text-sm truncate ${
              hasUnreadMessages
                ? "font-black text-slate-900"
                : "font-bold text-slate-700"
            }`}
            title={contextData.contexto || "General"}
          >
            {contextData.contexto || "General"}
          </span>
        </div>

        <div className="flex gap-1 shrink-0">
          {hasUnreadMessages ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(thread);
              }}
              className="p-1.5 rounded bg-white text-blue-500 hover:bg-blue-100 border border-blue-100 transition-all mr-1"
              title="Marcar como Leído"
            >
              <IconEye size={16} />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkUnread(thread);
              }}
              className="p-1.5 rounded text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all mr-1"
              title="Marcar como No Leído"
            >
              <IconEyeOff size={16} />
            </button>
          )}

          {onNavigate && (
            <button
              onClick={handleNavigate}
              className="p-1.5 rounded bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-transparent hover:border-indigo-100 transition-all mr-1"
              title="Ir al detalle"
            >
              {getContextIcon(contextData.entidad_tipo)}
            </button>
          )}

          <button
            onClick={() => onReply(thread)}
            className="p-1.5 rounded hover:bg-indigo-50 text-indigo-500"
            title="Responder al hilo"
          >
            <IconArrowRight size={16} />
          </button>

          <button
            onClick={() => onResolve(thread)}
            className="p-1.5 rounded hover:bg-emerald-50 text-slate-300 hover:text-emerald-600"
            title="Resolver Hilo Completo"
          >
            <IconCheckCircle size={16} />
          </button>
        </div>
      </div>

      {/* BODY: RENDERIZADO DE ÁRBOL DE MENSAJES */}
      <div className="p-3 flex flex-col pb-1">
        {rootMessages.length === 0 && (
          <p className="text-xs text-slate-400 italic">Hilo vacío</p>
        )}
        {rootMessages.map((msgNode) => (
          <MessageNode
            key={msgNode.id}
            msg={msgNode}
            user={user}
            lastReadAt={lastReadAt}
            onDelete={onDelete}
            onPreviewImage={onPreviewImage}
            isChild={false} // Raíz
          />
        ))}
      </div>

      {/* FOOTER */}
      <div className="px-3 py-2 border-t border-slate-50 flex justify-between items-center bg-slate-50/30 rounded-b-lg">
        <div className="flex items-center gap-2">
          <div className="flex items-center group/date">
            {editingDateId === thread.key ? (
              <div className="flex items-center gap-1 bg-white border border-indigo-300 rounded px-1 shadow-sm z-10 animate-in zoom-in-95">
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
                className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 cursor-pointer hover:shadow-sm transition-colors ${deadlineClass}`}
                onClick={() => {
                  if (
                    messages.some((m) => m.id_autor === user.id) ||
                    user.rol_sistema === "admin"
                  )
                    setEditingDateId(thread.key);
                }}
                title="Clic para editar fecha límite del hilo"
              >
                <IconClock size={10} />
                {lastMessage.fecha_limite
                  ? `Vence: ${format(
                      parseISO(lastMessage.fecha_limite),
                      "dd/MM",
                    )}`
                  : "Fecha límite"}
                {(messages.some((m) => m.id_autor === user.id) ||
                  user.rol_sistema === "admin") && (
                  <IconEdit
                    size={8}
                    className="opacity-0 group-hover/date:opacity-50 ml-1"
                  />
                )}
              </div>
            )}
          </div>
        </div>
        {isMentionedInThread && (
          <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <IconAtSign size={10} /> Para mí
          </span>
        )}
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL (VIEWER) ---
export default function GlobalCommentsViewer({
  supabase,
  giraId = null,
  onClose,
  onNavigate,
  onCountsChange,
}) {
  const { user } = useAuth();

  const [threads, setThreads] = useState([]);
  const [filteredThreads, setFilteredThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastReadMap, setLastReadMap] = useState({});

  const [filterMentioned, setFilterMentioned] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);

  const [replyingThread, setReplyingThread] = useState(null);
  const [newResponse, setNewResponse] = useState("");
  const [sending, setSending] = useState(false);
  const [editingDateId, setEditingDateId] = useState(null);
  const [usersList, setUsersList] = useState([]);

  // Visor de imagen
  const [previewImage, setPreviewImage] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);

  const [mentionQuery, setMentionQuery] = useState(null);
  const [showMentions, setShowMentions] = useState(false);
  const replyInputRef = useRef(null);

  const [counts, setCounts] = useState({ total: 0, mentioned: 0 });

  useEffect(() => {
    fetchGlobalComments();
    fetchUsers();
  }, [giraId]);

  useEffect(() => {
    let result = threads;
    if (filterMentioned) {
      result = result.filter((t) =>
        t.messages.some((m) => m.etiquetados?.includes(user.id)),
      );
    }
    if (filterUnread) {
      result = result.filter((t) => {
        const key = t.key;
        const lastRead = lastReadMap[key]
          ? new Date(lastReadMap[key])
          : new Date(0);
        return t.messages.some((m) => new Date(m.created_at) > lastRead);
      });
    }
    setFilteredThreads(result);
  }, [filterMentioned, filterUnread, threads, user.id, lastReadMap]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("integrantes")
      .select("id, nombre, apellido, rol_sistema, avatar_url, avatar_color")
      .order("nombre");
    if (data) {
      setUsersList(data);
      const me = data.find((u) => u.id === user.id);
      if (me) setCurrentUserData(me);
    }
  };

  const fetchGlobalComments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sistema_comentarios")
        .select("*, integrantes(nombre, apellido, avatar_url, avatar_color)")
        .eq("resuelto", false)
        .eq("deleted", false)
        .order("created_at", { ascending: true });

      const { data: allComments } = await query;
      let rawComments = allComments || [];

      const { data: readings } = await supabase
        .from("comentarios_lecturas")
        .select("entidad_tipo, entidad_id, last_read_at")
        .eq("user_id", user.id);

      const readingsMap = {};
      readings?.forEach((r) => {
        readingsMap[getThreadKey(r.entidad_tipo, r.entidad_id)] =
          r.last_read_at;
      });

      setLastReadMap(readingsMap);

      if (giraId) {
        const contextMap = await buildContextMapForGira(giraId);
        const normalizedGiraId = normalizeId(giraId);

        rawComments = rawComments.filter((c) => {
          if (
            c.entidad_tipo === "PROGRAMA" && // CAMBIO: Usamos PROGRAMA como estándar
            normalizeId(c.entidad_id) === normalizedGiraId
          ) {
            c.contexto = "General de Gira";
            return true;
          }
          // Compatibilidad: algunos registros viejos pueden tener "GIRA"
          if (
            c.entidad_tipo === "GIRA" &&
            normalizeId(c.entidad_id) === normalizedGiraId
          ) {
            c.contexto = "General de Gira";
            return true;
          }

          const key = getThreadKey(c.entidad_tipo, c.entidad_id);
          if (contextMap[key]) {
            c.contexto = contextMap[key];
            return true;
          }
          return false;
        });
      } else {
        // --- VISTA GLOBAL (Sin giraId) ---
        const eventIds = rawComments
          .filter((c) => c.entidad_tipo === "EVENTO")
          .map((c) => c.entidad_id);
        const workIds = rawComments
          .filter((c) => c.entidad_tipo === "OBRA")
          .map((c) => c.entidad_id);
        const roomIds = rawComments
          .filter((c) => c.entidad_tipo === "HABITACION")
          .map((c) => c.entidad_id);

        // Carga de contextos para vista global
        const { data: progs } = await supabase
          .from("programas")
          .select("id, nombre_gira, nomenclador, mes_letra");
        const progMap = {};
        progs?.forEach((p) => (progMap[p.id] = p));
        const contextMap = {};

        if (eventIds.length > 0) {
          const { data: evs } = await supabase
            .from("eventos")
            .select("id, descripcion, fecha, id_gira")
            .in("id", eventIds);
          evs?.forEach((e) => {
            contextMap[getThreadKey("EVENTO", e.id)] = {
              contexto: `${e.descripcion} (${format(
                new Date(e.fecha),
                "dd/MM",
              )})`,
              gira_id: e.id_gira,
            };
          });
        }

        if (workIds.length > 0) {
          const { data: reps } = await supabase
            .from("repertorio_obras")
            .select(
              `id, programas_repertorios ( id_programa ), obras ( titulo, obras_compositores ( compositores ( nombre, apellido ) ) )`,
            )
            .in("id", workIds);

          reps?.forEach((r) => {
            const obraData = r.obras;
            const titulo = obraData?.titulo || "Sin Título";
            let autorString = "";
            const compositores = obraData?.obras_compositores || [];
            if (compositores.length > 0 && compositores[0].compositores) {
              const comp = compositores[0].compositores;
              autorString = ` (${comp.apellido}, ${comp.nombre})`;
            }
            const tourId = r.programas_repertorios?.id_programa;
            contextMap[getThreadKey("OBRA", r.id)] = {
              contexto: `Obra: ${titulo}${autorString}`,
              gira_id: tourId,
            };
          });
        }

        if (roomIds.length > 0) {
          const { data: rooms } = await supabase
            .from("hospedaje_habitaciones")
            .select(
              "id, orden, programas_hospedajes(id_programa, hoteles(nombre))",
            )
            .in("id", roomIds);
          rooms?.forEach((r) => {
            contextMap[getThreadKey("HABITACION", r.id)] = {
              contexto: `Hab. ${r.orden} (${r.programas_hospedajes?.hoteles?.nombre})`,
              gira_id: r.programas_hospedajes?.id_programa,
            };
          });
        }

        rawComments = rawComments.map((c) => {
          let info = {
            contexto: `${c.entidad_tipo} #${c.entidad_id}`,
            gira_id: null,
          };
          if (c.entidad_tipo === "PROGRAMA" || c.entidad_tipo === "GIRA") {
            info.gira_id = parseInt(c.entidad_id);
            info.contexto = "General";
          } else {
            const key = getThreadKey(c.entidad_tipo, c.entidad_id);
            if (contextMap[key]) info = contextMap[key];
          }

          const progData = progMap[info.gira_id];
          return {
            ...c,
            contexto: info.contexto,
            gira_id: info.gira_id,
            nombre_gira: progData ? progData.nombre_gira : "Sin Asignar",
            nomenclador: progData
              ? `${progData.mes_letra} | ${progData.nomenclador}`
              : "",
          };
        });
      }

      const threadsMap = rawComments.reduce((acc, comment) => {
        // Agrupar por Entidad (Contexto)
        const key = getThreadKey(comment.entidad_tipo, comment.entidad_id);
        if (!acc[key]) {
          acc[key] = { key, contextData: { ...comment }, messages: [] };
        }
        acc[key].messages.push(comment);
        return acc;
      }, {});

      const sortedThreads = Object.values(threadsMap).sort((a, b) => {
        const dateA = new Date(a.messages[a.messages.length - 1].created_at);
        const dateB = new Date(b.messages[b.messages.length - 1].created_at);
        return dateB - dateA;
      });

      setThreads(sortedThreads);

      let unreadThreadCount = 0;
      let unreadMentionCount = 0;

      sortedThreads.forEach((t) => {
        const key = t.key;
        const lastRead = readingsMap[key]
          ? new Date(readingsMap[key])
          : new Date(0);

        const hasUnread = t.messages.some(
          (m) => new Date(m.created_at) > lastRead,
        );
        if (hasUnread) unreadThreadCount++;

        const hasUnreadMention = t.messages.some(
          (m) =>
            m.etiquetados?.includes(user.id) &&
            m.id_autor !== user.id &&
            new Date(m.created_at) > lastRead,
        );
        if (hasUnreadMention) unreadMentionCount++;
      });

      setCounts({ total: unreadThreadCount, mentioned: unreadMentionCount });
      if (onCountsChange)
        onCountsChange({
          total: unreadThreadCount,
          mentioned: unreadMentionCount,
        });
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
      map[getThreadKey("EVENTO", e.id)] = `${e.descripcion} (${format(
        new Date(e.fecha),
        "dd/MM",
      )})`;
    });

    const { data: reps } = await supabase
      .from("repertorio_obras")
      .select(
        `id, obras ( titulo, obras_compositores ( compositores ( nombre, apellido ) ) ), programas_repertorios!inner ( id_programa ) `,
      )
      .eq("programas_repertorios.id_programa", targetId);

    reps?.forEach((r) => {
      const obraData = r.obras;
      const titulo = obraData?.titulo || "Sin Título";
      let autorString = "";
      const compositores = obraData?.obras_compositores || [];
      if (compositores.length > 0 && compositores[0].compositores) {
        const comp = compositores[0].compositores;
        autorString = ` (${comp.apellido}, ${comp.nombre})`;
      }
      map[getThreadKey("OBRA", r.id)] = `Obra: ${titulo}${autorString}`;
    });

    const { data: hosp } = await supabase
      .from("programas_hospedajes")
      .select("id, hoteles(nombre), hospedaje_habitaciones(id, orden)")
      .eq("id_programa", targetId);
    hosp?.forEach((h) => {
      h.hospedaje_habitaciones?.forEach((room) => {
        map[getThreadKey("HABITACION", room.id)] =
          `Hab. ${room.orden} (${h.hoteles?.nombre})`;
      });
    });
    return map;
  };

  const handleMarkThreadRead = async (thread) => {
    const context = thread.contextData;
    const now = new Date().toISOString();
    const key = getThreadKey(context.entidad_tipo, context.entidad_id);

    setLastReadMap((prev) => ({ ...prev, [key]: now }));

    const { error } = await supabase.from("comentarios_lecturas").upsert(
      {
        user_id: user.id,
        entidad_tipo: context.entidad_tipo,
        entidad_id: normalizeId(context.entidad_id),
        last_read_at: now,
      },
      { onConflict: "user_id, entidad_tipo, entidad_id" },
    );

    if (!error) fetchGlobalComments();
    else console.error("Error al guardar lectura:", error);
  };

  const handleMarkThreadUnread = async (thread) => {
    const context = thread.contextData;
    const key = getThreadKey(context.entidad_tipo, context.entidad_id);

    setLastReadMap((prev) => ({ ...prev, [key]: new Date(0).toISOString() }));

    const { error } = await supabase
      .from("comentarios_lecturas")
      .delete()
      .match({
        user_id: user.id,
        entidad_tipo: context.entidad_tipo,
        entidad_id: normalizeId(context.entidad_id),
      });
    if (!error) fetchGlobalComments();
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setNewResponse(val);
    const words = val.split(" ");
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith("@")) {
      setMentionQuery(lastWord.slice(1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionQuery(null);
    }
  };

  const selectMentionUser = (u) => {
    const words = newResponse.split(" ");
    words.pop();
    const userNameTag = `@${u.nombre}${u.apellido}`;
    const newText = [...words, userNameTag, ""].join(" ");
    setNewResponse(newText);
    setShowMentions(false);
    if (replyInputRef.current) replyInputRef.current.focus();
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!newResponse.trim() || !replyingThread) return;
    setSending(true);

    handleMarkThreadRead(replyingThread);

    const context = replyingThread.contextData;
    const taggedIds = usersList
      .filter((u) => {
        const tag = `@${u.nombre}${u.apellido}`;
        return newResponse.includes(tag);
      })
      .map((u) => u.id);

    // RESPONDER AL ÚLTIMO MENSAJE DEL HILO (Para mantenerlo lineal en el tiempo)
    // Opcional: Podríamos responder al thread.messages[0] si quisiéramos estructura de árbol estricta
    const lastMsgId =
      replyingThread.messages[replyingThread.messages.length - 1].id;

    const payload = {
      entidad_tipo: context.entidad_tipo,
      entidad_id: normalizeId(context.entidad_id),
      id_autor: user.id,
      contenido: newResponse,
      etiquetados: taggedIds,
      parent_id: lastMsgId,
      resuelto: false,
      deleted: false,
    };

    try {
      const { error } = await supabase
        .from("sistema_comentarios")
        .insert([payload]);
      if (error) throw error;
      setNewResponse("");
      setReplyingThread(null);
      await fetchGlobalComments();
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleResolveThread = async (thread) => {
    if (!confirm("¿Marcar todo este hilo como resuelto?")) return;
    const ids = thread.messages.map((m) => m.id);
    await supabase
      .from("sistema_comentarios")
      .update({
        resuelto: true,
        fecha_resolucion: new Date().toISOString(),
        resuelto_por: user.id,
      })
      .in("id", ids);
    fetchGlobalComments();
  };

  const handleArchiveMsg = async (id) => {
    if (!confirm("¿Eliminar este mensaje?")) return;
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
    fetchGlobalComments();
  };

  const filteredUsers = usersList.filter(
    (u) =>
      mentionQuery === "" ||
      `${u.nombre} ${u.apellido}`
        .toLowerCase()
        .includes(mentionQuery?.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col relative">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-full text-amber-600">
              <IconAlertCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">
                {giraId ? "Pendientes de Gira" : "Gestor General de Pendientes"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    counts.total > 0
                      ? "bg-indigo-100 text-indigo-600 border-indigo-200"
                      : "bg-slate-100 text-slate-400 border-slate-200"
                  }`}
                >
                  {counts.total} hilos no leídos
                </span>
                {counts.mentioned > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-200 animate-pulse">
                    @{counts.mentioned} menciones no leídas
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterUnread(!filterUnread)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                filterUnread
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <IconEyeOff size={14} />{" "}
              {filterUnread ? "Solo No Leídos" : "Filtrar No Leídos"}
            </button>
            <button
              onClick={() => setFilterMentioned(!filterMentioned)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                filterMentioned
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <IconAtSign size={14} />{" "}
              {filterMentioned ? "Mis menciones" : "Filtrar Menciones"}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <IconX size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
          {loading && (
            <div className="text-center py-10">
              <IconLoader className="animate-spin inline text-indigo-500" />
            </div>
          )}
          {!loading && filteredThreads.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
              <IconCheckCircle size={64} className="text-emerald-200 mb-4" />
              <p className="font-medium">¡Todo al día!</p>
              <p className="text-sm">No hay mensajes pendientes.</p>
            </div>
          )}

          {filteredThreads.map((thread) => (
            <GlobalThreadItem
              key={thread.key}
              thread={thread}
              user={user}
              lastReadMap={lastReadMap}
              onReply={(t) => setReplyingThread(t)}
              onResolve={handleResolveThread}
              onDelete={handleArchiveMsg}
              onUpdateDate={handleUpdateDate}
              onNavigate={onNavigate}
              onMarkRead={handleMarkThreadRead}
              onMarkUnread={handleMarkThreadUnread}
              editingDateId={editingDateId}
              setEditingDateId={setEditingDateId}
              isGlobalView={!giraId}
              onPreviewImage={setPreviewImage} // Propagar función de zoom
            />
          ))}
        </div>

        {replyingThread && (
          <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-5 z-20 relative">
            {showMentions && (
              <div className="absolute bottom-full left-4 mb-2 w-64 bg-white border border-slate-200 shadow-2xl rounded-lg max-h-48 overflow-y-auto z-[100]">
                <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 uppercase">
                  Sugerencias
                </div>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectMentionUser(u);
                      }}
                      className="px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer flex items-center gap-2 text-slate-700"
                    >
                      <UserAvatar user={u} size="sm" />
                      {u.nombre} {u.apellido}
                    </div>
                  ))
                ) : (
                  <div className="p-2 text-xs text-slate-400 italic">
                    No encontrado
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-between items-center mb-2 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
              <span className="truncate max-w-[80%]">
                Respondiendo a: <b>{replyingThread.contextData.contexto}</b>
              </span>
              <button
                onClick={() => setReplyingThread(null)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <IconX size={16} />
              </button>
            </div>
            <div className="flex gap-2 items-start">
              {/* Avatar propio en input */}
              <div className="mt-1">
                <UserAvatar user={currentUserData || user} size="md" />
              </div>
              <form
                onSubmit={handleReplySubmit}
                className="flex gap-2 relative flex-1"
              >
                <input
                  ref={replyInputRef}
                  autoFocus
                  type="text"
                  className="flex-1 border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Escribe tu respuesta... (Usa @ para mencionar)"
                  value={newResponse}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setShowMentions(false);
                  }}
                />
                <button
                  disabled={sending}
                  className="bg-indigo-600 text-white px-4 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[50px]"
                >
                  {sending ? (
                    <IconLoader className="animate-spin" size={20} />
                  ) : (
                    <IconSend size={20} />
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- LIGHTBOX (ZOOM IMAGEN) --- */}
        {previewImage && (
          <div
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-full max-h-full">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 text-white/80 hover:text-white"
              >
                <IconX size={32} />
              </button>
              <img
                src={previewImage}
                alt="Vista previa"
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
