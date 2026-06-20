import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import EntradasCompartirConciertoBtn from "../../../components/entradas/EntradasCompartirConciertoBtn";
import EntradasDisponibilidadBar from "../../../components/entradas/EntradasDisponibilidadBar";
import EntradasDriveCoverImage from "../../../components/entradas/EntradasDriveCoverImage";
import EntradasLiveQrScanner from "../../../components/entradas/EntradasLiveQrScanner";
import EntradasMisReservasSection from "../../../components/entradas/EntradasMisReservasSection";
import EntradasTercerosSection from "../../../components/entradas/EntradasTercerosSection";
import MisReservasQrPanel from "../../../components/entradas/MisReservasQrPanel";
import {
  IconCamera,
  IconChevronLeft,
  IconCopy,
  IconEdit,
  IconHelpCircle,
  IconMail,
  IconMoon,
  IconSun,
  IconTrash,
  IconX,
} from "../../../components/ui/Icons";
import EntradasRichTextHtml from "../../../components/ui/EntradasRichTextHtml";
import RichTextEditor from "../../../components/ui/RichTextEditor";
import { supabaseEntradasPublic } from "../../../services/supabase";
import {
  adminInviteEntradaUsuario,
  adminUpdateUsuarioRol,
  getAdminConciertoStats,
  getAdminProgramaMailBuckets,
  adminUpsertConcierto,
  adminUpsertPrograma,
  adminDeleteConcierto,
  adminDeletePrograma,
  blobToPdfBase64ForMail,
  buildEntradasRecordarmeUrl,
  buildEntradasReservaPdfConDataUrls,
  computeDisponibles,
  conciertoSinPlazasDisponibles,
  crearReserva,
  crearReservaTercero,
  buscarBeneficiarioPorEmail,
  cancelarReservaTercero,
  fetchConciertosDisponibilidad,
  programasConDisponibilidad,
  todosConciertoIdsEnProgramas,
  cancelarReserva,
  deltaEntradaSinEntrada,
  enviarMailCancelacionReserva,
  enviarMailPruebaConciertoAdmin,
  fetchEntradaSinEntradaCount,
  enviarMailReserva,
  getConciertoBySlug,
  listAdminData,
  listConciertoIdsConReservaActiva,
  listarMisReservas,
  listarEntradasTercerosAdmin,
  listProgramasConConciertos,
  compareConciertosPorFechaHora,
  fechaHoraDesdeConciertoEntrada,
  localidadDesdeConciertoEntrada,
  localidadLabelDesdeProgramaEntrada,
  lugarNombreDesdeConciertoEntrada,
  listarRecordatoriosAperturaConciertoIds,
  previewEntradaQr,
  suscribirRecordatorioApertura,
  tokenToQrDataUrl,
  validarYConsumirQr,
} from "../../../services/entradaService";
import { normalizeDriveImageUrlForStorage } from "../../../utils/entradasDriveImage";
import { aplicarDatosEventoAConciertoEntrada } from "../../../utils/entradasConciertoEvento";
import { downloadEntradasReservaPdfBlob } from "../../../utils/entradasReservaPdf";
import { formatEntradasConciertoFechaHora as formatConciertoFechaHoraEs } from "../../../utils/entradasReservaCopy";
import {
  formatEntradasPreviewError,
  formatEntradasValidacionError,
  formatEntradasRecepcionIngresoSuccess,
} from "../../../utils/entradasQrMessages";
import { formatEntradasIngresoConRecepcionista } from "../../../utils/entradasIngresoDisplay";
import { decodeQrFromImageFile } from "../../../utils/qrDecodeFromImage";
import {
  ADMIN_CONCIERTO_VISTAS,
  aperturaReservasEfectivaAt,
  conciertoAceptaRecordatorioApertura,
  conciertoAdminSoloRecordatoriosProgramados,
  conciertoCumpleFiltroAdminVista,
  conciertoParaReglasEntradas,
  defaultAperturaReservasAtFromConcierto,
  entradaConciertoReservasAbiertas,
} from "../../../utils/entradasReservasApertura";
import {
  ENTRADAS_LOGO_URL,
  entradaUsuarioRolLabelClass,
  entradaUsuarioRolRowClass,
  entradasUi,
  recepcionPanelClass,
  useEntradasDarkMode,
} from "../../../hooks/useEntradasDarkMode";
import "../../../styles/entradas-filarmonica.css";

const ADMIN_TABS = ["programas", "usuarios", "terceros"];
const ADMIN_TAB_LABELS = {
  programas: "Programas y conciertos",
  usuarios: "Usuarios",
  terceros: "Entradas de terceros",
};

const ADMIN_USUARIO_ROLES_FILTRO = [
  {
    id: "personal",
    label: "Personal",
    chip: (isDark) =>
      isDark
        ? "border-slate-600 bg-slate-800 text-slate-300"
        : "border-slate-200 bg-white text-slate-600",
    dot: (isDark) =>
      isDark ? "bg-slate-600 border-slate-500" : "bg-slate-200 border-slate-300",
  },
  {
    id: "recepcionista",
    label: "Recepcionista",
    chip: (isDark) =>
      isDark
        ? "border-emerald-800 bg-emerald-950 text-emerald-200"
        : "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: () => "bg-emerald-500",
  },
  {
    id: "admin",
    label: "Admin",
    chip: (isDark) =>
      isDark
        ? "border-amber-800 bg-amber-950 text-amber-200"
        : "border-amber-200 bg-amber-50 text-amber-900",
    dot: () => "bg-amber-500",
  },
];

/** Valores de `programas.tipo` en OFRN (alineado con GiraForm). */
const OFRN_PROGRAMA_TIPO_ENTRADAS_OPTIONS = [
  { value: "Sinfónico", label: "Sinfónico" },
  { value: "Camerata Filarmónica", label: "Camerata filarmónica" },
  { value: "Ensamble", label: "Ensamble" },
  { value: "Jazz Band", label: "Jazz Band" },
  { value: "Comisión", label: "Comisión" },
];

function tipoProgramaOfrnCoincide(rowTipo, selectedTipo) {
  return String(rowTipo || "").trim().toLowerCase() === String(selectedTipo || "").trim().toLowerCase();
}

function entradasHoyYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Mismo criterio que la agenda OFRN: conciertos y funciones. */
function isEventoOfrnConciertoParaEntradas(ev) {
  const t = String(ev?.tipos_evento?.nombre || "").toLowerCase();
  return t.includes("concierto") || t.includes("función") || t.includes("funcion");
}

function filterEventosConciertoFuturos(eventos, hoyYmd = entradasHoyYmd()) {
  const inicioHoy = new Date(`${hoyYmd}T00:00:00`);
  return (eventos || []).filter(
    (ev) =>
      isEventoOfrnConciertoParaEntradas(ev)
      && ev?.fecha
      && new Date(`${ev.fecha}T00:00:00`) >= inicioHoy,
  );
}

/** Primera fecha de evento (>= hoy) para una gira, si el programa no trae `fecha_desde`. */
function fechaDesdeProxyDesdeEventos(idGira, eventos, hoyYmd) {
  const gid = Number(idGira);
  if (!Number.isFinite(gid)) return "";
  let min = "";
  for (const ev of eventos || []) {
    if (Number(ev?.id_gira) !== gid) continue;
    const f = String(ev?.fecha || "").trim();
    if (!f || f < hoyYmd) continue;
    if (!min || f < min) min = f;
  }
  return min;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
}

function formatDateLongEs(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const parts = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).formatToParts(date);
  const weekday = (parts.find((p) => p.type === "weekday")?.value || "").toLowerCase();
  const day = parts.find((p) => p.type === "day")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const year = parts.find((p) => p.type === "year")?.value || "";
  return `${weekday}, ${day} de ${month} de ${year}`;
}

function getProgramaNombre(programa) {
  if (!programa) return "Programa sin nombre";
  const nombreEntradas = String(programa.nombre || "").trim();
  if (nombreEntradas) return nombreEntradas;
  return (
    programa.nombre_gira
    || programa.nomenclador
    || programa.subtitulo
    || `Programa ${programa.id || "-"}`
  );
}

/** Título OFRN para entradas (`nombre_gira`), sin nomenclador. */
function tituloOfrnPrograma(programa) {
  const titulo = String(programa?.nombre_gira || "").trim();
  if (titulo) return titulo;
  const subt = String(programa?.subtitulo || "").trim();
  if (subt) return subt;
  return programa?.id ? `Programa #${programa.id}` : "";
}

/** 115% del aforo (`locaciones.capacidad`) si está cargado. */
function capacidadEntradasSugeridaDesdeLocacion(locacion) {
  const cap = Number(locacion?.capacidad);
  if (!Number.isFinite(cap) || cap <= 0) return null;
  return Math.max(1, Math.round(cap * 1.15));
}

function conciertoFormDefaultsDesdeEventoOfrn(ev, prev = {}) {
  let apertura_reservas_at = prev.apertura_reservas_at || "";
  if (ev?.fecha) {
    const hora = String(ev.hora_inicio || "20:00").trim().slice(0, 5);
    const fechaHora = `${ev.fecha}T${hora}`;
    const def = defaultAperturaReservasAtFromConcierto(fechaHora);
    if (def) apertura_reservas_at = isoToDatetimeLocalInput(def.toISOString());
  }
  const capSug = capacidadEntradasSugeridaDesdeLocacion(ev?.locaciones);
  return {
    ofrn_evento_id: ev?.id ?? "",
    nombre: tituloOfrnPrograma(ev?.programas),
    capacidad_maxima: capSug ?? "",
    apertura_reservas_at,
  };
}

