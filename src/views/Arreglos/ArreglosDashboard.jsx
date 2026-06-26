import React, { useState, useEffect, useMemo, useRef } from "react";
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
  IconUserPlus,
  IconCopy,
  IconTrash,
  IconAlertCircle,
  IconFolder,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabase";
import SearchableSelect from "../../components/ui/SearchableSelect";
import DateInput from "../../components/ui/DateInput";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import WorkForm, { QuickComposerModal, WysiwygEditor } from "../Repertoire/WorkForm";
import NewVersionModal from "../../components/repertoire/NewVersionModal";
import ArreglosReferenciasModal from "../../components/arreglos/ArreglosReferenciasModal";
import ArregloEntregaModal from "../../components/arreglos/ArregloEntregaModal";
import { markEncargoArregloMailSent } from "../../utils/encargoArregloMail";
import { readManageDriveResponseBody } from "../../utils/paraAcomodarDrive";

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

function isArregloEntregado(work) {
  const estado = (work?.estado || "").toLowerCase();
  return estado === "entregado" || estado === "oficial";
}

function compareArreglosPorUrgencia(a, b) {
  const aEntregado = isArregloEntregado(a);
  const bEntregado = isArregloEntregado(b);
  if (aEntregado !== bEntregado) return aEntregado ? 1 : -1;

  const fa = a.fecha_esperada || "";
  const fb = b.fecha_esperada || "";
  if (!fa && !fb) return stripHtmlForSort(a.titulo).localeCompare(stripHtmlForSort(b.titulo));
  if (!fa) return 1;
  if (!fb) return -1;
  const cmp = fa.localeCompare(fb);
  if (cmp !== 0) return cmp;
  return stripHtmlForSort(a.titulo).localeCompare(stripHtmlForSort(b.titulo));
}

