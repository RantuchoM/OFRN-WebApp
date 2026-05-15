import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import { IconCamera, IconEdit, IconMail, IconTrash, IconX } from "../../../components/ui/Icons";
import EntradasRichTextHtml from "../../../components/ui/EntradasRichTextHtml";
import RichTextEditor from "../../../components/ui/RichTextEditor";
import { supabaseEntradasPublic } from "../../../services/supabase";
import {
  adminUpdateUsuarioRol,
  getAdminConciertoStats,
  getAdminProgramaMailBuckets,
  adminUpsertConcierto,
  adminUpsertPrograma,
  adminDeleteConcierto,
  adminDeletePrograma,
  blobToPdfBase64ForMail,
  buildEntradasReservaPdfConDataUrls,
  computeDisponibles,
  crearReserva,
  cancelarReserva,
  descargarPdfDesdeReservaRow,
  enviarMailCancelacionReserva,
  enviarMailReserva,
  getConciertoBySlug,
  listAdminData,
  listConciertoIdsConReservaActiva,
  listarMisReservas,
  listProgramasConConciertos,
  previewEntradaQr,
  tokenToQrDataUrl,
  validarYConsumirQr,
} from "../../../services/entradaService";
import { downloadEntradasReservaPdfBlob } from "../../../utils/entradasReservaPdf";
import {
  formatEntradasPreviewError,
  formatEntradasValidacionError,
  formatEntradasValidacionSuccess,
} from "../../../utils/entradasQrMessages";
import { decodeQrFromImageFile } from "../../../utils/qrDecodeFromImage";

const ADMIN_TABS = ["programas", "usuarios"];

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

/** Día de la semana en mayúsculas (es-AR), precediendo fecha y hora del concierto. */
const WEEKDAY_UPPER_ES = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];

function formatConciertoFechaHoraEs(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const weekday = WEEKDAY_UPPER_ES[date.getDay()] || "";
  const datePart = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${weekday}, ${datePart} · ${timePart}`;
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
  return (
    programa.nombre_gira
    || programa.nomenclador
    || programa.subtitulo
    || `Programa ${programa.id || "-"}`
  );
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
      return "Esta entrada ya registró ingreso a sala.";
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

function recepcionPanelClass(p) {
  if (!p) return "bg-slate-50 border-slate-200";
  if (!p.ok) {
    if (p.reason === "concierto_distinto") return "bg-orange-50/95 border-orange-300";
    return "bg-rose-50/95 border-rose-200";
  }
  if (p.tipo === "entrada") {
    if (p.reserva_estado && p.reserva_estado !== "activa") return "bg-orange-100/95 border-orange-300";
    if (p.estado_ingreso === "ingresada") return "bg-orange-100/95 border-orange-300";
    return "bg-emerald-100/95 border-emerald-300";
  }
  if (p.tipo === "reserva") {
    if (p.reserva_estado === "cancelada" || p.pendientes === 0) return "bg-orange-100/95 border-orange-300";
    if (p.ingresadas > 0 && p.pendientes > 0) return "bg-sky-100/95 border-sky-400";
    return "bg-emerald-100/95 border-emerald-300";
  }
  return "bg-slate-100 border-slate-200";
}

function isManualReservaCodeInput(value) {
  const token = String(value || "").trim();
  if (!token) return false;
  if (/^\d{10}$/.test(token)) return true;
  return /^ENT-RSV(?:-[A-Z0-9]+)*-\d{10}$/i.test(token);
}

/** Misma ventana que el catálogo público: hoy hasta +13 días inclusive. */
function conciertoEnVentanaCatalogoDosSemanas(concierto, inicioDiaHoy, finDiaVentanaCatalogo) {
  if (!concierto?.fecha_hora) return false;
  const t = new Date(concierto.fecha_hora);
  if (Number.isNaN(t.getTime())) return false;
  return t >= inicioDiaHoy && t <= finDiaVentanaCatalogo;
}

function conciertoStatsSinReservasNiIngresos(stats) {
  return Boolean(stats) && Number(stats.reservadas || 0) === 0 && Number(stats.ingresadas || 0) === 0;
}

function normalizeDriveImageUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const fileIdFromPath = raw.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileIdFromPath?.[1]) {
    return `https://drive.google.com/thumbnail?id=${fileIdFromPath[1]}&sz=w1600`;
  }
  const fileIdFromQuery = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (fileIdFromQuery?.[1] && raw.includes("drive.google.com")) {
    return `https://drive.google.com/thumbnail?id=${fileIdFromQuery[1]}&sz=w1600`;
  }
  return raw;
}