/** ISO timestamptz → valor para `<input type="datetime-local" />` (hora local del navegador). */
function isoToDatetimeLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalInputToIso(value) {
  const t = String(value || "").trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function buildProgramaLabel(programa) {
  const nombre = getProgramaNombre(programa);
  const prefijos = [programa?.nomenclador, programa?.mes_letra]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  if (!prefijos.length) return nombre;
  return `${prefijos.join(" · ")} · ${nombre}`;
}

/** OFRN programa id (id_gira) asociado a un `entrada_programa`, vía conciertos o slug `ofrn-programa-{id}`. */
function getOfrnProgramaIdForEntradaPrograma(programaRow, conciertosDelPrograma) {
  const first = conciertosDelPrograma?.[0];
  const fromConcierto = first != null ? Number(first.ofrn_programa_id) : NaN;
  if (Number.isFinite(fromConcierto) && fromConcierto > 0) return fromConcierto;
  const slug = String(programaRow?.slug_publico || "");
  const m = slug.match(/^ofrn-programa-(\d+)$/i);
  if (m) return Number(m[1]);
  return null;
}

function entradasBloqueoIngreso(p) {
  if (!p || !p.ok) return "";
  if (p.puede_ingresar) return "";
  if (p.tipo === "entrada") {
    if (p.reserva_estado && p.reserva_estado !== "activa") {
      return "La reserva asociada no está activa (p. ej. cancelada).";
    }
    if (p.estado_ingreso === "ingresada") {
      const det = p.ingresada_at
        ? formatEntradasIngresoConRecepcionista(p.ingresada_at, p.ingresada_por_nombre)
        : "";
      return det ? `Esta entrada ya ingresó. ${det}.` : "Esta entrada ya registró ingreso a sala.";
    }
    return "No se puede completar el ingreso con este estado.";
  }
  if (p.tipo === "reserva") {
    if (p.reserva_estado && p.reserva_estado !== "activa") {
      return "La reserva no está activa (p. ej. cancelada).";
    }
    if (!p.pendientes) {
      return "No quedan plazas pendientes: las entradas de este QR ya se registraron.";
    }
  }
  return "";
}

function isQrOfrnTokenInput(value) {
  const token = String(value || "").trim();
  return /^ENTR-(RSV|TCK)-[a-f0-9]{32}$/i.test(token);
}

function isManualReservaCodeInput(value) {
  const token = String(value || "").trim();
  if (!token || isQrOfrnTokenInput(token)) return false;
  if (/^\d{10}$/.test(token)) return true;
  if (/^ENTR-C\d+-[0-9]{10}$/i.test(token)) return true;
  return /^ENT-RSV(?:-[A-Z0-9]+)*-[0-9]{10}$/i.test(token);
}

/** Misma ventana que el catálogo público: hoy hasta +13 días inclusive. */
function conciertoEnVentanaCatalogoDosSemanas(concierto, inicioDiaHoy, finDiaVentanaCatalogo) {
  const fh = fechaHoraDesdeConciertoEntrada(concierto);
  if (!fh) return false;
  const t = new Date(fh);
  if (Number.isNaN(t.getTime())) return false;
  return t >= inicioDiaHoy && t <= finDiaVentanaCatalogo;
}

function motivoBloqueoEliminarConcierto(stats) {
  if (!stats) return null;
  if (Number(stats.reservadas || 0) > 0) return "Hay reservas activas en este concierto.";
  if (Number(stats.ingresadas || 0) > 0) return "Hay entradas ya ingresadas en este concierto.";
  return null;
}

function motivoBloqueoEliminarPrograma(conciertos, statsById) {
  if (!conciertos?.length) return null;
  for (const c of conciertos) {
    const st = statsById[c.id];
    if (!st) continue;
    if (Number(st.reservadas || 0) > 0) return "Hay reservas activas en algún concierto del programa.";
    if (Number(st.ingresadas || 0) > 0) return "Hay ingresos registrados en algún concierto del programa.";
  }
  return null;
}

export default function EntradasMain({ user, profile, onLogout }) {
  const { isDark, toggle } = useEntradasDarkMode();
  const ui = entradasUi(isDark);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [programas, setProgramas] = useState([]);
  const [selectedConcierto, setSelectedConcierto] = useState(null);
  /** Detalle del concierto por URL; no debe ocultar el catálogo. */
  const [selectedConciertoLoading, setSelectedConciertoLoading] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [creatingReserva, setCreatingReserva] = useState(false);
  const [reservaResult, setReservaResult] = useState(null);
  const [misReservas, setMisReservas] = useState([]);
  const [entradasTerceros, setEntradasTerceros] = useState([]);
  const [adminTerceroConciertoId, setAdminTerceroConciertoId] = useState("");
  const [adminTerceroCantidad, setAdminTerceroCantidad] = useState(1);
  const [creatingTerceroReserva, setCreatingTerceroReserva] = useState(false);
  const [terceroEmail, setTerceroEmail] = useState("");
  const [terceroReferencia, setTerceroReferencia] = useState("");
  const [terceroBeneficiarioLookup, setTerceroBeneficiarioLookup] = useState(null);
  const [terceroBeneficiarioConfirmado, setTerceroBeneficiarioConfirmado] = useState(false);
  const [terceroEmailLookupBusy, setTerceroEmailLookupBusy] = useState(false);
  const [recepcionConciertoId, setRecepcionConciertoId] = useState("");
  const [scannerToken, setScannerToken] = useState("");
  const [manualReservaCode, setManualReservaCode] = useState("");
  const [pendingWarning, setPendingWarning] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [qrPreviewLoading, setQrPreviewLoading] = useState(false);
  const [ingresando, setIngresando] = useState(false);
  /** Órdenes de plaza (1..n) a ingresar ahora con QR de reserva grupal */
  const [recepcionOrdenesIngreso, setRecepcionOrdenesIngreso] = useState(() => new Set());
  /** Recepción: personas que ingresan sin reserva/QR (cuenta compartida en tiempo real). */
  const [sinEntradaCount, setSinEntradaCount] = useState(0);
  const [sinEntradaBusy, setSinEntradaBusy] = useState(false);
  /** Plazas ingresadas vía QR vs total reservado (reservas activas), mismo criterio que estadísticas admin. */
  const [recepcionQrStats, setRecepcionQrStats] = useState({ ingresadas: 0, reservadas: 0, capacidad: 0 });
  /** Móvil recepción: qué tarjeta de stats muestra la explicación (null = ninguna). */
  const [recepcionStatHelp, setRecepcionStatHelp] = useState(null);
  /** Reserva activa cuyos QRs se muestran en modal desde el catálogo. */
  const [catalogQrModalReserva, setCatalogQrModalReserva] = useState(null);
  const [cancelReservaTarget, setCancelReservaTarget] = useState(null);
  const [cancelingReserva, setCancelingReserva] = useState(false);
  const [conciertosConReservaActiva, setConciertosConReservaActiva] = useState([]);
  const [downloadingPdfReservaId, setDownloadingPdfReservaId] = useState(null);
  const [decodingQrPhoto, setDecodingQrPhoto] = useState(false);
  const [liveQrScannerOpen, setLiveQrScannerOpen] = useState(false);
  const qrPhotoInputRef = useRef(null);
  const [adminData, setAdminData] = useState({ programas: [], conciertos: [], usuarios: [] });
  const [eventosConcierto, setEventosConcierto] = useState([]);
  /** Filas `programas` OFRN para el selector (admin); si la query falla, se usa fallback desde eventos. */
  const [ofrnProgramasList, setOfrnProgramasList] = useState([]);
  /** id_gira OFRN para filtrar eventos al dar de alta un concierto nuevo (o el elegido en la tarjeta). */
  const [conciertoOfrnProgramaContextId, setConciertoOfrnProgramaContextId] = useState(null);
  const [nuevoProgramaOfrnSelect, setNuevoProgramaOfrnSelect] = useState("");
  const [nuevoProgramaModalOpen, setNuevoProgramaModalOpen] = useState(false);
  const [nuevoProgramaTipoSelect, setNuevoProgramaTipoSelect] = useState("Sinfónico");
  const [adminConciertoStatsById, setAdminConciertoStatsById] = useState({});
  const [adminConciertoStatsLoadingById, setAdminConciertoStatsLoadingById] = useState({});
  const [adminTab, setAdminTab] = useState("programas");
  const [adminConciertoVista, setAdminConciertoVista] = useState("actuales");
  /** Filtro en pestaña Usuarios: localidades elegidas (vacío = mostrar todos). */
  const [adminUsuarioFiltroLocalidades, setAdminUsuarioFiltroLocalidades] = useState([]);
  /** Roles activos en el filtro (vacío = todos los roles). */
  const [adminUsuarioFiltroRoles, setAdminUsuarioFiltroRoles] = useState([]);
  const [adminUsuarioFiltroNombre, setAdminUsuarioFiltroNombre] = useState("");
  const [adminInviteForm, setAdminInviteForm] = useState({
    email: "",
    nombre: "",
    apellido: "",
    rol: "recepcionista",
  });
  const [invitingEntradaUsuario, setInvitingEntradaUsuario] = useState(false);
  const [adminInviteFormOpen, setAdminInviteFormOpen] = useState(false);
  const [copyingAdminMails, setCopyingAdminMails] = useState(false);
  const [copyingProgramaMailsKey, setCopyingProgramaMailsKey] = useState("");
  const [copyingConciertoMailsKey, setCopyingConciertoMailsKey] = useState("");
  const [catalogoFuturosVisible, setCatalogoFuturosVisible] = useState(false);
  const [catalogoFuturosLocalidad, setCatalogoFuturosLocalidad] = useState(null);
  const [recordatorioConciertoIds, setRecordatorioConciertoIds] = useState(() => new Set());
  const [recordatorioBusyId, setRecordatorioBusyId] = useState(null);
  /** null | "new" | id del concierto en edición inline */
  const [conciertoEditor, setConciertoEditor] = useState(null);
  /** null | id del programa en edición inline */
  const [programaEditor, setProgramaEditor] = useState(null);
  const [programaForm, setProgramaForm] = useState({
    id: null,
    nombre: "",
    detalle_richtext: "",
    activo: true,
  });
  const [conciertoForm, setConciertoForm] = useState({
    id: null,
    ofrn_evento_id: "",
    nombre: "",
    detalle_richtext: "",
    imagen_drive_url: "",
    capacidad_maxima: "",
    reservas_habilitadas: true,
    activo: true,
    apertura_reservas_at: "",
    limite_recordatorio_at: "",
    limite_cierre_reservas_at: "",
    limite_encuesta_at: "",
    encuesta_url: "",
  });
  /** { id, nombre } para confirmar borrado de concierto (admin) */
  const [deleteConciertoTarget, setDeleteConciertoTarget] = useState(null);
  /** { id, nombre } para confirmar borrado de programa (admin) */
  const [deleteProgramaTarget, setDeleteProgramaTarget] = useState(null);
  const [adminDeleting, setAdminDeleting] = useState(false);
  /** 'recordatorio' | 'encuesta' mientras se envía mail de prueba desde config de concierto */
  const [testMailBusyTipo, setTestMailBusyTipo] = useState(null);

  const canAdmin = profile?.rol === "admin";
  const canRecepcion = profile?.rol === "recepcionista" || profile?.rol === "admin";
  const section = searchParams.get("view") || "catalogo";
  const conciertoSlug = searchParams.get("concierto") || "";

  useEffect(() => {
    if (searchParams.get("view") === "entradas-terceros" && canAdmin) {
      setAdminTab("terceros");
      setSearchParams({ view: "admin" }, { replace: true });
    }
  }, [searchParams, canAdmin, setSearchParams]);

  const loadAdminOfrnEventos = async () => {
    const hoyYmd = entradasHoyYmd();
    const { data: progsData, error: progsError } = await supabaseEntradasPublic
      .from("programas")
      .select("id, nombre_gira, nomenclador, mes_letra, subtitulo, tipo, fecha_desde")
      .order("nomenclador", { ascending: true });
    if (!progsError && Array.isArray(progsData)) {
      setOfrnProgramasList(progsData);
    } else {
      setOfrnProgramasList([]);
    }
    const { data: eventosData, error: eventosError } = await supabaseEntradasPublic
      .from("eventos")
      .select(
        "id, id_gira, fecha, hora_inicio, descripcion, tipos_evento(nombre), locaciones(nombre, capacidad, localidades(localidad)), programas!eventos_id_gira_fkey(id, nombre_gira, nomenclador, mes_letra, subtitulo, tipo, fecha_desde)",
      )
      .eq("is_deleted", false)
      .is("deleted_at", null)
      .gte("fecha", hoyYmd)
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true });
    if (eventosError) throw eventosError;
    setEventosConcierto(filterEventosConciertoFuturos(eventosData, hoyYmd));
  };

  const loadBase = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const [data, idsReservados, reservas, terceros] = await Promise.all([
        listProgramasConConciertos(),
        listConciertoIdsConReservaActiva(),
        listarMisReservas(),
        canAdmin ? listarEntradasTercerosAdmin() : Promise.resolve([]),
      ]);
      setConciertosConReservaActiva(idsReservados);
      setMisReservas(reservas);
      setEntradasTerceros(terceros);
      let programasData = data;
      try {
        const dispMap = await fetchConciertosDisponibilidad(todosConciertoIdsEnProgramas(data));
        programasData = programasConDisponibilidad(data, dispMap);
      } catch {
        /* catálogo usable sin agregado de disponibilidad */
      }
      setProgramas(programasData);
      if (quiet && section === "catalogo" && conciertoSlug) {
        try {
          const fresh = await getConciertoBySlug(conciertoSlug);
          setSelectedConcierto(fresh);
        } catch {
          /* mantener detalle previo si falla el refresco en segundo plano */
        }
      }
      if (canAdmin && section === "admin") {
        setAdminData(await listAdminData());
        await loadAdminOfrnEventos();
      }
    } catch (error) {
      toast.error(error?.message || "No se pudo cargar Entradas.");
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, canAdmin]);

  useEffect(() => {
    if (section !== "admin" || adminTab !== "terceros" || !canAdmin) {
      setTerceroBeneficiarioLookup(null);
      setTerceroBeneficiarioConfirmado(false);
      return undefined;
    }
    const email = String(terceroEmail || "").trim();
    if (!email || !email.includes("@")) {
      setTerceroBeneficiarioLookup(null);
      setTerceroBeneficiarioConfirmado(false);
      return undefined;
    }
    const t = window.setTimeout(async () => {
      setTerceroEmailLookupBusy(true);
      try {
        const data = await buscarBeneficiarioPorEmail(email);
        setTerceroBeneficiarioLookup(data?.encontrado ? data : { encontrado: false, email });
        setTerceroBeneficiarioConfirmado(false);
      } catch {
        setTerceroBeneficiarioLookup(null);
      } finally {
        setTerceroEmailLookupBusy(false);
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [section, adminTab, canAdmin, terceroEmail]);

  useEffect(() => {
    let cancelled = false;
    async function syncConciertoDesdeUrl() {
      if (section !== "catalogo") {
        setSelectedConciertoLoading(false);
        return;
      }
      if (!conciertoSlug) {
        setSelectedConcierto(null);
        setSelectedConciertoLoading(false);
        return;
      }
      setSelectedConciertoLoading(true);
      try {
        const concierto = await getConciertoBySlug(conciertoSlug);
        if (cancelled) return;
        setSelectedConcierto(concierto);
        if (!concierto) {
          toast.error("Concierto no encontrado o inactivo.");
        }
      } catch (err) {
        if (!cancelled) {
          setSelectedConcierto(null);
          toast.error(err?.message || "No se pudo cargar el concierto.");
        }
      } finally {
        if (!cancelled) setSelectedConciertoLoading(false);
      }
    }
    syncConciertoDesdeUrl();
    return () => {
      cancelled = true;
    };
  }, [section, conciertoSlug]);

  useEffect(() => {
    let cancelled = false;
    if (!profile?.email && !user?.email) {
      setRecordatorioConciertoIds(new Set());
      return undefined;
    }
    listarRecordatoriosAperturaConciertoIds()
      .then((ids) => {
        if (!cancelled) setRecordatorioConciertoIds(ids);
      })
      .catch(() => {
        if (!cancelled) setRecordatorioConciertoIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.email, user?.email, programas]);

  useEffect(() => {
    if (section !== "admin" || adminTab !== "programas") {
      setConciertoEditor(null);
    }
  }, [section, adminTab]);

  useEffect(() => {
    if (section !== "admin" || adminTab !== "programas") {
      setProgramaForm({ id: null, nombre: "", detalle_richtext: "", activo: true });
    }
  }, [section, adminTab]);

  const concertosFlat = useMemo(
    () =>
      programas.flatMap((programa) =>
        (programa.entrada_concierto || []).map((concierto) => ({
          ...concierto,
          programa,
        })),
      ),
    [programas],
  );

  const conciertosByProgramaId = useMemo(() => {
    const m = new Map();
    for (const c of adminData.conciertos || []) {
      const pid = Number(c.programa_id ?? c.programa?.id);
      if (!Number.isFinite(pid)) continue;
      if (!m.has(pid)) m.set(pid, []);
      m.get(pid).push(c);
    }
    for (const arr of m.values()) {
      arr.sort(compareConciertosPorFechaHora);
    }
    return m;
  }, [adminData.conciertos]);

  const programaIdsAdmin = useMemo(
    () => new Set((adminData.programas || []).map((p) => Number(p.id))),
    [adminData.programas],
  );

  const conciertosSinProgramaEnAdmin = useMemo(
    () =>
      (adminData.conciertos || []).filter((c) => {
        const pid = Number(c.programa_id ?? c.programa?.id);
        return Number.isFinite(pid) && !programaIdsAdmin.has(pid);
      }),
    [adminData.conciertos, programaIdsAdmin],
  );

  const conciertosSinProgramaEnAdminFiltrados = useMemo(
    () =>
      conciertosSinProgramaEnAdmin.filter((c) =>
        conciertoCumpleFiltroAdminVista(c, adminConciertoVista),
      ),
    [conciertosSinProgramaEnAdmin, adminConciertoVista],
  );

  const conciertosByProgramaIdFiltrado = useMemo(() => {
    const m = new Map();
    for (const [pid, lista] of conciertosByProgramaId.entries()) {
      const filtrada = lista.filter((c) => conciertoCumpleFiltroAdminVista(c, adminConciertoVista));
      if (filtrada.length) m.set(pid, filtrada);
    }
    return m;
  }, [conciertosByProgramaId, adminConciertoVista]);

  const programasAdminVisibles = useMemo(
    () =>
      (adminData.programas || []).filter((p) =>
        (conciertosByProgramaIdFiltrado.get(Number(p.id)) || []).length > 0,
      ),
    [adminData.programas, conciertosByProgramaIdFiltrado],
  );

  const conciertosReservaTercerosAdmin = useMemo(
    () =>
      (adminData.conciertos || [])
        .map((c) => aplicarDatosEventoAConciertoEntrada(c))
        .filter(
          (c) =>
            c.activo !== false
            && conciertoCumpleFiltroAdminVista(c, "actuales")
            && entradaConciertoReservasAbiertas(c),
        )
        .sort(compareConciertosPorFechaHora),
    [adminData.conciertos],
  );

  const adminTerceroConciertoSelected = useMemo(() => {
    const id = Number(adminTerceroConciertoId);
    if (!Number.isFinite(id)) return null;
    const base = conciertosReservaTercerosAdmin.find((c) => Number(c.id) === id);
    if (!base) return null;
    const catalogo = concertosFlat.find((c) => Number(c.id) === id);
    return catalogo ? { ...base, ...catalogo, disponibilidad: catalogo.disponibilidad } : base;
  }, [adminTerceroConciertoId, conciertosReservaTercerosAdmin, concertosFlat]);

  useEffect(() => {
    if (section !== "admin" || adminTab !== "terceros") return;
    if (!conciertosReservaTercerosAdmin.length) {
      setAdminTerceroConciertoId("");
      return;
    }
    const stillValid = conciertosReservaTercerosAdmin.some(
      (c) => String(c.id) === String(adminTerceroConciertoId),
    );
    if (!stillValid) {
      setAdminTerceroConciertoId(String(conciertosReservaTercerosAdmin[0].id));
    }
  }, [section, adminTab, conciertosReservaTercerosAdmin, adminTerceroConciertoId]);

  const adminConciertoVistaBtn = (active) => (active ? ui.adminTabActive : ui.adminTabIdle);

  const usuarioEmailEntradas = String(profile?.email || user?.email || "")
    .trim()
    .toLowerCase();

  const textoAperturaReservas = (concierto) => {
    const at = aperturaReservasEfectivaAt(concierto);
    if (!at) return "";
    return formatConciertoFechaHoraEs(at.toISOString());
  };

  const buildConciertoMailPruebaPreview = () => {
    const evSel = eventosParaSelectorConcierto.find(
      (row) => Number(row.id) === Number(conciertoForm.ofrn_evento_id),
    );
    const fh = evSel ? fechaHoraDesdeConciertoEntrada({ evento: evSel }) : null;
    const slugGuardado = conciertoForm.id
      ? String(
          adminData.conciertos?.find((c) => Number(c.id) === Number(conciertoForm.id))?.slug_publico || "",
        ).trim()
      : "";
    return {
      nombre: conciertoForm.nombre,
      slugPublico: slugGuardado || undefined,
      encuestaUrl: conciertoForm.encuesta_url?.trim() || undefined,
      fechaTexto: fh ? formatConciertoFechaHoraEs(fh) : undefined,
      lugar: evSel ? lugarNombreDesdeConciertoEntrada({ evento: evSel }) : undefined,
    };
  };

  const handleEnviarMailPruebaConcierto = async (tipo) => {
    if (!usuarioEmailEntradas) {
      toast.error("No encontramos tu correo en la sesión.");
      return;
    }
    setTestMailBusyTipo(tipo);
    try {
      const data = await enviarMailPruebaConciertoAdmin({
        tipo,
        conciertoId: conciertoForm.id || undefined,
        preview: buildConciertoMailPruebaPreview(),
      });
      const dest = data?.to || usuarioEmailEntradas;
      if (tipo === "recordatorio") {
        toast.success(`Mail de prueba (recordatorio) enviado a ${dest}.`);
      } else {
        const fallback = data?.encuestaFallback ? " con enlace por defecto (Linktree)" : "";
        toast.success(`Mail de prueba (encuesta) enviado a ${dest}${fallback}.`);
      }
    } catch (err) {
      toast.error(err?.message || "No se pudo enviar el mail de prueba.");
    } finally {
      setTestMailBusyTipo(null);
    }
  };

  const handleRecordarmeConcierto = async (concierto) => {
    const slug = String(concierto?.slug_publico || "").trim();
    if (!slug) return;
    const mail = usuarioEmailEntradas;
    if (!mail) {
      toast.error("No encontramos tu correo en la sesión.");
      return;
    }
    const cid = Number(concierto.id);
    setRecordatorioBusyId(cid);
    try {
      const result = await suscribirRecordatorioApertura({ slug, email: mail });
      setRecordatorioConciertoIds((prev) => new Set([...prev, cid]));
      if (result?.ya_estaba) {
        toast.message("Ya estabas anotado al recordatorio de este concierto.");
      } else {
        toast.success("Te avisaremos por mail cuando se habiliten las reservas.");
      }
    } catch (err) {
      toast.error(err?.message || "No se pudo anotar al recordatorio.");
    } finally {
      setRecordatorioBusyId(null);
    }
  };

  const recepcionHelpTextClass = (tone) => {
    const tones = {
      amber: isDark ? "text-amber-100/90" : "text-amber-950/90",
      emerald: isDark ? "text-emerald-100/85" : "text-emerald-950/85",
      slate: isDark ? "text-slate-300/90" : "text-slate-600",
    };
    return `text-xs mt-0.5 leading-snug ${tones[tone] || tones.slate}`;
  };

  const recepcionHelpVisibleClass = (key) =>
    recepcionStatHelp === key ? "block" : "hidden sm:block";

  const renderRecepcionHelpToggle = (key, tone = "slate") => {
    const open = recepcionStatHelp === key;
    const btnTone = {
      amber: isDark ? "text-amber-200 hover:bg-amber-900/50" : "text-amber-800 hover:bg-amber-100",
      emerald: isDark ? "text-emerald-200 hover:bg-emerald-900/50" : "text-emerald-800 hover:bg-emerald-100",
      slate: isDark ? "text-slate-300 hover:bg-slate-700/80" : "text-slate-600 hover:bg-slate-200",
    }[tone];
    return (
      <button
        type="button"
        className={`sm:hidden shrink-0 rounded-full p-1 ${btnTone}`}
        aria-label={open ? "Ocultar explicación" : "Ver explicación"}
        aria-expanded={open}
        onClick={() => setRecepcionStatHelp((prev) => (prev === key ? null : key))}
      >
        <IconHelpCircle size={18} />
      </button>
    );
  };

  const copiarEnlaceRecordarme = async (concierto) => {
    const url = buildEntradasRecordarmeUrl(concierto?.slug_publico);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace de recordatorio copiado.");
    } catch {
      toast.error("No se pudo copiar el enlace.");
    }
  };

  const ofrnProgramasPicker = useMemo(() => {
    if (ofrnProgramasList.length > 0) {
      return [...ofrnProgramasList].sort((a, b) =>
        buildProgramaLabel(a).localeCompare(buildProgramaLabel(b), "es", { sensitivity: "base" }),
      );
    }
    const map = new Map();
    for (const ev of eventosConcierto) {
      const gid = Number(ev.id_gira);
      if (!Number.isFinite(gid) || map.has(gid)) continue;
      map.set(gid, ev.programas || { id: gid });
    }
    return Array.from(map.values()).sort((a, b) =>
      buildProgramaLabel(a).localeCompare(buildProgramaLabel(b), "es", { sensitivity: "base" }),
    );
  }, [ofrnProgramasList, eventosConcierto]);

  const ofrnProgramaIdsYaEnEntradas = useMemo(() => {
    const s = new Set();
    for (const programa of adminData.programas || []) {
      const lista = conciertosByProgramaId.get(Number(programa.id)) || [];
      const oid = getOfrnProgramaIdForEntradaPrograma(programa, lista);
      if (Number.isFinite(oid) && oid > 0) s.add(oid);
    }
    return s;
  }, [adminData.programas, conciertosByProgramaId]);

  /** Programas OFRN del tipo elegido, con inicio ≥ hoy, sin `entrada_programa` aún; orden cronológico por inicio. */
  const programasOfrnDisponiblesNuevoEntrada = useMemo(() => {
    const hoyYmd = entradasHoyYmd();
    const tipo = nuevoProgramaTipoSelect;
    const rows = [];
    for (const p of ofrnProgramasPicker) {
      const id = Number(p.id);
      if (!Number.isFinite(id) || id <= 0) continue;
      if (ofrnProgramaIdsYaEnEntradas.has(id)) continue;
      if (!tipoProgramaOfrnCoincide(p.tipo, tipo)) continue;
      const desdeDb = String(p.fecha_desde || "").trim();
      const desde = desdeDb || fechaDesdeProxyDesdeEventos(id, eventosConcierto, hoyYmd);
      if (!desde || desde < hoyYmd) continue;
      rows.push({ p, sortFecha: desde });
    }
    rows.sort((a, b) => {
      const c = a.sortFecha.localeCompare(b.sortFecha);
      if (c !== 0) return c;
      return buildProgramaLabel(a.p).localeCompare(buildProgramaLabel(b.p), "es", { sensitivity: "base" });
    });
    return rows.map((r) => r.p);
  }, [
    ofrnProgramasPicker,
    ofrnProgramaIdsYaEnEntradas,
    nuevoProgramaTipoSelect,
    eventosConcierto,
  ]);

  const contextProgramaLabel = useMemo(() => {
    if (!conciertoOfrnProgramaContextId) return "";
    const id = Number(conciertoOfrnProgramaContextId);
    const row = ofrnProgramasPicker.find((p) => Number(p.id) === id);
    if (row) return buildProgramaLabel(row);
    const ev = eventosConcierto.find((e) => Number(e.id_gira) === id);
    if (ev?.programas) return buildProgramaLabel(ev.programas);
    return `Programa #${id}`;
  }, [conciertoOfrnProgramaContextId, ofrnProgramasPicker, eventosConcierto]);

  /** Fila `programas` OFRN del contexto actual (nuevo concierto / flujo programa). */
  const contextOfrnProgramaRow = useMemo(() => {
    if (!conciertoOfrnProgramaContextId) return null;
    const id = Number(conciertoOfrnProgramaContextId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return ofrnProgramasPicker.find((p) => Number(p.id) === id) || null;
  }, [conciertoOfrnProgramaContextId, ofrnProgramasPicker]);

  const ofrnSeleccionadoModal = useMemo(() => {
    const id = Number(nuevoProgramaOfrnSelect);
    if (!Number.isFinite(id) || id <= 0) return null;
    return programasOfrnDisponiblesNuevoEntrada.find((p) => Number(p.id) === id) || null;
  }, [nuevoProgramaOfrnSelect, programasOfrnDisponiblesNuevoEntrada]);

  /** Gira OFRN vinculada al `entrada_programa` que se está editando (subtítulo de referencia). */
  const ofrnProgramaEnEdicionReferencia = useMemo(() => {
    const pid = programaForm.id;
    if (pid == null) return null;
    const programaRow = (adminData.programas || []).find((p) => Number(p.id) === Number(pid));
    if (!programaRow) return null;
    const lista = conciertosByProgramaId.get(Number(pid)) || [];
    const ofrnId = getOfrnProgramaIdForEntradaPrograma(programaRow, lista);
    if (!ofrnId) return null;
    return ofrnProgramasPicker.find((p) => Number(p.id) === ofrnId) || null;
  }, [programaForm.id, adminData.programas, conciertosByProgramaId, ofrnProgramasPicker]);

  const eventosParaSelectorConcierto = useMemo(() => {
    if (conciertoEditor !== "new" || !conciertoOfrnProgramaContextId) {
      return eventosConcierto;
    }
    const gid = Number(conciertoOfrnProgramaContextId);
    return eventosConcierto.filter((ev) => Number(ev.id_gira) === gid);
  }, [conciertoEditor, conciertoOfrnProgramaContextId, eventosConcierto]);

  const inicioDiaHoy = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  /** Fin del día que cierra la ventana de 14 días (hoy + 13 días), inclusive. */
  const finDiaVentanaCatalogo = useMemo(() => {
    const d = new Date(inicioDiaHoy);
    d.setDate(d.getDate() + 13);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [inicioDiaHoy]);

  const programasCatalogo = useMemo(
    () =>
      programas
        .map((programa) => ({
          ...programa,
          entrada_concierto: (programa.entrada_concierto || [])
            .filter((concierto) => {
              const fhCat = fechaHoraDesdeConciertoEntrada(concierto);
              if (!fhCat) return false;
              const t = new Date(fhCat);
              if (Number.isNaN(t.getTime())) return false;
              return t >= inicioDiaHoy && t <= finDiaVentanaCatalogo;
            })
            .sort(compareConciertosPorFechaHora),
        }))
        .filter((p) => (p.entrada_concierto || []).length > 0)
        .map((p) => ({
          ...p,
          localidadLabel: localidadLabelDesdeProgramaEntrada(p),
        }))
        .sort((a, b) =>
          compareConciertosPorFechaHora(a.entrada_concierto[0], b.entrada_concierto[0]),
        ),
    [programas, inicioDiaHoy, finDiaVentanaCatalogo],
  );

  const conciertosFuturosRecordatorio = useMemo(
    () =>
      concertosFlat.filter((concierto) => {
        if (concierto?.activo === false) return false;
        if (!conciertoAceptaRecordatorioApertura(concierto, finDiaVentanaCatalogo)) return false;
        const enVentana = conciertoEnVentanaCatalogoDosSemanas(concierto, inicioDiaHoy, finDiaVentanaCatalogo);
        if (enVentana && entradaConciertoReservasAbiertas(concierto)) return false;
        return true;
      }),
    [concertosFlat, finDiaVentanaCatalogo, inicioDiaHoy],
  );

  const futurosPorLocalidad = useMemo(() => {
    const m = new Map();
    for (const c of conciertosFuturosRecordatorio) {
      const loc = localidadDesdeConciertoEntrada(c) || "Sin localidad indicada";
      if (!m.has(loc)) m.set(loc, []);
      m.get(loc).push(c);
    }
    for (const arr of m.values()) {
      arr.sort(compareConciertosPorFechaHora);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [conciertosFuturosRecordatorio]);

  const conciertosFuturosLocalidadLista = useMemo(() => {
    if (!catalogoFuturosLocalidad) return [];
    const row = futurosPorLocalidad.find(([loc]) => loc === catalogoFuturosLocalidad);
    return row?.[1] || [];
  }, [catalogoFuturosLocalidad, futurosPorLocalidad]);

  const adminUsuariosLocalidadesOpciones = useMemo(() => {
    const s = new Set();
    for (const u of adminData.usuarios || []) {
      for (const loc of u.localidades_reserva || []) {
        const t = String(loc || "").trim();
        if (t) s.add(t);
      }
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [adminData.usuarios]);

  const adminUsuariosFiltrados = useMemo(() => {
    let list = adminData.usuarios || [];
    const filtroLoc = new Set(
      (adminUsuarioFiltroLocalidades || []).map((l) => String(l || "").trim()).filter(Boolean),
    );
    if (filtroLoc.size > 0) {
      list = list.filter((u) =>
        (u.localidades_reserva || []).some((loc) => filtroLoc.has(String(loc || "").trim())),
      );
    }
    const filtroRoles = new Set(
      (adminUsuarioFiltroRoles || []).map((r) => String(r || "").toLowerCase()).filter(Boolean),
    );
    if (filtroRoles.size > 0) {
      list = list.filter((u) => filtroRoles.has(String(u.rol || "personal").toLowerCase()));
    }
    const q = adminUsuarioFiltroNombre.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => {
      const nombreCompleto = `${u.nombre || ""} ${u.apellido || ""}`.trim().toLowerCase();
      const apellidoNombre = `${u.apellido || ""} ${u.nombre || ""}`.trim().toLowerCase();
      const email = String(u.email || "").toLowerCase();
      return (
        nombreCompleto.includes(q) ||
        apellidoNombre.includes(q) ||
        String(u.nombre || "").toLowerCase().includes(q) ||
        String(u.apellido || "").toLowerCase().includes(q) ||
        email.includes(q)
      );
    });
  }, [adminData.usuarios, adminUsuarioFiltroLocalidades, adminUsuarioFiltroRoles, adminUsuarioFiltroNombre]);

  useEffect(() => {
    const valid = new Set(adminUsuariosLocalidadesOpciones);
    setAdminUsuarioFiltroLocalidades((prev) => prev.filter((l) => valid.has(l)));
  }, [adminUsuariosLocalidadesOpciones]);

  const conciertosRecepcion = useMemo(() => {
    return concertosFlat
      .filter((c) => {
        if (!c.activo) return false;
        const fh = fechaHoraDesdeConciertoEntrada(c);
        return fh && new Date(fh) >= inicioDiaHoy;
      })
      .sort(compareConciertosPorFechaHora);
  }, [concertosFlat, inicioDiaHoy]);

  useEffect(() => {
    if (section !== "recepcion") setRecepcionStatHelp(null);
  }, [section]);

  useEffect(() => {
    if (section !== "recepcion" || !canRecepcion) {
      return;
    }
    if (!recepcionConciertoId) {
      setQrPreview(null);
      setQrPreviewLoading(false);
      return;
    }
    const t = scannerToken.trim();
    const esCodigoManual = isManualReservaCodeInput(t);
    if (!esCodigoManual && t.length < 18) {
      setQrPreview(null);
      setQrPreviewLoading(false);
      return;
    }
    let active = true;
    setQrPreviewLoading(true);
    const timer = setTimeout(() => {
      previewEntradaQr(t, recepcionConciertoId)
        .then((p) => {
          if (active) setQrPreview(p);
        })
        .catch((err) => {
          if (active) {
            setQrPreview({
              ok: false,
              reason: "error",
              detalle: err?.message || String(err),
            });
          }
        })
        .finally(() => {
          if (active) setQrPreviewLoading(false);
        });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
      setQrPreviewLoading(false);
    };
  }, [scannerToken, section, canRecepcion, recepcionConciertoId]);

  useEffect(() => {
    if (qrPreview?.ok && qrPreview.tipo === "reserva" && Array.isArray(qrPreview.entradas)) {
      const pendientes = qrPreview.entradas
        .filter((e) => e.estado_ingreso === "pendiente")
        .map((e) => Number(e.orden))
        .filter((n) => Number.isFinite(n) && n > 0);
      setRecepcionOrdenesIngreso(new Set(pendientes));
    } else {
      setRecepcionOrdenesIngreso(new Set());
    }
  }, [qrPreview]);

  const puedeIngresarRecepcion = useMemo(() => {
    if (!qrPreview?.ok || !qrPreview.puede_ingresar) return false;
    if (qrPreview.tipo === "reserva") {
      const hayPendiente = (qrPreview.entradas || []).some((e) => e.estado_ingreso === "pendiente");
      return hayPendiente && recepcionOrdenesIngreso.size > 0;
    }
    return true;
  }, [qrPreview, recepcionOrdenesIngreso]);

  const toggleRecepcionOrdenIngreso = (orden) => {
    const n = Number(orden);
    if (!Number.isFinite(n)) return;
    setRecepcionOrdenesIngreso((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  useEffect(() => {
    if (section !== "recepcion" || !canRecepcion || !recepcionConciertoId) {
      setSinEntradaCount(0);
      setRecepcionQrStats({ ingresadas: 0, reservadas: 0, capacidad: 0 });
      return undefined;
    }
    const cid = String(recepcionConciertoId);
    let cancelled = false;
    let debTimer;

    const scheduleQrStatsRefresh = () => {
      if (cancelled) return;
      clearTimeout(debTimer);
      debTimer = setTimeout(async () => {
        if (cancelled) return;
        try {
          const s = await getAdminConciertoStats(cid);
          if (!cancelled) {
            setRecepcionQrStats({ ingresadas: s.ingresadas, reservadas: s.reservadas, capacidad: s.capacidad });
          }
        } catch {
          if (!cancelled) setRecepcionQrStats({ ingresadas: 0, reservadas: 0, capacidad: 0 });
        }
      }, 120);
    };

    (async () => {
      try {
        const [n, s] = await Promise.all([fetchEntradaSinEntradaCount(cid), getAdminConciertoStats(cid)]);
        if (!cancelled) {
          setSinEntradaCount(n);
          setRecepcionQrStats({ ingresadas: s.ingresadas, reservadas: s.reservadas, capacidad: s.capacidad });
        }
      } catch {
        if (!cancelled) {
          setSinEntradaCount(0);
          setRecepcionQrStats({ ingresadas: 0, reservadas: 0, capacidad: 0 });
        }
      }
    })();

    const channel = supabaseEntradasPublic
      .channel(`entradas-recepcion-live:${cid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entrada_concierto_sin_entrada",
          filter: `entrada_concierto_id=eq.${cid}`,
        },
        (payload) => {
          const row = payload.new;
          if (row && row.cantidad != null) {
            setSinEntradaCount(Number(row.cantidad));
          } else if (payload.eventType === "DELETE") {
            setSinEntradaCount(0);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entrada_reserva_entrada",
          filter: `concierto_id=eq.${cid}`,
        },
        scheduleQrStatsRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entrada_reserva",
          filter: `concierto_id=eq.${cid}`,
        },
        scheduleQrStatsRefresh,
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearTimeout(debTimer);
      supabaseEntradasPublic.removeChannel(channel);
    };
  }, [section, canRecepcion, recepcionConciertoId]);

  const tieneReservaEnConcierto = (conciertoId) =>
    conciertosConReservaActiva.includes(Number(conciertoId));

  const conciertoCatalogoEntradasAgotadas = (concierto) =>
    entradaConciertoReservasAbiertas(concierto)
    && !tieneReservaEnConcierto(concierto?.id)
    && conciertoSinPlazasDisponibles(concierto);

  const reservaActivaPorConciertoId = useMemo(() => {
    const map = new Map();
    for (const reserva of misReservas) {
      if (reserva?.estado !== "activa") continue;
      const cid = Number(reserva?.concierto?.id);
      if (Number.isFinite(cid) && !map.has(cid)) map.set(cid, reserva);
    }
    return map;
  }, [misReservas]);

  const abrirCatalogQrModal = async (conciertoId) => {
    const cid = Number(conciertoId);
    let reserva = reservaActivaPorConciertoId.get(cid);
    if (!reserva) {
      try {
        const reservas = await listarMisReservas();
        setMisReservas(reservas);
        reserva = reservas.find(
          (r) => r?.estado === "activa" && Number(r?.concierto?.id) === cid,
        );
      } catch (error) {
        toast.error(error?.message || "No se pudieron cargar tus reservas.");
        return;
      }
    }
    if (!reserva) {
      toast.error("No se encontró la reserva activa para este concierto.");
      return;
    }
    setCatalogQrModalReserva(reserva);
  };

  const renderCatalogReservaEnRecuadro = (
    conciertoId,
    { embedded = false, className = embedded ? "" : "mb-2" } = {},
  ) => {
    if (!tieneReservaEnConcierto(conciertoId)) return null;
    const boxClass = embedded ? ui.reservaActivaBoxEnTarjeta : ui.reservaActivaBox;
    return (
      <button
        type="button"
        className={`entradas-interactive flex flex-wrap items-center justify-between gap-2 ${boxClass} ${className}`}
        onClick={() => void abrirCatalogQrModal(conciertoId)}
        aria-label="Ver QR de tu reserva para este concierto"
      >
        <span className={ui.badgeReserva}>Ya tenés entrada/s</span>
        <span
          className={`text-xs font-bold underline-offset-2 ${
            isDark ? "text-emerald-300" : "text-emerald-800"
          }`}
        >
          Ver QR
        </span>
      </button>
    );
  };

  const renderCatalogAgotadasEnRecuadro = (
    concierto,
    { embedded = false, className = "" } = {},
  ) => {
    if (!conciertoCatalogoEntradasAgotadas(concierto)) return null;
    const boxClass = embedded ? ui.agotadasBoxEnTarjeta : ui.agotadasBoxEnTarjeta;
    return (
      <div className={`flex flex-wrap items-center ${boxClass} ${className}`} role="status">
        <span className={ui.badgeAgotadas}>Entradas agotadas</span>
      </div>
    );
  };

  const handlePickConcierto = (slug) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", "catalogo");
    if (slug) params.set("concierto", slug);
    else params.delete("concierto");
    setSearchParams(params);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleClearCatalogoConcierto = () => handlePickConcierto("");

  const handleCreateReserva = async () => {
    if (!selectedConcierto?.id) return;
    setCreatingReserva(true);
    try {
      const result = await crearReserva({ conciertoId: selectedConcierto.id, cantidad });
      const reservaQr = await tokenToQrDataUrl(result.qr_reserva_token);
      const entriesQr = await Promise.all((result.qr_entrada_tokens || []).map((token) => tokenToQrDataUrl(token)));
      setReservaResult({ ...result, reservaQr, entriesQr, cantidad_solicitada: cantidad });
      let pdfBase64;
      try {
        const { blob, filename } = await buildEntradasReservaPdfConDataUrls({
          concierto: selectedConcierto,
          reserva: { codigo_reserva: result.codigo_reserva, cantidad_solicitada: cantidad },
          reservaQrDataUrl: reservaQr,
          entriesQrDataUrls: entriesQr,
        });
        downloadEntradasReservaPdfBlob(blob, filename);
        pdfBase64 = await blobToPdfBase64ForMail(blob);
      } catch (pdfErr) {
        console.error(pdfErr);
        toast.message("Reserva creada. No se pudo generar el PDF; podés intentar desde «Mis entradas» luego.");
      }
      try {
        await enviarMailReserva({
          reservaId: result.reserva_id,
          qrReservaToken: result.qr_reserva_token,
          qrEntradaTokens: result.qr_entrada_tokens || [],
          pdfBase64,
        });
        if (pdfBase64) {
          toast.success("Reserva confirmada: se descargó el PDF y el mail se envió con el mismo adjunto.");
        } else {
          toast.success("Reserva confirmada y mail enviado. El PDF no se generó; probá descargar desde «Mis entradas».");
        }
      } catch {
        toast.message(
          pdfBase64
            ? "Reserva creada y PDF generado, pero el mail no pudo enviarse."
            : "Reserva creada. El mail no pudo enviarse automáticamente.",
        );
      }
      await loadBase({ quiet: true });
    } catch (error) {
      toast.error(error?.message || "No se pudo crear la reserva.");
    } finally {
      setCreatingReserva(false);
    }
  };

  const resetAdminTerceroForm = () => {
    setTerceroEmail("");
    setTerceroReferencia("");
    setTerceroBeneficiarioLookup(null);
    setTerceroBeneficiarioConfirmado(false);
    setAdminTerceroCantidad(1);
  };

  const handleCreateReservaTercero = async () => {
    const concierto = adminTerceroConciertoSelected;
    if (!concierto?.id) {
      toast.error("Elegí un concierto.");
      return;
    }
    const email = String(terceroEmail || "").trim();
    if (email && terceroBeneficiarioLookup?.encontrado && !terceroBeneficiarioConfirmado) {
      toast.error("Confirmá que es la persona correcta antes de reservar.");
      return;
    }
    setCreatingTerceroReserva(true);
    try {
      const result = await crearReservaTercero({
        conciertoId: concierto.id,
        cantidad: adminTerceroCantidad,
        emailBeneficiario: terceroEmail || null,
        beneficiarioReferencia: terceroReferencia || null,
      });
      const reservaQr = await tokenToQrDataUrl(result.qr_reserva_token);
      const entriesQr = await Promise.all((result.qr_entrada_tokens || []).map((token) => tokenToQrDataUrl(token)));
      let pdfBase64;
      try {
        const { blob, filename } = await buildEntradasReservaPdfConDataUrls({
          concierto,
          reserva: { codigo_reserva: result.codigo_reserva, cantidad_solicitada: adminTerceroCantidad },
          reservaQrDataUrl: reservaQr,
          entriesQrDataUrls: entriesQr,
        });
        downloadEntradasReservaPdfBlob(blob, filename);
        pdfBase64 = await blobToPdfBase64ForMail(blob);
      } catch (pdfErr) {
        console.error(pdfErr);
        toast.message("Reserva creada. No se pudo generar el PDF; podés descargarla desde el listado.");
      }
      try {
        await enviarMailReserva({
          reservaId: result.reserva_id,
          qrReservaToken: result.qr_reserva_token,
          qrEntradaTokens: result.qr_entrada_tokens || [],
          pdfBase64,
        });
        const extra =
          result.vinculado_inmediato && result.beneficiario_apellido
            ? ` Vinculada a ${result.beneficiario_apellido}, ${result.beneficiario_nombre}.`
            : terceroEmail
              ? " Mail enviado al admin y al beneficiario."
              : " Mail de confirmación enviado al admin.";
        toast.success(`Entrada de tercero confirmada.${extra}`);
      } catch {
        toast.message("Reserva creada. El mail no pudo enviarse automáticamente.");
      }
      resetAdminTerceroForm();
      await loadBase({ quiet: true });
    } catch (error) {
      toast.error(error?.message || "No se pudo crear la reserva.");
    } finally {
      setCreatingTerceroReserva(false);
    }
  };

  const clearRecepcionParaNuevoIngreso = () => {
    setScannerToken("");
    setManualReservaCode("");
    setQrPreview(null);
    setRecepcionOrdenesIngreso(new Set());
  };

  const consumeToken = async ({ forceParcial = false } = {}) => {
    if (!scannerToken.trim() || !recepcionConciertoId) {
      if (!recepcionConciertoId) toast.error("Elegí un concierto en la lista para registrar ingresos.");
      return;
    }
    setIngresando(true);
    const esReservaGrupo = qrPreview?.tipo === "reserva";
    const ordenesIngresar =
      esReservaGrupo && !forceParcial && recepcionOrdenesIngreso.size > 0
        ? [...recepcionOrdenesIngreso].sort((a, b) => a - b)
        : null;
    try {
      const result = await validarYConsumirQr({
        token: scannerToken,
        modo: "auto",
        confirmarParcial: forceParcial,
        conciertoId: recepcionConciertoId,
        ordenesIngresar,
      });
      if (result?.warning || result?.reason === "reserva_uso_parcial") {
        setPendingWarning(result);
        return;
      }
      if (!result?.ok) {
        toast.error(formatEntradasValidacionError(result));
        if (
          result?.reason === "entrada_ya_usada"
          || result?.reason === "reserva_totalmente_usada"
        ) {
          setQrPreview((prev) => {
            const base = prev && typeof prev === "object" ? prev : { ok: true };
            if (result.reason === "entrada_ya_usada") {
              return {
                ...base,
                ok: true,
                tipo: "entrada",
                puede_ingresar: false,
                estado_ingreso: "ingresada",
                codigo_reserva: result.codigo_reserva ?? base.codigo_reserva,
                entrada_orden: result.entrada_orden ?? base.entrada_orden,
                ingresada_at: result.ingresada_at ?? base.ingresada_at,
                ingresada_por_nombre: result.ingresada_por_nombre ?? base.ingresada_por_nombre,
              };
            }
            return {
              ...base,
              ok: true,
              tipo: "reserva",
              puede_ingresar: false,
              pendientes: 0,
              codigo_reserva: result.codigo_reserva ?? base.codigo_reserva,
              ingresada_at: result.ultima_ingresada_at,
              ingresada_por_nombre: result.ultima_ingresada_por_nombre,
            };
          });
        }
        return;
      }
      toast.success(formatEntradasRecepcionIngresoSuccess(result), { duration: 3500 });
      clearRecepcionParaNuevoIngreso();
      getAdminConciertoStats(recepcionConciertoId)
        .then((s) =>
          setRecepcionQrStats({ ingresadas: s.ingresadas, reservadas: s.reservadas, capacidad: s.capacidad }),
        )
        .catch(() => {});
    } finally {
      setIngresando(false);
    }
  };

  const adjustSinEntrada = async (delta) => {
    if (!recepcionConciertoId || sinEntradaBusy) return;
    if (delta === -1 && sinEntradaCount <= 0) return;
    setSinEntradaBusy(true);
    try {
      const n = await deltaEntradaSinEntrada(recepcionConciertoId, delta);
      setSinEntradaCount(n);
    } catch (err) {
      toast.error(err?.message || "No se pudo actualizar el contador.");
    } finally {
      setSinEntradaBusy(false);
    }
  };

  const handleNativeQrPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!recepcionConciertoId) {
      toast.error("Elegí primero el concierto de este turno.");
      return;
    }
    setDecodingQrPhoto(true);
    try {
      const text = await decodeQrFromImageFile(file);
      if (text?.trim()) {
        setManualReservaCode("");
        setScannerToken(text.trim());
        toast.success("Código leído de la imagen.");
      } else {
        toast.error("No se leyó el QR. Probá otra toma o ingresá el código de 10 dígitos.");
      }
    } catch (err) {
      console.error(err);
      toast.error("No se pudo leer la imagen.");
    } finally {
      setDecodingQrPhoto(false);
    }
  };

  const handleOpenQrScanner = () => {
    if (!recepcionConciertoId) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.message("Cámara en vivo no disponible en este navegador. Usá la foto.");
      qrPhotoInputRef.current?.click();
      return;
    }
    setLiveQrScannerOpen(true);
  };

  const handleLiveQrScan = (text) => {
    setLiveQrScannerOpen(false);
    if (text?.trim()) {
      setManualReservaCode("");
      setScannerToken(text.trim());
      toast.success("Código leído con la cámara.");
    }
  };

  const handleQrScannerFallbackPhoto = () => {
    setLiveQrScannerOpen(false);
    qrPhotoInputRef.current?.click();
  };

  const resetProgramaForm = () => {
    setProgramaForm({ id: null, nombre: "", detalle_richtext: "", activo: true });
    setProgramaEditor(null);
  };

  const startEditPrograma = (programa) => {
    setProgramaForm({
      id: programa.id,
      nombre: programa.nombre || "",
      detalle_richtext: programa.detalle_richtext || "",
      activo: programa.activo !== false,
    });
    setProgramaEditor(programa.id);
  };

  const submitPrograma = async (event) => {
    event.preventDefault();
    try {
      await adminUpsertPrograma(programaForm);
      toast.success(programaForm.id ? "Programa actualizado." : "Programa guardado.");
      resetProgramaForm();
      const [nextAdmin, nextProgramas] = await Promise.all([listAdminData(), listProgramasConConciertos()]);
      setAdminData(nextAdmin);
      setProgramas(nextProgramas);
    } catch (err) {
      toast.error(err?.message || "No se pudo guardar el programa.");
    }
  };

  const refreshAdminYCatalogoEntradas = async () => {
    const [nextAdmin, nextProgramas, idsReservados] = await Promise.all([
      listAdminData(),
      listProgramasConConciertos(),
      listConciertoIdsConReservaActiva(),
    ]);
    setAdminData(nextAdmin);
    setProgramas(nextProgramas);
    setConciertosConReservaActiva(idsReservados);
    if (canAdmin && section === "admin") {
      await loadAdminOfrnEventos();
    }
  };

  const handleConfirmDeleteConcierto = async () => {
    const id = deleteConciertoTarget?.id;
    if (!id) return;
    setAdminDeleting(true);
    try {
      await adminDeleteConcierto(id);
      toast.success("Concierto eliminado.");
      if (conciertoEditor != null && conciertoEditor !== "new" && Number(conciertoEditor) === Number(id)) {
        closeConciertoEditor();
      }
      setAdminConciertoStatsById((prev) => {
        const next = { ...prev };
        delete next[Number(id)];
        return next;
      });
      setAdminConciertoStatsLoadingById((prev) => {
        const next = { ...prev };
        delete next[Number(id)];
        return next;
      });
      try {
        await refreshAdminYCatalogoEntradas();
      } catch (refreshErr) {
        toast.message(refreshErr?.message || "Eliminado; no se pudo refrescar la lista. Probá recargar la página.");
      }
    } catch (err) {
      toast.error(err?.message || "No se pudo eliminar el concierto.");
      throw err;
    } finally {
      setAdminDeleting(false);
    }
  };

  const handleConfirmDeletePrograma = async () => {
    const target = deleteProgramaTarget;
    if (!target?.id) return;
    const pid = Number(target.id);
    const lista = conciertosByProgramaId.get(pid) || [];
    setAdminDeleting(true);
    try {
      await adminDeletePrograma(pid);
      toast.success("Programa y conciertos de entradas eliminados.");
      if (programaEditor != null && Number(programaEditor) === pid) {
        resetProgramaForm();
      }
      if (conciertoEditor != null && conciertoEditor !== "new") {
        const cid = Number(conciertoEditor);
        if (lista.some((c) => Number(c.id) === cid)) {
          closeConciertoEditor();
        }
      }
      setAdminConciertoStatsById((prev) => {
        const next = { ...prev };
        for (const c of lista) {
          delete next[Number(c.id)];
        }
        return next;
      });
      setAdminConciertoStatsLoadingById((prev) => {
        const next = { ...prev };
        for (const c of lista) {
          delete next[Number(c.id)];
        }
        return next;
      });
      try {
        await refreshAdminYCatalogoEntradas();
      } catch (refreshErr) {
        toast.message(refreshErr?.message || "Eliminado; no se pudo refrescar la lista. Probá recargar la página.");
      }
    } catch (err) {
      toast.error(err?.message || "No se pudo eliminar el programa.");
      throw err;
    } finally {
      setAdminDeleting(false);
    }
  };

  const handleConfirmCancelReserva = async () => {
    if (!cancelReservaTarget?.id) return;
    setCancelingReserva(true);
    const esTercero = Boolean(cancelReservaTarget.reservada_por);
    try {
      if (esTercero) {
        await cancelarReservaTercero(cancelReservaTarget.id);
      } else {
        await cancelarReserva(cancelReservaTarget.id);
      }
      try {
        await enviarMailCancelacionReserva({ reservaId: cancelReservaTarget.id });
        toast.success("Reserva cancelada. Se envió confirmación por correo.");
      } catch {
        toast.message("Reserva cancelada. No pudimos enviar el mail de confirmación.");
      }
      setCancelReservaTarget(null);
      await loadBase({ quiet: true });
    } catch (err) {
      toast.error(err?.message || "No se pudo cancelar la reserva.");
    } finally {
      setCancelingReserva(false);
    }
  };

  const resetConciertoForm = () => {
    setConciertoForm({
      id: null,
      ofrn_evento_id: "",
      nombre: "",
      detalle_richtext: "",
      imagen_drive_url: "",
      capacidad_maxima: "",
      reservas_habilitadas: true,
      activo: true,
      apertura_reservas_at: "",
      limite_recordatorio_at: "",
      limite_cierre_reservas_at: "",
      limite_encuesta_at: "",
      encuesta_url: "",
    });
  };

  const closeConciertoEditor = () => {
    setConciertoEditor(null);
    resetConciertoForm();
  };

  const confirmarProgramaOfrnParaNuevo = () => {
    const id = Number(nuevoProgramaOfrnSelect);
    if (!Number.isFinite(id) || id <= 0) {
      toast.error("Elegí un programa de la lista OFRN.");
      return false;
    }
    setConciertoOfrnProgramaContextId(id);
    setNuevoProgramaOfrnSelect(String(id));
    return true;
  };

  const openNuevoProgramaModal = () => {
    setConciertoOfrnProgramaContextId(null);
    setNuevoProgramaTipoSelect("Sinfónico");
    setNuevoProgramaOfrnSelect("");
    if (conciertoEditor === "new") {
      closeConciertoEditor();
    }
    setNuevoProgramaModalOpen(true);
  };

  const cambiarProgramaOfrnContexto = () => {
    setConciertoOfrnProgramaContextId(null);
    setNuevoProgramaOfrnSelect("");
    setNuevoProgramaTipoSelect("Sinfónico");
    setNuevoProgramaModalOpen(true);
    if (conciertoEditor === "new") {
      closeConciertoEditor();
    }
  };

  const openNuevoConcierto = (ofrnProgramaIdOverride) => {
    const pid =
      ofrnProgramaIdOverride != null && ofrnProgramaIdOverride !== ""
        ? Number(ofrnProgramaIdOverride)
        : conciertoOfrnProgramaContextId;
    if (!Number.isFinite(pid) || pid <= 0) {
      toast.message(
        "Elegí un programa OFRN con «+ Programa» o usá «Agregar concierto» en la tarjeta de un programa que ya tenga entradas.",
      );
      return;
    }
    setConciertoOfrnProgramaContextId(pid);
    setNuevoProgramaOfrnSelect(String(pid));
    resetConciertoForm();
    setConciertoEditor("new");
  };

  const submitConcierto = async (event) => {
    event.preventDefault();
    const cap = Number(conciertoForm.capacidad_maxima);
    if (!Number.isFinite(cap) || cap < 1) {
      toast.error("Indicá la capacidad máxima del concierto.");
      return;
    }
    await adminUpsertConcierto({
      ...conciertoForm,
      capacidad_maxima: cap,
      imagen_drive_url: normalizeDriveImageUrlForStorage(conciertoForm.imagen_drive_url),
      apertura_reservas_at: datetimeLocalInputToIso(conciertoForm.apertura_reservas_at),
      limite_recordatorio_at: datetimeLocalInputToIso(conciertoForm.limite_recordatorio_at),
      limite_cierre_reservas_at: datetimeLocalInputToIso(conciertoForm.limite_cierre_reservas_at),
      limite_encuesta_at: datetimeLocalInputToIso(conciertoForm.limite_encuesta_at),
      encuesta_url: conciertoForm.encuesta_url?.trim() || null,
    });
    toast.success(conciertoForm.id ? "Concierto actualizado." : "Concierto guardado.");
    closeConciertoEditor();
    try {
      await refreshAdminYCatalogoEntradas();
    } catch (err) {
      toast.message(err?.message || "Guardado; no se pudo refrescar la lista. Probá recargar.");
    }
    setAdminConciertoStatsById({});
    setAdminConciertoStatsLoadingById({});
  };

  const cargarStatsConcierto = async (conciertoId, { force = false } = {}) => {
    const id = Number(conciertoId);
    if (!id) return;
    if (!force && adminConciertoStatsById[id]) return;
    setAdminConciertoStatsLoadingById((prev) => ({ ...prev, [id]: true }));
    try {
      const stats = await getAdminConciertoStats(id);
      setAdminConciertoStatsById((prev) => ({ ...prev, [id]: stats }));
    } catch (err) {
      toast.error(err?.message || "No se pudieron cargar estadísticas del concierto.");
    } finally {
      setAdminConciertoStatsLoadingById((prev) => ({ ...prev, [id]: false }));
    }
  };

  const copiarMailsProgramaAdmin = async (programaId, conciertosDelPrograma, bucket) => {
    const ids = (conciertosDelPrograma || []).map((c) => Number(c.id)).filter((n) => Number.isFinite(n) && n > 0);
    if (!ids.length) {
      toast.message("Este programa no tiene conciertos.");
      return;
    }
    const key = `${programaId}:${bucket}`;
    setCopyingProgramaMailsKey(key);
    try {
      const out = await getAdminProgramaMailBuckets(ids);
      const list =
        bucket === "reservaron"
          ? out.emailsReservaron
          : bucket === "ingresaron"
          ? out.emailsIngresaron
          : bucket === "sinIngreso"
          ? out.emailsReservaSinIngreso
          : bucket === "recordatorio"
          ? out.emailsRecordatorioApertura
          : [];
      if (!list.length) {
        toast.message("No hay direcciones en esa categoría.");
        return;
      }
      await navigator.clipboard.writeText(list.join(", "));
      const label =
        bucket === "reservaron"
          ? "quienes reservaron"
          : bucket === "ingresaron"
          ? "con al menos un ingreso registrado"
          : bucket === "recordatorio"
          ? "recordatorio de apertura"
          : "reserva sin ningún ingreso (no asistieron)";
      toast.success(`${list.length} mail${list.length === 1 ? "" : "es"} copiados (${label}).`);
    } catch (err) {
      toast.error(err?.message || "No se pudo copiar.");
    } finally {
      setCopyingProgramaMailsKey("");
    }
  };

  const copiarMailsConciertoAdmin = async (conciertoId, bucket) => {
    const id = Number(conciertoId);
    if (!Number.isFinite(id) || id <= 0) return;
    const key = `${id}:${bucket}`;
    setCopyingConciertoMailsKey(key);
    try {
      const out = await getAdminProgramaMailBuckets([id]);
      const list =
        bucket === "reservaron"
          ? out.emailsReservaron
          : bucket === "ingresaron"
          ? out.emailsIngresaron
          : bucket === "sinIngreso"
          ? out.emailsReservaSinIngreso
          : bucket === "recordatorio"
          ? out.emailsRecordatorioApertura
          : [];
      if (!list.length) {
        toast.message("No hay direcciones en esa categoría para este concierto.");
        return;
      }
      await navigator.clipboard.writeText(list.join(", "));
      const label =
        bucket === "reservaron"
          ? "reservaron"
          : bucket === "ingresaron"
          ? "con ingreso"
          : bucket === "recordatorio"
          ? "recordatorio de apertura"
          : "sin ingreso (no asistieron)";
      toast.success(`${list.length} mail${list.length === 1 ? "" : "es"} copiados (${label}).`);
    } catch (err) {
      toast.error(err?.message || "No se pudo copiar.");
    } finally {
      setCopyingConciertoMailsKey("");
    }
  };

  useEffect(() => {
    if (section !== "admin" || !canAdmin || adminTab !== "programas") return;
    for (const c of adminData.conciertos || []) {
      void cargarStatsConcierto(c.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- precarga al entrar a Admin programas
  }, [section, canAdmin, adminTab, adminData.conciertos]);

  useEffect(() => {
    if (conciertoEditor == null || conciertoEditor === "new") return;
    const id = Number(conciertoEditor);
    if (!Number.isFinite(id) || id <= 0) return;
    setAdminConciertoStatsById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    void cargarStatsConcierto(id, { force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recargar stats al cambiar apertura en el formulario
  }, [conciertoForm.apertura_reservas_at, conciertoForm.reservas_habilitadas]);

  const startEditConcierto = (concierto) => {
    const aperturaGuardada = concierto.apertura_reservas_at
      ? isoToDatetimeLocalInput(concierto.apertura_reservas_at)
      : "";
    const fhEdit = fechaHoraDesdeConciertoEntrada(concierto);
    const aperturaDefault =
      !aperturaGuardada && fhEdit
        ? isoToDatetimeLocalInput(defaultAperturaReservasAtFromConcierto(fhEdit)?.toISOString())
        : "";
    setConciertoForm({
      id: concierto.id,
      ofrn_evento_id: concierto.ofrn_evento_id ?? "",
      nombre: concierto.nombre || "",
      detalle_richtext: concierto.detalle_richtext || "",
      imagen_drive_url: concierto.imagen_drive_url || "",
      capacidad_maxima: Number(concierto.capacidad_maxima || 100),
      reservas_habilitadas: concierto.reservas_habilitadas ?? true,
      activo: concierto.activo ?? true,
      apertura_reservas_at: aperturaGuardada || aperturaDefault,
      limite_recordatorio_at: isoToDatetimeLocalInput(concierto.limite_recordatorio_at),
      limite_cierre_reservas_at: isoToDatetimeLocalInput(concierto.limite_cierre_reservas_at),
      limite_encuesta_at: isoToDatetimeLocalInput(concierto.limite_encuesta_at),
      encuesta_url: concierto.encuesta_url || "",
    });
    setConciertoEditor(concierto.id);
    const reglas = conciertoParaReglasEntradas(
      concierto,
      {
        apertura_reservas_at: aperturaGuardada || aperturaDefault,
        reservas_habilitadas: concierto.reservas_habilitadas ?? true,
        activo: concierto.activo ?? true,
      },
      { editing: true },
    );
    if (conciertoAdminSoloRecordatoriosProgramados(reglas)) {
      setAdminConciertoStatsById((prev) => {
        const next = { ...prev };
        delete next[concierto.id];
        return next;
      });
      void cargarStatsConcierto(concierto.id, { force: true });
    }
  };

  const renderProgramaEditorForm = () => (
    <form className="space-y-3" onSubmit={submitPrograma}>
      {ofrnProgramaEnEdicionReferencia && (
        <div className={ui.inset}>
          <p className={ui.label}>Gira OFRN (referencia)</p>
          <p className={`text-xs font-semibold ${ui.textBody}`}>{buildProgramaLabel(ofrnProgramaEnEdicionReferencia)}</p>
          {String(ofrnProgramaEnEdicionReferencia.subtitulo || "").trim() ? (
            <p className={`text-xs leading-relaxed ${ui.textSoft}`}>{String(ofrnProgramaEnEdicionReferencia.subtitulo).trim()}</p>
          ) : (
            <p className={`text-[11px] italic ${ui.textMuted}`}>Sin subtítulo en la gira OFRN.</p>
          )}
        </div>
      )}
      <input
        value={programaForm.nombre}
        onChange={(event) => setProgramaForm((prev) => ({ ...prev, nombre: event.target.value }))}
        className={ui.input}
        placeholder="Nombre del programa"
        required
      />
      <RichTextEditor
        key={`programa-detalle-${programaForm.id ?? "nuevo"}`}
        value={programaForm.detalle_richtext}
        onChange={(value) => setProgramaForm((prev) => ({ ...prev, detalle_richtext: value }))}
        placeholder="Detalle del programa (texto enriquecido)"
      />
      <label className={`flex items-center gap-2 text-sm ${ui.textBody}`}>
        <input
          type="checkbox"
          checked={programaForm.activo}
          onChange={(event) => setProgramaForm((prev) => ({ ...prev, activo: event.target.checked }))}
          className={ui.checkbox}
        />
        Programa activo (visible en catálogo cuando tenga conciertos publicados)
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={`${ui.btnPrimary} w-auto px-4`}>
          Actualizar programa
        </button>
        <button type="button" onClick={resetProgramaForm} className={ui.btnGhost}>
          Cancelar
        </button>
      </div>
    </form>
  );

  const renderConciertoEditorForm = () => (
    <form className="space-y-3" onSubmit={submitConcierto}>
      <select
        value={conciertoForm.ofrn_evento_id === "" ? "" : String(conciertoForm.ofrn_evento_id)}
        onChange={(event) => {
          const nextId = event.target.value === "" ? "" : Number(event.target.value);
          const ev = eventosParaSelectorConcierto.find((row) => Number(row.id) === Number(nextId));
          if (!ev) {
            setConciertoForm((prev) => ({
              ...prev,
              ofrn_evento_id: "",
              nombre: "",
              capacidad_maxima: "",
              apertura_reservas_at: "",
            }));
            return;
          }
          setConciertoForm((prev) => ({
            ...prev,
            ...conciertoFormDefaultsDesdeEventoOfrn(ev, prev),
          }));
        }}
        className={ui.select}
        required
      >
        <option value="">Seleccionar evento OFRN (tipo concierto)</option>
        {eventosParaSelectorConcierto.map((ev) => (
          <option key={ev.id} value={String(ev.id)}>
            {`${buildProgramaLabel(ev.programas)} · ${formatDateLongEs(`${ev.fecha}T00:00:00`)}`}
          </option>
        ))}
      </select>
      <input
        value={conciertoForm.nombre}
        onChange={(event) => setConciertoForm((prev) => ({ ...prev, nombre: event.target.value }))}
        className={ui.input}
        placeholder="Nombre del concierto"
        required
      />
      {(() => {
        const evSel = eventosParaSelectorConcierto.find(
          (row) => Number(row.id) === Number(conciertoForm.ofrn_evento_id),
        );
        if (!evSel) return null;
        const fh = fechaHoraDesdeConciertoEntrada({ evento: evSel });
        const lugar = lugarNombreDesdeConciertoEntrada({ evento: evSel });
        return (
          <div className={`${ui.inset} space-y-1`}>
            <p className={ui.label}>Fecha, hora y lugar (solo lectura · evento OFRN)</p>
            <p className={`text-sm font-semibold ${ui.textBody}`}>
              {fh ? formatConciertoFechaHoraEs(fh) : "—"}
            </p>
            <p className={`text-xs ${ui.textMuted}`}>{lugar || "Sin lugar indicado en el evento"}</p>
          </div>
        );
      })()}
      <input
        value={conciertoForm.imagen_drive_url}
        onChange={(event) => setConciertoForm((prev) => ({ ...prev, imagen_drive_url: event.target.value }))}
        className={ui.input}
        placeholder="URL pública de portada (Google Drive)"
      />
      <input
        type="number"
        min={1}
        value={conciertoForm.capacidad_maxima === "" ? "" : conciertoForm.capacidad_maxima}
        onChange={(event) => {
          const raw = event.target.value;
          setConciertoForm((prev) => ({
            ...prev,
            capacidad_maxima: raw === "" ? "" : Number(raw),
          }));
        }}
        className={ui.input}
        placeholder="Capacidad máxima"
        required
      />
      <div className={ui.insetPanel}>
        <p className={ui.sectionTitle}>Apertura de reservas</p>
        <label className={`flex items-center gap-2 text-sm ${ui.textBody}`}>
          <input
            type="checkbox"
            checked={conciertoForm.reservas_habilitadas}
            onChange={(e) =>
              setConciertoForm((prev) => ({ ...prev, reservas_habilitadas: e.target.checked }))
            }
            className={ui.checkbox}
          />
          Reservas habilitadas (flag admin)
        </label>
        <label className={`block text-xs font-semibold mt-2 ${ui.textBody}`}>
          Fecha y hora de apertura
          <input
            type="datetime-local"
            value={conciertoForm.apertura_reservas_at}
            onChange={(e) => setConciertoForm((prev) => ({ ...prev, apertura_reservas_at: e.target.value }))}
            className={`mt-1 ${ui.input}`}
          />
        </label>
        <p className={`text-[10px] leading-snug mt-1 ${ui.textMuted}`}>
          Si dejás vacío en base, se usa por defecto el jueves anterior al concierto a las 19:00 (Argentina). Mientras no
          llegue la apertura, en admin solo verás recordatorios programados.
        </p>
      </div>
      <div className={ui.insetPanel}>
        <p className={ui.sectionTitle}>Horarios automáticos</p>
        <p className={`text-[11px] leading-snug ${ui.textMuted}`}>
          Por defecto: recordatorio 1 día antes, cierre de reservas 10 min antes del concierto, encuesta 3 h después (editable).
        </p>
        <label className={`block text-xs font-semibold ${ui.textBody}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Recordatorio por mail</span>
            <button
              type="button"
              disabled={testMailBusyTipo != null}
              onClick={() => void handleEnviarMailPruebaConcierto("recordatorio")}
              className={`${ui.btnGhost} text-[11px] px-2 py-1 shrink-0 disabled:opacity-50`}
            >
              {testMailBusyTipo === "recordatorio" ? "Enviando…" : "Enviar mail de prueba"}
            </button>
          </div>
          <input
            type="datetime-local"
            value={conciertoForm.limite_recordatorio_at}
            onChange={(e) => setConciertoForm((prev) => ({ ...prev, limite_recordatorio_at: e.target.value }))}
            className={`mt-1 ${ui.input}`}
          />
        </label>
        <label className={`block text-xs font-semibold ${ui.textBody}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Cierre para sacar entradas</span>
            <span className={`text-[10px] font-normal ${ui.textMuted}`}>Sin correo automático</span>
          </div>
          <input
            type="datetime-local"
            value={conciertoForm.limite_cierre_reservas_at}
            onChange={(e) => setConciertoForm((prev) => ({ ...prev, limite_cierre_reservas_at: e.target.value }))}
            className={`mt-1 ${ui.input}`}
          />
        </label>
        <label className={`block text-xs font-semibold ${ui.textBody}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Envío encuesta (quienes ingresaron)</span>
            <button
              type="button"
              disabled={testMailBusyTipo != null}
              onClick={() => void handleEnviarMailPruebaConcierto("encuesta")}
              className={`${ui.btnGhost} text-[11px] px-2 py-1 shrink-0 disabled:opacity-50`}
            >
              {testMailBusyTipo === "encuesta" ? "Enviando…" : "Enviar mail de prueba"}
            </button>
          </div>
          <input
            type="datetime-local"
            value={conciertoForm.limite_encuesta_at}
            onChange={(e) => setConciertoForm((prev) => ({ ...prev, limite_encuesta_at: e.target.value }))}
            className={`mt-1 ${ui.input}`}
          />
        </label>
        <label className={`block text-xs font-semibold ${ui.textBody}`}>
          Enlace de la encuesta (Google Form u otro)
          <input
            type="url"
            value={conciertoForm.encuesta_url}
            onChange={(e) => setConciertoForm((prev) => ({ ...prev, encuesta_url: e.target.value }))}
            placeholder="https://forms.gle/..."
            className={`mt-1 ${ui.input}`}
          />
        </label>
        <p className={`text-[10px] leading-snug ${ui.textMuted}`}>
          Opcional: si queda vacío, el mail de encuesta (y la prueba) usan{" "}
          <a
            href="https://linktr.ee/conciertos_ofrn"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            linktr.ee/conciertos_ofrn
          </a>
          . Un enlace acá reemplaza ese default solo para este concierto.
        </p>
      </div>
      <RichTextEditor
        key={`detalle-${conciertoForm.id ?? "nuevo"}`}
        defaultOpen
        value={conciertoForm.detalle_richtext}
        onChange={(value) => setConciertoForm((prev) => ({ ...prev, detalle_richtext: value }))}
        placeholder="Detalle del concierto"
      />
      <div className="flex flex-wrap gap-2 items-center">
        <button type="submit" className={`${ui.btnPrimary} w-auto px-4`}>
          {conciertoForm.id ? "Actualizar concierto" : "Guardar concierto"}
        </button>
        <button type="button" onClick={closeConciertoEditor} className={ui.btnGhost}>
          Cancelar
        </button>
      </div>
    </form>
  );

  const renderAdminConciertoItem = (concierto) => {
    const stats = adminConciertoStatsById[concierto.id];
    const loadingStats = Boolean(adminConciertoStatsLoadingById[concierto.id]);
    const editingThis =
      conciertoEditor != null
      && conciertoEditor !== "new"
      && Number(conciertoEditor) === Number(concierto.id);
    const conciertoReglas = conciertoParaReglasEntradas(concierto, conciertoForm, { editing: editingThis });
    const vistaSoloRecordatorios = conciertoAdminSoloRecordatoriosProgramados(conciertoReglas);
    const enVentana = conciertoEnVentanaCatalogoDosSemanas(concierto, inicioDiaHoy, finDiaVentanaCatalogo);
    const bloqueoEliminarConcierto = motivoBloqueoEliminarConcierto(stats);
    const muestraCargandoStats = (enVentana || vistaSoloRecordatorios) && loadingStats && !stats;
    const muestraVerStats = !enVentana && !vistaSoloRecordatorios && !stats && !loadingStats;
    const conciertoMailBusy = copyingConciertoMailsKey.startsWith(`${concierto.id}:`);
    const recordatoriosPendientes = stats?.recordatoriosAperturaPendientes ?? stats?.recordatoriosApertura ?? 0;
    const statMailBtn = (bucket, { disabled = false, title }) => (
      <button
        type="button"
        disabled={disabled || conciertoMailBusy}
        title={title}
        aria-label={title}
        onClick={() => {
          if (!disabled) void copiarMailsConciertoAdmin(concierto.id, bucket);
        }}
        className={`shrink-0 ${ui.btnIcon} p-1.5 disabled:opacity-25 disabled:cursor-not-allowed`}
      >
        <IconMail size={16} className={copyingConciertoMailsKey === `${concierto.id}:${bucket}` ? "opacity-40" : ""} />
      </button>
    );
    const statsGrid = stats && (
      vistaSoloRecordatorios ? (
        <div className="mt-2 space-y-2 text-xs">
          <div
            className={`rounded-md border px-2 py-1.5 flex items-start justify-between gap-1 ${ui.adminStatCard("recordatorio")}`}
          >
            <div className="min-w-0">
              <span className={ui.adminStatLabel("recordatorio")}>Recordatorios programados:</span>{" "}
              <span>{recordatoriosPendientes}</span>
            </div>
            {statMailBtn("recordatorio", {
              title: "Copiar mails inscriptos al recordatorio de apertura (pendientes de aviso)",
            })}
          </div>
          <p className={`text-[11px] ${ui.textMuted}`}>Capacidad máxima: {stats.capacidad}</p>
          <p className={`text-[10px] leading-snug ${ui.textMuted}`}>
            Las reservas aún no están abiertas
            {textoAperturaReservas(conciertoReglas)
              ? ` (apertura prevista: ${textoAperturaReservas(conciertoReglas)})`
              : ""}
            . Hasta entonces solo tiene sentido el contador de recordatorios.
          </p>
        </div>
      ) : (
      <>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          <div className={`rounded-md border px-2 py-1.5 flex items-start justify-between gap-1 ${ui.adminStatCard("reservadas")}`}>
            <div className="min-w-0">
              <span className={ui.adminStatLabel("reservadas")}>Reservadas:</span>{" "}
              <span>{stats.reservadas}</span>
            </div>
            {statMailBtn("reservaron", {
              title: "Copiar mails de quienes tienen reserva activa en este concierto",
            })}
          </div>
          <div className={`rounded-md border px-2 py-1.5 flex items-start justify-between gap-1 ${ui.adminStatCard("disponibles")}`}>
            <div className="min-w-0">
              <span className={ui.adminStatLabel("disponibles")}>Disponibles:</span>{" "}
              <span>{stats.disponibles}</span>
            </div>
            {statMailBtn("disponibles", {
              disabled: true,
              title: "Sin destinatarios: son plazas libres (no hay mails asociados)",
            })}
          </div>
          <div className={`rounded-md border px-2 py-1.5 flex items-start justify-between gap-1 ${ui.adminStatCard("ingresadas")}`}>
            <div className="min-w-0">
              <span className={ui.adminStatLabel("ingresadas")}>Ingresadas:</span>{" "}
              <span>{stats.ingresadas}</span>
            </div>
            {statMailBtn("ingresaron", {
              title: "Copiar mails con al menos un ingreso registrado en este concierto",
            })}
          </div>
          <div className={`rounded-md border px-2 py-1.5 flex items-start justify-between gap-1 ${ui.adminStatCard("noUtilizadas")}`}>
            <div className="min-w-0">
              <span className={ui.adminStatLabel("noUtilizadas")}>Reservadas no utilizadas:</span> {stats.noUtilizadas}
            </div>
            {statMailBtn("sinIngreso", {
              title:
                "Copiar mails con entrada activa sin ningún ingreso registrado en este concierto (no asistieron)",
            })}
          </div>
        </div>
        <p className={`mt-1 text-[11px] ${ui.textMuted}`}>Capacidad máxima: {stats.capacidad}</p>
      </>
      )
    );
    if (editingThis) {
      return (
        <li key={concierto.id} className={`${ui.editorHighlight} text-sm space-y-3 list-none`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className={ui.sectionTitle}>Editar concierto</h4>
              <p className={`mt-1 text-sm font-semibold ${ui.textStrong}`}>
                {formatConciertoFechaHoraEs(concierto.fecha_hora)}
                {concierto.lugar_nombre ? ` · ${concierto.lugar_nombre}` : ""}
              </p>
              <p className={`text-xs ${ui.textMuted}`}>{concierto.nombre}</p>
            </div>
            {bloqueoEliminarConcierto ? (
              <button
                type="button"
                title={bloqueoEliminarConcierto}
                aria-label={bloqueoEliminarConcierto}
                disabled
                className={`${ui.btnIconDanger} opacity-35 cursor-not-allowed`}
              >
                <IconTrash size={18} />
              </button>
            ) : (
              <button
                type="button"
                title="Eliminar concierto"
                aria-label="Eliminar concierto"
                onClick={() => setDeleteConciertoTarget({ id: concierto.id, nombre: concierto.nombre })}
                className={ui.btnIconDanger}
              >
                <IconTrash size={18} />
              </button>
            )}
          </div>
          {renderConciertoEditorForm()}
          {muestraCargandoStats && (
            <p className={`text-xs pt-2 border-t ${ui.dividerLight} ${ui.textMuted}`}>Cargando estadísticas…</p>
          )}
          {statsGrid && (
            <div className={`pt-2 border-t ${ui.dividerLight}`}>{statsGrid}</div>
          )}
        </li>
      );
    }
    return (
      <li key={concierto.id} className={`${ui.cardMuted} p-2.5 text-sm list-none`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${ui.textStrong}`}>{formatConciertoFechaHoraEs(concierto.fecha_hora)}</p>
            <p className={`text-xs ${ui.textSoft}`}>{concierto.lugar_nombre || "Sin lugar"}</p>
            <p className={`text-[11px] mt-0.5 ${ui.textMuted}`}>{concierto.nombre}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              title="Editar concierto"
              aria-label="Editar concierto"
              onClick={() => startEditConcierto(concierto)}
              className={ui.btnIcon}
            >
              <IconEdit size={18} />
            </button>
            {bloqueoEliminarConcierto ? (
              <button
                type="button"
                title={bloqueoEliminarConcierto}
                aria-label={bloqueoEliminarConcierto}
                disabled
                className={`${ui.btnIconDanger} opacity-35 cursor-not-allowed`}
              >
                <IconTrash size={18} />
              </button>
            ) : (
              <button
                type="button"
                title="Eliminar concierto"
                aria-label="Eliminar concierto"
                onClick={() => setDeleteConciertoTarget({ id: concierto.id, nombre: concierto.nombre })}
                className={ui.btnIconDanger}
              >
                <IconTrash size={18} />
              </button>
            )}
          </div>
        </div>
        {muestraCargandoStats && <p className={`text-xs mt-2 ${ui.textMuted}`}>Cargando estadísticas…</p>}
        {statsGrid}
        {muestraVerStats && (
          <button
            type="button"
            onClick={() => cargarStatsConcierto(concierto.id)}
            className={`mt-2 ${ui.btnIndigoSmall}`}
          >
            Ver estadísticas
          </button>
        )}
      </li>
    );
  };

  if (loading) {
    return (
      <div className={`${ui.page} flex items-center justify-center px-4`}>
        <span className={`text-sm uppercase tracking-wide font-semibold ${ui.textMuted}`}>Cargando entradas...</span>
      </div>
    );
  }

  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-start justify-between gap-3 entradas-app-header">
          <div className="flex flex-col gap-2 min-w-0 sm:flex-row sm:items-center sm:gap-3">
            <h1 className={`${ui.title} uppercase tracking-tight leading-tight sm:order-2`}>ENTRADAS</h1>
            <div className={`${ui.logoWrap} sm:order-1`}>
              <img
                src={ENTRADAS_LOGO_URL}
                alt="Orquesta Filarmónica de Río Negro"
                className="h-10 w-auto max-w-[180px] object-contain"
              />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0 sm:flex-row sm:items-center sm:gap-3">
            <p className={`${ui.subtitle} text-right max-w-[10rem] sm:max-w-none truncate sm:whitespace-nowrap`}>
              {profile.apellido}, {profile.nombre}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggle}
                className={`${ui.headerAction} ${ui.themeToggle}`}
                aria-label={isDark ? "Modo claro" : "Modo oscuro"}
                title={isDark ? "Modo claro" : "Modo oscuro"}
              >
                {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
              </button>
              <button
                type="button"
                onClick={onLogout}
                className={`${ui.headerAction} ${ui.logout} text-xs font-bold`}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <div className="entradas-nav-row grid grid-cols-2 sm:flex flex-wrap gap-2">
          <button
            type="button"
            className={section === "catalogo" ? ui.navActive : ui.navIdle}
            onClick={() => setSearchParams({ view: "catalogo" })}
          >
            Catálogo
          </button>
          <button
            type="button"
            className={section === "mis-reservas" ? ui.navActive : ui.navIdle}
            onClick={() => setSearchParams({ view: "mis-reservas" })}
          >
            Mis entradas
          </button>
          {canRecepcion && (
            <button
              type="button"
              className={section === "recepcion" ? ui.navActive : ui.navIdle}
              onClick={() => setSearchParams({ view: "recepcion" })}
            >
              Recepción
            </button>
          )}
          {canAdmin && (
            <button
              type="button"
              className={section === "admin" ? ui.navActive : ui.navIdle}
              onClick={() => setSearchParams({ view: "admin" })}
            >
              Admin
            </button>
          )}
        </div>

        {section === "catalogo" && (
          <div className="entradas-catalogo grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section
              className={`lg:col-span-1 entradas-catalog-panel ${ui.section} p-4 space-y-4 ${
                conciertoSlug ? "hidden lg:block" : ""
              }`}
            >
              <h2 className={ui.sectionTitle}>Programas y conciertos</h2>
              <div className="space-y-3">
                {programasCatalogo.length === 0 && (
                  <p className={`text-sm ${ui.textMuted}`}>No hay conciertos publicados en las próximas dos semanas.</p>
                )}
                {programasCatalogo.map((programa) => (
                  <article key={programa.id} className={`${ui.cardInner} p-3 space-y-2`}>
                    {programa.localidadLabel ? (
                      <p className={ui.programaLocalidad}>{programa.localidadLabel}</p>
                    ) : null}
                    <h3 className={ui.programaTitle}>{programa.nombre}</h3>
                    <EntradasRichTextHtml
                      html={programa.detalle_richtext}
                      isDark={isDark}
                      className={ui.richtextBorder}
                    />
                    <div className="mt-2 space-y-2">
                      {(programa.entrada_concierto || []).map((concierto) => {
                        const catalogoSeleccionado = String(concierto.slug_publico || "") === conciertoSlug;
                        const reservasAbiertas = entradaConciertoReservasAbiertas(concierto);
                        const entradasAgotadas = conciertoCatalogoEntradasAgotadas(concierto);
                        const aceptaRecordatorio = conciertoAceptaRecordatorioApertura(
                          concierto,
                          finDiaVentanaCatalogo,
                        );
                        const inscriptoRecordatorio = recordatorioConciertoIds.has(Number(concierto.id));
                        const textoTarjetaAgotada = entradasAgotadas
                          ? isDark
                            ? "text-slate-400"
                            : "text-slate-500"
                          : ui.textBody;
                        const textoSecundarioAgotado = entradasAgotadas
                          ? isDark
                            ? "text-slate-500"
                            : "text-slate-400"
                          : null;
                        return (
                          <div
                            key={concierto.id}
                            className={`${ui.catalogConciertoCardWrap(catalogoSeleccionado, entradasAgotadas)} entradas-interactive`}
                          >
                            {renderCatalogReservaEnRecuadro(concierto.id, { embedded: true })}
                          <button
                            type="button"
                            className={ui.catalogConciertoCardBody}
                            onClick={() => handlePickConcierto(concierto.slug_publico)}
                          >
                            <div className="space-y-1">
                              <p className={`text-sm font-semibold ${textoTarjetaAgotada}`}>{concierto.nombre}</p>
                              {((!reservasAbiertas && textoAperturaReservas(concierto)) ||
                                (aceptaRecordatorio && inscriptoRecordatorio)) && (
                                <div className="flex flex-wrap gap-1">
                                  {!reservasAbiertas && textoAperturaReservas(concierto) && (
                                    <span className={ui.badgeRecordatorio}>
                                      Apertura {textoAperturaReservas(concierto)}
                                    </span>
                                  )}
                                  {aceptaRecordatorio && inscriptoRecordatorio && (
                                    <span className={ui.badgeRecordatorio}>Recordatorio activo</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <p className={`text-xs mt-0.5 ${textoSecundarioAgotado || ui.textSoft}`}>
                              {formatConciertoFechaHoraEs(concierto.fecha_hora)}
                            </p>
                            {concierto.lugar_nombre && (
                              <p className={`text-xs ${textoSecundarioAgotado || ui.textMuted}`}>{concierto.lugar_nombre}</p>
                            )}
                          </button>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>

              {conciertosFuturosRecordatorio.length > 0 && (
                <button
                  type="button"
                  className={`w-full sm:w-auto ${catalogoFuturosVisible ? ui.navActive : ui.navIdle}`}
                  onClick={() => {
                    setCatalogoFuturosVisible((v) => {
                      if (v) setCatalogoFuturosLocalidad(null);
                      return !v;
                    });
                  }}
                >
                  {catalogoFuturosVisible ? "Ocultar conciertos futuros" : "Mostrar conciertos futuros"}
                </button>
              )}

              {catalogoFuturosVisible && conciertosFuturosRecordatorio.length > 0 && (
                <div className={`border-t pt-4 space-y-3 ${ui.divider}`}>
                  <h3 className={ui.sectionTitle}>Conciertos futuros (recordatorio)</h3>
                  {!catalogoFuturosLocalidad ? (
                    <>
                      <p className={`text-xs ${ui.textMuted}`}>
                        Elegí una localidad para ver conciertos con reservas aún no abiertas o más allá de la ventana habitual.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {futurosPorLocalidad.map(([loc, lista]) => (
                          <button
                            key={loc}
                            type="button"
                            className={`entradas-concierto-card ${ui.cardInner} p-3 text-left entradas-interactive`}
                            onClick={() => setCatalogoFuturosLocalidad(loc)}
                          >
                            <p className={`text-sm font-bold ${ui.textStrong}`}>{loc}</p>
                            <p className={`text-xs ${ui.textMuted}`}>
                              {lista.length} concierto{lista.length === 1 ? "" : "s"}
                            </p>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`text-xs font-bold ${isDark ? "text-[#7dd3fc]" : "text-[#0e7490]"}`}
                        onClick={() => setCatalogoFuturosLocalidad(null)}
                      >
                        ← Todas las localidades
                      </button>
                      <p className={`text-xs ${ui.textMuted}`}>{catalogoFuturosLocalidad}</p>
                      <div className="space-y-2">
                        {conciertosFuturosLocalidadLista.map((concierto) => {
                          const inscripto = recordatorioConciertoIds.has(Number(concierto.id));
                          const busy = recordatorioBusyId === Number(concierto.id);
                          return (
                            <article key={concierto.id} className={`entradas-concierto-card ${ui.cardInner} p-3 space-y-2`}>
                              <div>
                                <p className={`text-sm font-semibold ${ui.textBody}`}>{concierto.nombre}</p>
                                <p className={`text-xs ${ui.textSoft}`}>
                                  {formatConciertoFechaHoraEs(concierto.fecha_hora)}
                                </p>
                                {textoAperturaReservas(concierto) && (
                                  <p className={`text-[11px] mt-0.5 ${ui.textMuted}`}>
                                    Apertura de reservas: {textoAperturaReservas(concierto)}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={busy || inscripto}
                                  onClick={() => void handleRecordarmeConcierto(concierto)}
                                  className={`${ui.btnPrimary} w-auto px-3 py-1.5 text-xs`}
                                >
                                  {busy ? "Anotando…" : inscripto ? "Ya estás anotado" : "Recordarme"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void copiarEnlaceRecordarme(concierto)}
                                  className={`${ui.btnGhost} px-2 py-1.5`}
                                  title="Copiar enlace público de recordatorio"
                                >
                                  <IconCopy size={16} />
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>

            <section
              className={`lg:col-span-2 entradas-catalog-panel ${ui.section} p-4 space-y-3 min-h-[12rem] ${
                !conciertoSlug ? "hidden lg:block" : ""
              }`}
            >
              {conciertoSlug && (
                <button
                  type="button"
                  onClick={handleClearCatalogoConcierto}
                  className={`lg:hidden flex items-center gap-1 text-sm font-bold -mt-1 mb-1 ${
                    isDark ? "text-[#7dd3fc]" : "text-[#0e7490]"
                  }`}
                >
                  <IconChevronLeft size={18} aria-hidden />
                  Volver al listado
                </button>
              )}
              {selectedConciertoLoading && conciertoSlug && (
                <div className={`flex flex-col items-center justify-center gap-2 py-10 ${ui.textMuted}`}>
                  <span
                    className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1ebbf0] border-t-transparent"
                    aria-hidden
                  />
                  <span className="text-sm font-medium">Cargando concierto…</span>
                </div>
              )}
              {!selectedConciertoLoading && !conciertoSlug && (
                <p className={`text-sm ${ui.textMuted}`}>Seleccioná un concierto para ver su URL compartible y reservar.</p>
              )}
              {!selectedConciertoLoading && conciertoSlug && !selectedConcierto && (
                <p className={`text-sm ${ui.textMuted}`}>No se pudo mostrar este concierto. Volvé al listado o probá con otro enlace.</p>
              )}
              {!selectedConciertoLoading && selectedConcierto && (() => {
                const reservasAbiertasSel = entradaConciertoReservasAbiertas(selectedConcierto);
                const entradasAgotadasSel = conciertoCatalogoEntradasAgotadas(selectedConcierto);
                const aceptaRecSel = conciertoAceptaRecordatorioApertura(
                  selectedConcierto,
                  finDiaVentanaCatalogo,
                );
                const inscriptoRecSel = recordatorioConciertoIds.has(Number(selectedConcierto.id));
                const busyRecSel = recordatorioBusyId === Number(selectedConcierto.id);
                const localidadSel = localidadDesdeConciertoEntrada(selectedConcierto);
                const renderLocalidadSel = localidadSel ? (
                  <p className={ui.programaLocalidad}>{localidadSel}</p>
                ) : null;
                return (
                <>
                  <p className={ui.accentEyebrow}>Concierto seleccionado</p>
                  {entradasAgotadasSel && !tieneReservaEnConcierto(selectedConcierto.id) ? (
                    <div
                      className={`entradas-catalog-control overflow-hidden border-2 ${
                        isDark ? "border-slate-600 bg-slate-800/70" : "border-slate-300 bg-slate-100"
                      }`}
                    >
                      {renderCatalogAgotadasEnRecuadro(selectedConcierto, { embedded: true })}
                      <div className="px-3 py-3 space-y-1">
                        <h3 className={`text-lg font-bold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          {selectedConcierto.nombre}
                        </h3>
                        <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          {formatConciertoFechaHoraEs(selectedConcierto.fecha_hora)}
                        </p>
                        {selectedConcierto.lugar_nombre && (
                          <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            {selectedConcierto.lugar_nombre}
                          </p>
                        )}
                        {renderLocalidadSel}
                      </div>
                    </div>
                  ) : tieneReservaEnConcierto(selectedConcierto.id) ? (
                    <div
                      className={`entradas-catalog-control overflow-hidden border-2 ${
                        isDark ? "border-slate-600 bg-slate-800" : "border-[#e8eaed] bg-white"
                      }`}
                    >
                      {renderCatalogReservaEnRecuadro(selectedConcierto.id, { embedded: true })}
                      <div className="px-3 py-3 space-y-1">
                        <h3 className={`text-lg font-bold ${ui.textStrong}`}>{selectedConcierto.nombre}</h3>
                        <p className={`text-xs ${ui.textSoft}`}>
                          {formatConciertoFechaHoraEs(selectedConcierto.fecha_hora)}
                        </p>
                        {selectedConcierto.lugar_nombre && (
                          <p className={`text-xs ${ui.textMuted}`}>{selectedConcierto.lugar_nombre}</p>
                        )}
                        {renderLocalidadSel}
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className={`text-lg font-bold ${ui.textStrong}`}>{selectedConcierto.nombre}</h3>
                      <p className={`text-xs ${ui.textSoft}`}>
                        {formatConciertoFechaHoraEs(selectedConcierto.fecha_hora)}
                      </p>
                      {selectedConcierto.lugar_nombre && (
                        <p className={`text-xs ${ui.textMuted}`}>{selectedConcierto.lugar_nombre}</p>
                      )}
                      {renderLocalidadSel}
                    </>
                  )}
                  {!reservasAbiertasSel && (
                    <div className={`entradas-catalog-control ${ui.warningBox}`}>
                      <p className="text-sm font-semibold">Reservas aún no abiertas</p>
                      {textoAperturaReservas(selectedConcierto) && (
                        <p className={`text-xs mt-1 ${ui.textMuted}`}>
                          Apertura prevista: {textoAperturaReservas(selectedConcierto)}
                        </p>
                      )}
                      {aceptaRecSel && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyRecSel || inscriptoRecSel}
                            onClick={() => void handleRecordarmeConcierto(selectedConcierto)}
                            className={`${ui.btnPrimary} w-auto px-3 py-1.5 text-xs`}
                          >
                            {busyRecSel ? "Anotando…" : inscriptoRecSel ? "Ya estás anotado al recordatorio" : "Recordarme cuando abran"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void copiarEnlaceRecordarme(selectedConcierto)}
                            className={`${ui.btnGhost} px-2 py-1.5 text-xs`}
                          >
                            Copiar enlace
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedConcierto.imagen_drive_url && (
                    <EntradasDriveCoverImage
                      url={selectedConcierto.imagen_drive_url}
                      alt={selectedConcierto.nombre}
                      wrapperClassName={`entradas-concierto-card flex w-full items-center justify-center overflow-hidden ${ui.imgBorder} ${
                        isDark ? "bg-slate-900/50" : "bg-slate-50"
                      }`}
                    />
                  )}
                  <EntradasRichTextHtml html={selectedConcierto.detalle_richtext} isDark={isDark} />
                  {reservasAbiertasSel && (
                    <div className={`entradas-catalog-control ${ui.inset}`}>
                      <EntradasDisponibilidadBar concierto={selectedConcierto} isDark={isDark} square />
                    </div>
                  )}
                  <EntradasCompartirConciertoBtn concierto={selectedConcierto} />
                  {reservasAbiertasSel && !entradasAgotadasSel && (
                    <>
                  <label className={ui.label}>Cantidad</label>
                  <select
                    className={`entradas-catalog-control ${ui.select} w-full disabled:opacity-60`}
                    value={cantidad}
                    onChange={(event) => setCantidad(Number(event.target.value))}
                    disabled={tieneReservaEnConcierto(selectedConcierto.id)}
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} entrada{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleCreateReserva}
                    disabled={
                      creatingReserva
                      || !entradaConciertoReservasAbiertas(selectedConcierto)
                      || computeDisponibles(selectedConcierto) < cantidad
                      || tieneReservaEnConcierto(selectedConcierto.id)
                    }
                    className={ui.btnPrimary}
                  >
                    {creatingReserva ? "Obteniendo..." : "Obtener"}
                  </button>
                    </>
                  )}
                  {entradasAgotadasSel && reservasAbiertasSel && (
                    <p className={`text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      No quedan entradas disponibles para este concierto.
                    </p>
                  )}
                  {reservaResult && (
                    <div className={`space-y-2 border-t pt-3 ${ui.divider}`}>
                      <p className={`text-sm font-bold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                        Reserva #{reservaResult.codigo_reserva}
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!selectedConcierto) return;
                          try {
                            const { blob, filename } = await buildEntradasReservaPdfConDataUrls({
                              concierto: selectedConcierto,
                              reserva: {
                                codigo_reserva: reservaResult.codigo_reserva,
                                cantidad_solicitada: reservaResult.cantidad_solicitada ?? cantidad,
                              },
                              reservaQrDataUrl: reservaResult.reservaQr,
                              entriesQrDataUrls: reservaResult.entriesQr,
                            });
                            downloadEntradasReservaPdfBlob(blob, filename);
                          } catch (e) {
                            toast.error(e?.message || "No se pudo generar el PDF.");
                          }
                        }}
                        className={ui.btnGhost}
                      >
                        Descargar PDF (detalle y QRs)
                      </button>
                      <img
                        src={reservaResult.reservaQr}
                        alt="QR reserva general"
                        className={`w-40 h-40 rounded-lg ${ui.imgBorder}`}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {reservaResult.entriesQr.map((qr, idx) => (
                          <img key={idx} src={qr} alt={`QR entrada ${idx + 1}`} className={`w-full rounded-lg ${ui.imgBorder}`} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
                );
              })()}
            </section>
          </div>
        )}

        {section === "mis-reservas" && (
          <section className={`${ui.section} p-4 space-y-3`}>
            <h2 className={ui.sectionTitle}>Mis entradas</h2>
            <EntradasMisReservasSection
              misReservas={misReservas}
              ui={ui}
              isDark={isDark}
              downloadingPdfReservaId={downloadingPdfReservaId}
              setDownloadingPdfReservaId={setDownloadingPdfReservaId}
              onCancelReserva={(reserva) => setCancelReservaTarget(reserva)}
            />
          </section>
        )}

        {section === "recepcion" && canRecepcion && (
          <section className={`${ui.section} p-4 space-y-3`}>
            <input
              ref={qrPhotoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleNativeQrPhoto}
            />
            <div className="flex w-full items-stretch gap-2 min-w-0">
              <select
                className={`min-w-0 w-[80%] max-w-[80%] shrink-0 ${ui.select}`}
                value={recepcionConciertoId}
                onChange={(e) => {
                  setRecepcionConciertoId(e.target.value);
                  setScannerToken("");
                  setManualReservaCode("");
                  setQrPreview(null);
                  setRecepcionStatHelp(null);
                }}
              >
                <option value="">Concierto (desde hoy)…</option>
                {conciertosRecepcion.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {formatConciertoFechaHoraEs(c.fecha_hora)} — {c.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                title="Escanear QR (cámara en vivo)"
                onClick={handleOpenQrScanner}
                disabled={decodingQrPhoto || liveQrScannerOpen || !recepcionConciertoId}
                className={ui.recepcionCamera}
              >
                {decodingQrPhoto ? <span className="text-[10px] font-bold">…</span> : <IconCamera size={26} className="shrink-0" />}
              </button>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={10}
              value={manualReservaCode}
              onChange={(event) => {
                const onlyDigits = event.target.value.replace(/\D/g, "").slice(0, 10);
                setManualReservaCode(onlyDigits);
                setScannerToken(onlyDigits);
              }}
              className={`${ui.input} tracking-[0.18em]`}
              placeholder="Código manual (10 dígitos)"
            />
            {(qrPreviewLoading || qrPreview) && (
              <div className="space-y-3">
                {qrPreviewLoading && (
                  <p className="text-sm font-medium entradas-accent-text">Analizando código…</p>
                )}
                {qrPreview && !qrPreview.ok && (
                  <div className={`rounded-xl border-2 p-3 text-sm shadow-sm ${recepcionPanelClass(qrPreview, isDark)}`}>
                    <p className={`font-medium ${ui.textBody}`}>{formatEntradasPreviewError(qrPreview)}</p>
                  </div>
                )}
                {qrPreview && qrPreview.ok && qrPreview.tipo === "entrada" && (
                  <div className={`rounded-xl border-2 p-4 space-y-2 text-sm shadow-sm ${recepcionPanelClass(qrPreview, isDark)}`}>
                    <p className={`text-[10px] font-black uppercase tracking-wider ${ui.textMuted}`}>Entrada individual</p>
                    <p className={ui.textBody}>
                      Reserva <span className="font-mono font-semibold">{qrPreview.codigo_reserva || "—"}</span> · Entrada nº{" "}
                      {qrPreview.entrada_orden} de {qrPreview.cantidad_en_reserva}
                    </p>
                    <p className={`font-medium ${ui.textBody}`}>
                      {qrPreview.estado_ingreso === "pendiente" ? (
                        <span>Sin ingreso registrado aún con esta plaza.</span>
                      ) : (
                        <span>
                          {qrPreview.ingresada_at
                            ? formatEntradasIngresoConRecepcionista(qrPreview.ingresada_at, qrPreview.ingresada_por_nombre)
                            : "—"}
                        </span>
                      )}
                    </p>
                    {!qrPreview.puede_ingresar && entradasBloqueoIngreso(qrPreview) && (
                      <p className={`text-xs border-t pt-2 mt-1 ${ui.dividerLight} ${ui.textBody}`}>{entradasBloqueoIngreso(qrPreview)}</p>
                    )}
                  </div>
                )}
                {qrPreview && qrPreview.ok && qrPreview.tipo === "reserva" && (
                  <div className={`rounded-xl border-2 p-4 space-y-2 text-sm shadow-sm ${recepcionPanelClass(qrPreview, isDark)}`}>
                    <p className={`${ui.textBody} whitespace-nowrap overflow-x-auto`}>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${ui.textMuted}`}>
                        Reserva (grupo)
                      </span>
                      {" · "}
                      <span className="font-mono font-semibold">{qrPreview.codigo_reserva}</span>
                    </p>
                    <p className={ui.textBody}>
                      {qrPreview.pendientes} sin ingresar · {qrPreview.ingresadas} ya ingresaron
                    </p>
                    {Array.isArray(qrPreview.entradas) && qrPreview.entradas.length > 0 && (
                      <div className={`border-t pt-2 space-y-2 ${ui.dividerLight}`}>
                        <ul className="text-xs space-y-1">
                          {qrPreview.entradas.map((row) => {
                            const orden = Number(row.orden);
                            const esPendiente = row.estado_ingreso === "pendiente";
                            const marcada = recepcionOrdenesIngreso.has(orden);
                            return (
                              <li
                                key={row.orden}
                                className={`rounded-lg border px-2.5 py-1.5 ${
                                  esPendiente && !marcada
                                    ? isDark
                                      ? "border-amber-800 bg-amber-950/50"
                                      : "border-amber-200 bg-amber-50/80"
                                    : isDark
                                      ? "border-slate-600 bg-slate-800/80"
                                      : "border-slate-200 bg-white/80"
                                }`}
                              >
                                <label
                                  className={`flex items-center gap-2 ${esPendiente ? "cursor-pointer" : "cursor-default"}`}
                                >
                                  {esPendiente ? (
                                    <input
                                      type="checkbox"
                                      className={`shrink-0 ${ui.checkbox}`}
                                      checked={marcada}
                                      onChange={() => toggleRecepcionOrdenIngreso(orden)}
                                    />
                                  ) : (
                                    <span className="w-4 shrink-0" aria-hidden />
                                  )}
                                  <span className={`min-w-0 shrink-0 font-semibold ${ui.textStrong}`}>
                                    Plaza nº {row.orden}
                                  </span>
                                  {esPendiente && marcada && (
                                    <span
                                      className={`ml-auto shrink-0 text-[10px] font-medium whitespace-nowrap ${
                                        isDark ? "text-emerald-300" : "text-emerald-800"
                                      }`}
                                    >
                                      Ingresa ahora
                                    </span>
                                  )}
                                  {esPendiente && !marcada && (
                                    <span
                                      className={`ml-auto shrink-0 text-[10px] font-medium text-right leading-tight ${
                                        isDark ? "text-amber-200" : "text-amber-900"
                                      }`}
                                    >
                                      Vendrá después
                                    </span>
                                  )}
                                  {!esPendiente && (
                                    <span className={`ml-auto min-w-0 shrink text-right text-[10px] leading-snug ${ui.textBody}`}>
                                      {row.ingresada_at
                                        ? formatEntradasIngresoConRecepcionista(row.ingresada_at, row.ingresada_por_nombre)
                                        : "Ingresada"}
                                    </span>
                                  )}
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                        {recepcionOrdenesIngreso.size === 0 &&
                          (qrPreview.entradas || []).some((e) => e.estado_ingreso === "pendiente") && (
                            <p className={`text-xs font-medium ${isDark ? "text-amber-200" : "text-amber-900"}`}>
                              Marcá al menos una plaza para registrar el ingreso.
                            </p>
                          )}
                      </div>
                    )}
                    {!qrPreview.puede_ingresar && entradasBloqueoIngreso(qrPreview) && (
                      <p className={`text-xs border-t pt-2 ${ui.dividerLight} ${ui.textBody}`}>{entradasBloqueoIngreso(qrPreview)}</p>
                    )}
                  </div>
                )}
                {qrPreview?.ok && (
                  <button
                    type="button"
                    onClick={() => consumeToken()}
                    className={ui.btnSuccess}
                    disabled={
                      !recepcionConciertoId
                      || !scannerToken.trim()
                      || qrPreviewLoading
                      || !puedeIngresarRecepcion
                      || ingresando
                    }
                  >
                    {ingresando
                      ? "Registrando…"
                      : qrPreview.tipo === "reserva" && recepcionOrdenesIngreso.size > 0
                        ? `Ingresar ${recepcionOrdenesIngreso.size} plaza${recepcionOrdenesIngreso.size === 1 ? "" : "s"}`
                        : "Ingresar a sala"}
                  </button>
                )}
              </div>
            )}
            {recepcionConciertoId && (
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <div className={`min-w-0 flex-1 ${ui.recepcionAmber}`}>
                    <div className="flex items-center gap-1.5">
                      <p className={ui.recepcionStatTitle("amber")}>Sin entrada / sin QR</p>
                      {renderRecepcionHelpToggle("sin-entrada", "amber")}
                    </div>
                    <p className={`${recepcionHelpTextClass("amber")} mb-3 ${recepcionHelpVisibleClass("sin-entrada")}`}>
                      Personas que ingresan sin reserva (invitados, boletería, etc.). El número se comparte en vivo con otros recepcionistas.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        aria-label="Restar una persona"
                        disabled={sinEntradaBusy || sinEntradaCount <= 0}
                        onClick={() => adjustSinEntrada(-1)}
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 text-2xl font-black shadow-sm disabled:opacity-35 disabled:cursor-not-allowed ${
                          isDark
                            ? "border-amber-600/50 bg-slate-900 text-amber-100 hover:bg-slate-800"
                            : "border-amber-700/40 bg-white text-amber-950 hover:bg-amber-100"
                        }`}
                      >
                        −
                      </button>
                      <div
                        className={`min-w-[4.5rem] rounded-xl border px-4 py-2 text-center shadow-inner ${
                          isDark ? "border-amber-700 bg-slate-900" : "border-amber-300/80 bg-white"
                        }`}
                      >
                        <span
                          className={`text-3xl font-black tabular-nums leading-none ${
                            isDark ? "text-amber-100" : "text-amber-950"
                          }`}
                        >
                          {sinEntradaCount}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label="Sumar una persona"
                        disabled={sinEntradaBusy}
                        onClick={() => adjustSinEntrada(1)}
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 text-2xl font-black shadow-sm disabled:opacity-35 ${
                          isDark
                            ? "border-amber-600/50 bg-slate-900 text-amber-100 hover:bg-slate-800"
                            : "border-amber-700/40 bg-white text-amber-950 hover:bg-amber-100"
                        }`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className={`${ui.recepcionEmerald}`}>
                    <div className="flex items-center gap-1.5">
                      <p className={ui.recepcionStatTitle("emerald")}>Ingresos por QR</p>
                      {renderRecepcionHelpToggle("qr", "emerald")}
                    </div>
                    <p className={`${recepcionHelpTextClass("emerald")} mb-2 ${recepcionHelpVisibleClass("qr")}`}>
                      Plazas con entrada ya registradas en puerta (código o QR). Tiempo real con otros recepcionistas.
                    </p>
                    <div className="flex flex-1 items-center justify-center py-1">
                      <span className={ui.recepcionQrValue}>
                        {recepcionQrStats.ingresadas}
                        <span className={ui.recepcionQrSep}>/</span>
                        {recepcionQrStats.reservadas}
                      </span>
                    </div>
                    <p className={ui.recepcionStatHint("emerald")}>ingresadas / reservadas (activas)</p>
                  </div>
                </div>
                <div className={ui.recepcionTotal}>
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                    <p className={`text-[10px] font-black uppercase tracking-wide ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      Total en sala
                    </p>
                    {renderRecepcionHelpToggle("total", "slate")}
                  </div>
                  <p className={`${recepcionHelpTextClass("slate")} mb-2 ${recepcionHelpVisibleClass("total")}`}>
                    Sin QR + ingresos por QR frente al aforo máximo del concierto.
                  </p>
                  <div className="flex items-center justify-center py-1">
                    <span className={ui.recepcionTotalValue}>
                      {recepcionQrStats.ingresadas + sinEntradaCount}
                      <span className={ui.recepcionTotalSep}>/</span>
                      {recepcionQrStats.capacidad}
                    </span>
                  </div>
                  <p className={ui.recepcionStatHint("slate")}>total ingresados / capacidad</p>
                </div>
              </div>
            )}
          </section>
        )}

        {section === "admin" && canAdmin && (
          <section className={`${ui.section} p-4 space-y-4`}>
            <div className="flex flex-wrap gap-2">
              {ADMIN_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={adminTab === tab ? ui.adminTabActive : ui.adminTabIdle}
                  onClick={() => {
                    setAdminTab(tab);
                    if (section !== "admin") setSearchParams({ view: "admin" });
                  }}
                >
                  {ADMIN_TAB_LABELS[tab] || tab}
                </button>
              ))}
            </div>

            {adminTab === "terceros" && (
              <div className="space-y-6">
                <div className={`${ui.inset} p-4 space-y-4`}>
                  <h3 className={ui.sectionTitle}>Nueva reserva para otra persona</h3>
                  {conciertosReservaTercerosAdmin.length === 0 ? (
                    <p className={`text-sm ${ui.textMuted}`}>
                      No hay conciertos actuales con reservas abiertas. Cuando haya uno disponible, podrás reservar desde acá.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label htmlFor="admin-tercero-concierto" className={ui.label}>
                          Concierto
                        </label>
                        <select
                          id="admin-tercero-concierto"
                          className={`w-full max-w-xl ${ui.select}`}
                          value={adminTerceroConciertoId}
                          onChange={(e) => setAdminTerceroConciertoId(e.target.value)}
                        >
                          {conciertosReservaTercerosAdmin.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {formatConciertoFechaHoraEs(c.fecha_hora)} — {c.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      {adminTerceroConciertoSelected && (
                        <>
                          <EntradasDisponibilidadBar concierto={adminTerceroConciertoSelected} isDark={isDark} />
                          <div className="space-y-1.5">
                            <label className={ui.label}>Mail del beneficiario (opcional)</label>
                            <input
                              type="email"
                              className={`w-full max-w-md ${ui.input}`}
                              value={terceroEmail}
                              onChange={(e) => setTerceroEmail(e.target.value)}
                              placeholder="correo@ejemplo.com"
                            />
                            {terceroEmailLookupBusy && (
                              <p className={`text-xs ${ui.textMuted}`}>Buscando usuario…</p>
                            )}
                            {terceroBeneficiarioLookup?.encontrado && (
                              <div
                                className={`max-w-md rounded-lg p-3 text-sm ${
                                  isDark
                                    ? "bg-emerald-950/40 border border-emerald-800"
                                    : "bg-emerald-50 border border-emerald-200"
                                }`}
                              >
                                <p className="font-bold">
                                  {terceroBeneficiarioLookup.apellido}, {terceroBeneficiarioLookup.nombre}
                                </p>
                                <p className={`text-xs ${ui.textMuted}`}>{terceroBeneficiarioLookup.email}</p>
                                <label className="mt-2 flex items-start gap-2 text-xs cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={terceroBeneficiarioConfirmado}
                                    onChange={(e) => setTerceroBeneficiarioConfirmado(e.target.checked)}
                                    className="mt-0.5"
                                  />
                                  <span>Sí, es esa persona</span>
                                </label>
                              </div>
                            )}
                            {terceroBeneficiarioLookup
                              && !terceroBeneficiarioLookup.encontrado
                              && terceroEmail.includes("@")
                              && !terceroEmailLookupBusy && (
                              <p className={`text-xs ${ui.textMuted}`}>
                                No hay cuenta con ese mail; la reserva quedará pendiente hasta que se registre.
                              </p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <label className={ui.label}>Referencia / nota (opcional)</label>
                            <input
                              type="text"
                              className={`w-full max-w-md ${ui.input}`}
                              value={terceroReferencia}
                              onChange={(e) => setTerceroReferencia(e.target.value)}
                              placeholder="Ej. María García — vecina"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className={ui.label}>Cantidad</label>
                            <select
                              className={`w-full max-w-xs ${ui.select}`}
                              value={adminTerceroCantidad}
                              onChange={(e) => setAdminTerceroCantidad(Number(e.target.value))}
                            >
                              {[1, 2, 3, 4].map((n) => (
                                <option key={n} value={n}>
                                  {n} entrada{n > 1 ? "s" : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={handleCreateReservaTercero}
                            disabled={
                              creatingTerceroReserva
                              || computeDisponibles(adminTerceroConciertoSelected) < adminTerceroCantidad
                              || (terceroBeneficiarioLookup?.encontrado && !terceroBeneficiarioConfirmado)
                            }
                            className={`${ui.btnPrimary} w-full sm:w-auto`}
                          >
                            {creatingTerceroReserva ? "Reservando…" : "Reservar entradas de tercero"}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className={ui.sectionTitle}>Entradas de terceros activas</h3>
                  <p className={`text-sm ${ui.textMuted}`}>
                    Próximos conciertos. Podés descargar el PDF, asociar un mail o cancelar.
                  </p>
                  <EntradasTercerosSection
                    entradasTerceros={entradasTerceros}
                    ui={ui}
                    isDark={isDark}
                    downloadingPdfReservaId={downloadingPdfReservaId}
                    setDownloadingPdfReservaId={setDownloadingPdfReservaId}
                    onCancelReserva={(reserva) => setCancelReservaTarget(reserva)}
                    onRefresh={() => loadBase({ quiet: true })}
                  />
                </div>
              </div>
            )}

            {adminTab === "programas" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  {conciertoOfrnProgramaContextId && (
                    <div className={ui.contextBox}>
                      <p className={`text-sm ${ui.textBody}`}>
                        <span className="font-bold">Programa elegido:</span> {contextProgramaLabel}
                      </p>
                      {String(contextOfrnProgramaRow?.subtitulo || "").trim() && (
                        <p className={`text-xs leading-relaxed border-t pt-2 ${ui.dividerLight} ${ui.textSoft}`}>
                          <span className={`font-semibold ${ui.textStrong}`}>Subtítulo (OFRN): </span>
                          {String(contextOfrnProgramaRow.subtitulo).trim()}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openNuevoConcierto()} className={ui.btnIndigoSmall}>
                          Agregar concierto
                        </button>
                        <button type="button" onClick={cambiarProgramaOfrnContexto} className={ui.btnGhost}>
                          Elegir otro programa
                        </button>
                      </div>
                    </div>
                  )}
                  {conciertoEditor === "new" && (
                    <div className={ui.editorHighlight}>
                      <h3 className={ui.accentEyebrow}>Nuevo concierto</h3>
                      {eventosParaSelectorConcierto.length === 0 && (
                        <p className={`text-xs ${isDark ? "text-amber-200" : "text-amber-800"}`}>
                          No hay eventos tipo concierto futuros para esta gira. Revisá fechas en OFRN o elegí otra gira.
                        </p>
                      )}
                      {renderConciertoEditorForm()}
                    </div>
                  )}
                </div>

                <div className={`border-t pt-4 space-y-4 ${ui.divider}`}>
                  <div>
                    <h3 className={ui.sectionTitle}>Programas con entradas</h3>
                    <p className={`text-[11px] mt-0.5 ${ui.textMuted}`}>
                      Editá nombre y detalle del programa en Entradas, agregá conciertos de la misma gira OFRN o administrá los ya creados. En la lista solo se muestran fecha, lugar y nombre; el detalle al editar.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {ADMIN_CONCIERTO_VISTAS.map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        className={adminConciertoVistaBtn(adminConciertoVista === id)}
                        onClick={() => setAdminConciertoVista(id)}
                      >
                        {label}
                      </button>
                    ))}
                    <button type="button" onClick={openNuevoProgramaModal} className={adminConciertoVistaBtn(false)}>
                      + Programa
                    </button>
                  </div>
                  <p className={`text-[10px] -mt-2 leading-snug ${ui.textMuted}`}>
                    {adminConciertoVista === "actuales"
                      ? "Hoy o después, con reservas ya abiertas."
                      : adminConciertoVista === "futuros"
                      ? "Hoy o después, reservas aún no abiertas."
                      : "Funciones de días anteriores (antes de las 00:00 de hoy, hora Argentina)."}
                  </p>

                  <div className="space-y-4">
                    {programasAdminVisibles.length === 0
                    && conciertosSinProgramaEnAdminFiltrados.length === 0 && (
                      <p className={`text-sm ${ui.textMuted}`}>No hay conciertos en esta vista.</p>
                    )}
                    {programasAdminVisibles.map((programa) => {
                      const listaCompleta = conciertosByProgramaId.get(Number(programa.id)) || [];
                      const lista = conciertosByProgramaIdFiltrado.get(Number(programa.id)) || [];
                      const ofrnPid = getOfrnProgramaIdForEntradaPrograma(programa, listaCompleta);
                      const editingPrograma =
                        programaEditor != null && Number(programaEditor) === Number(programa.id);
                      const bloqueoEliminarPrograma = motivoBloqueoEliminarPrograma(
                        listaCompleta,
                        adminConciertoStatsById,
                      );
                      const programaLocalidadLabel = localidadLabelDesdeProgramaEntrada(
                        programa,
                        listaCompleta,
                      );
                      return (
                        <article
                          key={programa.id}
                          className={
                            editingPrograma ? `${ui.editorHighlight} p-3 space-y-3` : `${ui.cardInner} p-3 space-y-3`
                          }
                        >
                          {editingPrograma ? (
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className={ui.accentEyebrow}>Editar programa</h4>
                                {bloqueoEliminarPrograma ? (
                                  <button
                                    type="button"
                                    title={bloqueoEliminarPrograma}
                                    aria-label={bloqueoEliminarPrograma}
                                    disabled
                                    className={`${ui.btnIconDanger} opacity-35 cursor-not-allowed`}
                                  >
                                    <IconTrash size={18} />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    title="Eliminar programa"
                                    aria-label="Eliminar programa"
                                    onClick={() =>
                                      setDeleteProgramaTarget({ id: programa.id, nombre: programa.nombre })
                                    }
                                    className={ui.btnIconDanger}
                                  >
                                    <IconTrash size={18} />
                                  </button>
                                )}
                              </div>
                              {renderProgramaEditorForm()}
                            </div>
                          ) : (
                          <div className={`flex flex-wrap items-start justify-between gap-2 border-b pb-2 ${ui.dividerLight}`}>
                            <div className="min-w-0 flex-1">
                              {programaLocalidadLabel ? (
                                <p className={ui.programaLocalidad}>{programaLocalidadLabel}</p>
                              ) : null}
                              <p className={ui.programaTitle}>{programa.nombre}</p>
                              {(() => {
                                const ofrnRow = ofrnPid
                                  ? ofrnProgramasPicker.find((p) => Number(p.id) === ofrnPid)
                                  : null;
                                const st = String(ofrnRow?.subtitulo || "").trim();
                                if (!st) return null;
                                return (
                                  <p className={`text-xs mt-0.5 leading-snug ${ui.textMuted}`}>
                                    <span className={`font-semibold ${ui.textSoft}`}>OFRN: </span>
                                    {st}
                                  </p>
                                );
                              })()}
                              {programa.activo === false && (
                                <span className={`text-[10px] font-bold uppercase ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                                  Programa inactivo
                                </span>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!ofrnPid) {
                                    toast.error(
                                      "Este programa no tiene gira OFRN vinculada. Usá «+ Programa» arriba y elegí la gira.",
                                    );
                                    return;
                                  }
                                  openNuevoConcierto(ofrnPid);
                                }}
                                className={ui.btnIndigoSmall}
                              >
                                Agregar concierto
                              </button>
                              <button
                                type="button"
                                title="Editar programa"
                                aria-label="Editar programa"
                                onClick={() => startEditPrograma(programa)}
                                className={ui.btnIcon}
                              >
                                <IconEdit size={18} />
                              </button>
                              {bloqueoEliminarPrograma ? (
                                <button
                                  type="button"
                                  title={bloqueoEliminarPrograma}
                                  aria-label={bloqueoEliminarPrograma}
                                  disabled
                                  className={`${ui.btnIconDanger} opacity-35 cursor-not-allowed`}
                                >
                                  <IconTrash size={18} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  title="Eliminar programa"
                                  aria-label="Eliminar programa"
                                  onClick={() => setDeleteProgramaTarget({ id: programa.id, nombre: programa.nombre })}
                                  className={ui.btnIconDanger}
                                >
                                  <IconTrash size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                          )}
                          {lista.length > 0 && (
                            <div className={`rounded-lg border px-3 py-2 space-y-1.5 ${isDark ? "border-slate-600 bg-slate-900/40" : "border-slate-100 bg-slate-50/90"}`}>
                              <p className={ui.sectionTitle}>Mails del programa (todos los conciertos)</p>
                              <div className="flex flex-wrap gap-2">
                                {(() => {
                                  const busy = copyingProgramaMailsKey.startsWith(`${programa.id}:`);
                                  return (
                                    <>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        title="Personas con al menos una reserva activa en cualquier concierto del programa"
                                        onClick={() => copiarMailsProgramaAdmin(programa.id, listaCompleta, "reservaron")}
                                        className={ui.adminMailBucketBtn("reservaron")}
                                      >
                                        {copyingProgramaMailsKey === `${programa.id}:reservaron`
                                          ? "Copiando…"
                                          : "Mails: reservaron"}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        title="Personas con al menos una entrada registrada como ingresada (reserva activa)"
                                        onClick={() => copiarMailsProgramaAdmin(programa.id, listaCompleta, "ingresaron")}
                                        className={ui.adminMailBucketBtn("ingresaron")}
                                      >
                                        {copyingProgramaMailsKey === `${programa.id}:ingresaron`
                                          ? "Copiando…"
                                          : "Mails: ingresaron"}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        title="Personas con al menos una reserva activa donde ninguna entrada figura como ingresada (no asistieron a esa reserva)"
                                        onClick={() => copiarMailsProgramaAdmin(programa.id, listaCompleta, "sinIngreso")}
                                        className={ui.adminMailBucketBtn("sinIngreso")}
                                      >
                                        {copyingProgramaMailsKey === `${programa.id}:sinIngreso`
                                          ? "Copiando…"
                                          : "Mails: sin ingreso"}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        title="Mails inscriptos al recordatorio de apertura en cualquier concierto del programa"
                                        onClick={() => copiarMailsProgramaAdmin(programa.id, listaCompleta, "recordatorio")}
                                        className={ui.adminMailBucketBtn("recordatorio")}
                                      >
                                        {copyingProgramaMailsKey === `${programa.id}:recordatorio`
                                          ? "Copiando…"
                                          : "Mails: recordatorio"}
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>
                              <p className={`text-[10px] leading-snug ${ui.textMuted}`}>
                                Solo reservas activas. «Sin ingreso» = esa reserva no tiene ninguna plaza marcada como ingresada.
                              </p>
                            </div>
                          )}
                          {lista.length === 0 ? (
                            <p className={`text-xs ${ui.textMuted}`}>Sin conciertos de entradas en este programa.</p>
                          ) : (
                            <ul className="space-y-2 pl-0">{lista.map((c) => renderAdminConciertoItem(c))}</ul>
                          )}
                        </article>
                      );
                    })}
                  </div>

                  {conciertosSinProgramaEnAdminFiltrados.length > 0 && (
                    <div className={ui.warningBox}>
                      <h4 className={`text-xs font-black uppercase tracking-wide ${isDark ? "text-amber-200" : "text-amber-900"}`}>
                        Conciertos sin programa listado
                      </h4>
                      <p className={`text-[11px] ${isDark ? "text-amber-100/95" : "text-amber-900/90"}`}>
                        Estos conciertos no coinciden con ningún programa de la lista superior. Revisá datos o sincronización.
                      </p>
                      <ul className="space-y-2 pl-0">
                        {conciertosSinProgramaEnAdminFiltrados.map((c) => renderAdminConciertoItem(c))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {adminTab === "usuarios" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setAdminInviteFormOpen(true)}
                  className={`${ui.btnPrimary} w-full sm:w-auto`}
                >
                  Pre-registrar usuario
                </button>

                <div className="space-y-1.5">
                  <label htmlFor="admin-usuario-buscar-nombre" className={ui.label}>
                    Buscar por nombre
                  </label>
                  <input
                    id="admin-usuario-buscar-nombre"
                    type="search"
                    value={adminUsuarioFiltroNombre}
                    onChange={(e) => setAdminUsuarioFiltroNombre(e.target.value)}
                    placeholder="Nombre, apellido o mail…"
                    className={`w-full max-w-md ${ui.input}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <span className={ui.label}>Filtrar por rol (sin marcar = todos)</span>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {ADMIN_USUARIO_ROLES_FILTRO.map(({ id, label, chip, dot }) => {
                      const selected = adminUsuarioFiltroRoles.includes(id);
                      const filtroActivo = adminUsuarioFiltroRoles.length > 0;
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setAdminUsuarioFiltroRoles((prev) => {
                              const next = new Set(prev);
                              if (next.has(id)) next.delete(id);
                              else next.add(id);
                              return Array.from(next);
                            });
                          }}
                          className={`entradas-interactive inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-semibold transition-all ${
                            chip(isDark)
                          } ${
                            selected
                              ? isDark
                                ? "ring-2 ring-[#1ebbf0] ring-offset-2 ring-offset-slate-900"
                                : "ring-2 ring-[#1ebbf0] ring-offset-2 ring-offset-white"
                              : filtroActivo
                                ? "opacity-45 hover:opacity-70"
                                : "hover:opacity-90"
                          }`}
                        >
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-sm border ${dot(isDark)}`}
                            aria-hidden
                          />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 items-start justify-between">
                  <div className="space-y-2 min-w-0 w-full sm:min-w-[12rem] sm:max-w-md sm:flex-1">
                    <span className={ui.label}>Filtrar por localidad (una o más; sin marcar = todas)</span>
                    <div className={ui.filterScroll}>
                      {adminUsuariosLocalidadesOpciones.length === 0 ? (
                        <p className={`text-xs px-1 ${ui.textMuted}`}>Sin localidades en reservas cargadas.</p>
                      ) : (
                        adminUsuariosLocalidadesOpciones.map((loc) => {
                          const checked = adminUsuarioFiltroLocalidades.includes(loc);
                          return (
                            <label key={loc} className={ui.filterLabel}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setAdminUsuarioFiltroLocalidades((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(loc)) next.delete(loc);
                                    else next.add(loc);
                                    return Array.from(next);
                                  });
                                }}
                                className={`mt-0.5 shrink-0 ${ui.checkbox}`}
                              />
                              <span className="leading-snug">{loc}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    {adminUsuariosLocalidadesOpciones.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <button
                          type="button"
                          className={`${ui.btnGhost} px-2 py-1 text-[11px]`}
                          onClick={() => setAdminUsuarioFiltroLocalidades([...adminUsuariosLocalidadesOpciones])}
                        >
                          Marcar todas
                        </button>
                        <button
                          type="button"
                          className={`${ui.btnGhost} px-2 py-1 text-[11px]`}
                          onClick={() => setAdminUsuarioFiltroLocalidades([])}
                        >
                          Quitar todas
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-stretch sm:items-end shrink-0">
                    <button
                      type="button"
                      disabled={copyingAdminMails || adminUsuariosFiltrados.length === 0}
                      onClick={async () => {
                        const mails = [
                          ...new Set(
                            adminUsuariosFiltrados.map((u) => String(u.email || "").trim()).filter(Boolean),
                          ),
                        ];
                        if (!mails.length) {
                          toast.message("No hay mails para copiar.");
                          return;
                        }
                        setCopyingAdminMails(true);
                        try {
                          await navigator.clipboard.writeText(mails.join(", "));
                          toast.success(`Se copiaron ${mails.length} dirección${mails.length === 1 ? "" : "es"} al portapapeles (separadas por coma).`);
                        } catch {
                          toast.error("No se pudo copiar. Revisá permisos del navegador o usá HTTPS.");
                        } finally {
                          setCopyingAdminMails(false);
                        }
                      }}
                      className={`${ui.btnPrimary} w-full sm:w-auto px-4 whitespace-nowrap`}
                    >
                      {copyingAdminMails ? "Copiando…" : `Copiar mails (${adminUsuariosFiltrados.length})`}
                    </button>
                  </div>
                </div>
                <p className={`text-[11px] max-w-3xl ${ui.textMuted}`}>
                  Las localidades salen del evento OFRN vinculado a cada concierto. Con varias marcadas se listan usuarios que tengan reserva en{" "}
                  <span className={`font-semibold ${ui.textBody}`}>cualquiera</span> de esas localidades.
                </p>
                <div className={`hidden md:block ${ui.tableWrap}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={ui.tableHead}>
                        <th className="px-3 py-2 whitespace-nowrap">Apellido</th>
                        <th className="px-3 py-2 whitespace-nowrap">Nombre</th>
                        <th className="px-3 py-2 min-w-[10rem]">Mail</th>
                        <th className="px-3 py-2 min-w-[9rem]">Localidades</th>
                        <th className="px-3 py-2 whitespace-nowrap w-[8.5rem]">Rol</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsuariosFiltrados.map((usr) => (
                        <tr key={usr.id} className={`${ui.tableRow} ${entradaUsuarioRolRowClass(usr.rol, isDark)}`}>
                          <td className={`px-3 py-2 font-medium whitespace-nowrap ${ui.textStrong}`}>{usr.apellido}</td>
                          <td className={`px-3 py-2 whitespace-nowrap ${ui.textBody}`}>{usr.nombre}</td>
                          <td className={`px-3 py-2 break-all max-w-[16rem] ${ui.textSoft}`}>{usr.email}</td>
                          <td className={`px-3 py-2 text-xs ${ui.textSoft}`}>
                            {(usr.localidades_reserva || []).length ? (
                              <span className="leading-snug">{(usr.localidades_reserva || []).join(" · ")}</span>
                            ) : (
                              <span className={`italic ${ui.textMuted}`}>—</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={usr.rol}
                              onChange={async (event) => {
                                await adminUpdateUsuarioRol({ id: usr.id, rol: event.target.value });
                                setAdminData(await listAdminData());
                              }}
                              className={`w-full max-w-[8.5rem] rounded-lg border px-2 py-1.5 text-xs font-semibold ${entradaUsuarioRolLabelClass(usr.rol, isDark)}`}
                            >
                              <option value="personal">personal</option>
                              <option value="recepcionista">recepcionista</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-3">
                  {adminUsuariosFiltrados.map((usr) => (
                    <article
                      key={usr.id}
                      className={`${ui.cardInner} border p-4 space-y-3 shadow-sm ${entradaUsuarioRolRowClass(usr.rol, isDark)}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className={`text-base font-bold leading-snug ${ui.textStrong}`}>
                            {[usr.apellido, usr.nombre].filter(Boolean).join(", ") || "—"}
                          </h3>
                          <p className={`mt-1 text-sm break-all ${ui.textSoft}`}>{usr.email || "—"}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${entradaUsuarioRolLabelClass(usr.rol, isDark)}`}
                        >
                          {usr.rol || "personal"}
                        </span>
                      </div>
                      <div>
                        <span className={`block text-[10px] font-bold uppercase tracking-wide mb-1 ${ui.textMuted}`}>Localidades</span>
                        <p className={`text-sm leading-snug ${ui.textBody}`}>
                          {(usr.localidades_reserva || []).length ? (usr.localidades_reserva || []).join(" · ") : "—"}
                        </p>
                      </div>
                      <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wide mb-1 ${ui.textMuted}`}>Cambiar rol</label>
                        <select
                          value={usr.rol}
                          onChange={async (event) => {
                            await adminUpdateUsuarioRol({ id: usr.id, rol: event.target.value });
                            setAdminData(await listAdminData());
                          }}
                          className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold ${entradaUsuarioRolLabelClass(usr.rol, isDark)}`}
                        >
                          <option value="personal">personal</option>
                          <option value="recepcionista">recepcionista</option>
                          <option value="admin">admin</option>
                        </select>
                      </div>
                    </article>
                  ))}
                </div>

                {adminUsuariosFiltrados.length === 0 && (
                  <p className={`text-sm ${ui.textMuted}`}>
                    {adminUsuarioFiltroNombre.trim()
                      ? "Ningún usuario coincide con la búsqueda."
                      : adminUsuarioFiltroRoles.length > 0
                        ? "Ningún usuario coincide con los roles elegidos."
                        : adminUsuarioFiltroLocalidades.length > 0
                          ? "Ningún usuario coincide con la combinación de localidades elegida."
                          : "No hay usuarios registrados."}
                  </p>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      <EntradasLiveQrScanner
        open={liveQrScannerOpen}
        isDark={isDark}
        onClose={() => setLiveQrScannerOpen(false)}
        onScan={handleLiveQrScan}
        onFallbackPhoto={handleQrScannerFallbackPhoto}
      />

      {catalogQrModalReserva && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-3 sm:p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCatalogQrModalReserva(null);
          }}
        >
          <div
            className={`w-full max-w-md max-h-[min(90vh,42rem)] overflow-y-auto p-5 shadow-2xl ${ui.cardInner}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="entradas-catalog-qr-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0 pr-2">
                <h3 id="entradas-catalog-qr-titulo" className={`text-sm font-bold ${ui.textStrong}`}>
                  {catalogQrModalReserva.concierto?.nombre || "Concierto"}
                </h3>
                <p className={`text-xs mt-0.5 ${ui.textMuted}`}>
                  Reserva {catalogQrModalReserva.codigo_reserva}
                  {catalogQrModalReserva.concierto?.fecha_hora
                    ? ` · ${formatConciertoFechaHoraEs(catalogQrModalReserva.concierto.fecha_hora)}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                className={`shrink-0 rounded p-1 ${ui.btnIcon}`}
                aria-label="Cerrar"
                onClick={() => setCatalogQrModalReserva(null)}
              >
                <IconX size={20} />
              </button>
            </div>
            <MisReservasQrPanel reserva={catalogQrModalReserva} isDark={isDark} />
          </div>
        </div>
      )}

      {adminInviteFormOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-3 sm:p-4"
          role="presentation"
          onClick={(e) => {
            if (invitingEntradaUsuario) return;
            if (e.target === e.currentTarget) setAdminInviteFormOpen(false);
          }}
        >
          <div
            className={`w-full max-w-lg p-5 shadow-2xl animate-in zoom-in-95 duration-200 ${ui.cardInner}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="entradas-pre-registrar-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="entradas-pre-registrar-titulo" className={`${ui.sectionTitle} pr-2 text-xs`}>
                Pre-registrar usuario
              </h3>
              <button
                type="button"
                className={`shrink-0 rounded p-1 ${ui.btnIcon}`}
                aria-label="Cerrar"
                disabled={invitingEntradaUsuario}
                onClick={() => setAdminInviteFormOpen(false)}
              >
                <IconX size={20} />
              </button>
            </div>
            <p className={`text-[11px] mt-2 leading-relaxed ${ui.textMuted}`}>
              Creá la cuenta antes del primer acceso. La persona entra con su mail (código OTP) y conserva el rol asignado.
            </p>
            <form
              className="mt-4 grid gap-3 sm:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();
                const email = adminInviteForm.email.trim().toLowerCase();
                const nombre = adminInviteForm.nombre.trim();
                const apellido = adminInviteForm.apellido.trim();
                const rolInvitado = adminInviteForm.rol;
                if (!email || !nombre || !apellido) {
                  toast.error("Completá mail, nombre y apellido.");
                  return;
                }
                setInvitingEntradaUsuario(true);
                try {
                  const result = await adminInviteEntradaUsuario({
                    email,
                    nombre,
                    apellido,
                    rol: rolInvitado,
                  });
                  setAdminData(await listAdminData());
                  setAdminInviteForm({
                    email: "",
                    nombre: "",
                    apellido: "",
                    rol: rolInvitado,
                  });
                  setAdminInviteFormOpen(false);
                  toast.success(
                    result?.created
                      ? `${nombre} ${apellido} quedó pre-registrado como ${rolInvitado}.`
                      : `Se actualizó el perfil de ${email}.`,
                  );
                } catch (inviteError) {
                  toast.error(inviteError?.message || "No se pudo pre-registrar el usuario.");
                } finally {
                  setInvitingEntradaUsuario(false);
                }
              }}
            >
              <label className={`block space-y-1 sm:col-span-2 ${ui.textBody}`}>
                <span className={`block text-[11px] uppercase tracking-wide ${ui.textMuted}`}>Mail</span>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={adminInviteForm.email}
                  onChange={(e) => setAdminInviteForm((f) => ({ ...f, email: e.target.value }))}
                  className={ui.input}
                  placeholder="recepcion@ejemplo.com"
                />
              </label>
              <label className={`block space-y-1 ${ui.textBody}`}>
                <span className={`block text-[11px] uppercase tracking-wide ${ui.textMuted}`}>Nombre</span>
                <input
                  type="text"
                  required
                  value={adminInviteForm.nombre}
                  onChange={(e) => setAdminInviteForm((f) => ({ ...f, nombre: e.target.value }))}
                  className={ui.input}
                />
              </label>
              <label className={`block space-y-1 ${ui.textBody}`}>
                <span className={`block text-[11px] uppercase tracking-wide ${ui.textMuted}`}>Apellido</span>
                <input
                  type="text"
                  required
                  value={adminInviteForm.apellido}
                  onChange={(e) => setAdminInviteForm((f) => ({ ...f, apellido: e.target.value }))}
                  className={ui.input}
                />
              </label>
              <label className={`block space-y-1 ${ui.textBody}`}>
                <span className={`block text-[11px] uppercase tracking-wide ${ui.textMuted}`}>Rol</span>
                <select
                  value={adminInviteForm.rol}
                  onChange={(e) => setAdminInviteForm((f) => ({ ...f, rol: e.target.value }))}
                  className={ui.select}
                >
                  <option value="recepcionista">recepcionista</option>
                  <option value="personal">personal</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <div className="mt-1 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:col-span-2">
                <button
                  type="button"
                  disabled={invitingEntradaUsuario}
                  onClick={() => setAdminInviteFormOpen(false)}
                  className={ui.btnGhost}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={invitingEntradaUsuario}
                  className={`${ui.btnPrimary} w-full sm:w-auto px-4 disabled:opacity-60`}
                >
                  {invitingEntradaUsuario ? "Guardando…" : "Pre-registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {nuevoProgramaModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-3 sm:p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNuevoProgramaModalOpen(false);
          }}
        >
          <div
            className={`w-full max-w-lg p-5 shadow-2xl animate-in zoom-in-95 duration-200 ${ui.cardInner}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="entradas-nuevo-programa-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="entradas-nuevo-programa-titulo" className={`${ui.sectionTitle} pr-2 text-xs`}>
                Nuevo programa de entradas
              </h3>
              <button
                type="button"
                className={`shrink-0 rounded p-1 ${ui.btnIcon}`}
                aria-label="Cerrar"
                onClick={() => setNuevoProgramaModalOpen(false)}
              >
                <IconX size={20} />
              </button>
            </div>
            <p className={`text-[11px] mt-2 leading-relaxed ${ui.textMuted}`}>
              Elegí el tipo de programa y una gira de la app OFRN que aún no tenga entradas. Luego cargá los conciertos: solo se listan eventos futuros de tipo concierto de esa gira.
            </p>
            <div className="mt-4 space-y-3">
              <label className={`block text-xs font-semibold space-y-1 ${ui.textBody}`}>
                <span className={`block text-[11px] uppercase tracking-wide ${ui.textMuted}`}>Tipo de programa</span>
                <select
                  className={ui.select}
                  value={nuevoProgramaTipoSelect}
                  onChange={(event) => {
                    setNuevoProgramaTipoSelect(event.target.value);
                    setNuevoProgramaOfrnSelect("");
                  }}
                >
                  {OFRN_PROGRAMA_TIPO_ENTRADAS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`block text-xs font-semibold space-y-1 ${ui.textBody}`}>
                <span className={`block text-[11px] uppercase tracking-wide ${ui.textMuted}`}>Programa OFRN</span>
                <select
                  className={ui.select}
                  value={nuevoProgramaOfrnSelect}
                  onChange={(event) => setNuevoProgramaOfrnSelect(event.target.value)}
                  disabled={programasOfrnDisponiblesNuevoEntrada.length === 0}
                >
                  <option value="">Elegí un programa…</option>
                  {programasOfrnDisponiblesNuevoEntrada.map((p) => {
                    const desde = String(p.fecha_desde || "").trim();
                    const label = buildProgramaLabel(p);
                    return (
                      <option key={p.id} value={String(p.id)}>
                        {desde ? `${label} · desde ${desde}` : label}
                      </option>
                    );
                  })}
                </select>
              </label>
              {ofrnSeleccionadoModal && (
                <div className={ui.contextBox}>
                  <p className={`text-[10px] font-black uppercase tracking-wide ${isDark ? "text-indigo-200" : "text-indigo-900/80"}`}>
                    Subtítulo en OFRN
                  </p>
                  {String(ofrnSeleccionadoModal.subtitulo || "").trim() ? (
                    <p className={`text-xs leading-relaxed ${ui.textBody}`}>{String(ofrnSeleccionadoModal.subtitulo).trim()}</p>
                  ) : (
                    <p className={`text-[11px] italic ${ui.textMuted}`}>Esta gira no tiene subtítulo cargado en OFRN.</p>
                  )}
                </div>
              )}
              {programasOfrnDisponiblesNuevoEntrada.length === 0 && (
                <p className={ui.warningBox}>
                  No hay giras de este tipo con inicio a partir de hoy y sin módulo de entradas. Revisá fechas en OFRN o probá con otro tipo.
                </p>
              )}
            </div>
            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={() => setNuevoProgramaModalOpen(false)} className={ui.btnGhost}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmarProgramaOfrnParaNuevo()) setNuevoProgramaModalOpen(false);
                }}
                className={`${ui.btnPrimary} w-full sm:w-auto px-4`}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(pendingWarning)}
        onClose={() => setPendingWarning(null)}
        title="La reserva ya tuvo ingresos parciales"
        message={`Reserva ${pendingWarning?.codigo_reserva || "—"}: ya se registraron ${pendingWarning?.ingresadas || 0} entrada(s). ¿Querés completar ahora el ingreso de las ${pendingWarning?.pendientes || 0} que siguen pendientes?`}
        confirmText="Consumir pendientes"
        onConfirm={async () => {
          await consumeToken({ forceParcial: true });
          setPendingWarning(null);
        }}
      />

      <ConfirmModal
        isOpen={Boolean(cancelReservaTarget)}
        onClose={() => !cancelingReserva && setCancelReservaTarget(null)}
        title="Cancelar reserva"
        message={
          cancelReservaTarget
            ? `¿Seguro que querés cancelar la reserva ${cancelReservaTarget.codigo_reserva}?\n\nLos códigos QR dejarán de valer y las plazas se liberarán para otras personas.${
                (cancelReservaTarget.entradas || []).some((e) => e.estado_ingreso === "ingresada")
                  ? "\n\nNota: si ya ingresó alguien con una entrada, esa asistencia no se borra; solo se anulan las entradas pendientes."
                  : ""
              }`
            : ""
        }
        confirmText={cancelingReserva ? "Cancelando…" : "Sí, cancelar reserva"}
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md"
        onConfirm={handleConfirmCancelReserva}
      />

      <ConfirmModal
        isOpen={Boolean(deleteConciertoTarget)}
        onClose={() => !adminDeleting && setDeleteConciertoTarget(null)}
        title="Eliminar concierto"
        message={
          deleteConciertoTarget
            ? `¿Eliminar el concierto «${deleteConciertoTarget.nombre || "sin nombre"}»?\n\nSolo es posible si no hay reservas activas ni entradas ya ingresadas. Las reservas canceladas y el registro de ingreso asociado se eliminarán.`
            : ""
        }
        confirmText={adminDeleting ? "Eliminando…" : "Sí, eliminar"}
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md"
        onConfirm={handleConfirmDeleteConcierto}
      />

      <ConfirmModal
        isOpen={Boolean(deleteProgramaTarget)}
        onClose={() => !adminDeleting && setDeleteProgramaTarget(null)}
        title="Eliminar programa"
        message={
          deleteProgramaTarget
            ? `¿Eliminar el programa «${deleteProgramaTarget.nombre || "sin nombre"}» y todos los conciertos de entradas vinculados?\n\nNo debe haber reservas activas ni entradas ingresadas en ninguno de esos conciertos.`
            : ""
        }
        confirmText={adminDeleting ? "Eliminando…" : "Sí, eliminar todo"}
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md"
        onConfirm={handleConfirmDeletePrograma}
      />
    </div>
  );
}