function stripHtmlForSort(html) {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function formatIntegranteLabel(integrante) {
  if (!integrante) return null;
  const label = `${integrante.apellido || ""}, ${integrante.nombre || ""}`.trim();
  return label || null;
}

function getFieldStatusClass(status) {
  if (status === "saving") return "bg-yellow-100 text-yellow-900 border-yellow-300 ring-1 ring-yellow-300 transition-colors duration-200";
  if (status === "error") return "bg-red-100 text-red-900 border-red-300 ring-1 ring-red-300 font-bold transition-colors duration-200";
  if (status === "saved") return "bg-green-200 text-green-900 border-green-400 ring-1 ring-green-400 font-medium transition-colors duration-1000";
  return "border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
}

const DEFAULT_ARREGLADOR_INTEGRANTE_ID = 4340365;

const NOTAS_STICKY_PANEL_CLASS =
  "bg-yellow-50 border border-yellow-100 text-yellow-900 rounded-lg shadow-[2px_3px_10px_rgba(234,179,8,0.22)] relative leading-tight rotate-[0.15deg]";

function formatFechaCorta(fechaStr) {
  if (!fechaStr) return null;
  const d = fechaStr.includes("T") ? new Date(fechaStr) : new Date(`${fechaStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function extractNotaEntrega(comentarios) {
  const plain = (comentarios || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  const idx = plain.lastIndexOf("[Entrega]");
  if (idx === -1) return "";
  return plain.slice(idx + "[Entrega]".length).trim().split(/\n\n/)[0].trim();
}

function SolicitanteTag({ label }) {
  if (!label) return null;
  return (
    <span
      className="inline-flex mt-1 text-[9px] font-semibold uppercase tracking-wide text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-1.5 py-0.5 max-w-full truncate"
      title={`Solicitado por ${label}`}
    >
      {label}
    </span>
  );
}

function ObservacionesStickyCell({
  value,
  onChange,
  onBlur,
  canEdit,
  statusClass = "",
  placeholder = "Observación del pedido…",
  fillHeight = false,
}) {
  const editingRef = useRef(false);
  const [draft, setDraft] = useState(value ?? "");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!editingRef.current) setDraft(value ?? "");
  }, [value]);

  const stickyWrap = (inner) => (
    <div
      className={`${NOTAS_STICKY_PANEL_CLASS} px-2 py-1 ${fillHeight ? "h-full flex flex-col flex-1 min-h-0" : ""}`}
    >
      <IconAlertCircle
        size={10}
        className="absolute left-1.5 top-1.5 text-amber-500/75 pointer-events-none"
      />
      <div className={`min-w-0 pl-3 ${fillHeight ? "flex flex-col flex-1 min-h-0 h-full" : ""}`}>{inner}</div>
    </div>
  );

  if (!canEdit) {
    const plain = (value || "").trim();
    if (!plain) {
      return <span className="text-[10px] text-slate-300 italic">—</span>;
    }
    return (
      <div className={`min-w-0 max-w-[18rem] ${fillHeight ? "h-full" : ""}`}>
        {stickyWrap(
          <div className={`text-[10px] text-yellow-950 leading-snug ${fillHeight ? "" : "line-clamp-4"}`}>{plain}</div>,
        )}
      </div>
    );
  }

  const showPostIt = draft.trim().length > 0 || focused;
  const textarea = (
    <textarea
      rows={fillHeight ? undefined : showPostIt && focused ? 3 : 1}
      spellCheck
      className={`w-full bg-transparent border-0 p-0 text-[10px] outline-none focus:ring-0 leading-snug placeholder:text-slate-400 ${
        fillHeight
          ? "flex-1 min-h-[2.5rem] h-full resize-none"
          : `resize-y ${showPostIt ? "text-yellow-950 min-h-[1.35rem] max-h-[8rem]" : "text-slate-700 min-h-[1.35rem]"}`
      } ${statusClass}`}
      placeholder={placeholder}
      value={draft}
      onFocus={() => {
        editingRef.current = true;
        setFocused(true);
      }}
      onBlur={() => {
        editingRef.current = false;
        setFocused(false);
        onBlur?.(draft);
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange?.(e.target.value);
      }}
    />
  );

  return (
    <div className={`min-w-0 max-w-[18rem] ${fillHeight ? "h-full flex flex-col" : ""}`}>
      {showPostIt ? (
        stickyWrap(
          fillHeight ? <div className="flex flex-col flex-1 min-h-0 h-full">{textarea}</div> : textarea,
        )
      ) : (
        <div
          className={`rounded-lg border border-dashed border-slate-200 bg-white px-1.5 py-0.5 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] ${
            fillHeight ? "flex flex-col flex-1 min-h-[2.5rem] h-full" : ""
          }`}
        >
          {textarea}
        </div>
      )}
    </div>
  );
}

function getDiasRestantesInfo(work) {
  if (!work?.fecha_esperada) return null;
  const estado = (work.estado || "").toLowerCase();
  if (estado === "entregado" || estado === "oficial") return null;

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(`${work.fecha_esperada}T00:00:00`);
  const diffMs = target.getTime() - todayMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { kind: "hoy" };
  if (diffDays > 0) return { kind: "faltan", days: diffDays };
  return { kind: "vencio", days: Math.abs(diffDays) };
}

function DiasRestantesDisplay({ work }) {
  const info = getDiasRestantesInfo(work);
  if (!info || work.estado !== "Para arreglar") return null;

  const textClass = "text-[11px] text-slate-500 leading-tight";
  const numClass = "font-bold tabular-nums text-slate-700";

  return (
    <p className={`${textClass} text-center w-full`}>
      {info.kind === "hoy" && "vence hoy"}
      {info.kind === "faltan" && (
        <>
          Faltan <span className={numClass}>{info.days}</span> día{info.days === 1 ? "" : "s"}
        </>
      )}
      {info.kind === "vencio" && (
        <>
          venció hace <span className={numClass}>{info.days}</span> día{info.days === 1 ? "" : "s"}
        </>
      )}
    </p>
  );
}

function FechaEntregaCell({
  work,
  canEditFecha,
  fechaValue,
  onFechaChange,
  fechaStatusClass = "",
  solicitanteLabel,
}) {
  const fecha = formatFechaCorta(work.fecha_esperada);

  return (
    <div className="space-y-1 min-w-[6.5rem] flex flex-col items-center text-center">
      {canEditFecha ? (
        <DateInput
          label=""
          value={fechaValue || ""}
          onChange={onFechaChange}
          className={`border rounded-lg text-[10px] w-full ${fechaStatusClass}`}
        />
      ) : fecha ? (
        <span className="text-[11px] font-mono font-semibold text-slate-700 block">{fecha}</span>
      ) : (
        <span className="text-[10px] text-slate-300 italic block">Sin fecha</span>
      )}
      <DiasRestantesDisplay work={work} />
      <SolicitanteTag label={solicitanteLabel} />
    </div>
  );
}

function ArregloEntregaAcciones({
  work,
  linkValue,
  notaEntregaDraft,
  notaEntregaGuardada,
  fechaEntrega,
  onOpenEntrega,
  isSaving,
  canEditFields,
  canEditDelivery,
  onDelete,
  onEdit,
  onNewVersion,
}) {
  const link = (linkValue || work.link_drive || "").trim();
  const isParaArreglar = work.estado === "Para arreglar";
  const notaBorrador = (notaEntregaDraft || "").trim();
  const notaGuardada = (notaEntregaGuardada || "").trim();
  const fechaEntregaFmt = formatFechaCorta(fechaEntrega);

  const btnBase =
    "w-full text-[10px] font-bold px-2 py-1 rounded flex items-center justify-center gap-1 disabled:opacity-50";

  if (isParaArreglar) {
    return (
      <div className="flex flex-col justify-center gap-1 min-w-[5.5rem] max-w-[8rem] h-full py-1">
        {notaBorrador ? (
          <div className={`${NOTAS_STICKY_PANEL_CLASS} px-1.5 py-0.5`}>
            <p className="text-[9px] text-yellow-950 line-clamp-3 leading-snug pl-2">{notaBorrador}</p>
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          {canEditFields && (
            <button
              type="button"
              onClick={onEdit}
              className={`${btnBase} bg-indigo-100 text-indigo-700 hover:bg-indigo-200`}
            >
              <IconEdit size={11} />
              Editar
            </button>
          )}
          {canEditDelivery && (
            <button
              type="button"
              onClick={onOpenEntrega}
              disabled={isSaving}
              className={`${btnBase} bg-sky-600 text-white hover:bg-sky-700`}
            >
              Entregar
            </button>
          )}
          {canEditFields && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isSaving}
              className={`${btnBase} bg-rose-50 text-rose-700 hover:bg-rose-100`}
              title="Eliminar solicitud de arreglo"
            >
              <IconTrash size={11} />
              Eliminar
            </button>
          )}
        </div>
      </div>
    );
  }

  const notaMostrar = notaGuardada || notaBorrador;

  return (
    <div className="flex flex-col justify-center gap-1 min-w-[5.5rem] max-w-[9rem] h-full py-1">
      <div className={`${NOTAS_STICKY_PANEL_CLASS} px-1.5 py-0.5`}>
        <p className="text-[9px] font-bold text-yellow-950 leading-snug pl-2">
          {work.estado}
          {fechaEntregaFmt ? ` · ${fechaEntregaFmt}` : ""}
        </p>
      </div>
      {notaMostrar ? (
        <div className={`${NOTAS_STICKY_PANEL_CLASS} px-1.5 py-0.5`}>
          <p className="text-[9px] text-yellow-950 line-clamp-3 leading-snug pl-2">{notaMostrar}</p>
        </div>
      ) : null}
      <div className="flex items-center gap-1">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 border border-amber-200/60"
            title="Abrir carpeta"
          >
            <IconFolder size={15} />
          </a>
        ) : (
          <span className="p-1.5 text-slate-300" title="Sin carpeta">
            <IconFolder size={15} />
          </span>
        )}
        {canEditFields && (
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50 border border-indigo-200/60"
            title="Editar obra"
          >
            <IconEdit size={15} />
          </button>
        )}
      </div>
      {(work.estado === "Entregado" || work.estado === "Oficial") && (
        <button
          type="button"
          onClick={onNewVersion}
          className={`${btnBase} bg-slate-100 text-slate-700 hover:bg-slate-200`}
          title="Nueva versión (reemplazar o clonar)"
        >
          <IconCopy size={11} />
          Nueva versión
        </button>
      )}
    </div>
  );
}

export default function ArreglosDashboard({ supabase: supabaseClient, onViewInRepertoire, catalogoInstrumentos }) {
  const { user, isEditor, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sb = supabaseClient || supabase;
  const canEditFields = isEditor || isAdmin;

  const [loading, setLoading] = useState(true);
  const [works, setWorks] = useState([]);
  const [arregladoresOptions, setArregladoresOptions] = useState([]);
  const [integrantesArregladorOptions, setIntegrantesArregladorOptions] = useState([]);
  const [compositoresOptions, setCompositoresOptions] = useState([]);
  const [filterArregladorId, setFilterArregladorId] = useState("");
  const [myCompositorId, setMyCompositorId] = useState(null);

  // Modal WorkForm: abrir por encima de la vista sin cambiar de tab
  const [workFormModalOpen, setWorkFormModalOpen] = useState(false);
  const [workFormInitialData, setWorkFormInitialData] = useState({});

  // Modal Nueva versión (solo para obras Entregado / Oficial)
  const [newVersionModalOpen, setNewVersionModalOpen] = useState(false);
  const [newVersionWork, setNewVersionWork] = useState(null);

  // Inline edit state: workId -> { link_drive, nota_entrega, fecha_esperada, instrumentacion, dificultad, observaciones }
  const [rowDraft, setRowDraft] = useState({});
  const [savingId, setSavingId] = useState(null);
  // Por celda: 'idle' | 'saving' | 'saved' | 'error' (rojo/amarillo/verde)
  const [fieldStatus, setFieldStatus] = useState({});

  // Fila de carga rápida
  const [quickDraft, setQuickDraft] = useState({
    compositorId: null,
    titulo: "",
    fecha_esperada: "",
    instrumentacion: "",
    dificultad: "",
    observaciones: "",
    id_integrante_arreglador: DEFAULT_ARREGLADOR_INTEGRANTE_ID,
  });
  const [quickSaving, setQuickSaving] = useState(false);
  const [isQuickCompOpen, setIsQuickCompOpen] = useState(false);
  const [showQuickRow, setShowQuickRow] = useState(false);

  const [workToDelete, setWorkToDelete] = useState(null);
  const [deletingArreglo, setDeletingArreglo] = useState(false);
  const [refsByObra, setRefsByObra] = useState({});
  const [refsModalWork, setRefsModalWork] = useState(null);
  const [entregaModalWork, setEntregaModalWork] = useState(null);

  const fetchWorks = async () => {
    setLoading(true);
    try {
      // 1) Obtener todas las obras que tengan al menos un log de producción (arreglos)
      //    Solo consideramos transiciones entre estados propios del flujo de arreglos:
      //    "Para arreglar" ↔ "Entregado" ↔ "Oficial".
      const estadosArreglo = ["Para arreglar", "Entregado", "Oficial"];
      const { data: logs, error: logsError } = await sb
        .from("obras_produccion_log")
        .select("id_obra, estado_anterior, estado_nuevo")
        .in("estado_anterior", estadosArreglo)
        .in("estado_nuevo", estadosArreglo);
      if (logsError) throw logsError;
      const obrasConLogIds = Array.from(
        new Set((logs || []).map((l) => l.id_obra).filter(Boolean))
      );

      // 2) Traer obras que:
      //    - estén en "Para arreglar" o "Entregado"
      //    - o bien tengan al menos un registro en obras_produccion_log
      let obrasQuery = sb
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
          id_usuario_carga,
          usuario_carga:integrantes!id_usuario_carga (apellido, nombre),
          obras_compositores (rol, compositores (apellido, nombre))
        `
        );

      if (obrasConLogIds.length > 0) {
        const inList = obrasConLogIds.join(",");
        obrasQuery = obrasQuery.or(
          `estado.eq.Para arreglar,estado.eq.Entregado,id.in.(${inList})`
        );
      } else {
        obrasQuery = obrasQuery.in("estado", ["Para arreglar", "Entregado"]);
      }

      const { data: obras, error } = await obrasQuery
        .order("estado", { ascending: true })
        .order("titulo");

      if (error) throw error;

      // Excluir obras cuyo estado actual es "Solicitud" (solo las ve el Archivista)
      const obrasFiltradas = (obras || []).filter(
        (w) => (w.estado || "").toLowerCase() !== "solicitud"
      );

      const { data: integrantes } = await sb
        .from("integrantes")
        .select("id, apellido, nombre, mail")
        .order("apellido");

      const intMap = new Map(
        (integrantes || []).map((i) => [
          i.id,
          `${i.apellido || ""}, ${i.nombre || ""}`.trim() || `ID ${i.id}`,
        ])
      );
      const arregladorIds = new Set(
        (obrasFiltradas || [])
          .map((w) => w.id_integrante_arreglador)
          .filter(Boolean)
      );
      const options = Array.from(arregladorIds)
        .map((id) => ({ id, label: intMap.get(id) || `ID ${id}` }))
        .sort((a, b) => (a.label || "").localeCompare(b.label || ""));
      setArregladoresOptions(options);
      setIntegrantesArregladorOptions(
        (integrantes || []).map((i) => ({
          id: i.id,
          label: intMap.get(i.id) || `ID ${i.id}`,
          mail: i.mail || null,
        }))
      );

      let referenciasMap = {};
      let entregaFechaByObra = {};
      const obraIds = (obrasFiltradas || []).map((w) => w.id).filter(Boolean);
      if (obraIds.length > 0) {
        const { data: refsData, error: refsError } = await sb
          .from("arreglos_referencias")
          .select("id, id_obra, titulo, link, id_obra_referencia, orden")
          .in("id_obra", obraIds)
          .order("orden", { ascending: true })
          .order("id", { ascending: true });
        if (refsError) {
          console.warn("ArreglosDashboard referencias:", refsError.message);
        } else {
          referenciasMap = (refsData || []).reduce((acc, ref) => {
            if (!acc[ref.id_obra]) acc[ref.id_obra] = [];
            acc[ref.id_obra].push(ref);
            return acc;
          }, {});
        }

        const { data: entregaLogs, error: entregaLogsError } = await sb
          .from("obras_produccion_log")
          .select("id_obra, fecha")
          .in("id_obra", obraIds)
          .eq("estado_nuevo", "Entregado")
          .order("fecha", { ascending: false });
        if (entregaLogsError) {
          console.warn("ArreglosDashboard fecha entrega:", entregaLogsError.message);
        } else {
          for (const log of entregaLogs || []) {
            if (!entregaFechaByObra[log.id_obra]) {
              entregaFechaByObra[log.id_obra] = log.fecha;
            }
          }
        }
      }

      const list = (obrasFiltradas || []).map((w) => {
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
          solicitante_label: formatIntegranteLabel(w.usuario_carga),
          fecha_entrega: entregaFechaByObra[w.id] || null,
          nota_entrega_guardada: extractNotaEntrega(w.comentarios),
        };
      });
      setRefsByObra(referenciasMap);
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

  // Cargar lista de compositores para SearchableSelect
  useEffect(() => {
    if (!canEditFields) return;
    const fetchComposers = async () => {
      try {
        const { data, error } = await sb
          .from("compositores")
          .select("id, apellido, nombre")
          .order("apellido");
        if (error) throw error;
        setCompositoresOptions(
          (data || []).map((c) => ({
            id: c.id,
            label: `${c.apellido || ""}${c.nombre ? `, ${c.nombre}` : ""}`.trim(),
          }))
        );
      } catch (err) {
        console.error("Error al cargar compositores:", err);
        toast.error(err?.message || "Error al cargar compositores.");
      }
    };
    fetchComposers();
  }, [sb, canEditFields]);

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
    return [...list].sort(compareArreglosPorUrgencia);
  }, [works, filterArregladorId]);

  const getDraft = (workId) => rowDraft[workId] || {};

  const setDraftField = (workId, field, value) => {
    setRowDraft((prev) => ({
      ...prev,
      [workId]: { ...(prev[workId] || {}), [field]: value },
    }));
  };

  const setQuickDraftField = (field, value) => {
    setQuickDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetQuickDraft = () => {
    setQuickDraft({
      compositorId: null,
      titulo: "",
      fecha_esperada: "",
      instrumentacion: "",
      dificultad: "",
      observaciones: "",
      id_integrante_arreglador: DEFAULT_ARREGLADOR_INTEGRANTE_ID,
    });
  };

  const handleQuickCompCreated = (newComp) => {
    const newOption = {
      id: newComp.id,
      label: `${newComp.apellido}, ${newComp.nombre}`,
    };
    setCompositoresOptions((prev) =>
      [...prev, newOption].sort((a, b) => (a.label || "").localeCompare(b.label || ""))
    );
    setQuickDraftField("compositorId", newComp.id);
  };

  const getRowPriorityClass = (work) => {
    const estado = (work.estado || "").toLowerCase();
    if (estado === "entregado" || estado === "oficial") return "bg-emerald-100";

    const fechaStr = work.fecha_esperada;
    if (fechaStr) {
      const today = new Date();
      const target = new Date(`${fechaStr}T00:00:00`);
      const diffMs = target.getTime() - today.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays < 2) return "bg-red-100";
      if (diffDays < 7) return "bg-orange-100";
    }

    return "bg-yellow-100";
  };

  const canEditDeliveryForWork = (work) => {
    const hasOwner =
      work.id_integrante_arreglador != null &&
      myCompositorId != null &&
      Number(work.id_integrante_arreglador) === Number(myCompositorId);
    return isAdmin || hasOwner;
  };

  const canMarkEntregadoForWork = (work) => {
    const isOwnerArreglador =
      work.id_integrante_arreglador &&
      myCompositorId &&
      Number(work.id_integrante_arreglador) === Number(myCompositorId);
    return isAdmin || isOwnerArreglador;
  };

  const getSolicitanteLabelForUser = () => formatIntegranteLabel(user);

  const enviarEncargoArreglo = async (
    obraId,
    tituloStr,
    idIntegranteArregladorVal,
    linkDrive,
    observacionesStr,
    fechaEsperada,
    dificultad,
    instrumentacion,
    solicitadoPor
  ) => {
    const integranteOpt = integrantesArregladorOptions.find(
      (i) => Number(i.id) === Number(idIntegranteArregladorVal)
    );
    const arregladorLabel = integranteOpt ? integranteOpt.label : "";
    const emailTo = integranteOpt?.mail || null;
    if (!emailTo) {
      console.warn(
        "encargo_arreglo (ArreglosDashboard): sin email para integrante",
        idIntegranteArregladorVal
      );
      toast.error(
        "No se encontró email del arreglador para enviar el encargo."
      );
      return false;
    }
    const detalle = {
      titulo: tituloStr,
      arreglador: arregladorLabel,
      id_obra: obraId,
      link_drive: linkDrive || null,
      observaciones: observacionesStr || null,
      fecha_esperada: fechaEsperada || null,
      dificultad: dificultad || null,
      instrumentacion: instrumentacion || null,
      solicitado_por: solicitadoPor || null,
    };
    const { error } = await sb.functions.invoke("mails_produccion", {
      body: {
        action: "enviar_mail",
        templateId: "encargo_arreglo",
        email: emailTo,
        bcc: ["ofrn.archivo@gmail.com"],
        nombre: user ? `${user.apellido || ""}, ${user.nombre || ""}`.trim() : "Sistema",
        gira: null,
        detalle,
      },
    });
    if (error) {
      console.error("mails_produccion (encargo_arreglo):", error);
      toast.error("No se pudo enviar el mail de encargo.");
      return false;
    }
    toast.success("Mail de encargo enviado al Arreglador y al Archivista.");
    return true;
  };

  const handleQuickSave = async () => {
    if (!canEditFields) return;
    const compositorId = quickDraft.compositorId;
    const titulo = (quickDraft.titulo || "").trim();
    const arregladorId =
      quickDraft.id_integrante_arreglador || DEFAULT_ARREGLADOR_INTEGRANTE_ID;

    if (!compositorId) {
      toast.error("Seleccioná un compositor para el encargo.");
      return;
    }
    if (!titulo) {
      toast.error("Ingresá el título de la obra para el encargo.");
      return;
    }

    setQuickSaving(true);
    try {
      const payload = {
        titulo,
        instrumentacion: (quickDraft.instrumentacion || "").trim() || null,
        dificultad: (quickDraft.dificultad || "").trim() || null,
        observaciones: (quickDraft.observaciones || "").trim() || null,
        estado: "Para arreglar",
        fecha_esperada: quickDraft.fecha_esperada || null,
        id_integrante_arreglador: arregladorId,
        id_usuario_carga: user?.id || null,
      };

      const { data, error } = await sb
        .from("obras")
        .insert([payload])
        .select("id")
        .single();

      if (error) throw error;

      if (data?.id) {
        const { error: relError } = await sb.from("obras_compositores").insert([
          {
            id_obra: data.id,
            id_compositor: Number(compositorId),
            rol: "compositor",
          },
        ]);
        if (relError) throw relError;

        // Enviar mail de encargo igual que en WorkForm
        const mailSent = await enviarEncargoArreglo(
          data.id,
          titulo,
          arregladorId,
          null,
          quickDraft.observaciones || "",
          quickDraft.fecha_esperada || null,
          quickDraft.dificultad || null,
          quickDraft.instrumentacion || null,
          getSolicitanteLabelForUser()
        );
        if (mailSent) {
          await markEncargoArregloMailSent(sb, data.id);
        }
      }

      toast.success("Nuevo encargo de arreglo creado y asignado.");
      resetQuickDraft();
      await fetchWorks();
    } catch (err) {
      console.error("Error al crear encargo rápido de arreglo:", err);
      toast.error(err?.message || "Error al crear el encargo.");
    } finally {
      setQuickSaving(false);
    }
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

    if (!canEditDeliveryForWork(work)) {
      toast.error("Solo el arreglador asignado o un admin pueden modificar el link de entrega.");
      return;
    }
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
    // Solo el arreglador asignado (o un admin) puede marcar como Entregado
    const isOwnerArreglador =
      work.id_integrante_arreglador &&
      myCompositorId &&
      Number(work.id_integrante_arreglador) === Number(myCompositorId);
    if (!isAdmin && !isOwnerArreglador) {
      toast.error("Solo el arreglador asignado puede marcar este encargo como entregado.");
      return;
    }

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
      const body = await readManageDriveResponseBody(efError, data);
      if (body?.code === "DRIVE_ACCESS_DENIED") {
        toast.error(
          body.error ||
            "El Archivo no tiene acceso a la carpeta de Drive. Compartila con ofrn.archivo@gmail.com y reintentá.",
        );
        return;
      }
      if (efError || body?.error) throw new Error(body?.error || efError?.message || "Error al entregar");
      if (!body?.success && !body?.link_drive) throw new Error(body?.error || "Error al entregar");

      const nuevoLink = body?.link_drive || link.trim();

      setWorks((prev) =>
        prev.map((w) =>
          w.id === work.id
            ? {
                ...w,
                estado: "Entregado",
                link_drive: nuevoLink,
                comentarios: comentariosNuevos || w.comentarios,
                nota_entrega_guardada: notaEntrega.trim() || w.nota_entrega_guardada,
                fecha_entrega: w.fecha_entrega || new Date().toISOString(),
              }
            : w
        )
      );
      setRowDraft((prev) => {
        const next = { ...prev };
        delete next[work.id];
        return next;
      });
      toast.success(
        body?.copied_to_para_acomodar
          ? "Obra entregada. Copia creada en «Para acomodar» y se notificó al archivista."
          : "Obra entregada. Ya estaba en «Para acomodar»; se notificó al archivista.",
      );
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

  const refreshReferenciasCount = async (obraId) => {
    try {
      const { data, error } = await sb
        .from("arreglos_referencias")
        .select("id, id_obra, titulo, link, id_obra_referencia, orden")
        .eq("id_obra", obraId)
        .order("orden", { ascending: true })
        .order("id", { ascending: true });
      if (error) throw error;
      setRefsByObra((prev) => ({ ...prev, [obraId]: data || [] }));
    } catch (e) {
      console.warn("refreshReferenciasCount:", e);
    }
  };

  const deleteArregloCompleto = async (work) => {
    if (!canEditFields || !work?.id) return;
    if (work.estado !== "Para arreglar") {
      toast.error("Solo se pueden eliminar encargos en estado «Para arreglar».");
      return;
    }

    setDeletingArreglo(true);
    try {
      const obraId = work.id;
      const childDeletes = [
        { table: "seating_asignaciones", column: "id_obra" },
        { table: "repertorio_obras", column: "id_obra" },
        { table: "obras_produccion_log", column: "id_obra" },
        { table: "obras_palabras_clave", column: "id_obra" },
        { table: "obras_particellas", column: "id_obra" },
        { table: "obras_arcos", column: "id_obra" },
        { table: "obras_compositores", column: "id_obra" },
      ];

      for (const { table, column } of childDeletes) {
        const { error } = await sb.from(table).delete().eq(column, obraId);
        if (error) throw error;
      }

      const { error: obraError } = await sb.from("obras").delete().eq("id", obraId);
      if (obraError) throw obraError;

      setWorks((prev) => prev.filter((w) => w.id !== obraId));
      setRowDraft((prev) => {
        const next = { ...prev };
        delete next[obraId];
        return next;
      });
      toast.success("Solicitud de arreglo eliminada por completo.");
      setWorkToDelete(null);
    } catch (e) {
      console.error("Error al eliminar solicitud de arreglo:", e);
      toast.error(e?.message || "No se pudo eliminar la solicitud de arreglo.");
      throw e;
    } finally {
      setDeletingArreglo(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <IconMusicNote className="text-indigo-600" />Obras para arreglar
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Tabla de obras con encargos de arreglo: incluye las que están en &quot;Para arreglar&quot;, &quot;Entregado&quot; o tienen un arreglador asignado. Cargá el link de Drive, una observación opcional y pasá a Entregado.
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
            No hay obras con encargos de arreglo para mostrar.
          </div>
        ) : filteredWorks.length === 0 ? (
          <div className="p-12 text-center text-slate-500 italic">
            Ninguna obra para el arreglador seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm table-fixed">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-center py-3 px-2 font-bold text-slate-600 uppercase text-xs w-[8%] min-w-[6.5rem]">
                    F. est.
                  </th>
                  <th className="text-left py-3 px-3 font-bold text-slate-600 uppercase text-xs w-[24%] min-w-[12rem]">
                    Obra / Compositor · Arreglador
                  </th>
                  <th className="text-center py-3 px-1 font-bold text-slate-600 uppercase text-xs w-[3%]">
                    Ref.
                  </th>
                  <th className="text-left py-3 px-3 font-bold text-slate-600 uppercase text-xs w-[14%] min-w-[6rem]">
                    Orgánico
                  </th>
                  <th className="text-left py-3 px-3 font-bold text-slate-600 uppercase text-xs w-[7%] min-w-[4.5rem]">
                    Dificultad
                  </th>
                  <th className="text-left py-3 px-3 font-bold text-slate-600 uppercase text-xs w-[18%] min-w-[8rem]">
                    Observación
                  </th>
                  <th className="text-left py-3 px-2 font-bold text-slate-600 uppercase text-xs w-[12%] min-w-[5.5rem]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {canEditFields && (
                  <>
                    <tr
                      className="cursor-pointer bg-indigo-50 hover:bg-indigo-100 border-y border-indigo-100"
                      onClick={() => setShowQuickRow((prev) => !prev)}
                    >
                      <td
                        colSpan={7}
                        className="py-0.5 px-3 text-[11px] font-semibold text-indigo-700"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <IconPlus size={12} />
                            <span>
                              {showQuickRow ? "Ocultar nuevo arreglo" : "Nuevo arreglo"}
                            </span>
                          </div>
                          <span className="text-[10px] font-normal text-indigo-500">
                            Cargar un nuevo encargo de arreglo.
                          </span>
                        </div>
                      </td>
                    </tr>
                    {showQuickRow && (
                      <tr className="border-b border-slate-100 bg-yellow-50/30 hover:bg-yellow-50/50">
                        <td className="py-2 px-3 align-top text-xs whitespace-nowrap bg-blue-50/40 min-w-[6.5rem]">
                          <FechaEntregaCell
                            work={{ estado: "Para arreglar" }}
                            canEditFecha
                            fechaValue={quickDraft.fecha_esperada || ""}
                            onFechaChange={(v) => setQuickDraftField("fecha_esperada", v)}
                            solicitanteLabel={getSolicitanteLabelForUser()}
                          />
                        </td>
                        <td className="py-2 px-3 align-top bg-blue-50/40 min-w-[14rem]">
                          <div className="space-y-1 max-w-[22rem]">
                            <div className="flex items-center gap-1">
                              <div className="flex-1 min-w-0">
                                <SearchableSelect
                                  options={compositoresOptions}
                                  value={quickDraft.compositorId}
                                  onChange={(id) => setQuickDraftField("compositorId", id)}
                                  placeholder="Buscar compositor..."
                                  className="text-xs"
                                  dropdownMinWidth={260}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsQuickCompOpen(true)}
                                className="inline-flex items-center justify-center px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-600 hover:border-indigo-500 hover:bg-indigo-50 transition-colors shrink-0"
                                title="Crear nuevo compositor"
                              >
                                <IconUserPlus size={16} />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={quickDraft.titulo}
                              onChange={(e) => setQuickDraftField("titulo", e.target.value)}
                              placeholder="Título de la obra"
                              className="w-full text-sm font-semibold border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </td>
                        <td className="py-2 px-1 align-top text-center text-xs text-slate-400 bg-blue-50/40 w-10">
                          —
                        </td>
                        <td className="py-2 px-3 align-top bg-blue-50/40">
                          <input
                            type="text"
                            value={quickDraft.instrumentacion}
                            onChange={(e) => setQuickDraftField("instrumentacion", e.target.value)}
                            placeholder="Orgánico"
                            className="w-full min-w-[6rem] text-xs border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3 align-top text-xs bg-blue-50/40">
                          <input
                            type="text"
                            value={quickDraft.dificultad}
                            onChange={(e) => setQuickDraftField("dificultad", e.target.value)}
                            placeholder="Dificultad"
                            className="w-full min-w-[70px] border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3 align-top text-xs bg-blue-50/40">
                          <ObservacionesStickyCell
                            value={quickDraft.observaciones}
                            onChange={(v) => setQuickDraftField("observaciones", v)}
                            canEdit
                            placeholder="Observación del pedido…"
                          />
                        </td>
                        <td className="py-2 px-3 align-top">
                          <div className="flex flex-col gap-2">
                            <SearchableSelect
                              options={integrantesArregladorOptions}
                              value={quickDraft.id_integrante_arreglador}
                              onChange={(id) =>
                                setQuickDraftField("id_integrante_arreglador", id)
                              }
                              placeholder="Seleccionar arreglador..."
                              isMulti={false}
                              className="text-xs"
                              dropdownMinWidth={260}
                            />
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={handleQuickSave}
                                disabled={
                                  quickSaving ||
                                  !quickDraft.compositorId ||
                                  !(quickDraft.titulo || "").trim()
                                }
                                className="text-[10px] font-bold px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                {quickSaving ? (
                                  <IconLoader size={12} className="animate-spin" />
                                ) : (
                                  <IconCheck size={12} />
                                )}
                                Asignar a...
                              </button>
                              <button
                                type="button"
                                onClick={resetQuickDraft}
                                disabled={quickSaving}
                                className="text-[10px] font-bold px-2 py-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 flex items-center gap-1"
                              >
                                <IconX size={12} />
                                Limpiar
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )}

                {filteredWorks.map((work) => {
                  const draft = getDraft(work.id);
                  const linkValue = draft.link_drive !== undefined ? draft.link_drive : (work.link_drive || "");
                  const notaValue = draft.nota_entrega !== undefined ? draft.nota_entrega : "";
                  const isSaving = savingId === work.id;
                  const isParaArreglar = work.estado === "Para arreglar";
                  return (
                    <tr
                      key={work.id}
                      className={`hover:bg-slate-50/50 ${getRowPriorityClass(work)}`}
                    >
                      <td className="py-2 px-3 align-top bg-blue-50/40 min-w-[6.5rem]">
                        <FechaEntregaCell
                          work={work}
                          canEditFecha={canEditFields && isParaArreglar}
                          fechaValue={
                            draft.fecha_esperada !== undefined
                              ? draft.fecha_esperada
                              : work.fecha_esperada
                          }
                          onFechaChange={(v) => {
                            const nextVal = v || "";
                            setDraftField(work.id, "fecha_esperada", nextVal);
                            const current = work.fecha_esperada || "";
                            if (nextVal !== current) {
                              saveEditorField(work, "fecha_esperada", nextVal);
                            }
                          }}
                          fechaStatusClass={getFieldStatusClass(
                            fieldStatus[fieldStatusKey(work.id, "fecha_esperada")] || "idle",
                          )}
                          solicitanteLabel={work.solicitante_label}
                        />
                      </td>
                      <td className="py-2 px-3 align-top bg-blue-50/40 min-w-[14rem]">
                        {canEditFields && isParaArreglar ? (
                          <div className="max-w-[22rem] min-h-[3rem]">
                            <WysiwygEditor
                              compact
                              fillHeight
                              value={
                                draft.titulo !== undefined ? draft.titulo : work.titulo || ""
                              }
                              onChange={(v) => setDraftField(work.id, "titulo", v)}
                              onBlur={() => {
                                const currentDraft = getDraft(work.id);
                                const v =
                                  currentDraft.titulo !== undefined
                                    ? currentDraft.titulo
                                    : work.titulo || "";
                                if (v !== (work.titulo || "")) {
                                  saveEditorField(work, "titulo", v);
                                }
                              }}
                              placeholder="Título"
                              className={`h-full min-h-[3rem] ${getFieldStatusClass(fieldStatus[fieldStatusKey(work.id, "titulo")] || "idle")}`}
                            />
                          </div>
                        ) : (
                          <div className="text-sm text-slate-800 leading-snug max-w-[22rem] [&_b]:font-semibold [&_strong]:font-semibold">
                            <RichTextPreview content={work.titulo} />
                          </div>
                        )}
                        {work.compositor_full && (
                          <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[22rem]">{work.compositor_full}</div>
                        )}
                        {work.arreglador_label && (
                          <div className="text-xs text-slate-600 mt-0.5 truncate max-w-[22rem]">
                            {work.arreglador_label}
                            {myCompositorId === work.id_integrante_arreglador && (
                              <span className="text-indigo-500 ml-1">(vos)</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-1 align-top text-center bg-blue-50/40 w-10">
                        {(() => {
                          const refCount = (refsByObra[work.id] || []).length;
                          return (
                            <button
                              type="button"
                              onClick={() => setRefsModalWork(work)}
                              className="inline-flex items-center justify-center gap-0.5 text-[10px] font-bold p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 min-w-0"
                              title="Ver referencias de material"
                            >
                              <IconDrive size={13} className="text-amber-600 shrink-0" />
                              <span className="tabular-nums">{refCount > 0 ? refCount : "+"}</span>
                            </button>
                          );
                        })()}
                      </td>
                      <td className="py-2 px-3 bg-blue-50/40 h-px align-stretch">
                        <div className="h-full min-h-[3rem]">
                          {canEditFields && isParaArreglar ? (
                            <textarea
                              value={(draft.instrumentacion !== undefined ? draft.instrumentacion : work.instrumentacion) || ""}
                              onChange={(e) => setDraftField(work.id, "instrumentacion", e.target.value)}
                              onBlur={(e) => {
                                const v = e.target.value;
                                if (v !== (work.instrumentacion || "")) saveEditorField(work, "instrumentacion", v);
                              }}
                              placeholder="Orgánico"
                              rows={2}
                              className={`w-full h-full min-h-[3rem] font-mono text-xs border rounded px-2 py-1 resize-none ${getFieldStatusClass(fieldStatus[fieldStatusKey(work.id, "instrumentacion")] || "idle")}`}
                            />
                          ) : (
                            <span className="font-mono text-xs text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded block h-full min-h-[3rem]">
                              {work.instrumentacion || "-"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 align-top text-xs bg-blue-50/40">
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
                      <td className="py-2 px-3 bg-blue-50/40 h-px align-stretch">
                        <div className="h-full min-h-[3rem] flex flex-col">
                          {canEditFields && isParaArreglar ? (
                            <ObservacionesStickyCell
                              fillHeight
                              value={
                                (draft.observaciones !== undefined
                                  ? draft.observaciones
                                  : stripHtml(work.observaciones || "")) || ""
                              }
                              onChange={(v) => setDraftField(work.id, "observaciones", v)}
                              onBlur={(v) => {
                                if (v !== stripHtml(work.observaciones || "")) {
                                  saveEditorField(work, "observaciones", v);
                                }
                              }}
                              canEdit
                              statusClass={getFieldStatusClass(
                                fieldStatus[fieldStatusKey(work.id, "observaciones")] || "idle",
                              )}
                            />
                          ) : (
                            <ObservacionesStickyCell
                              fillHeight
                              value={stripHtml(work.observaciones || "")}
                              canEdit={false}
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 h-px align-middle">
                        <div className="h-full min-h-[3rem] flex items-center justify-center">
                          <ArregloEntregaAcciones
                          work={work}
                          linkValue={linkValue}
                          notaEntregaDraft={notaValue}
                          notaEntregaGuardada={work.nota_entrega_guardada}
                          fechaEntrega={work.fecha_entrega}
                          onOpenEntrega={() => setEntregaModalWork(work)}
                          isSaving={isSaving}
                          canEditFields={canEditFields}
                          canEditDelivery={canEditDeliveryForWork(work)}
                          onDelete={() => setWorkToDelete(work)}
                          onEdit={() => openWorkFormModal(work.id)}
                          onNewVersion={() => {
                            setNewVersionWork(work);
                            setNewVersionModalOpen(true);
                          }}
                        />
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-1.5 sm:p-2">
          <div className="relative my-4 flex w-full max-w-4xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl sm:my-6 max-h-[92vh]">
            <div className="flex items-center justify-between shrink-0 px-3 py-2.5 border-b border-slate-200 bg-slate-50 rounded-t-xl">
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
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 min-h-0 w-full">
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

      <QuickComposerModal
        isOpen={isQuickCompOpen}
        onClose={() => setIsQuickCompOpen(false)}
        onCreated={handleQuickCompCreated}
        supabase={sb}
      />

      <NewVersionModal
        isOpen={newVersionModalOpen}
        onClose={() => {
          setNewVersionModalOpen(false);
          setNewVersionWork(null);
        }}
        work={newVersionWork}
        supabase={sb}
        onSuccess={fetchWorks}
      />

      <ArreglosReferenciasModal
        isOpen={refsModalWork != null}
        onClose={() => setRefsModalWork(null)}
        work={refsModalWork}
        supabase={sb}
        canEdit={canEditFields}
        onChanged={refreshReferenciasCount}
      />

      {entregaModalWork && (
        <ArregloEntregaModal
          isOpen={entregaModalWork != null}
          onClose={() => setEntregaModalWork(null)}
          work={entregaModalWork}
          linkValue={
            (getDraft(entregaModalWork.id).link_drive !== undefined
              ? getDraft(entregaModalWork.id).link_drive
              : entregaModalWork.link_drive) || ""
          }
          onLinkChange={(v) => setDraftField(entregaModalWork.id, "link_drive", v)}
          notaValue={
            getDraft(entregaModalWork.id).nota_entrega !== undefined
              ? getDraft(entregaModalWork.id).nota_entrega
              : ""
          }
          onNotaChange={(v) => setDraftField(entregaModalWork.id, "nota_entrega", v)}
          canEditDelivery={canEditDeliveryForWork(entregaModalWork)}
          canMarkEntregado={canMarkEntregadoForWork(entregaModalWork)}
          isSaving={savingId === entregaModalWork.id}
          onSaveLink={async () => {
            await saveLinkDrive(entregaModalWork);
          }}
          onEntregado={async () => {
            await pasarAEntregado(entregaModalWork);
            setEntregaModalWork(null);
          }}
        />
      )}

      <ConfirmModal
        isOpen={workToDelete != null}
        onClose={() => {
          if (!deletingArreglo) setWorkToDelete(null);
        }}
        onConfirm={() => deleteArregloCompleto(workToDelete)}
        title="Eliminar solicitud de arreglo"
        message={
          workToDelete
            ? `Se eliminará por completo el encargo «${stripHtml(workToDelete.titulo) || "sin título"}» y todos los registros asociados (obra, compositores vinculados, historial de producción, particellas, etc.). Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmLoading={deletingArreglo}
        loadingText="Eliminando…"
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md w-full sm:w-auto"
      />
    </div>
  );
}