export default function EntradasMain({ user, profile, onLogout }) {
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
  const [recepcionConciertoId, setRecepcionConciertoId] = useState("");
  const [scannerToken, setScannerToken] = useState("");
  const [manualReservaCode, setManualReservaCode] = useState("");
  const [pendingWarning, setPendingWarning] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [qrPreviewLoading, setQrPreviewLoading] = useState(false);
  const [ingresando, setIngresando] = useState(false);
  const [cancelReservaTarget, setCancelReservaTarget] = useState(null);
  const [cancelingReserva, setCancelingReserva] = useState(false);
  const [conciertosConReservaActiva, setConciertosConReservaActiva] = useState([]);
  const [downloadingPdfReservaId, setDownloadingPdfReservaId] = useState(null);
  const [decodingQrPhoto, setDecodingQrPhoto] = useState(false);
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
  /** Filtro en pestaña Usuarios: localidades elegidas (vacío = mostrar todos). */
  const [adminUsuarioFiltroLocalidades, setAdminUsuarioFiltroLocalidades] = useState([]);
  const [copyingAdminMails, setCopyingAdminMails] = useState(false);
  const [copyingProgramaMailsKey, setCopyingProgramaMailsKey] = useState("");
  const [copyingConciertoMailsKey, setCopyingConciertoMailsKey] = useState("");
  /** null | "new" | id del concierto en edición inline */
  const [conciertoEditor, setConciertoEditor] = useState(null);
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
    capacidad_maxima: 100,
    reservas_habilitadas: true,
    activo: true,
  });
  /** { id, nombre } para confirmar borrado de concierto (admin) */
  const [deleteConciertoTarget, setDeleteConciertoTarget] = useState(null);
  /** { id, nombre } para confirmar borrado de programa (admin) */
  const [deleteProgramaTarget, setDeleteProgramaTarget] = useState(null);
  const [adminDeleting, setAdminDeleting] = useState(false);

  const canAdmin = profile?.rol === "admin";
  const canRecepcion = profile?.rol === "recepcionista" || profile?.rol === "admin";
  const section = searchParams.get("view") || "catalogo";
  const conciertoSlug = searchParams.get("concierto") || "";

  const loadBase = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const [data, idsReservados] = await Promise.all([
        listProgramasConConciertos(),
        listConciertoIdsConReservaActiva(),
      ]);
      setConciertosConReservaActiva(idsReservados);
      setProgramas(data);
      if (quiet && section === "catalogo" && conciertoSlug) {
        try {
          const fresh = await getConciertoBySlug(conciertoSlug);
          setSelectedConcierto(fresh);
        } catch {
          /* mantener detalle previo si falla el refresco en segundo plano */
        }
      }
      if (section === "mis-reservas") {
        const reservas = await listarMisReservas();
        setMisReservas(reservas);
      }
      if (canAdmin && section === "admin") {
        setAdminData(await listAdminData());
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
            "id, id_gira, fecha, hora_inicio, descripcion, tipos_evento(nombre), locaciones(nombre, localidades(localidad)), programas!eventos_id_gira_fkey(id, nombre_gira, nomenclador, mes_letra, subtitulo, tipo, fecha_desde)",
          )
          .eq("is_deleted", false)
          .is("deleted_at", null)
          .order("fecha", { ascending: true })
          .order("hora_inicio", { ascending: true });
        if (eventosError) throw eventosError;
        const inicioHoy = new Date();
        inicioHoy.setHours(0, 0, 0, 0);
        const onlyConciertos = (eventosData || []).filter((ev) =>
          String(ev?.tipos_evento?.nombre || "").toLowerCase().includes("concierto")
          && ev?.fecha
          && new Date(`${ev.fecha}T00:00:00`) >= inicioHoy,
        );
        setEventosConcierto(onlyConciertos);
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
      arr.sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
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
    const d = new Date();
    const hoyYmd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
          entrada_concierto: (programa.entrada_concierto || []).filter((concierto) => {
            if (!concierto?.fecha_hora) return false;
            const t = new Date(concierto.fecha_hora);
            if (Number.isNaN(t.getTime())) return false;
            return t >= inicioDiaHoy && t <= finDiaVentanaCatalogo;
          }),
        }))
        .filter((p) => (p.entrada_concierto || []).length > 0),
    [programas, inicioDiaHoy, finDiaVentanaCatalogo],
  );

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
    const list = adminData.usuarios || [];
    const filtro = new Set(
      (adminUsuarioFiltroLocalidades || []).map((l) => String(l || "").trim()).filter(Boolean),
    );
    if (filtro.size === 0) return list;
    return list.filter((u) =>
      (u.localidades_reserva || []).some((loc) => filtro.has(String(loc || "").trim())),
    );
  }, [adminData.usuarios, adminUsuarioFiltroLocalidades]);

  useEffect(() => {
    const valid = new Set(adminUsuariosLocalidadesOpciones);
    setAdminUsuarioFiltroLocalidades((prev) => prev.filter((l) => valid.has(l)));
  }, [adminUsuariosLocalidadesOpciones]);

  const conciertosRecepcion = useMemo(() => {
    return concertosFlat
      .filter((c) => c.activo && c.fecha_hora && new Date(c.fecha_hora) >= inicioDiaHoy)
      .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
  }, [concertosFlat, inicioDiaHoy]);

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

  const tieneReservaEnConcierto = (conciertoId) =>
    conciertosConReservaActiva.includes(Number(conciertoId));

  const handlePickConcierto = (slug) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", "catalogo");
    params.set("concierto", slug);
    setSearchParams(params);
  };

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
        toast.message("Reserva creada. No se pudo generar el PDF; podés intentar desde «Mis reservas» luego.");
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
          toast.success("Reserva confirmada y mail enviado. El PDF no se generó; probá descargar desde «Mis reservas».");
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

  const consumeToken = async ({ forceParcial = false } = {}) => {
    if (!scannerToken.trim() || !recepcionConciertoId) {
      if (!recepcionConciertoId) toast.error("Elegí un concierto en la lista para registrar ingresos.");
      return;
    }
    setIngresando(true);
    try {
      const result = await validarYConsumirQr({
        token: scannerToken,
        modo: "auto",
        confirmarParcial: forceParcial,
        conciertoId: recepcionConciertoId,
      });
      if (result?.warning || result?.reason === "reserva_uso_parcial") {
        setPendingWarning(result);
        return;
      }
      if (!result?.ok) {
        toast.error(formatEntradasValidacionError(result));
        return;
      }
      toast.success(formatEntradasValidacionSuccess(result));
      setScannerToken("");
      setManualReservaCode("");
      setQrPreview(null);
    } finally {
      setIngresando(false);
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
        setScannerToken(text.trim());
        toast.success("Código leído de la imagen.");
      } else {
        toast.error("No se leyó el QR. Probá otra toma o pegá el token abajo.");
      }
    } catch (err) {
      console.error(err);
      toast.error("No se pudo leer la imagen.");
    } finally {
      setDecodingQrPhoto(false);
    }
  };

  const resetProgramaForm = () => {
    setProgramaForm({ id: null, nombre: "", detalle_richtext: "", activo: true });
  };

  const startEditPrograma = (programa) => {
    setProgramaForm({
      id: programa.id,
      nombre: programa.nombre || "",
      detalle_richtext: programa.detalle_richtext || "",
      activo: programa.activo !== false,
    });
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
      if (programaForm.id != null && Number(programaForm.id) === pid) {
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
    try {
      await cancelarReserva(cancelReservaTarget.id);
      try {
        await enviarMailCancelacionReserva({ reservaId: cancelReservaTarget.id });
        toast.success("Reserva cancelada. Revisá tu correo para la confirmación.");
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
      capacidad_maxima: 100,
      reservas_habilitadas: true,
      activo: true,
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
    await adminUpsertConcierto({
      ...conciertoForm,
      imagen_drive_url: normalizeDriveImageUrl(conciertoForm.imagen_drive_url),
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

  const cargarStatsConcierto = async (conciertoId) => {
    const id = Number(conciertoId);
    if (!id || adminConciertoStatsById[id]) return;
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
          : out.emailsReservaSinIngreso;
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

  const startEditConcierto = (concierto) => {
    setConciertoForm({
      id: concierto.id,
      ofrn_evento_id: concierto.ofrn_evento_id ?? "",
      nombre: concierto.nombre || "",
      detalle_richtext: concierto.detalle_richtext || "",
      imagen_drive_url: concierto.imagen_drive_url || "",
      capacidad_maxima: Number(concierto.capacidad_maxima || 100),
      reservas_habilitadas: concierto.reservas_habilitadas ?? true,
      activo: concierto.activo ?? true,
    });
    setConciertoEditor(concierto.id);
  };

  const renderConciertoEditorForm = () => (
    <form className="space-y-3" onSubmit={submitConcierto}>
      <select
        value={conciertoForm.ofrn_evento_id === "" ? "" : String(conciertoForm.ofrn_evento_id)}
        onChange={(event) =>
          setConciertoForm((prev) => ({
            ...prev,
            ofrn_evento_id: event.target.value === "" ? "" : Number(event.target.value),
          }))
        }
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        placeholder="Nombre del concierto"
        required
      />
      <p className="text-xs text-slate-500">
        {conciertoEditor === "new" && conciertoOfrnProgramaContextId
          ? "Solo se muestran conciertos del programa OFRN elegido. Fecha, hora y lugar salen del evento."
          : "Fecha, hora y lugar se toman del evento OFRN seleccionado."}
      </p>
      <input
        value={conciertoForm.imagen_drive_url}
        onChange={(event) => setConciertoForm((prev) => ({ ...prev, imagen_drive_url: event.target.value }))}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        placeholder="URL pública de portada (Google Drive)"
      />
      <input
        type="number"
        min={1}
        value={conciertoForm.capacidad_maxima}
        onChange={(event) => setConciertoForm((prev) => ({ ...prev, capacidad_maxima: Number(event.target.value) }))}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        placeholder="Capacidad máxima"
        required
      />
      <RichTextEditor
        key={`detalle-${conciertoForm.id ?? "nuevo"}`}
        defaultOpen
        value={conciertoForm.detalle_richtext}
        onChange={(value) => setConciertoForm((prev) => ({ ...prev, detalle_richtext: value }))}
        placeholder="Detalle del concierto"
      />
      <div className="flex flex-wrap gap-2 items-center">
        <button type="submit" className="rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-semibold">
          {conciertoForm.id ? "Actualizar concierto" : "Guardar concierto"}
        </button>
        <button
          type="button"
          onClick={closeConciertoEditor}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Cancelar
        </button>
      </div>
    </form>
  );

  const renderAdminConciertoItem = (concierto) => {
    const stats = adminConciertoStatsById[concierto.id];
    const loadingStats = Boolean(adminConciertoStatsLoadingById[concierto.id]);
    const enVentana = conciertoEnVentanaCatalogoDosSemanas(concierto, inicioDiaHoy, finDiaVentanaCatalogo);
    const puedeEliminarConcierto = conciertoStatsSinReservasNiIngresos(stats);
    const muestraCargandoStats = enVentana && loadingStats && !stats;
    const muestraVerStats = !enVentana && !stats && !loadingStats;
    const conciertoMailBusy = copyingConciertoMailsKey.startsWith(`${concierto.id}:`);
    const statMailBtn = (bucket, { disabled = false, title }) => (
      <button
        type="button"
        disabled={disabled || conciertoMailBusy}
        title={title}
        aria-label={title}
        onClick={() => {
          if (!disabled) void copiarMailsConciertoAdmin(concierto.id, bucket);
        }}
        className="shrink-0 rounded p-0.5 text-slate-600 hover:text-indigo-800 hover:bg-white/70 border border-transparent hover:border-slate-200 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:border-transparent disabled:cursor-not-allowed"
      >
        <IconMail size={16} className={copyingConciertoMailsKey === `${concierto.id}:${bucket}` ? "opacity-40" : ""} />
      </button>
    );
    const statsGrid = stats && (
      <>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          <div className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1.5 flex items-start justify-between gap-1">
            <div className="min-w-0">
              <span className="font-bold text-indigo-800">Reservadas:</span>{" "}
              <span className="text-indigo-900">{stats.reservadas}</span>
            </div>
            {statMailBtn("reservaron", {
              title: "Copiar mails de quienes tienen reserva activa en este concierto",
            })}
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 flex items-start justify-between gap-1">
            <div className="min-w-0">
              <span className="font-bold text-emerald-800">Disponibles:</span>{" "}
              <span className="text-emerald-900">{stats.disponibles}</span>
            </div>
            {statMailBtn("disponibles", {
              disabled: true,
              title: "Sin destinatarios: son plazas libres (no hay mails asociados)",
            })}
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 flex items-start justify-between gap-1">
            <div className="min-w-0">
              <span className="font-bold text-amber-800">Ingresadas:</span>{" "}
              <span className="text-amber-900">{stats.ingresadas}</span>
            </div>
            {statMailBtn("ingresaron", {
              title: "Copiar mails con al menos un ingreso registrado en este concierto",
            })}
          </div>
          <div className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1.5 text-slate-700 flex items-start justify-between gap-1">
            <div className="min-w-0">
              <span className="font-bold">Reservadas no utilizadas:</span> {stats.noUtilizadas}
            </div>
            {statMailBtn("sinIngreso", {
              title:
                "Copiar mails con reserva activa sin ningún ingreso registrado en este concierto (no asistieron)",
            })}
          </div>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Capacidad máxima: {stats.capacidad}</p>
      </>
    );
    const editingThis =
      conciertoEditor != null
      && conciertoEditor !== "new"
      && Number(conciertoEditor) === Number(concierto.id);
    if (editingThis) {
      return (
        <li
          key={concierto.id}
          className="rounded-xl border-2 border-indigo-300 bg-white p-3 text-sm space-y-3 shadow-sm list-none"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-[10px] font-black uppercase tracking-wide text-slate-600">Editar concierto</h4>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatConciertoFechaHoraEs(concierto.fecha_hora)}
                {concierto.lugar_nombre ? ` · ${concierto.lugar_nombre}` : ""}
              </p>
              <p className="text-xs text-slate-500">{concierto.nombre}</p>
            </div>
            {puedeEliminarConcierto && (
              <button
                type="button"
                title="Eliminar concierto"
                aria-label="Eliminar concierto"
                onClick={() => setDeleteConciertoTarget({ id: concierto.id, nombre: concierto.nombre })}
                className="shrink-0 p-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                <IconTrash size={18} />
              </button>
            )}
          </div>
          {renderConciertoEditorForm()}
          {muestraCargandoStats && (
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-200">Cargando estadísticas…</p>
          )}
          {statsGrid && <div className="pt-2 border-t border-slate-200">{statsGrid}</div>}
        </li>
      );
    }
    return (
      <li key={concierto.id} className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 text-sm list-none">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">{formatConciertoFechaHoraEs(concierto.fecha_hora)}</p>
            <p className="text-xs text-slate-600">{concierto.lugar_nombre || "Sin lugar"}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{concierto.nombre}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              title="Editar concierto"
              aria-label="Editar concierto"
              onClick={() => startEditConcierto(concierto)}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            >
              <IconEdit size={18} />
            </button>
            {puedeEliminarConcierto && (
              <button
                type="button"
                title="Eliminar concierto"
                aria-label="Eliminar concierto"
                onClick={() => setDeleteConciertoTarget({ id: concierto.id, nombre: concierto.nombre })}
                className="p-2 rounded-lg border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
              >
                <IconTrash size={18} />
              </button>
            )}
          </div>
        </div>
        {muestraCargandoStats && <p className="text-xs text-slate-500 mt-2">Cargando estadísticas…</p>}
        {statsGrid}
        {muestraVerStats && (
          <button
            type="button"
            onClick={() => cargarStatsConcierto(concierto.id)}
            className="mt-2 rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
          >
            Ver estadísticas
          </button>
        )}
      </li>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <span className="text-sm uppercase tracking-wide font-semibold text-slate-500">Cargando entradas...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">Entradas OFRN</h1>
            <p className="text-xs text-slate-500">{profile.apellido}, {profile.nombre}</p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 sm:flex gap-2">
          <button className={`rounded-xl px-3 py-2 text-xs font-bold ${section === "catalogo" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`} onClick={() => setSearchParams({ view: "catalogo" })}>Catálogo</button>
          <button className={`rounded-xl px-3 py-2 text-xs font-bold ${section === "mis-reservas" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`} onClick={() => setSearchParams({ view: "mis-reservas" })}>Mis reservas</button>
          {canRecepcion && <button className={`rounded-xl px-3 py-2 text-xs font-bold ${section === "recepcion" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`} onClick={() => setSearchParams({ view: "recepcion" })}>Recepción</button>}
          {canAdmin && <button className={`rounded-xl px-3 py-2 text-xs font-bold ${section === "admin" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`} onClick={() => setSearchParams({ view: "admin" })}>Admin</button>}
        </div>

        {section === "catalogo" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Programas y conciertos</h2>
              <div className="space-y-3">
                {programasCatalogo.length === 0 && (
                  <p className="text-sm text-slate-500">No hay conciertos publicados en las próximas dos semanas.</p>
                )}
                {programasCatalogo.map((programa) => (
                  <article key={programa.id} className="rounded-xl border border-slate-200 p-3">
                    <h3 className="font-bold text-slate-800">{programa.nombre}</h3>
                    <EntradasRichTextHtml
                      html={programa.detalle_richtext}
                      className="mt-2 border-t border-slate-100 pt-2"
                    />
                    <div className="mt-2 space-y-2">
                      {(programa.entrada_concierto || []).map((concierto) => {
                        const catalogoSeleccionado = String(concierto.slug_publico || "") === conciertoSlug;
                        return (
                          <button
                            key={concierto.id}
                            type="button"
                            className={`w-full text-left rounded-lg border-2 px-3 py-2 transition-colors bg-white ${
                              catalogoSeleccionado
                                ? "border-indigo-600 shadow-sm"
                                : "border-slate-200 hover:border-indigo-400"
                            }`}
                            onClick={() => handlePickConcierto(concierto.slug_publico)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-700">{concierto.nombre}</p>
                              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                                {catalogoSeleccionado && (
                                  <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-700 border-2 border-indigo-600 rounded px-1.5 py-0.5 bg-white">
                                    Seleccionado
                                  </span>
                                )}
                                {tieneReservaEnConcierto(concierto.id) && (
                                  <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                                    Con reserva
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">{formatConciertoFechaHoraEs(concierto.fecha_hora)}</p>
                            {concierto.lugar_nombre && <p className="text-xs text-slate-500">{concierto.lugar_nombre}</p>}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 space-y-3 min-h-[12rem]">
              {selectedConciertoLoading && conciertoSlug && (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-500">
                  <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-hidden />
                  <span className="text-sm font-medium">Cargando concierto…</span>
                </div>
              )}
              {!selectedConciertoLoading && !conciertoSlug && (
                <p className="text-sm text-slate-500">Seleccioná un concierto para ver su URL compartible y reservar.</p>
              )}
              {!selectedConciertoLoading && conciertoSlug && !selectedConcierto && (
                <p className="text-sm text-slate-500">No se pudo mostrar este concierto. Volvé al listado o probá con otro enlace.</p>
              )}
              {!selectedConciertoLoading && selectedConcierto && (
                <>
                  <p className="text-[10px] font-black uppercase tracking-wide text-indigo-600">Concierto seleccionado</p>
                  <h3 className="text-lg font-bold text-slate-800">{selectedConcierto.nombre}</h3>
                  <p className="text-xs text-slate-600">{formatConciertoFechaHoraEs(selectedConcierto.fecha_hora)}</p>
                  {selectedConcierto.lugar_nombre && <p className="text-xs text-slate-500">{selectedConcierto.lugar_nombre}</p>}
                  {selectedConcierto.imagen_drive_url && (
                    <img
                      src={normalizeDriveImageUrl(selectedConcierto.imagen_drive_url)}
                      alt={selectedConcierto.nombre}
                      className="w-full h-44 rounded-xl object-cover border border-slate-200"
                      onError={(event) => {
                        const img = event.currentTarget;
                        const original = String(selectedConcierto.imagen_drive_url || "");
                        const fallbackMatch =
                          original.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i)
                          || original.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
                        const fallbackId = fallbackMatch?.[1];
                        if (!fallbackId) return;
                        const currentSrc = img.getAttribute("src") || "";
                        if (currentSrc.includes("/thumbnail?")) {
                          img.src = `https://drive.google.com/uc?export=view&id=${fallbackId}`;
                        }
                      }}
                    />
                  )}
                  <EntradasRichTextHtml html={selectedConcierto.detalle_richtext} />
                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
                    Disponibles: <strong>{computeDisponibles(selectedConcierto)}</strong> / {selectedConcierto.capacidad_maxima}
                  </div>
                  <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs break-all">
                    URL: {window.location.origin}/entradas?view=catalogo&concierto={selectedConcierto.slug_publico}
                  </div>
                  {tieneReservaEnConcierto(selectedConcierto.id) && (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Ya tenés una reserva activa para este concierto. Podés verla en &quot;Mis reservas&quot;.
                    </p>
                  )}
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Cantidad</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                    value={cantidad}
                    onChange={(event) => setCantidad(Number(event.target.value))}
                    disabled={tieneReservaEnConcierto(selectedConcierto.id)}
                  >
                    {[1, 2, 3, 4].map((n) => (<option key={n} value={n}>{n} entrada{n > 1 ? "s" : ""}</option>))}
                  </select>
                  <button
                    onClick={handleCreateReserva}
                    disabled={
                      creatingReserva
                      || !selectedConcierto.reservas_habilitadas
                      || computeDisponibles(selectedConcierto) < cantidad
                      || tieneReservaEnConcierto(selectedConcierto.id)
                    }
                    className="w-full rounded-lg bg-blue-700 text-white py-2 text-sm font-semibold disabled:bg-slate-300"
                  >
                    {creatingReserva ? "Reservando..." : "Reservar"}
                  </button>
                  {reservaResult && (
                    <div className="space-y-2 border-t border-slate-200 pt-3">
                      <p className="text-sm font-bold text-emerald-700">Reserva #{reservaResult.codigo_reserva}</p>
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
                        className="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-800"
                      >
                        Descargar PDF (detalle y QRs)
                      </button>
                      <img src={reservaResult.reservaQr} alt="QR reserva general" className="w-40 h-40 border border-slate-200 rounded-lg" />
                      <div className="grid grid-cols-2 gap-2">
                        {reservaResult.entriesQr.map((qr, idx) => (
                          <img key={idx} src={qr} alt={`QR entrada ${idx + 1}`} className="w-full border border-slate-200 rounded-lg" />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}

        {section === "mis-reservas" && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Mis reservas</h2>
            <div className="space-y-2">
              {misReservas.map((reserva) => {
                const ingresadas = (reserva.entradas || []).filter((x) => x.estado_ingreso === "ingresada").length;
                const esActiva = reserva.estado === "activa";
                return (
                  <article key={reserva.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{reserva.concierto?.nombre} · {reserva.codigo_reserva}</p>
                        <p className="text-xs text-slate-500">{formatConciertoFechaHoraEs(reserva.concierto?.fecha_hora)}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          esActiva ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {esActiva ? "Activa" : "Cancelada"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Entradas: {reserva.cantidad_solicitada} · Ingresadas: {ingresadas}
                    </p>
                    {esActiva && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          disabled={downloadingPdfReservaId === reserva.id}
                          onClick={async () => {
                            setDownloadingPdfReservaId(reserva.id);
                            try {
                              await descargarPdfDesdeReservaRow(reserva);
                            } catch (e) {
                              toast.error(e?.message || "No se pudo generar el PDF.");
                            } finally {
                              setDownloadingPdfReservaId(null);
                            }
                          }}
                          className="w-full sm:w-auto rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100 disabled:opacity-60"
                        >
                          {downloadingPdfReservaId === reserva.id ? "Generando PDF…" : "Descargar PDF (detalle y QRs)"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelReservaTarget(reserva)}
                          className="w-full sm:w-auto rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100"
                        >
                          Cancelar reserva
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
              {misReservas.length === 0 && <p className="text-sm text-slate-500">Aún no tenés reservas.</p>}
            </div>
          </section>
        )}

        {section === "recepcion" && canRecepcion && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Recepción</h2>
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
                className="min-w-0 rounded-lg border border-slate-300 px-2 py-2.5 text-sm font-medium text-slate-800 w-[80%] max-w-[80%] shrink-0"
                value={recepcionConciertoId}
                onChange={(e) => {
                  setRecepcionConciertoId(e.target.value);
                  setScannerToken("");
                  setQrPreview(null);
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
                title="Escanear QR (cámara)"
                onClick={() => qrPhotoInputRef.current?.click()}
                disabled={decodingQrPhoto || !recepcionConciertoId}
                className="flex w-[20%] min-w-0 max-w-[20%] shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 disabled:opacity-40"
              >
                {decodingQrPhoto ? <span className="text-[10px] font-bold">…</span> : <IconCamera size={26} className="shrink-0" />}
              </button>
            </div>
            <input
              value={scannerToken}
              onChange={(event) => setScannerToken(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              placeholder="Pegá el token QR completo (ENTR-...) o usá código manual abajo"
            />
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
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
                  if (onlyDigits.length === 10) {
                    setScannerToken(onlyDigits);
                  }
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm tracking-[0.18em]"
                placeholder="Código manual (10 dígitos)"
              />
              <button
                type="button"
                onClick={() => {
                  if (manualReservaCode.length === 10) {
                    setScannerToken(manualReservaCode);
                  }
                }}
                disabled={manualReservaCode.length !== 10}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50"
              >
                Usar código
              </button>
            </div>
            {qrPreviewLoading && <p className="text-sm text-indigo-600 font-medium">Analizando código…</p>}
            {qrPreview && !qrPreview.ok && (
              <div
                className={`rounded-xl border-2 p-3 text-sm text-slate-800 shadow-sm ${recepcionPanelClass(qrPreview)}`}
              >
                <p className="font-medium">{formatEntradasPreviewError(qrPreview)}</p>
              </div>
            )}
            {qrPreview && qrPreview.ok && qrPreview.tipo === "entrada" && (
              <div
                className={`rounded-xl border-2 p-4 space-y-2 text-sm shadow-sm ${recepcionPanelClass(qrPreview)}`}
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Entrada individual</p>
                <p className="text-slate-800">
                  Reserva <span className="font-mono font-semibold">{qrPreview.codigo_reserva || "—"}</span> · Entrada nº {qrPreview.entrada_orden} de {qrPreview.cantidad_en_reserva}
                </p>
                <p className="font-medium text-slate-800">
                  {qrPreview.estado_ingreso === "pendiente" ? (
                    <span>Sin ingreso registrado aún con esta plaza.</span>
                  ) : (
                    <span>Ingreso: {formatDate(qrPreview.ingresada_at) || "—"}</span>
                  )}
                </p>
                {!qrPreview.puede_ingresar && entradasBloqueoIngreso(qrPreview) && (
                  <p className="text-xs text-slate-800 border-t border-slate-300/50 pt-2 mt-1">{entradasBloqueoIngreso(qrPreview)}</p>
                )}
              </div>
            )}
            {qrPreview && qrPreview.ok && qrPreview.tipo === "reserva" && (
              <div
                className={`rounded-xl border-2 p-4 space-y-2 text-sm shadow-sm ${recepcionPanelClass(qrPreview)}`}
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Reserva (grupo)</p>
                <p>
                  Código <span className="font-mono font-semibold">{qrPreview.codigo_reserva}</span> · {qrPreview.cantidad_solicitada} plaza
                  {Number(qrPreview.cantidad_solicitada) !== 1 ? "s" : ""}
                </p>
                <p>
                  {qrPreview.pendientes} sin ingresar · {qrPreview.ingresadas} ya ingresaron
                </p>
                {qrPreview.necesita_confirmar_parcial && (
                  <p className="text-xs text-slate-800 border-t border-slate-300/50 pt-2">
                    Ingreso parcial: al confirmar se completarán las plazas pendientes (se pedirá confirmación).
                  </p>
                )}
                {Array.isArray(qrPreview.entradas) && qrPreview.entradas.length > 0 && (
                  <ul className="text-xs space-y-1.5 border-t border-slate-300/50 pt-2">
                    {qrPreview.entradas.map((row) => (
                      <li key={row.orden} className="flex flex-wrap gap-2 justify-between text-slate-800">
                        <span>Plaza nº {row.orden}</span>
                        {row.estado_ingreso === "pendiente" ? (
                          <span className="font-medium">Pendiente</span>
                        ) : (
                          <span>Ingresó {row.ingresada_at ? formatDate(row.ingresada_at) : ""}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {!qrPreview.puede_ingresar && entradasBloqueoIngreso(qrPreview) && (
                  <p className="text-xs text-slate-800 border-t border-slate-300/50 pt-2">{entradasBloqueoIngreso(qrPreview)}</p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => consumeToken()}
              className="w-full rounded-lg bg-emerald-600 text-white py-3 text-sm font-bold disabled:bg-slate-300"
              disabled={
                !recepcionConciertoId
                || !scannerToken.trim()
                || qrPreviewLoading
                || !qrPreview
                || !qrPreview.ok
                || !qrPreview.puede_ingresar
                || ingresando
              }
            >
              {ingresando ? "Registrando…" : "Ingresar a sala"}
            </button>
          </section>
        )}

        {section === "admin" && canAdmin && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
            <div className="flex gap-2">
              {ADMIN_TABS.map((tab) => (
                <button
                  key={tab}
                  className={`rounded-lg px-3 py-2 text-xs font-bold uppercase ${adminTab === tab ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}
                  onClick={() => setAdminTab(tab)}
                >
                  {tab === "programas" ? "Programas y conciertos" : "Usuarios"}
                </button>
              ))}
            </div>

            {adminTab === "programas" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={openNuevoProgramaModal}
                    className="inline-flex items-center justify-center rounded-xl border-2 border-dashed border-indigo-300 bg-white px-4 py-2.5 text-sm font-bold text-indigo-800 shadow-sm hover:bg-indigo-50/80 transition-colors"
                  >
                    + Programa
                  </button>
                  {conciertoOfrnProgramaContextId && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2.5 space-y-2">
                      <p className="text-sm text-slate-800">
                        <span className="font-bold">Programa elegido:</span> {contextProgramaLabel}
                      </p>
                      {String(contextOfrnProgramaRow?.subtitulo || "").trim() && (
                        <p className="text-xs text-slate-600 leading-relaxed border-t border-indigo-200/70 pt-2">
                          <span className="font-semibold text-slate-700">Subtítulo (OFRN): </span>
                          {String(contextOfrnProgramaRow.subtitulo).trim()}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openNuevoConcierto()}
                          className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-900 hover:bg-indigo-100"
                        >
                          Agregar concierto
                        </button>
                        <button
                          type="button"
                          onClick={cambiarProgramaOfrnContexto}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Elegir otro programa
                        </button>
                      </div>
                    </div>
                  )}
                  {conciertoEditor === "new" && (
                    <div className="rounded-xl border-2 border-indigo-300 bg-white p-4 space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wide text-indigo-900">Nuevo concierto</h3>
                      {eventosParaSelectorConcierto.length === 0 && (
                        <p className="text-xs text-amber-800">
                          No hay eventos tipo concierto futuros para esta gira. Revisá fechas en OFRN o elegí otra gira.
                        </p>
                      )}
                      {renderConciertoEditorForm()}
                    </div>
                  )}
                </div>

                {programaForm.id != null && (
                  <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">Editar programa en catálogo</h3>
                    <form className="space-y-3" onSubmit={submitPrograma}>
                      <p className="text-xs font-black uppercase tracking-wide text-indigo-800">Programa #{programaForm.id}</p>
                      {ofrnProgramaEnEdicionReferencia && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Gira OFRN (referencia)</p>
                          <p className="text-xs font-semibold text-slate-800">{buildProgramaLabel(ofrnProgramaEnEdicionReferencia)}</p>
                          {String(ofrnProgramaEnEdicionReferencia.subtitulo || "").trim() ? (
                            <p className="text-xs text-slate-600 leading-relaxed">{String(ofrnProgramaEnEdicionReferencia.subtitulo).trim()}</p>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">Sin subtítulo en la gira OFRN.</p>
                          )}
                        </div>
                      )}
                      <input
                        value={programaForm.nombre}
                        onChange={(event) => setProgramaForm((prev) => ({ ...prev, nombre: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Nombre del programa"
                        required
                      />
                      <RichTextEditor
                        value={programaForm.detalle_richtext}
                        onChange={(value) => setProgramaForm((prev) => ({ ...prev, detalle_richtext: value }))}
                        placeholder="Detalle del programa (texto enriquecido)"
                      />
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={programaForm.activo}
                          onChange={(event) => setProgramaForm((prev) => ({ ...prev, activo: event.target.checked }))}
                          className="rounded border-slate-300"
                        />
                        Programa activo (visible en catálogo cuando tenga conciertos publicados)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" className="rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-semibold">
                          Actualizar programa
                        </button>
                        <button
                          type="button"
                          onClick={resetProgramaForm}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                        >
                          Cancelar edición
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">Programas con entradas</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Editá nombre y detalle del programa en Entradas, agregá conciertos de la misma gira OFRN o administrá los ya creados. En la lista solo se muestran fecha, lugar y nombre; el detalle al editar.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {adminData.programas.map((programa) => {
                      const lista = conciertosByProgramaId.get(Number(programa.id)) || [];
                      const ofrnPid = getOfrnProgramaIdForEntradaPrograma(programa, lista);
                      const programaStatsCompletas =
                        lista.length === 0
                        || lista.every((c) => Boolean(adminConciertoStatsById[c.id]));
                      const programaMuestraEliminar =
                        lista.length === 0
                        || (programaStatsCompletas
                          && lista.every((c) =>
                            conciertoStatsSinReservasNiIngresos(adminConciertoStatsById[c.id]),
                          ));
                      return (
                        <article key={programa.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-800">{programa.nombre}</p>
                              {(() => {
                                const ofrnRow = ofrnPid
                                  ? ofrnProgramasPicker.find((p) => Number(p.id) === ofrnPid)
                                  : null;
                                const st = String(ofrnRow?.subtitulo || "").trim();
                                if (!st) return null;
                                return (
                                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                                    <span className="font-semibold text-slate-600">OFRN: </span>
                                    {st}
                                  </p>
                                );
                              })()}
                              {programa.activo === false && (
                                <span className="text-[10px] font-bold uppercase text-amber-700">Programa inactivo</span>
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
                                className="rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-900 hover:bg-indigo-100"
                              >
                                Agregar concierto
                              </button>
                              <button
                                type="button"
                                title="Editar programa"
                                aria-label="Editar programa"
                                onClick={() => startEditPrograma(programa)}
                                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                              >
                                <IconEdit size={18} />
                              </button>
                              {programaMuestraEliminar && (
                                <button
                                  type="button"
                                  title="Eliminar programa"
                                  aria-label="Eliminar programa"
                                  onClick={() => setDeleteProgramaTarget({ id: programa.id, nombre: programa.nombre })}
                                  className="p-2 rounded-lg border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                                >
                                  <IconTrash size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                          {lista.length > 0 && (
                            <div className="rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2 space-y-1.5">
                              <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">
                                Mails del programa (todos los conciertos)
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {(() => {
                                  const busy = copyingProgramaMailsKey.startsWith(`${programa.id}:`);
                                  return (
                                    <>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        title="Personas con al menos una reserva activa en cualquier concierto del programa"
                                        onClick={() => copiarMailsProgramaAdmin(programa.id, lista, "reservaron")}
                                        className="rounded-md border border-indigo-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-indigo-900 hover:bg-indigo-50 disabled:opacity-50"
                                      >
                                        {copyingProgramaMailsKey === `${programa.id}:reservaron`
                                          ? "Copiando…"
                                          : "Mails: reservaron"}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        title="Personas con al menos una entrada registrada como ingresada (reserva activa)"
                                        onClick={() => copiarMailsProgramaAdmin(programa.id, lista, "ingresaron")}
                                        className="rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-emerald-900 hover:bg-emerald-50/80 disabled:opacity-50"
                                      >
                                        {copyingProgramaMailsKey === `${programa.id}:ingresaron`
                                          ? "Copiando…"
                                          : "Mails: ingresaron"}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        title="Personas con al menos una reserva activa donde ninguna entrada figura como ingresada (no asistieron a esa reserva)"
                                        onClick={() => copiarMailsProgramaAdmin(programa.id, lista, "sinIngreso")}
                                        className="rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-50/80 disabled:opacity-50"
                                      >
                                        {copyingProgramaMailsKey === `${programa.id}:sinIngreso`
                                          ? "Copiando…"
                                          : "Mails: sin ingreso"}
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>
                              <p className="text-[10px] text-slate-500 leading-snug">
                                Solo reservas activas. «Sin ingreso» = esa reserva no tiene ninguna plaza marcada como ingresada.
                              </p>
                            </div>
                          )}
                          {lista.length === 0 ? (
                            <p className="text-xs text-slate-500">Sin conciertos de entradas en este programa.</p>
                          ) : (
                            <ul className="space-y-2 pl-0">{lista.map((c) => renderAdminConciertoItem(c))}</ul>
                          )}
                        </article>
                      );
                    })}
                  </div>

                  {conciertosSinProgramaEnAdmin.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wide text-amber-900">Conciertos sin programa listado</h4>
                      <p className="text-[11px] text-amber-900/90">
                        Estos conciertos no coinciden con ningún programa de la lista superior. Revisá datos o sincronización.
                      </p>
                      <ul className="space-y-2 pl-0">{conciertosSinProgramaEnAdmin.map((c) => renderAdminConciertoItem(c))}</ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {adminTab === "usuarios" && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-4 items-start justify-between">
                  <div className="space-y-2 min-w-[12rem] max-w-md flex-1">
                    <span className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                      Filtrar por localidad (una o más; sin marcar = todas)
                    </span>
                    <div className="rounded-lg border border-slate-200 bg-white p-2 max-h-44 overflow-y-auto space-y-1.5">
                      {adminUsuariosLocalidadesOpciones.length === 0 ? (
                        <p className="text-xs text-slate-400 px-1">Sin localidades en reservas cargadas.</p>
                      ) : (
                        adminUsuariosLocalidadesOpciones.map((loc) => {
                          const checked = adminUsuarioFiltroLocalidades.includes(loc);
                          return (
                            <label
                              key={loc}
                              className="flex items-start gap-2 cursor-pointer text-xs text-slate-700 hover:bg-slate-50 rounded px-1 py-0.5"
                            >
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
                                className="rounded border-slate-300 mt-0.5 shrink-0"
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
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 font-bold text-slate-700 hover:bg-slate-50"
                          onClick={() => setAdminUsuarioFiltroLocalidades([...adminUsuariosLocalidadesOpciones])}
                        >
                          Marcar todas
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 font-bold text-slate-700 hover:bg-slate-50"
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
                      className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-bold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {copyingAdminMails ? "Copiando…" : `Copiar mails (${adminUsuariosFiltrados.length})`}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 max-w-3xl">
                  Las localidades salen del evento OFRN vinculado a cada concierto. Con varias marcadas se listan usuarios que tengan reserva en{" "}
                  <span className="font-semibold">cualquiera</span> de esas localidades.
                </p>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wide text-slate-500 border-b border-slate-200">
                        <th className="px-3 py-2 whitespace-nowrap">Apellido</th>
                        <th className="px-3 py-2 whitespace-nowrap">Nombre</th>
                        <th className="px-3 py-2 min-w-[10rem]">Mail</th>
                        <th className="px-3 py-2 min-w-[9rem]">Localidades</th>
                        <th className="px-3 py-2 whitespace-nowrap w-[8.5rem]">Rol</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsuariosFiltrados.map((usr) => (
                        <tr key={usr.id} className="border-b border-slate-100 last:border-0 align-top hover:bg-slate-50/80">
                          <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{usr.apellido}</td>
                          <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{usr.nombre}</td>
                          <td className="px-3 py-2 text-slate-600 break-all max-w-[16rem]">{usr.email}</td>
                          <td className="px-3 py-2 text-xs text-slate-600">
                            {(usr.localidades_reserva || []).length ? (
                              <span className="leading-snug">{(usr.localidades_reserva || []).join(" · ")}</span>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={usr.rol}
                              onChange={async (event) => {
                                await adminUpdateUsuarioRol({ id: usr.id, rol: event.target.value });
                                setAdminData(await listAdminData());
                              }}
                              className="w-full max-w-[8.5rem] rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
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
                {adminUsuariosFiltrados.length === 0 && (
                  <p className="text-sm text-slate-500">
                    {adminUsuarioFiltroLocalidades.length > 0
                      ? "Ningún usuario coincide con la combinación de localidades elegida."
                      : "No hay usuarios registrados."}
                  </p>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      {nuevoProgramaModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-3 sm:p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNuevoProgramaModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="entradas-nuevo-programa-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="entradas-nuevo-programa-titulo" className="text-xs font-black uppercase tracking-wide text-slate-800 pr-2">
                Nuevo programa de entradas
              </h3>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-800 shrink-0 rounded p-1"
                aria-label="Cerrar"
                onClick={() => setNuevoProgramaModalOpen(false)}
              >
                <IconX size={20} />
              </button>
            </div>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
              Elegí el tipo de programa y una gira de la app OFRN que aún no tenga entradas. Luego cargá los conciertos: solo se listan eventos futuros de tipo concierto de esa gira.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-700 space-y-1">
                <span className="block text-[11px] uppercase tracking-wide text-slate-600">Tipo de programa</span>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
              <label className="block text-xs font-semibold text-slate-700 space-y-1">
                <span className="block text-[11px] uppercase tracking-wide text-slate-600">Programa OFRN</span>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                <div className="rounded-lg border border-indigo-100 bg-white px-3 py-2 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wide text-indigo-900/80">Subtítulo en OFRN</p>
                  {String(ofrnSeleccionadoModal.subtitulo || "").trim() ? (
                    <p className="text-xs text-slate-700 leading-relaxed">{String(ofrnSeleccionadoModal.subtitulo).trim()}</p>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">Esta gira no tiene subtítulo cargado en OFRN.</p>
                  )}
                </div>
              )}
              {programasOfrnDisponiblesNuevoEntrada.length === 0 && (
                <p className="text-xs text-amber-900 bg-amber-50/90 border border-amber-200 rounded-lg px-2.5 py-2">
                  No hay giras de este tipo con inicio a partir de hoy y sin módulo de entradas. Revisá fechas en OFRN o probá con otro tipo.
                </p>
              )}
            </div>
            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setNuevoProgramaModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmarProgramaOfrnParaNuevo()) setNuevoProgramaModalOpen(false);
                }}
                className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-bold hover:bg-indigo-700"
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
