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
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
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
import ArregloQuickEncargoModal from "../../components/arreglos/ArregloQuickEncargoModal";
import ArregloMobileDetailModal from "../../components/arreglos/ArregloMobileDetailModal";
import ArregloAjusteSolicitarModal from "../../components/arreglos/ArregloAjusteSolicitarModal";
import ArregloAjusteEntregarModal from "../../components/arreglos/ArregloAjusteEntregarModal";
import { markEncargoArregloMailSent } from "../../utils/encargoArregloMail";
import { syncObraArregladorFromIntegrante } from "../../utils/syncObraArreglador";
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

  if (aEntregado && bEntregado) {
    const fa = a.fecha_entrega || "";
    const fb = b.fecha_entrega || "";
    if (!fa && !fb) return stripHtmlForSort(a.titulo).localeCompare(stripHtmlForSort(b.titulo));
    if (!fa) return 1;
    if (!fb) return -1;
    const cmp = fb.localeCompare(fa);
    if (cmp !== 0) return cmp;
    return stripHtmlForSort(a.titulo).localeCompare(stripHtmlForSort(b.titulo));
  }

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
const ARREGLOS_PAGE_SIZE = 25;

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

function ajusteTipoLabel(tipo) {
  if (tipo === "correccion") return "Corrección";
  if (tipo === "parte_alternativa") return "Parte alternativa";
  return "Cambio menor";
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

function DiasRestantesDisplay({ work, inline = false }) {
  const info = getDiasRestantesInfo(work);
  if (!info || work.estado !== "Para arreglar") return null;

  const textClass = inline
    ? "text-[10px] text-slate-500 leading-tight"
    : "text-[11px] text-slate-500 leading-tight text-center w-full";
  const numClass = "font-bold tabular-nums text-slate-700";

  const content = (
    <>
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
    </>
  );

  if (inline) {
    return <span className={textClass}>{content}</span>;
  }

  return <p className={textClass}>{content}</p>;
}

function getArregloPriorityClasses(work) {
  const estado = (work.estado || "").toLowerCase();
  if (estado === "entregado" || estado === "oficial") {
    return {
      card: "bg-emerald-50/40 border-2 border-emerald-400",
      row: "bg-emerald-50/40 border-y border-emerald-200",
      rowAccent: "border-l-4 border-emerald-400",
      cellPedido: "bg-emerald-50/15",
    };
  }

  const fechaStr = work.fecha_esperada;
  if (fechaStr) {
    const today = new Date();
    const target = new Date(`${fechaStr}T00:00:00`);
    const diffMs = target.getTime() - today.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays < 2) {
      return {
        card: "bg-red-50/40 border-2 border-red-400",
        row: "bg-red-50/40 border-y border-red-200",
        rowAccent: "border-l-4 border-red-400",
        cellPedido: "bg-sky-50/20",
      };
    }
    if (diffDays < 7) {
      return {
        card: "bg-orange-50/40 border-2 border-orange-400",
        row: "bg-orange-50/40 border-y border-orange-200",
        rowAccent: "border-l-4 border-orange-400",
        cellPedido: "bg-sky-50/20",
      };
    }
  }

  return {
    card: "bg-amber-50/35 border-2 border-amber-400",
    row: "bg-amber-50/35 border-y border-amber-200",
    rowAccent: "border-l-4 border-amber-400",
    cellPedido: "bg-sky-50/20",
  };
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
  onSolicitarAjuste,
  onEntregarAjusteRapido,
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
        <>
          <button
            type="button"
            onClick={onNewVersion}
            className={`${btnBase} bg-slate-100 text-slate-700 hover:bg-slate-200`}
            title="Nueva versión (reemplazar o clonar)"
          >
            <IconCopy size={11} />
            Nueva versión
          </button>
          {canEditFields && onSolicitarAjuste && (
            <button
              type="button"
              onClick={onSolicitarAjuste}
              className={`${btnBase} bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80`}
              title="Solicitar ajuste menor"
            >
              Solicitar ajuste
            </button>
          )}
          {canEditDelivery && onEntregarAjusteRapido && work.link_drive && (
            <button
              type="button"
              onClick={onEntregarAjusteRapido}
              className={`${btnBase} bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80`}
              title="Entregar ajuste (partes nuevas versionadas)"
            >
              Entregar ajuste
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function ArreglosDashboard({ supabase: supabaseClient, onViewInRepertoire, catalogoInstrumentos }) {
  const { user, isEditor, isAdmin, isArreglador } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sb = supabaseClient || supabase;
  const canEditFields = isEditor || isAdmin;
  /** Arreglador sin permisos de edición: puede cargar un arreglo propio (sin encargo/mail). */
  const isSelfArregloMode = Boolean(isArreglador && !canEditFields);
  const canQuickAdd = canEditFields || isArreglador;

  const [loading, setLoading] = useState(true);
  const [works, setWorks] = useState([]);
  const [arregladoresOptions, setArregladoresOptions] = useState([]);
  const [integrantesArregladorOptions, setIntegrantesArregladorOptions] = useState([]);
  const [compositoresOptions, setCompositoresOptions] = useState([]);
  const [filterArregladorId, setFilterArregladorId] = useState("");
  const [showArregladorFilter, setShowArregladorFilter] = useState(false);
  const arregladorFilterRef = useRef(null);
  const [searchObraText, setSearchObraText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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
  const [quickEncargoModalOpen, setQuickEncargoModalOpen] = useState(false);
  const [mobileDetailWork, setMobileDetailWork] = useState(null);
  const [quickRowPulse, setQuickRowPulse] = useState(false);
  const quickRowRef = useRef(null);

  const [workToDelete, setWorkToDelete] = useState(null);
  const [deletingArreglo, setDeletingArreglo] = useState(false);
  const [refsByObra, setRefsByObra] = useState({});
  const [refsModalWork, setRefsModalWork] = useState(null);
  const [entregaModalWork, setEntregaModalWork] = useState(null);

  const [ajustesPendientes, setAjustesPendientes] = useState([]);
  const [obrasAjusteOptions, setObrasAjusteOptions] = useState([]);
  const [solicitarAjusteOpen, setSolicitarAjusteOpen] = useState(false);
  const [solicitarAjusteObraId, setSolicitarAjusteObraId] = useState(null);
  const [solicitarAjusteSaving, setSolicitarAjusteSaving] = useState(false);
  const [entregarAjusteOpen, setEntregarAjusteOpen] = useState(false);
  const [entregarAjusteMode, setEntregarAjusteMode] = useState("entregar");
  const [entregarAjusteTicket, setEntregarAjusteTicket] = useState(null);
  const [entregarAjusteObra, setEntregarAjusteObra] = useState(null);
  const [entregarAjusteSaving, setEntregarAjusteSaving] = useState(false);

  const vistaActiva = searchParams.get("vista") === "ajustes" ? "ajustes" : "arreglos";
  const setVistaActiva = (vista) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "arreglos");
    if (vista === "ajustes") next.set("vista", "ajustes");
    else next.delete("vista");
    setSearchParams(next, { replace: true });
  };

  const fetchAjustesPendientes = async () => {
    try {
      const { data, error } = await sb
        .from("obras_ajustes")
        .select(
          "id, id_obra, tipo, estado, origen, brief, partes_afectadas, fecha_esperada, id_integrante_arreglador, created_at",
        )
        .eq("estado", "pendiente")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const rows = data || [];
      const obraIds = [...new Set(rows.map((r) => r.id_obra).filter(Boolean))];
      let obraMap = new Map();
      if (obraIds.length > 0) {
        const { data: obrasData, error: obrasErr } = await sb
          .from("obras")
          .select("id, titulo, link_drive, estado")
          .in("id", obraIds);
        if (obrasErr) throw obrasErr;
        obraMap = new Map((obrasData || []).map((o) => [o.id, o]));
      }

      setAjustesPendientes(
        rows.map((a) => {
          const obra = obraMap.get(a.id_obra);
          return {
            ...a,
            obra_titulo: obra?.titulo || "",
            link_drive: obra?.link_drive || null,
            obra_estado: obra?.estado || null,
          };
        }),
      );
    } catch (err) {
      console.error("ArreglosDashboard ajustes:", err?.message || err);
      toast.error(err?.message || "No se pudieron cargar los ajustes pendientes.");
      setAjustesPendientes([]);
    }
  };

  const fetchObrasAjusteOptions = async () => {
    try {
      const { data, error } = await sb
        .from("obras")
        .select("id, titulo, link_drive, estado")
        .in("estado", ["Entregado", "Oficial"])
        .not("link_drive", "is", null)
        .order("titulo")
        .limit(800);
      if (error) throw error;
      setObrasAjusteOptions(
        (data || []).map((o) => ({
          id: o.id,
          label: `${stripHtmlForSort(o.titulo) || `Obra #${o.id}`} · ${o.estado}`,
          link_drive: o.link_drive,
          titulo: o.titulo,
          estado: o.estado,
        })),
      );
    } catch (err) {
      console.warn("ArreglosDashboard obras ajuste:", err?.message || err);
      setObrasAjusteOptions([]);
    }
  };

  const fetchWorks = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
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
      await Promise.all([fetchAjustesPendientes(), fetchObrasAjusteOptions()]);
    } catch (err) {
      const msg = err?.message ?? (typeof err === "string" ? err : "Error al cargar encargos.");
      console.error("ArreglosDashboard:", msg);
      setWorks([]);
      toast.error(msg);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorks();
  }, [sb]);

  // Ajustes: carga independiente (no depende de que el listado de obras termine OK)
  useEffect(() => {
    fetchAjustesPendientes();
    fetchObrasAjusteOptions();
  }, [sb]);

  // Cargar lista de compositores para SearchableSelect (encargo o arreglo propio)
  useEffect(() => {
    if (!canQuickAdd) return;
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
  }, [sb, canQuickAdd]);

  // id_integrante_arreglador = integrantes.id del usuario logueado
  useEffect(() => {
    setMyCompositorId(user?.id != null ? user.id : null);
  }, [user?.id]);

  useEffect(() => {
    if (!showArregladorFilter) return;
    const handleClickOutside = (e) => {
      if (arregladorFilterRef.current && !arregladorFilterRef.current.contains(e.target)) {
        setShowArregladorFilter(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showArregladorFilter]);

  const selectArregladorFilter = (id) => {
    setFilterArregladorId(id ? String(id) : "");
    setShowArregladorFilter(false);
  };

  const filteredWorks = useMemo(() => {
    let list = works;
    if (filterArregladorId) {
      list = list.filter((w) => String(w.id_integrante_arreglador) === String(filterArregladorId));
    }
    const q = searchObraText.trim().toLowerCase();
    if (q) {
      list = list.filter((w) => {
        const titulo = stripHtmlForSort(w.titulo).toLowerCase();
        const compositor = (w.compositor_full || "").toLowerCase();
        const arreglador = (w.arreglador_label || "").toLowerCase();
        return titulo.includes(q) || compositor.includes(q) || arreglador.includes(q);
      });
    }
    return [...list].sort(compareArreglosPorUrgencia);
  }, [works, filterArregladorId, searchObraText]);

  const pendientesArreglosCount = useMemo(() => {
    let list = works.filter((w) => (w.estado || "") === "Para arreglar");
    if (filterArregladorId) {
      list = list.filter((w) => String(w.id_integrante_arreglador) === String(filterArregladorId));
    }
    return list.length;
  }, [works, filterArregladorId]);

  const filteredAjustes = useMemo(() => {
    let list = ajustesPendientes;
    if (filterArregladorId) {
      list = list.filter(
        (a) => String(a.id_integrante_arreglador) === String(filterArregladorId),
      );
    }
    const q = searchObraText.trim().toLowerCase();
    if (q) {
      list = list.filter((a) => {
        const titulo = stripHtmlForSort(a.obra_titulo).toLowerCase();
        const brief = (a.brief || "").toLowerCase();
        const partes = (a.partes_afectadas || "").toLowerCase();
        return titulo.includes(q) || brief.includes(q) || partes.includes(q);
      });
    }
    return list;
  }, [ajustesPendientes, filterArregladorId, searchObraText]);

  const pendientesAjustesCount = useMemo(() => {
    if (!filterArregladorId) return ajustesPendientes.length;
    return ajustesPendientes.filter(
      (a) => String(a.id_integrante_arreglador) === String(filterArregladorId),
    ).length;
  }, [ajustesPendientes, filterArregladorId]);

  const arregladorLabelById = useMemo(() => {
    const map = new Map();
    integrantesArregladorOptions.forEach((o) => map.set(Number(o.id), o.label));
    return map;
  }, [integrantesArregladorOptions]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredWorks.length / ARREGLOS_PAGE_SIZE)),
    [filteredWorks.length],
  );

  const paginatedWorks = useMemo(() => {
    const start = (currentPage - 1) * ARREGLOS_PAGE_SIZE;
    return filteredWorks.slice(start, start + ARREGLOS_PAGE_SIZE);
  }, [filteredWorks, currentPage]);

  const mobileDetailWorkLive = useMemo(() => {
    if (!mobileDetailWork?.id) return null;
    return works.find((w) => w.id === mobileDetailWork.id) || mobileDetailWork;
  }, [mobileDetailWork, works]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterArregladorId, searchObraText]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

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
      id_integrante_arreglador:
        isSelfArregloMode && user?.id != null
          ? user.id
          : DEFAULT_ARREGLADOR_INTEGRANTE_ID,
    });
  };

  const openEncargarArreglo = () => {
    if (!canQuickAdd) return;
    if (isSelfArregloMode && user?.id != null) {
      setQuickDraft((prev) => ({
        ...prev,
        id_integrante_arreglador: user.id,
      }));
    }
    const isMobile =
      typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) {
      setQuickEncargoModalOpen(true);
      return;
    }
    setShowQuickRow(true);
    setQuickRowPulse(true);
    window.setTimeout(() => setQuickRowPulse(false), 3500);
  };

  const handleQuickCancel = () => {
    setShowQuickRow(false);
    setQuickEncargoModalOpen(false);
    setQuickRowPulse(false);
    resetQuickDraft();
  };

  useEffect(() => {
    if (showQuickRow && quickRowRef.current) {
      quickRowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [showQuickRow, quickRowPulse]);

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

  const enviarEncargoAjuste = async ({
    idAjuste,
    idObra,
    tituloStr,
    idIntegranteArregladorVal,
    linkDrive,
    brief,
    tipo,
    partesAfectadas,
    fechaEsperada,
    solicitadoPor,
  }) => {
    const integranteOpt = integrantesArregladorOptions.find(
      (i) => Number(i.id) === Number(idIntegranteArregladorVal),
    );
    const emailTo = integranteOpt?.mail || null;
    if (!emailTo) {
      toast.error("No se encontró email del arreglador para el ajuste.");
      return false;
    }
    const { error } = await sb.functions.invoke("mails_produccion", {
      body: {
        action: "enviar_mail",
        templateId: "encargo_ajuste",
        email: emailTo,
        bcc: ["ofrn.archivo@gmail.com"],
        nombre: user ? `${user.apellido || ""}, ${user.nombre || ""}`.trim() : "Sistema",
        gira: null,
        detalle: {
          titulo: tituloStr,
          arreglador: integranteOpt?.label || "",
          id_obra: idObra,
          id_ajuste: idAjuste,
          link_drive: linkDrive || null,
          brief: brief || null,
          tipo: tipo || "cambio_menor",
          partes_afectadas: partesAfectadas || null,
          fecha_esperada: fechaEsperada || null,
          solicitado_por: solicitadoPor || null,
        },
      },
    });
    if (error) {
      console.error("mails_produccion (encargo_ajuste):", error);
      toast.error("Ajuste creado, pero no se pudo enviar el mail.");
      return false;
    }
    toast.success("Mail de ajuste enviado al arreglador (BCC Archivo).");
    return true;
  };

  const handleSolicitarAjuste = async (payload) => {
    if (!canEditFields) return;
    const idObra = payload?.id_obra;
    const arregladorId = payload?.id_integrante_arreglador;
    if (!idObra || !arregladorId) {
      toast.error("Elegí obra y arreglador.");
      return;
    }
    setSolicitarAjusteSaving(true);
    try {
      const obraOpt = obrasAjusteOptions.find((o) => Number(o.id) === Number(idObra));
      const { data, error } = await sb
        .from("obras_ajustes")
        .insert([
          {
            id_obra: Number(idObra),
            tipo: payload.tipo || "cambio_menor",
            estado: "pendiente",
            origen: "solicitud_interna",
            id_integrante_arreglador: Number(arregladorId),
            id_usuario_solicita: user?.id || null,
            fecha_esperada: payload.fecha_esperada || null,
            brief: payload.brief || null,
            partes_afectadas: payload.partes_afectadas || null,
          },
        ])
        .select("id")
        .single();
      if (error) throw error;

      await enviarEncargoAjuste({
        idAjuste: data.id,
        idObra: Number(idObra),
        tituloStr: stripHtmlForSort(obraOpt?.titulo) || `Obra #${idObra}`,
        idIntegranteArregladorVal: arregladorId,
        linkDrive: obraOpt?.link_drive || null,
        brief: payload.brief,
        tipo: payload.tipo,
        partesAfectadas: payload.partes_afectadas,
        fechaEsperada: payload.fecha_esperada,
        solicitadoPor: getSolicitanteLabelForUser(),
      });

      setSolicitarAjusteOpen(false);
      setSolicitarAjusteObraId(null);
      await fetchAjustesPendientes();
      toast.success("Ajuste pendiente creado.");
    } catch (e) {
      console.error("solicitar ajuste:", e);
      toast.error(e?.message || "No se pudo crear el ajuste.");
    } finally {
      setSolicitarAjusteSaving(false);
    }
  };

  const openEntregarAjusteTicket = (ajuste) => {
    setEntregarAjusteMode("entregar");
    setEntregarAjusteTicket(ajuste);
    setEntregarAjusteObra(
      ajuste
        ? {
            id: ajuste.id_obra,
            titulo: ajuste.obra_titulo,
            link_drive: ajuste.link_drive,
          }
        : null,
    );
    setEntregarAjusteOpen(true);
  };

  const openCargaPropiaAjuste = (obra = null) => {
    setEntregarAjusteMode("carga_propia");
    setEntregarAjusteTicket(null);
    setEntregarAjusteObra(obra);
    setEntregarAjusteOpen(true);
  };

  const handleEntregarAjuste = async (payload) => {
    setEntregarAjusteSaving(true);
    try {
      const body = {
        action: "entregar_ajuste",
        id_ajuste: payload.id_ajuste || null,
        id_obra: payload.id_obra,
        link_carpetas: payload.link_carpetas || [],
        link_archivos: payload.link_archivos || [],
        archivos: payload.archivos || [],
        observacion: payload.observacion || "",
        origen: payload.origen || (payload.id_ajuste ? "solicitud_interna" : "carga_propia"),
        id_integrante_arreglador: user?.id || null,
        id_usuario_solicita: user?.id || null,
        tipo: "cambio_menor",
      };
      const { data, error } = await sb.functions.invoke("manage-drive", { body });
      const parsed = await readManageDriveResponseBody(error, data);
      if (error && !parsed?.success) {
        throw new Error(
          parsed?.error || parsed?.message || error?.message || "Error al entregar ajuste",
        );
      }
      if (!parsed?.success) {
        throw new Error(parsed?.error || parsed?.message || "Error al entregar ajuste");
      }
      toast.success(
        `Ajuste entregado: ${(parsed.archivos || []).length || 0} archivo(s) como partes nuevas.`,
      );
      setEntregarAjusteOpen(false);
      setEntregarAjusteTicket(null);
      setEntregarAjusteObra(null);
      await fetchWorks({ silent: true });
    } catch (e) {
      console.error("entregar ajuste:", e);
      toast.error(e?.message || "No se pudo entregar el ajuste.");
    } finally {
      setEntregarAjusteSaving(false);
    }
  };

  const canActOnAjuste = (ajuste) => {
    if (isAdmin) return true;
    return (
      ajuste?.id_integrante_arreglador != null &&
      myCompositorId != null &&
      Number(ajuste.id_integrante_arreglador) === Number(myCompositorId)
    );
  };

  const handleQuickSave = async () => {
    if (!canQuickAdd) return;
    const compositorId = quickDraft.compositorId;
    const titulo = (quickDraft.titulo || "").trim();
    const selfMode = isSelfArregloMode;
    const arregladorId = selfMode
      ? user?.id
      : quickDraft.id_integrante_arreglador || DEFAULT_ARREGLADOR_INTEGRANTE_ID;

    if (!compositorId) {
      toast.error("Seleccioná un compositor para el encargo.");
      return;
    }
    if (!titulo) {
      toast.error("Ingresá el título de la obra para el encargo.");
      return;
    }
    if (!arregladorId) {
      toast.error(
        selfMode
          ? "No se pudo identificar tu usuario como arreglador."
          : "Seleccioná un arreglador para el encargo."
      );
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

        await syncObraArregladorFromIntegrante(sb, data.id, arregladorId);

        // Mail al arreglador + BCC a ofrn.archivo@gmail.com (también en autogestión)
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

      toast.success(
        selfMode
          ? "Arreglo nuevo creado. Ya podés cargar el link de entrega."
          : "Nuevo encargo de arreglo creado y asignado."
      );
      handleQuickCancel();
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

  const closeWorkFormModal = ({ refresh = true } = {}) => {
    setWorkFormModalOpen(false);
    setWorkFormInitialData({});
    if (refresh) {
      void fetchWorks({ silent: true });
    }
  };

  const handleSaveWorkForm = async (savedId = null, shouldClose = true) => {
    if (shouldClose) {
      closeWorkFormModal({ refresh: false });
      await fetchWorks({ silent: true });
    }
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

      // SET NULL en id_obra_referencia rompe arreglos_referencias_has_target si link es NULL
      const { error: refAsTargetErr } = await sb
        .from("arreglos_referencias")
        .delete()
        .eq("id_obra_referencia", obraId);
      if (refAsTargetErr) throw refAsTargetErr;

      const childDeletes = [
        { table: "arreglos_referencias", column: "id_obra" },
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
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <IconMusicNote className="text-indigo-600" />
              {vistaActiva === "ajustes" ? "Ajustes menores" : "Obras para arreglar"}
            </h2>
            <p className="text-xs text-slate-500 mt-1 hidden sm:block">
              {vistaActiva === "ajustes"
                ? "Pedidos menores sobre obras ya entregadas/oficiales: partes nuevas versionadas, sin clonar el catálogo."
                : "Encargos de arreglo: «Para arreglar», «Entregado» o con arreglador asignado. Cargá el link de Drive y pasá a Entregado."}
            </p>
            <div
              className="mt-3 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5"
              role="tablist"
              aria-label="Arreglos o ajustes"
            >
              <button
                type="button"
                role="tab"
                aria-selected={vistaActiva === "arreglos"}
                onClick={() => setVistaActiva("arreglos")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${
                  vistaActiva === "arreglos"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                Arreglos
                <span
                  className={`min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                    vistaActiva === "arreglos"
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {pendientesArreglosCount}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={vistaActiva === "ajustes"}
                onClick={() => setVistaActiva("ajustes")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${
                  vistaActiva === "ajustes"
                    ? "bg-white text-amber-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                Ajustes
                <span
                  className={`min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                    vistaActiva === "ajustes"
                      ? "bg-amber-100 text-amber-900"
                      : pendientesAjustesCount > 0
                        ? "bg-amber-200 text-amber-900"
                        : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {pendientesAjustesCount}
                </span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            {vistaActiva === "arreglos" && canQuickAdd && (
              <button
                type="button"
                onClick={openEncargarArreglo}
                className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm shrink-0"
              >
                <IconPlus size={16} />
                {isSelfArregloMode ? "Arreglo nuevo" : "Encargar arreglo"}
              </button>
            )}
            {vistaActiva === "ajustes" && (canEditFields || isArreglador) && (
              <>
                {canEditFields && (
                  <button
                    type="button"
                    onClick={() => {
                      setSolicitarAjusteObraId(null);
                      setSolicitarAjusteOpen(true);
                    }}
                    className="bg-amber-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-amber-700 flex items-center gap-2 shadow-sm shrink-0"
                    title="Solicitar ajuste menor sobre una obra"
                  >
                    <IconPlus size={16} />
                    Solicitar ajuste
                  </button>
                )}
                {isArreglador && (
                  <button
                    type="button"
                    onClick={() => openCargaPropiaAjuste(null)}
                    className="bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-emerald-800 flex items-center gap-2 shadow-sm shrink-0"
                    title="Cargar ajuste encargado por otra vía"
                  >
                    <IconPlus size={16} />
                    + Ajuste
                  </button>
                )}
              </>
            )}
            <div className="relative shrink-0" ref={arregladorFilterRef}>
              <button
                type="button"
                onClick={() => setShowArregladorFilter((v) => !v)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                  showArregladorFilter || filterArregladorId
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                    : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
                }`}
                aria-expanded={showArregladorFilter}
                aria-label="Filtrar por arreglador"
                title="Filtrar por arreglador"
              >
                <IconFilter size={18} />
              </button>
              {showArregladorFilter && (
                <div className="absolute right-0 top-full z-40 mt-1 w-[min(18rem,calc(100vw-2rem))] max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100">
                    <h3 className="text-xs font-bold uppercase text-slate-600">Arreglador</h3>
                    <button
                      type="button"
                      onClick={() => setShowArregladorFilter(false)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100"
                      aria-label="Cerrar filtros"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                  <ul className="py-1">
                    <li>
                      <button
                        type="button"
                        onClick={() => selectArregladorFilter("")}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                          !filterArregladorId ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-700"
                        }`}
                      >
                        Todos los arregladores
                      </button>
                    </li>
                    {arregladoresOptions.map((opt) => (
                      <li key={opt.id}>
                        <button
                          type="button"
                          onClick={() => selectArregladorFilter(opt.id)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 truncate ${
                            String(filterArregladorId) === String(opt.id)
                              ? "bg-indigo-50 text-indigo-700 font-semibold"
                              : "text-slate-700"
                          }`}
                        >
                          {opt.label}
                          {Number(myCompositorId) === Number(opt.id) ? " (vos)" : ""}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white rounded-xl border border-slate-200 shadow-sm min-h-0">
        {vistaActiva === "ajustes" ? (
          loading ? (
            <div className="p-20 text-center text-indigo-500 flex flex-col items-center gap-2">
              <IconLoader className="animate-spin" size={28} />
              <span>Cargando...</span>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm table-fixed">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-center py-3 px-2 font-bold text-slate-600 uppercase text-xs w-[8%] min-w-[6.5rem]">
                        F. est.
                      </th>
                      <th className="text-left py-3 px-3 font-bold text-slate-600 uppercase text-xs w-[26%] min-w-[12rem]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0">Obra · Arreglador</span>
                          <div className="relative font-normal normal-case shrink-0">
                            <IconSearch
                              size={11}
                              className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            />
                            <input
                              type="search"
                              value={searchObraText}
                              onChange={(e) => setSearchObraText(e.target.value)}
                              placeholder="Buscar…"
                              className="w-[5.5rem] pl-5 pr-1 py-0.5 text-[10px] border border-slate-200 rounded bg-white text-slate-700 outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
                              aria-label="Buscar ajustes"
                            />
                          </div>
                        </div>
                      </th>
                      <th className="text-left py-3 px-2 font-bold text-slate-600 uppercase text-xs w-[12%] min-w-[6rem]">
                        Tipo
                      </th>
                      <th className="text-left py-3 px-2 font-bold text-slate-600 uppercase text-xs w-[10%] min-w-[5rem]">
                        Estado obra
                      </th>
                      <th className="text-left py-3 px-3 font-bold text-slate-600 uppercase text-xs w-[28%] min-w-[10rem]">
                        Brief / Partes
                      </th>
                      <th className="text-left py-3 px-2 font-bold text-slate-600 uppercase text-xs w-[12%] min-w-[5.5rem]">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAjustes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 italic text-sm">
                          {searchObraText.trim() || filterArregladorId
                            ? "Ningún ajuste coincide con el filtro."
                            : "No hay ajustes pendientes."}
                        </td>
                      </tr>
                    ) : (
                      filteredAjustes.map((aj) => {
                        const titulo = stripHtmlForSort(aj.obra_titulo) || `Obra #${aj.id_obra}`;
                        const tipoLabel = ajusteTipoLabel(aj.tipo);
                        const canDeliver = canActOnAjuste(aj);
                        const arregladorNom =
                          arregladorLabelById.get(Number(aj.id_integrante_arreglador)) || null;
                        const fechaFmt = formatFechaCorta(aj.fecha_esperada);
                        return (
                          <tr key={aj.id} className="hover:bg-amber-50/40">
                            <td className="py-2 px-3 align-top text-center min-w-[6.5rem]">
                              {fechaFmt ? (
                                <span className="text-[11px] font-mono font-semibold text-slate-700 block">
                                  {fechaFmt}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-300 italic block">Sin fecha</span>
                              )}
                              {aj.origen === "carga_propia" ? (
                                <span className="inline-flex mt-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                                  Carga propia
                                </span>
                              ) : (
                                <span className="inline-flex mt-1 text-[9px] font-semibold uppercase tracking-wide text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-1.5 py-0.5">
                                  Solicitud
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 align-top min-w-[12rem]">
                              <p className="text-sm font-bold text-slate-800 leading-snug" title={titulo}>
                                {titulo}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                {arregladorNom ? `Arreglador: ${arregladorNom}` : "Sin arreglador"}
                              </p>
                            </td>
                            <td className="py-2 px-2 align-top">
                              <span className="inline-flex text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                                {tipoLabel}
                              </span>
                            </td>
                            <td className="py-2 px-2 align-top">
                              {aj.obra_estado ? (
                                <span
                                  className={`inline-flex text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                    aj.obra_estado === "Oficial"
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                      : "bg-sky-50 text-sky-800 border-sky-300"
                                  }`}
                                >
                                  {aj.obra_estado}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-300 italic">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 align-top">
                              {aj.brief ? (
                                <div className={`${NOTAS_STICKY_PANEL_CLASS} px-1.5 py-1 mb-1`}>
                                  <p className="text-[11px] text-yellow-950 line-clamp-3 leading-snug pl-2">
                                    {aj.brief}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300 italic">Sin brief</span>
                              )}
                              {aj.partes_afectadas ? (
                                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                                  Partes: {aj.partes_afectadas}
                                </p>
                              ) : null}
                            </td>
                            <td className="py-2 px-2 align-top">
                              <div className="flex flex-col gap-1 min-w-[5.5rem] max-w-[8rem]">
                                <div className="flex items-center gap-1">
                                  {aj.link_drive ? (
                                    <a
                                      href={aj.link_drive}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 border border-amber-200/60"
                                      title="Abrir carpeta de la obra"
                                    >
                                      <IconFolder size={15} />
                                    </a>
                                  ) : (
                                    <span className="p-1.5 text-slate-300" title="Sin carpeta">
                                      <IconFolder size={15} />
                                    </span>
                                  )}
                                </div>
                                {canDeliver && (
                                  <button
                                    type="button"
                                    onClick={() => openEntregarAjusteTicket(aj)}
                                    className="w-full text-[10px] font-bold px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-1"
                                  >
                                    Entregar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                {filteredAjustes.length > 0 && (
                  <div className="px-3 py-2 border-t border-slate-200 bg-slate-50/80 text-[10px] font-medium text-slate-500 flex justify-end">
                    {filteredAjustes.length} ajuste{filteredAjustes.length === 1 ? "" : "s"} pendiente
                    {filteredAjustes.length === 1 ? "" : "s"}
                  </div>
                )}
              </div>

              <div className="md:hidden flex flex-col min-h-0">
                <div className="shrink-0 p-2 border-b border-slate-200 bg-slate-50">
                  <div className="relative">
                    <IconSearch
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type="search"
                      value={searchObraText}
                      onChange={(e) => setSearchObraText(e.target.value)}
                      placeholder="Buscar obra, brief o partes…"
                      className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-400"
                      aria-label="Buscar ajustes"
                    />
                  </div>
                </div>
                {filteredAjustes.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 italic">
                    {searchObraText.trim() || filterArregladorId
                      ? "Ningún ajuste coincide con el filtro."
                      : "No hay ajustes pendientes."}
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {filteredAjustes.map((aj) => {
                      const titulo = stripHtmlForSort(aj.obra_titulo) || `Obra #${aj.id_obra}`;
                      const tipoLabel = ajusteTipoLabel(aj.tipo);
                      const canDeliver = canActOnAjuste(aj);
                      const arregladorNom =
                        arregladorLabelById.get(Number(aj.id_integrante_arreglador)) || null;
                      return (
                        <li
                          key={aj.id}
                          className="px-3 py-3 flex flex-col gap-2 hover:bg-amber-50/40"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                                {tipoLabel}
                              </span>
                              {aj.fecha_esperada ? (
                                <span className="text-[11px] font-mono text-slate-500">
                                  Est. {formatFechaCorta(aj.fecha_esperada)}
                                </span>
                              ) : null}
                              {aj.obra_estado ? (
                                <span className="text-[10px] text-slate-500">{aj.obra_estado}</span>
                              ) : null}
                            </div>
                            <p className="text-sm font-bold text-slate-800 truncate" title={titulo}>
                              {titulo}
                            </p>
                            {aj.brief ? (
                              <p className="text-xs text-slate-600 line-clamp-2">{aj.brief}</p>
                            ) : null}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                              {aj.partes_afectadas ? (
                                <span>Partes: {aj.partes_afectadas}</span>
                              ) : null}
                              {arregladorNom ? <span>Arreglador: {arregladorNom}</span> : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {aj.link_drive ? (
                              <a
                                href={aj.link_drive}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg text-amber-700 hover:bg-amber-50 border border-amber-200/60"
                                title="Abrir carpeta de la obra"
                              >
                                <IconFolder size={16} />
                              </a>
                            ) : null}
                            {canDeliver && (
                              <button
                                type="button"
                                onClick={() => openEntregarAjusteTicket(aj)}
                                className="text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                              >
                                Entregar
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {filteredAjustes.length > 0 && (
                  <div className="shrink-0 px-3 py-2 border-t border-slate-200 bg-slate-50/80 text-[10px] font-medium text-slate-500">
                    {filteredAjustes.length} ajuste{filteredAjustes.length === 1 ? "" : "s"} pendiente
                    {filteredAjustes.length === 1 ? "" : "s"}
                  </div>
                )}
              </div>
            </>
          )
        ) : loading ? (
          <div className="p-20 text-center text-indigo-500 flex flex-col items-center gap-2">
            <IconLoader className="animate-spin" size={28} />
            <span>Cargando...</span>
          </div>
        ) : works.length === 0 && !(canQuickAdd && showQuickRow) ? (
          <div className="p-12 text-center text-slate-500 italic">
            No hay obras con encargos de arreglo para mostrar.
          </div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm table-fixed">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-center py-3 px-2 font-bold text-slate-600 uppercase text-xs w-[8%] min-w-[6.5rem]">
                    F. est.
                  </th>
                  <th className="text-left py-3 px-3 font-bold text-slate-600 uppercase text-xs w-[24%] min-w-[12rem]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">Obra / Compositor · Arreglador</span>
                      <div className="relative font-normal normal-case shrink-0">
                        <IconSearch
                          size={11}
                          className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="search"
                          value={searchObraText}
                          onChange={(e) => setSearchObraText(e.target.value)}
                          placeholder="Buscar…"
                          className="w-[5.5rem] pl-5 pr-1 py-0.5 text-[10px] border border-slate-200 rounded bg-white text-slate-700 outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                          aria-label="Buscar por obra, compositor o arreglador"
                        />
                      </div>
                    </div>
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
                {canQuickAdd && showQuickRow && (
                  <tr
                    ref={quickRowRef}
                    className={`border-b border-slate-100 bg-yellow-50/30 hover:bg-yellow-50/50 transition-shadow ${
                      quickRowPulse ? "animate-pulse ring-2 ring-indigo-400 ring-inset" : ""
                    }`}
                  >
                        <td className="py-2 px-3 align-top text-xs whitespace-nowrap bg-sky-50/20 min-w-[6.5rem]">
                          <FechaEntregaCell
                            work={{ estado: "Para arreglar" }}
                            canEditFecha
                            fechaValue={quickDraft.fecha_esperada || ""}
                            onFechaChange={(v) => setQuickDraftField("fecha_esperada", v)}
                            solicitanteLabel={getSolicitanteLabelForUser()}
                          />
                        </td>
                        <td className="py-2 px-3 align-top bg-sky-50/20 min-w-[14rem]">
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
                        <td className="py-2 px-1 align-top text-center text-xs text-slate-400 bg-sky-50/20 w-10">
                          —
                        </td>
                        <td className="py-2 px-3 align-top bg-sky-50/20">
                          <input
                            type="text"
                            value={quickDraft.instrumentacion}
                            onChange={(e) => setQuickDraftField("instrumentacion", e.target.value)}
                            placeholder="Orgánico"
                            className="w-full min-w-[6rem] text-xs border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3 align-top text-xs bg-sky-50/20">
                          <input
                            type="text"
                            value={quickDraft.dificultad}
                            onChange={(e) => setQuickDraftField("dificultad", e.target.value)}
                            placeholder="Dificultad"
                            className="w-full min-w-[70px] border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3 align-top text-xs bg-sky-50/20">
                          <ObservacionesStickyCell
                            value={quickDraft.observaciones}
                            onChange={(v) => setQuickDraftField("observaciones", v)}
                            canEdit
                            placeholder="Observación del pedido…"
                          />
                        </td>
                        <td className="py-2 px-3 align-top">
                          <div className="flex flex-col gap-2">
                            {isSelfArregloMode ? (
                              <div className="text-xs font-semibold text-slate-800 border border-slate-200 bg-slate-50 rounded px-2 py-1.5">
                                {getSolicitanteLabelForUser() || "Vos"}
                              </div>
                            ) : (
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
                            )}
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
                                {isSelfArregloMode ? "Guardar" : "Asignar a..."}
                              </button>
                              <button
                                type="button"
                                onClick={handleQuickCancel}
                                disabled={quickSaving}
                                className="text-[10px] font-bold px-2 py-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 flex items-center gap-1"
                              >
                                <IconX size={12} />
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                )}

                {filteredWorks.length === 0 && !showQuickRow ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 italic text-sm">
                      {searchObraText.trim()
                        ? "Ninguna obra coincide con la búsqueda."
                        : "Ninguna obra para el arreglador seleccionado."}
                    </td>
                  </tr>
                ) : null}

                {paginatedWorks.map((work) => {
                  const draft = getDraft(work.id);
                  const linkValue = draft.link_drive !== undefined ? draft.link_drive : (work.link_drive || "");
                  const notaValue = draft.nota_entrega !== undefined ? draft.nota_entrega : "";
                  const isSaving = savingId === work.id;
                  const isParaArreglar = work.estado === "Para arreglar";
                  const priorityClasses = getArregloPriorityClasses(work);
                  return (
                    <tr
                      key={work.id}
                      className={`hover:brightness-[0.99] ${priorityClasses.row}`}
                    >
                      <td className={`py-2 px-3 align-top min-w-[6.5rem] ${priorityClasses.rowAccent} ${priorityClasses.cellPedido}`}>
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
                      <td className={`py-2 px-3 align-top min-w-[14rem] ${priorityClasses.cellPedido}`}>
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
                            {Number(myCompositorId) === Number(work.id_integrante_arreglador) && (
                              <span className="text-indigo-500 ml-1">(vos)</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className={`py-2 px-1 align-top text-center w-10 ${priorityClasses.cellPedido}`}>
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
                      <td className={`py-2 px-3 h-px align-stretch ${priorityClasses.cellPedido}`}>
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
                      <td className={`py-2 px-3 align-top text-xs ${priorityClasses.cellPedido}`}>
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
                      <td className={`py-2 px-3 h-px align-stretch ${priorityClasses.cellPedido}`}>
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
                          onSolicitarAjuste={() => {
                            setSolicitarAjusteObraId(work.id);
                            setSolicitarAjusteOpen(true);
                          }}
                          onEntregarAjusteRapido={() => openCargaPropiaAjuste(work)}
                        />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredWorks.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 border-t border-slate-200 bg-slate-50/80">
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1 || loading}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="p-1 rounded border bg-white disabled:opacity-30 hover:bg-indigo-50 text-indigo-600 transition-colors"
                      aria-label="Página anterior"
                    >
                      <IconChevronLeft size={14} />
                    </button>
                    <div className="text-xs font-medium text-slate-600">
                      Pág. <span className="font-bold text-indigo-600">{currentPage}</span> / {totalPages}
                    </div>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages || loading}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="p-1 rounded border bg-white disabled:opacity-30 hover:bg-indigo-50 text-indigo-600 transition-colors"
                      aria-label="Página siguiente"
                    >
                      <IconChevronRight size={14} />
                    </button>
                  </div>
                )}
                <div className="text-[10px] font-medium text-slate-500">
                  Mostrando {paginatedWorks.length} de {filteredWorks.length} arreglo
                  {filteredWorks.length === 1 ? "" : "s"}
                </div>
              </div>
            )}
          </div>

          <div className="md:hidden flex flex-col min-h-0">
            <div className="shrink-0 p-2 border-b border-slate-200 bg-slate-50 space-y-2">
              <div className="relative">
                <IconSearch
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="search"
                  value={searchObraText}
                  onChange={(e) => setSearchObraText(e.target.value)}
                  placeholder="Buscar obra, compositor o arreglador…"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                  aria-label="Buscar por obra, compositor o arreglador"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filteredWorks.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic text-sm">
                  {searchObraText.trim()
                    ? "Ninguna obra coincide con la búsqueda."
                    : "Ninguna obra para el arreglador seleccionado."}
                </div>
              ) : null}
              {paginatedWorks.map((work) => {
                const fechaFmt = formatFechaCorta(
                  isArregloEntregado(work) ? work.fecha_entrega : work.fecha_esperada,
                );
                const refCount = (refsByObra[work.id] || []).length;
                return (
                  <button
                    key={work.id}
                    type="button"
                    onClick={() => setMobileDetailWork(work)}
                    className={`w-full text-left rounded-xl p-3 shadow-sm active:scale-[0.99] transition-transform ${getArregloPriorityClasses(work).card}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                            work.estado === "Para arreglar"
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : work.estado === "Oficial"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-sky-50 text-sky-800 border-sky-300"
                          }`}
                        >
                          {work.estado}
                        </span>
                        {work.estado === "Para arreglar" ? (
                          <DiasRestantesDisplay work={work} inline />
                        ) : null}
                      </div>
                      {fechaFmt ? (
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {isArregloEntregado(work) ? `Ent. ${fechaFmt}` : `Est. ${fechaFmt}`}
                        </span>
                      ) : null}
                    </div>
                    <div
                      className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 [&_b]:font-semibold"
                      dangerouslySetInnerHTML={{ __html: work.titulo || "Sin título" }}
                    />
                    {work.compositor_full ? (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{work.compositor_full}</p>
                    ) : null}
                    {work.arreglador_label ? (
                      <p className="text-xs text-slate-600 mt-0.5 truncate">
                        {work.arreglador_label}
                        {Number(myCompositorId) === Number(work.id_integrante_arreglador) ? (
                          <span className="text-indigo-500 ml-1">(vos)</span>
                        ) : null}
                      </p>
                    ) : null}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                      {work.instrumentacion ? (
                        <span className="truncate font-mono max-w-[70%]">{work.instrumentacion}</span>
                      ) : null}
                      {refCount > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-amber-700">
                          <IconDrive size={11} />
                          {refCount} ref.
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredWorks.length > 0 && (
              <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 border-t border-slate-200 bg-slate-50/80">
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1 || loading}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="p-1 rounded border bg-white disabled:opacity-30 hover:bg-indigo-50 text-indigo-600"
                      aria-label="Página anterior"
                    >
                      <IconChevronLeft size={14} />
                    </button>
                    <div className="text-xs font-medium text-slate-600">
                      Pág. <span className="font-bold text-indigo-600">{currentPage}</span> / {totalPages}
                    </div>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages || loading}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="p-1 rounded border bg-white disabled:opacity-30 hover:bg-indigo-50 text-indigo-600"
                      aria-label="Página siguiente"
                    >
                      <IconChevronRight size={14} />
                    </button>
                  </div>
                )}
                <div className="text-[10px] font-medium text-slate-500">
                  {paginatedWorks.length} de {filteredWorks.length} arreglos
                </div>
              </div>
            )}
          </div>
          </>
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
            setMobileDetailWork(null);
          }}
        />
      )}

      <ArregloQuickEncargoModal
        isOpen={quickEncargoModalOpen}
        onClose={handleQuickCancel}
        quickDraft={quickDraft}
        onFieldChange={setQuickDraftField}
        compositoresOptions={compositoresOptions}
        integrantesArregladorOptions={integrantesArregladorOptions}
        solicitanteLabel={getSolicitanteLabelForUser()}
        onSave={handleQuickSave}
        onOpenNewComposer={() => setIsQuickCompOpen(true)}
        saving={quickSaving}
        mode={isSelfArregloMode ? "self" : "encargo"}
        arregladorFixedLabel={getSolicitanteLabelForUser()}
      />

      <ArregloAjusteSolicitarModal
        isOpen={solicitarAjusteOpen}
        onClose={() => {
          setSolicitarAjusteOpen(false);
          setSolicitarAjusteObraId(null);
        }}
        obrasOptions={obrasAjusteOptions}
        integrantesArregladorOptions={integrantesArregladorOptions}
        defaultArregladorId={DEFAULT_ARREGLADOR_INTEGRANTE_ID}
        defaultObraId={solicitarAjusteObraId}
        solicitanteLabel={getSolicitanteLabelForUser()}
        saving={solicitarAjusteSaving}
        onSubmit={handleSolicitarAjuste}
      />

      <ArregloAjusteEntregarModal
        isOpen={entregarAjusteOpen}
        onClose={() => {
          setEntregarAjusteOpen(false);
          setEntregarAjusteTicket(null);
          setEntregarAjusteObra(null);
        }}
        mode={entregarAjusteMode}
        ajuste={entregarAjusteTicket}
        obra={entregarAjusteObra}
        obrasOptions={obrasAjusteOptions}
        saving={entregarAjusteSaving}
        onSubmit={handleEntregarAjuste}
      />

      {mobileDetailWorkLive && (
        <ArregloMobileDetailModal
          isOpen={mobileDetailWorkLive != null}
          onClose={() => setMobileDetailWork(null)}
          work={mobileDetailWorkLive}
          draft={getDraft(mobileDetailWorkLive.id)}
          fieldStatus={fieldStatus}
          fieldStatusKey={fieldStatusKey}
          getFieldStatusClass={getFieldStatusClass}
          canEditFields={canEditFields}
          canEditDelivery={canEditDeliveryForWork(mobileDetailWorkLive)}
          myCompositorId={myCompositorId}
          refCount={(refsByObra[mobileDetailWorkLive.id] || []).length}
          isSaving={savingId === mobileDetailWorkLive.id}
          onFechaChange={(v) => {
            const nextVal = v || "";
            setDraftField(mobileDetailWorkLive.id, "fecha_esperada", nextVal);
            const current = mobileDetailWorkLive.fecha_esperada || "";
            if (nextVal !== current) {
              saveEditorField(mobileDetailWorkLive, "fecha_esperada", nextVal);
            }
          }}
          onInstrumentacionBlur={(v) => {
            if (v !== (mobileDetailWorkLive.instrumentacion || "")) {
              saveEditorField(mobileDetailWorkLive, "instrumentacion", v);
            }
          }}
          onDificultadBlur={(v) => {
            if (v !== (mobileDetailWorkLive.dificultad || "")) {
              saveEditorField(mobileDetailWorkLive, "dificultad", v);
            }
          }}
          onObservacionesBlur={(v) => {
            if (v !== stripHtml(mobileDetailWorkLive.observaciones || "")) {
              saveEditorField(mobileDetailWorkLive, "observaciones", v);
            }
          }}
          onDraftChange={(field, value) => setDraftField(mobileDetailWorkLive.id, field, value)}
          onOpenRefs={() => {
            setRefsModalWork(mobileDetailWorkLive);
          }}
          onOpenEntrega={() => {
            setEntregaModalWork(mobileDetailWorkLive);
          }}
          onEdit={() => {
            setMobileDetailWork(null);
            openWorkFormModal(mobileDetailWorkLive.id);
          }}
          onDelete={() => {
            setMobileDetailWork(null);
            setWorkToDelete(mobileDetailWorkLive);
          }}
          onNewVersion={() => {
            setMobileDetailWork(null);
            setNewVersionWork(mobileDetailWorkLive);
            setNewVersionModalOpen(true);
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
