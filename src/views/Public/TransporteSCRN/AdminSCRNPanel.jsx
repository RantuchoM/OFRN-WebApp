import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../services/supabase";
import { ensureScrnPerfilForNewEmail } from "../../../services/scrnCreatePerfil";
import {
  syncTransporteGoogleCalendar,
  syncViajeGoogleCalendar,
} from "../../../services/scrnSyncGoogleCalendar";
import {
  IconEdit,
  IconPlus,
  IconPencil,
  IconSave,
  IconTrash,
  IconX,
  IconArrowLeft,
  IconFolderPlus,
  IconUsers,
  IconSend,
} from "../../../components/ui/Icons";
import ManagementSectionCard from "../../Management/ManagementSectionCard";
import AdminPendientePaquetesList from "./AdminPendientePaquetesList";
import AlertModal from "../../../components/ui/AlertModal";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import ReservaPasajerosEditor from "./ReservaPasajerosEditor";
import ViajeReservasOperativoPanel from "./ViajeReservasOperativoPanel";
import { paxNombreCompleto } from "./scrnReservaPaxUtils";
import {
  initialViajeForm,
  ViajeFormFields,
  toLocalInputDateTime,
  viajeDraftFromItem,
} from "./ViajeFormFields";
import {
  buildTransporteOcupadoAlerta,
  findConflictingViajesForTransporte,
  propuestaOcupacionWindowFromForm,
} from "./viajeTransporteConflict";
import { isSalidaHoyOFutura } from "./viajeSalidaTemporal";
import {
  normalizeScrnTransporteColor,
  scrnTransporteAccentStyle,
  scrnTransporteColorFromEntity,
} from "./scrnTransporteColor";
import {
  cupoPasajerosViaje,
  parsePlazasPasajerosFormValue,
  topeTransportePasajeros,
} from "./scrnPlazasCapacidad";

const initialTransporteForm = {
  nombre: "",
  tipo: "",
  patente: "",
  localidad_base: "",
  capacidad_max: 20,
  observaciones_estado: "",
  color: "#6366f1",
};

/** Filtros en “Datos generales”, mismo estilo que UniversalTable */
const DG_FILTER_INP =
  "w-full min-h-[40px] md:min-h-0 px-2 py-2 md:py-1 text-[11px] border border-slate-200 rounded bg-white focus:ring-1 focus:ring-indigo-500/40 outline-none placeholder:text-slate-300 font-normal";

const DG_DG_ICON =
  "inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed shrink-0";
const DG_DG_ICON_PRIMARY =
  "inline-flex items-center justify-center rounded-md border border-blue-200 bg-white p-1 text-blue-700 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed shrink-0";
const DG_COMPACT_INP = "h-7 text-xs leading-tight py-0 px-1.5 rounded border border-slate-300 w-full min-w-0";
const DG_COMPACT_TH = "text-left px-1.5 py-1";
const DG_COMPACT_TD = "px-1.5 py-0.5";
const DG_TIPO_EMOJI_OPTS = ["🚐", "🚌", "🚗", "🚙", "🚕", "🚖", "🚘", "🚎", "🚚", "🚛", "🛻", "🚜"];

function DgEmojiField({
  value = "",
  onChange,
  disabled = false,
  className = "",
  placeholder = "🚐",
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (ev) => {
      if (!boxRef.current?.contains(ev.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={boxRef} className="relative flex items-center gap-1">
      <input
        value={value || ""}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        className={className}
        placeholder={placeholder}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="h-7 px-1.5 text-sm rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
        title="Elegir emoji"
        aria-label="Elegir emoji"
      >
        🙂
      </button>
      {open && (
        <div className="absolute z-30 top-8 right-0 rounded-lg border border-slate-200 bg-white shadow-md p-1.5 w-[11rem]">
          <div className="grid grid-cols-6 gap-1">
            {DG_TIPO_EMOJI_OPTS.map((emo) => (
              <button
                key={emo}
                type="button"
                onClick={() => {
                  onChange?.(emo);
                  setOpen(false);
                }}
                className="h-7 rounded hover:bg-slate-100 text-base leading-none"
                title={emo}
              >
                {emo}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mt-1.5 w-full h-7 rounded border border-slate-200 text-[11px] hover:bg-slate-50"
            onClick={() => {
              onChange?.("");
              setOpen(false);
            }}
          >
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function pad2(n) {
  return String(Math.max(0, Math.trunc(Number(n) || 0))).padStart(2, "0");
}

function mapReservasConDetalle(lista, paxByReserva, viajesMap, perfilesMap) {
  return lista.map((item) => ({
    ...item,
    viaje: viajesMap[item.id_viaje] || null,
    perfil: perfilesMap[item.id_usuario] || null,
    pasajeros: paxByReserva[item.id] || [],
  }));
}

function TransporteInlineLabel({ idTransporte, transportMap, viaje }) {
  const row =
    (idTransporte != null && transportMap?.[idTransporte]) || viaje?.scrn_transportes || null;
  const name =
    row?.nombre ||
    (idTransporte != null ? `#${idTransporte}` : "-");
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span>Transporte:</span>
      <span
        className="inline-block h-3.5 w-3.5 rounded border border-slate-300/90 shrink-0"
        style={{ backgroundColor: scrnTransporteColorFromEntity(row) }}
        title={name}
        aria-hidden
      />
      <span>{name}</span>
    </span>
  );
}

export default function AdminSCRNPanel({
  isAdmin,
  adminView,
  adminPendienteSeccion = null,
  onPendienteSeccionChange,
  pendienteCounts = { viajes: 0, pasajeros: 0, paquetes: 0 },
  transportes = [],
  viajes = [],
  scrnPerfiles = [],
  localidades = [],
  tipoOptions = [],
  reloadToken = 0,
  focusTransportRequest = null,
  focusViajeRequest = null,
  onDataChanged,
}) {
  const [transporteForm, setTransporteForm] = useState(initialTransporteForm);
  const [viajeForm, setViajeForm] = useState(initialViajeForm);
  const [transportEdits, setTransportEdits] = useState({});
  const [viajeEdits, setViajeEdits] = useState({});
  const [savingTransporte, setSavingTransporte] = useState(false);
  const [savingViaje, setSavingViaje] = useState(false);
  const [savingTransportId, setSavingTransportId] = useState(null);
  const [savingViajeId, setSavingViajeId] = useState(null);
  const [editingViajeId, setEditingViajeId] = useState(null);
  const [operativoViajeId, setOperativoViajeId] = useState(null);
  const [viajeIdToDelete, setViajeIdToDelete] = useState(null);
  const [eliminandoViajeId, setEliminandoViajeId] = useState(null);
  const [editingTransportId, setEditingTransportId] = useState(null);
  const [localidadesEdits, setLocalidadesEdits] = useState({});
  const [tiposCatalog, setTiposCatalog] = useState([]);
  const [tiposTableAvailable, setTiposTableAvailable] = useState(true);
  const [tiposEdits, setTiposEdits] = useState({});
  const [uxProfiles, setUxProfiles] = useState([]);
  const [uxEdits, setUxEdits] = useState({});
  const [savingLocalidadId, setSavingLocalidadId] = useState(null);
  const [savingTipoId, setSavingTipoId] = useState(null);
  const [savingUxId, setSavingUxId] = useState(null);
  const [pendingReservas, setPendingReservas] = useState([]);
  const [acceptedReservas, setAcceptedReservas] = useState([]);
  const [cancelledReservas, setCancelledReservas] = useState([]);
  const [loadingReservas, setLoadingReservas] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [adminGestionPendId, setAdminGestionPendId] = useState(null);
  const [adminGestionAccId, setAdminGestionAccId] = useState(null);
  const [pendingPropuestasViaje, setPendingPropuestasViaje] = useState([]);
  const [resolviendoPropId, setResolviendoPropId] = useState(null);
  const [transporteConflictoMsg, setTransporteConflictoMsg] = useState(null);
  const [datosGeneralesTab, setDatosGeneralesTab] = useState("transportes");
  const [showNuevoTransporteForm, setShowNuevoTransporteForm] = useState(false);
  const [showNuevoRecorridoForm, setShowNuevoRecorridoForm] = useState(false);
  const [verHistorialRecorridos, setVerHistorialRecorridos] = useState(false);
  const [syncingTransportId, setSyncingTransportId] = useState(null);
  const [syncStatusByTransport, setSyncStatusByTransport] = useState({});
  const [dgFilters, setDgFilters] = useState({
    localidades: { id: "", localidad: "" },
    tipos: { nombre: "", emoji: "" },
    ux: {
      nombre: "",
      apellido: "",
      dni: "",
      fecha_nacimiento: "",
      email: "",
      cargo: "",
      genero: "",
      admin: "",
    },
  });
  const [dgNuevaLocalidad, setDgNuevaLocalidad] = useState("");
  const [dgCreatingLocalidad, setDgCreatingLocalidad] = useState(false);
  const [dgNuevoTipoNombre, setDgNuevoTipoNombre] = useState("");
  const [dgNuevoTipoEmoji, setDgNuevoTipoEmoji] = useState("");
  const [dgCreatingTipo, setDgCreatingTipo] = useState(false);
  const [dgNuevoPerfil, setDgNuevoPerfil] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    fecha_nacimiento: "",
    email: "",
    cargo: "",
    genero: "-",
    es_admin: false,
  });
  const [dgCreatingPerfil, setDgCreatingPerfil] = useState(false);
  const [dgDeleteTarget, setDgDeleteTarget] = useState(null);
  const [dgEditing, setDgEditing] = useState(null);
  const [dgCreateModal, setDgCreateModal] = useState(null);
  const [uxColumnsAvailable, setUxColumnsAvailable] = useState({
    fecha_nacimiento: true,
    email: true,
  });

  useEffect(() => {
    const transportId = focusTransportRequest?.id;
    if (!transportId) return;
    if (adminView !== "datos_generales") return;
    setDatosGeneralesTab("transportes");
    setEditingTransportId(transportId);
  }, [focusTransportRequest, adminView]);

  useEffect(() => {
    const viajeId = focusViajeRequest?.id;
    if (!viajeId) return;
    if (adminView !== "recorridos") return;
    setEditingViajeId(viajeId);
    setOperativoViajeId(null);
  }, [focusViajeRequest, adminView]);

  const transportMap = useMemo(() => {
    const map = {};
    transportes.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [transportes]);
  const choferOptions = useMemo(
    () =>
      (scrnPerfiles || [])
        .filter((p) => p?.id)
        .map((p) => ({ id: p.id, nombre: p.nombre || "", apellido: p.apellido || "" }))
        .sort((a, b) =>
          `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es-AR"),
        ),
    [scrnPerfiles],
  );
  const viajesFiltradosAdmin = useMemo(
    () => (verHistorialRecorridos ? viajes : viajes.filter((v) => isSalidaHoyOFutura(v.fecha_salida))),
    [viajes, verHistorialRecorridos],
  );
  const viajesSinEventoGC = useMemo(
    () =>
      (viajesFiltradosAdmin || []).filter((v) => {
        const tr = transportMap[v.id_transporte];
        if (tr && tr.activo === false) return false;
        return !String(v?.google_calendar_event_id || "").trim();
      }),
    [viajesFiltradosAdmin, transportMap],
  );
  const plazasOcupadasPorViaje = useMemo(() => {
    const acc = {};
    const activas = [...(pendingReservas || []), ...(acceptedReservas || [])];
    activas.forEach((r) => {
      const viajeId = Number(r?.id_viaje);
      if (!Number.isFinite(viajeId)) return;
      const paxActivos = (r.pasajeros || []).filter((p) => String(p?.estado || "") !== "cancelada")
        .length;
      const legacyTitular = (r.pasajeros || []).length > 0 ? 0 : 1;
      acc[viajeId] = (acc[viajeId] || 0) + legacyTitular + paxActivos;
    });
    return acc;
  }, [pendingReservas, acceptedReservas]);

  const mergedTipoOptions = useMemo(() => {
    const values = new Set([...(tipoOptions || []), ...transportes.map((t) => t.tipo)]);
    return [...values].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [tipoOptions, transportes]);

  useEffect(() => {
    const mapped = {};
    localidades.forEach((item) => {
      mapped[item.id] = { localidad: item.localidad || "" };
    });
    setLocalidadesEdits(mapped);
  }, [localidades]);

  useEffect(() => {
    const mapped = {};
    transportes.forEach((item) => {
      mapped[item.id] = {
        nombre: item.nombre || "",
        tipo: item.tipo || "",
        patente: item.patente || "",
        localidad_base: item.localidad_base || "",
        capacidad_max: item.capacidad_max ?? 20,
        observaciones_estado: item.observaciones_estado || "",
        activo: item.activo ?? true,
        color: normalizeScrnTransporteColor(item.color),
      };
    });
    setTransportEdits(mapped);
  }, [transportes]);

  useEffect(() => {
    const mapped = {};
    viajes.forEach((item) => {
      mapped[item.id] = viajeDraftFromItem(item);
    });
    setViajeEdits(mapped);
  }, [viajes]);

  const loadSolicitudesReservas = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingReservas(true);

    const [pendRes, accRes, canRes] = await Promise.all([
      supabase
        .from("scrn_reservas")
        .select("*")
        .eq("estado", "pendiente")
        .order("created_at", { ascending: true }),
      supabase
        .from("scrn_reservas")
        .select("*")
        .eq("estado", "aceptada")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("scrn_reservas")
        .select("*")
        .eq("estado", "cancelada")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (pendRes.error) {
      console.error("Error cargando reservas pendientes:", pendRes.error);
    }
    if (accRes.error) {
      console.error("Error cargando reservas aceptadas:", accRes.error);
    }
    if (canRes.error) {
      console.error("Error cargando reservas canceladas:", canRes.error);
    }

    const reservasP = pendRes.data || [];
    const reservasA = accRes.data || [];
    const reservasC = canRes.data || [];
    const reservas = [...reservasP, ...reservasA, ...reservasC];
    const viajeIds = [...new Set(reservas.map((item) => item.id_viaje).filter(Boolean))];
    const userIds = [...new Set(reservas.map((item) => item.id_usuario).filter(Boolean))];
    const reservaIds = reservas.map((item) => item.id);

    const [{ data: viajesData }, { data: paxData, error: paxError }] = await Promise.all([
      viajeIds.length
        ? supabase
            .from("scrn_viajes")
            .select("*, scrn_transportes(*)")
            .in("id", viajeIds)
        : Promise.resolve({ data: [] }),
      reservaIds.length
        ? supabase
            .from("scrn_reserva_pasajeros")
            .select("*")
            .in("id_reserva", reservaIds)
            .order("id", { ascending: true })
        : Promise.resolve({ data: [] }),
    ]);

    const paxPerfilIds = [...new Set((paxData || []).map((row) => row.id_perfil).filter(Boolean))];
    const allPerfilIds = [...new Set([...userIds, ...paxPerfilIds])];
    const { data: perfilesData } = allPerfilIds.length
      ? await supabase.from("scrn_perfiles").select("*").in("id", allPerfilIds)
      : { data: [] };

    if (paxError) {
      console.error("Error cargando pasajeros de reservas:", paxError);
    }

    const perfilesMap = {};
    (perfilesData || []).forEach((item) => {
      perfilesMap[item.id] = item;
    });

    const paxByReserva = {};
    (paxData || []).forEach((row) => {
      if (!paxByReserva[row.id_reserva]) paxByReserva[row.id_reserva] = [];
      paxByReserva[row.id_reserva].push({
        ...row,
        perfil: row.id_perfil ? perfilesMap[row.id_perfil] || null : null,
      });
    });

    const viajesMap = {};
    (viajesData || []).forEach((item) => {
      viajesMap[item.id] = item;
    });

    setPendingReservas(
      mapReservasConDetalle(reservasP, paxByReserva, viajesMap, perfilesMap),
    );
    setAcceptedReservas(
      mapReservasConDetalle(reservasA, paxByReserva, viajesMap, perfilesMap),
    );
    setCancelledReservas(
      mapReservasConDetalle(reservasC, paxByReserva, viajesMap, perfilesMap),
    );

    const propRes = await supabase
      .from("scrn_solicitudes_nuevo_viaje")
      .select("*")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: true });
    if (propRes.error) {
      const miss =
        propRes.error.code === "42P01" ||
        (propRes.error.message || "").includes("does not exist");
      if (!miss) {
        console.error("Error cargando propuestas de nuevo viaje:", propRes.error);
      }
      setPendingPropuestasViaje([]);
    } else {
      const listP = propRes.data || [];
      const uidsP = [...new Set(listP.map((p) => p.id_usuario).filter(Boolean))];
      const { data: profsP } =
        uidsP.length > 0
          ? await supabase.from("scrn_perfiles").select("*").in("id", uidsP)
          : { data: [] };
      const pMap = {};
      (profsP || []).forEach((p) => {
        pMap[p.id] = p;
      });
      setPendingPropuestasViaje(
        listP.map((row) => ({ ...row, perfil: pMap[row.id_usuario] || null })),
      );
    }
    setLoadingReservas(false);
  }, [isAdmin, reloadToken]);

  useEffect(() => {
    loadSolicitudesReservas();
  }, [loadSolicitudesReservas]);

  useEffect(() => {
    if (!isAdmin) return;

    const loadGeneralData = async () => {
      const [uxResult, tiposResult] = await Promise.all([
        supabase
          .from("scrn_perfiles")
          .select("*")
          .order("apellido")
          .order("nombre"),
        supabase
          .from("scrn_tipos_transporte")
          .select("id, nombre, emoji")
          .order("nombre"),
      ]);

      if (uxResult.error) {
        console.error("Error cargando perfiles SCRN:", uxResult.error);
      } else {
        const profiles = uxResult.data || [];
        const sample = profiles[0];
        const hasCol = (key) =>
          !sample || Object.prototype.hasOwnProperty.call(sample, key);
        setUxColumnsAvailable({
          fecha_nacimiento: hasCol("fecha_nacimiento"),
          email: hasCol("email"),
        });
        setUxProfiles(profiles);
        const mappedUx = {};
        profiles.forEach((item) => {
          mappedUx[item.id] = {
            nombre: item.nombre || "",
            apellido: item.apellido || "",
            dni: item.dni || "",
            fecha_nacimiento: item.fecha_nacimiento
              ? String(item.fecha_nacimiento).slice(0, 10)
              : "",
            email: item.email || "",
            cargo: item.cargo || "",
            genero: item.genero || "-",
            es_admin: Boolean(item.es_admin),
          };
        });
        setUxEdits(mappedUx);
      }

      const tiposError = tiposResult?.error;
      const missingEmojiColumn =
        tiposError &&
        (tiposError.code === "42703" || /emoji/i.test(tiposError.message || ""));
      if (missingEmojiColumn) {
        const fallback = await supabase
          .from("scrn_tipos_transporte")
          .select("id, nombre")
          .order("nombre");
        if (!fallback.error) {
          setTiposTableAvailable(true);
          const tipos = fallback.data || [];
          setTiposCatalog(tipos.map((x) => ({ ...x, emoji: "" })));
          const mappedTipos = {};
          tipos.forEach((item) => {
            mappedTipos[item.id] = {
              nombre: item.nombre || "",
              emoji: "",
            };
          });
          setTiposEdits(mappedTipos);
          return;
        }
      }
      const missingTiposTable =
        tiposError &&
        (tiposError.code === "42P01" ||
          tiposError.code === "PGRST205" ||
          /scrn_tipos_transporte/i.test(tiposError.message || ""));

      if (missingTiposTable) {
        setTiposTableAvailable(false);
        setTiposCatalog(
          mergedTipoOptions.map((nombre) => ({
            id: `legacy-${nombre}`,
            nombre,
            emoji: "",
          })),
        );
        setTiposEdits({});
        return;
      }

      if (tiposError) {
        console.error("Error cargando tipos de transporte:", tiposError);
        return;
      }

      setTiposTableAvailable(true);
      const tipos = tiposResult?.data || [];
      setTiposCatalog(tipos);
      const mappedTipos = {};
      tipos.forEach((item) => {
        mappedTipos[item.id] = {
          nombre: item.nombre || "",
          emoji: item.emoji || "",
        };
      });
      setTiposEdits(mappedTipos);
    };

    loadGeneralData();
  }, [isAdmin, reloadToken, mergedTipoOptions]);

  const setDgFilter = (table, key, value) => {
    setDgFilters((prev) => ({
      ...prev,
      [table]: { ...prev[table], [key]: value },
    }));
  };

  const filteredDGLocalidades = useMemo(() => {
    const idQ = dgFilters.localidades.id.trim().toLowerCase();
    const locQ = dgFilters.localidades.localidad.trim().toLowerCase();
    return localidades.filter((item) => {
      const d = localidadesEdits[item.id] || {};
      const idStr = String(item.id);
      const locStr = (d.localidad ?? item.localidad ?? "").toLowerCase();
      if (idQ && !idStr.toLowerCase().includes(idQ)) return false;
      if (locQ && !locStr.includes(locQ)) return false;
      return true;
    });
  }, [localidades, localidadesEdits, dgFilters.localidades]);

  const filteredDGTipos = useMemo(() => {
    const nq = dgFilters.tipos.nombre.trim().toLowerCase();
    const eq = dgFilters.tipos.emoji.trim().toLowerCase();
    return tiposCatalog.filter((item) => {
      const draft = { ...item, ...tiposEdits[item.id] };
      const nombreStr = (draft.nombre || "").toLowerCase();
      const emojiStr = (draft.emoji || "").toLowerCase();
      if (nq && !nombreStr.includes(nq)) return false;
      if (eq && !emojiStr.includes(eq)) return false;
      return true;
    });
  }, [tiposCatalog, tiposEdits, dgFilters.tipos]);

  const filteredDGUx = useMemo(() => {
    const f = dgFilters.ux;
    return uxProfiles.filter((item) => {
      const d = { ...item, ...uxEdits[item.id] };
      const pairs = [
        [f.nombre, (d.nombre || "").toLowerCase()],
        [f.apellido, (d.apellido || "").toLowerCase()],
        [f.dni, (d.dni || "").toLowerCase()],
        [f.fecha_nacimiento, (d.fecha_nacimiento || "").toLowerCase()],
        [f.email, (d.email || "").toLowerCase()],
        [f.cargo, (d.cargo || "").toLowerCase()],
        [f.genero, (d.genero || "").toLowerCase()],
        [f.admin, d.es_admin ? "sí admin" : "no"],
      ];
      for (const [q, hay] of pairs) {
        const qq = (q || "").trim().toLowerCase();
        if (qq && !String(hay).includes(qq)) return false;
      }
      return true;
    });
  }, [uxProfiles, uxEdits, dgFilters.ux]);

  if (!isAdmin) return null;

  const setTransporteField = (field) => (event) => {
    setTransporteForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const updateTransportEdit = (id, field, value) => {
    setTransportEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const updateViajeEdit = (id, field, value) => {
    setViajeEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const createTransporte = async (event) => {
    event.preventDefault();
    const capN = Number(transporteForm.capacidad_max);
    if (!Number.isFinite(capN) || capN < 1) return;
    setSavingTransporte(true);

    const { data: created, error } = await supabase
      .from("scrn_transportes")
      .insert({
        nombre: transporteForm.nombre.trim(),
        tipo: transporteForm.tipo.trim(),
        patente: transporteForm.patente.trim().toUpperCase(),
        localidad_base: transporteForm.localidad_base.trim(),
        capacidad_max: Number(transporteForm.capacidad_max),
        observaciones_estado: transporteForm.observaciones_estado.trim() || null,
        activo: true,
        color: normalizeScrnTransporteColor(transporteForm.color),
      })
      .select("id")
      .single();

    setSavingTransporte(false);
    if (error) {
      alert(`Error creando transporte: ${error.message}`);
      return;
    }
    setTransporteForm(initialTransporteForm);
    setShowNuevoTransporteForm(false);
    onDataChanged?.();
    if (created?.id) void runSyncCalendar(created.id);
  };

  const updateTransporte = async (id) => {
    const draft = transportEdits[id];
    if (!draft) return;
    const capN = Number(draft.capacidad_max || 0);
    if (!Number.isFinite(capN) || capN < 1) return;

    setSavingTransportId(id);
    const { error } = await supabase
      .from("scrn_transportes")
      .update({
        nombre: (draft.nombre || "").trim(),
        tipo: (draft.tipo || "").trim(),
        patente: (draft.patente || "").trim().toUpperCase(),
        localidad_base: (draft.localidad_base || "").trim(),
        capacidad_max: Number(draft.capacidad_max || 0),
        observaciones_estado: (draft.observaciones_estado || "").trim() || null,
        activo: Boolean(draft.activo),
        color: normalizeScrnTransporteColor(draft.color),
      })
      .eq("id", id);
    setSavingTransportId(null);

    if (error) {
      alert(`No se pudo guardar el transporte: ${error.message}`);
      return;
    }
    onDataChanged?.();
    void runSyncCalendar(id);
  };

  const createViaje = async (event) => {
    event.preventDefault();
    if (!viajeForm.origen?.trim() || !viajeForm.destino_final?.trim()) {
      alert("Elegí origen y destino en la lista (con búsqueda).");
      return;
    }
    if (!viajeForm.id_chofer) {
      alert("Seleccioná el chofer del recorrido.");
      return;
    }
    setSavingViaje(true);
    const t =
      viajeForm.id_transporte &&
      transportes.find((x) => String(x.id) === String(viajeForm.id_transporte));
    const { plazas_pasajeros, error: pzErr } = parsePlazasPasajerosFormValue(
      viajeForm.plazas_pasajeros,
      t,
    );
    if (pzErr) {
      alert(pzErr);
      setSavingViaje(false);
      return;
    }
    const payload = {
      id_transporte: Number(viajeForm.id_transporte),
      id_chofer: viajeForm.id_chofer,
      motivo: viajeForm.motivo.trim() || null,
      origen: viajeForm.origen.trim(),
      destino_final: viajeForm.destino_final.trim(),
      fecha_salida: viajeForm.fecha_salida,
      fecha_llegada_estimada: viajeForm.fecha_llegada_estimada,
      fecha_retorno: viajeForm.fecha_retorno || null,
      observaciones: viajeForm.observaciones.trim() || null,
      paquetes_bodega_llena: Boolean(viajeForm.paquetes_bodega_llena),
      plazas_pasajeros,
    };

    const { data: createdViaje, error } = await supabase
      .from("scrn_viajes")
      .insert(payload)
      .select("id")
      .single();
    setSavingViaje(false);
    if (error) {
      alert(`Error creando viaje: ${error.message}`);
      return;
    }
    setViajeForm(initialViajeForm);
    setShowNuevoRecorridoForm(false);
    onDataChanged?.();
    if (createdViaje?.id) {
      void runSyncCalendarByViaje(createdViaje.id);
    }
  };

  const updateViaje = async (id) => {
    const draft = viajeEdits[id];
    if (!draft) return;
    const original = (viajes || []).find((v) => Number(v.id) === Number(id)) || null;
    const newTransporteId = Number(draft.id_transporte);

    setSavingViajeId(id);
    const t = transportes.find((x) => String(x.id) === String(draft.id_transporte));
    const { plazas_pasajeros, error: pzErr } = parsePlazasPasajerosFormValue(
      draft.plazas_pasajeros,
      t,
    );
    if (pzErr) {
      alert(pzErr);
      setSavingViajeId(null);
      return;
    }
    const { error } = await supabase
      .from("scrn_viajes")
      .update({
        id_transporte: newTransporteId,
        id_chofer: draft.id_chofer || null,
        motivo: (draft.motivo || "").trim() || null,
        origen: (draft.origen || "").trim(),
        destino_final: (draft.destino_final || "").trim(),
        fecha_salida: draft.fecha_salida,
        fecha_llegada_estimada: draft.fecha_llegada_estimada,
        fecha_retorno: draft.fecha_retorno || null,
        observaciones: (draft.observaciones || "").trim() || null,
        paquetes_bodega_llena: Boolean(draft.paquetes_bodega_llena),
        plazas_pasajeros,
      })
      .eq("id", id);
    setSavingViajeId(null);

    if (error) {
      alert(`No se pudo guardar el recorrido: ${error.message}`);
      return;
    }
    setEditingViajeId(null);
    onDataChanged?.();
    void runSyncCalendarByViaje(id);
  };

  const cancelEditViaje = (item) => {
    setEditingViajeId(null);
    setViajeEdits((prev) => ({
      ...prev,
      [item.id]: viajeDraftFromItem(item),
    }));
  };

  const isMissingTableError = (err) =>
    err &&
    (err.code === "42P01" || String(err.message || "").toLowerCase().includes("does not exist"));

  const runEliminarRecorridoCompleto = async (rawId) => {
    const id = Number(rawId);
    if (!Number.isFinite(id) || id <= 0) {
      setViajeIdToDelete(null);
      return;
    }
    setEliminandoViajeId(id);
    const { error: ePaq } = await supabase
      .from("scrn_solicitudes_paquete")
      .delete()
      .eq("id_viaje", id);
    if (ePaq && !isMissingTableError(ePaq)) {
      setEliminandoViajeId(null);
      alert(`No se pudo quitar envíos vinculados: ${ePaq.message}`);
      throw new Error("scrn_solicitudes_paquete");
    }
    const { error: eRes } = await supabase.from("scrn_reservas").delete().eq("id_viaje", id);
    if (eRes) {
      setEliminandoViajeId(null);
      alert(`No se pudo quitar reservas: ${eRes.message}`);
      throw new Error("scrn_reservas");
    }
    const { error: eV } = await supabase.from("scrn_viajes").delete().eq("id", id);
    setEliminandoViajeId(null);
    if (eV) {
      alert(`No se pudo eliminar el recorrido: ${eV.message}`);
      throw new Error("scrn_viajes");
    }
    setEditingViajeId((cur) => (Number(cur) === id ? null : cur));
    setOperativoViajeId((cur) => (Number(cur) === id ? null : cur));
    setViajeEdits((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, id)) return prev;
      const n = { ...prev };
      delete n[id];
      return n;
    });
    setSyncStatusByTransport((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, id)) return prev;
      const n = { ...prev };
      delete n[id];
      return n;
    });
    onDataChanged?.();
  };

  const updateLocalidadEdit = (id, value) => {
    setLocalidadesEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), localidad: value },
    }));
  };

  const saveLocalidad = async (id) => {
    const draft = localidadesEdits[id];
    if (!draft) return false;
    setSavingLocalidadId(id);
    const { error } = await supabase
      .from("localidades")
      .update({ localidad: (draft.localidad || "").trim() })
      .eq("id", id);
    setSavingLocalidadId(null);
    if (error) {
      alert(`No se pudo guardar la localidad: ${error.message}`);
      return false;
    }
    onDataChanged?.();
    setDgEditing(null);
    return true;
  };

  const updateTipoEdit = (id, field, value) => {
    setTiposEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const saveTipo = async (id) => {
    if (!tiposTableAvailable) return false;
    const item = tiposCatalog.find((t) => String(t.id) === String(id));
    if (!item || String(id).startsWith("legacy-")) return false;
    const draft = { ...item, ...tiposEdits[id] };
    setSavingTipoId(id);
    const { error } = await supabase
      .from("scrn_tipos_transporte")
      .update({
        nombre: (draft.nombre || "").trim(),
        emoji: (draft.emoji || "").trim() || null,
      })
      .eq("id", id);
    setSavingTipoId(null);
    if (error) {
      alert(`No se pudo guardar el tipo de transporte: ${error.message}`);
      return false;
    }
    onDataChanged?.();
    setDgEditing(null);
    return true;
  };

  const updateUxEdit = (id, field, value) => {
    setUxEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const saveUxProfile = async (id) => {
    const item = uxProfiles.find((p) => String(p.id) === String(id));
    if (!item) return false;
    const draft = { ...item, ...uxEdits[id] };
    const payload = {
      nombre: (draft.nombre || "").trim(),
      apellido: (draft.apellido || "").trim(),
      dni: (draft.dni || "").trim(),
      cargo: (draft.cargo || "").trim() || null,
      genero: (draft.genero || "-").trim(),
      es_admin: Boolean(draft.es_admin),
    };
    if (uxColumnsAvailable.fecha_nacimiento) {
      payload.fecha_nacimiento = (draft.fecha_nacimiento || "").trim() || null;
    }
    if (uxColumnsAvailable.email) {
      payload.email = (draft.email || "").trim() || null;
    }
    setSavingUxId(id);
    const { error } = await supabase
      .from("scrn_perfiles")
      .update(payload)
      .eq("id", id);
    setSavingUxId(null);
    if (error) {
      alert(`No se pudo guardar el perfil de usuario: ${error.message}`);
      return false;
    }
    onDataChanged?.();
    setDgEditing(null);
    return true;
  };

  const createLocalidadDatosG = async (event) => {
    event?.preventDefault();
    const name = dgNuevaLocalidad.trim();
    if (!name) {
      alert("Escribí el nombre de la localidad.");
      return false;
    }
    setDgCreatingLocalidad(true);
    const { error } = await supabase.from("localidades").insert({ localidad: name });
    setDgCreatingLocalidad(false);
    if (error) {
      alert(`No se pudo crear: ${error.message}`);
      return false;
    }
    setDgNuevaLocalidad("");
    onDataChanged?.();
    return true;
  };

  const createTipoDatosG = async (event) => {
    event?.preventDefault();
    if (!tiposTableAvailable) return false;
    const nombre = dgNuevoTipoNombre.trim();
    if (!nombre) {
      alert("Escribí el nombre del tipo.");
      return false;
    }
    setDgCreatingTipo(true);
    const { error } = await supabase
      .from("scrn_tipos_transporte")
      .insert({ nombre, emoji: dgNuevoTipoEmoji.trim() || null });
    setDgCreatingTipo(false);
    if (error) {
      alert(`No se pudo crear: ${error.message}`);
      return false;
    }
    setDgNuevoTipoNombre("");
    setDgNuevoTipoEmoji("");
    onDataChanged?.();
    return true;
  };

  const createPerfilDatosG = async (event) => {
    event?.preventDefault();
    const n = dgNuevoPerfil.nombre.trim();
    const a = dgNuevoPerfil.apellido.trim();
    const d = dgNuevoPerfil.dni.trim();
    const fn = (dgNuevoPerfil.fecha_nacimiento || "").trim();
    const em = (dgNuevoPerfil.email || "").trim();
    if (!n || !a || !em) {
      alert("Nombre, apellido y mail son obligatorios para crear un perfil.");
      return false;
    }
    setDgCreatingPerfil(true);
    const body = {
      email: em,
      nombre: n,
      apellido: a,
      ...(d ? { dni: d } : {}),
      cargo: dgNuevoPerfil.cargo?.trim() || null,
      genero: (dgNuevoPerfil.genero || "-").trim() || "-",
      es_admin: Boolean(dgNuevoPerfil.es_admin),
    };
    if (uxColumnsAvailable.fecha_nacimiento) {
      body.fecha_nacimiento = fn || null;
    }
    const resPerfil = await ensureScrnPerfilForNewEmail(body);
    setDgCreatingPerfil(false);
    if (resPerfil.error) {
      alert(`No se pudo crear el perfil: ${resPerfil.error}`);
      return false;
    }
    setDgNuevoPerfil({
      nombre: "",
      apellido: "",
      dni: "",
      fecha_nacimiento: "",
      email: "",
      cargo: "",
      genero: "-",
      es_admin: false,
    });
    onDataChanged?.();
    return true;
  };

  const resetDatosGDraft = useCallback((kind, id) => {
    if (kind === "localidad") {
      const item = localidades.find((l) => String(l.id) === String(id));
      if (item) {
        setLocalidadesEdits((p) => ({ ...p, [id]: { localidad: item.localidad || "" } }));
      }
    } else if (kind === "tipo") {
      setTiposEdits((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
    } else if (kind === "ux") {
      setUxEdits((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
    }
  }, [localidades]);

  const resetDatosGDraftRef = useRef(resetDatosGDraft);
  resetDatosGDraftRef.current = resetDatosGDraft;

  const onDgPencil = (nextKind, item) => {
    const nextId = String(item.id);
    const isSame = dgEditing?.kind === nextKind && String(dgEditing.id) === nextId;
    if (isSame) {
      resetDatosGDraft(nextKind, nextId);
      setDgEditing(null);
      return;
    }
    if (dgEditing) {
      resetDatosGDraft(dgEditing.kind, dgEditing.id);
    }
    setDgEditing({ kind: nextKind, id: nextId });
  };

  useEffect(() => {
    setDgEditing((e) => {
      if (e) resetDatosGDraftRef.current(e.kind, e.id);
      return null;
    });
  }, [datosGeneralesTab]);

  const runDatosGeneralesDelete = async () => {
    const t = dgDeleteTarget;
    if (!t) return;
    if (t.type === "localidad") {
      const { error } = await supabase.from("localidades").delete().eq("id", t.id);
      if (error) {
        alert(`No se pudo eliminar: ${error.message}`);
        throw new Error("delete-failed");
      }
    } else if (t.type === "tipo") {
      if (String(t.id).startsWith("legacy-")) {
        alert("Este ítem no tiene fila en la base; es solo de catálogo local.");
        throw new Error("legacy");
      }
      const { error } = await supabase.from("scrn_tipos_transporte").delete().eq("id", t.id);
      if (error) {
        alert(`No se pudo eliminar: ${error.message}`);
        throw new Error("delete-failed");
      }
    } else if (t.type === "ux") {
      const { error } = await supabase.from("scrn_perfiles").delete().eq("id", t.id);
      if (error) {
        alert(`No se pudo eliminar: ${error.message}`);
        throw new Error("delete-failed");
      }
    }
    onDataChanged?.();
  };

  const resolveReserva = async (reserva, nextState) => {
    setResolvingId(reserva.id);

    if (nextState === "aceptada") {
      const { data: viajeData } = await supabase
        .from("scrn_viajes")
        .select(
          "id, id_transporte, plazas_pasajeros, scrn_transportes(capacidad_max)",
        )
        .eq("id", reserva.id_viaje)
        .maybeSingle();

      const capacity = cupoPasajerosViaje(viajeData, viajeData?.scrn_transportes);

      const { data: accRows } = await supabase
        .from("scrn_reservas")
        .select("id")
        .eq("id_viaje", reserva.id_viaje)
        .eq("estado", "aceptada");

      const accIds = (accRows || []).map((r) => r.id);
      let used = 0;
      if (accIds.length) {
        const { data: paxRows } = await supabase
          .from("scrn_reserva_pasajeros")
          .select("id_reserva")
          .in("id_reserva", accIds);
        const paxByReserva = {};
        (paxRows || []).forEach((row) => {
          paxByReserva[row.id_reserva] = (paxByReserva[row.id_reserva] || 0) + 1;
        });
        accIds.forEach((rid) => {
          const pax = paxByReserva[rid] || 0;
          used += pax > 0 ? pax : 1;
        });
      }

      const { count: paxPend } = await supabase
        .from("scrn_reserva_pasajeros")
        .select("id", { count: "exact", head: true })
        .eq("id_reserva", reserva.id);

      const need = paxPend && paxPend > 0 ? paxPend : 1;
      if (used + need > capacity) {
        setResolvingId(null);
        alert(
          "No hay plazas suficientes para esta solicitud (se cuentan todas las personas).",
        );
        return;
      }
    }

    const { error } = await supabase
      .from("scrn_reservas")
      .update({ estado: nextState })
      .eq("id", reserva.id);

    setResolvingId(null);
    if (error) {
      alert(`No se pudo actualizar la reserva: ${error.message}`);
      return;
    }

    onDataChanged?.();
  };

  const parsePaxJson = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    }
    return [];
  };

  const fmtAlertaConflicto = (d) =>
    d.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });

  const aprobarSolicitudNuevoViaje = async (s) => {
    if (!s?.id) return;
    setResolviendoPropId(s.id);
    const win = propuestaOcupacionWindowFromForm(
      s.fecha_salida,
      s.fecha_llegada_estimada,
      s.fecha_retorno,
    );
    if (!win) {
      setResolviendoPropId(null);
      alert("Fechas de la propuesta inválidas.");
      return;
    }
    const conflictos = findConflictingViajesForTransporte(
      s.id_transporte,
      win.start,
      win.end,
      viajes,
    );
    if (conflictos.length > 0) {
      setTransporteConflictoMsg(
        buildTransporteOcupadoAlerta(conflictos, fmtAlertaConflicto),
      );
      setResolviendoPropId(null);
      return;
    }
    const tr = transportMap[s.id_transporte];
    const cap = topeTransportePasajeros(tr);
    const paxList = parsePaxJson(s.pasajeros_json);
    const need = 1 + paxList.length;
    if (need > cap) {
      setResolviendoPropId(null);
      alert(
        `Cupo de pasajeros del transporte: ${cap} plazas. Esta propuesta requiere ${need} personas (quien inscribe + el resto).`,
      );
      return;
    }

    const viajePayload = {
      id_transporte: s.id_transporte,
      motivo: s.motivo?.trim() || null,
      origen: (s.origen || "").trim(),
      destino_final: (s.destino_final || "").trim(),
      fecha_salida: s.fecha_salida,
      fecha_llegada_estimada: s.fecha_llegada_estimada,
      fecha_retorno: s.fecha_retorno || null,
      observaciones: s.observaciones?.trim() || null,
    };

    const { data: vRow, error: eV } = await supabase
      .from("scrn_viajes")
      .insert(viajePayload)
      .select("id")
      .single();

    if (eV || !vRow?.id) {
      setResolviendoPropId(null);
      alert(`No se pudo crear el recorrido: ${eV?.message || "error"}`);
      return;
    }

    const { data: rRow, error: eR } = await supabase
      .from("scrn_reservas")
      .insert({
        id_viaje: vRow.id,
        id_usuario: s.id_usuario,
        estado: "aceptada",
        tramo: s.tramo || "ida",
        localidad_subida: (s.localidad_subida || "").trim(),
        obs_subida: s.obs_subida?.trim() || null,
        localidad_bajada: (s.localidad_bajada || "").trim(),
        obs_bajada: s.obs_bajada?.trim() || null,
      })
      .select("id")
      .single();

    if (eR || !rRow?.id) {
      await supabase.from("scrn_viajes").delete().eq("id", vRow.id);
      setResolviendoPropId(null);
      alert(`No se pudo crear la reserva: ${eR?.message || "error"}`);
      return;
    }

    if (paxList.length > 0) {
      const paxRows = paxList.map((p) =>
        p.id_perfil
          ? {
              id_reserva: rRow.id,
              id_perfil: p.id_perfil,
              nombre: null,
              apellido: null,
              email: null,
              estado: "aceptada",
            }
          : {
              id_reserva: rRow.id,
              id_perfil: null,
              nombre: (p.nombre || "").trim() || null,
              apellido: (p.apellido || "").trim() || null,
              email: p.email ? String(p.email).trim() : null,
              estado: "aceptada",
            },
      );
      const { error: eP } = await supabase
        .from("scrn_reserva_pasajeros")
        .insert(paxRows);
      if (eP) {
        await supabase.from("scrn_reservas").delete().eq("id", rRow.id);
        await supabase.from("scrn_viajes").delete().eq("id", vRow.id);
        setResolviendoPropId(null);
        alert(`No se pudieron guardar las demás personas: ${eP.message}`);
        return;
      }
    }

    const { error: eU } = await supabase
      .from("scrn_solicitudes_nuevo_viaje")
      .update({
        estado: "aprobada",
        id_viaje_creado: vRow.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", s.id)
      .eq("estado", "pendiente");

    if (eU) {
      alert(
        `El recorrido y la reserva se crearon, pero no se pudo marcar la propuesta como aprobada: ${eU.message}.`,
      );
    }

    setResolviendoPropId(null);
    onDataChanged?.();
    loadSolicitudesReservas();
    void runSyncCalendarByViaje(vRow.id);
  };

  const runSyncCalendarByViaje = useCallback(async (viajeId) => {
    const id = Number(viajeId);
    if (!Number.isFinite(id) || id <= 0) return;
    setSyncingTransportId(id);
    const res = await syncViajeGoogleCalendar(id);
    const nowIso = new Date().toISOString();
    setSyncStatusByTransport((prev) => ({
      ...prev,
      [id]: res?.ok
        ? {
            ok: true,
            action: res?.data?.action || "updated",
            at: nowIso,
            error: "",
          }
        : {
            ok: false,
            action: "error",
            at: nowIso,
            error: res?.error || "Error de sincronización",
          },
    }));
    setSyncingTransportId(null);
    if (res?.ok) onDataChanged?.();
  }, [onDataChanged]);

  const runSyncCalendar = useCallback(async (transporteId) => {
    const id = Number(transporteId);
    if (!Number.isFinite(id) || id <= 0) return;
    setSyncingTransportId(id);
    const res = await syncTransporteGoogleCalendar(id);
    const nowIso = new Date().toISOString();
    // Sync masivo por transporte (actualiza varios recorridos). El detalle se refleja tras recargar.
    setSyncingTransportId(null);
    if (res?.ok) onDataChanged?.();
  }, [onDataChanged]);

  const syncViajesSinEvento = useCallback(async () => {
    for (const v of viajesSinEventoGC) {
      // secuencial para evitar ráfagas a la edge function
      // eslint-disable-next-line no-await-in-loop
      await runSyncCalendarByViaje(v.id);
    }
  }, [viajesSinEventoGC, runSyncCalendarByViaje]);

  const rechazarSolicitudNuevoViaje = async (s) => {
    if (!s?.id) return;
    setResolviendoPropId(s.id);
    const { error } = await supabase
      .from("scrn_solicitudes_nuevo_viaje")
      .update({ estado: "rechazada", updated_at: new Date().toISOString() })
      .eq("id", s.id)
      .eq("estado", "pendiente");
    setResolviendoPropId(null);
    if (error) {
      alert(`No se pudo rechazar: ${error.message}`);
      return;
    }
    onDataChanged?.();
    loadSolicitudesReservas();
  };

  return (
    <>
    <section className="space-y-4">
      {adminView === "recorridos" && (
        <section className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                Recorridos creados
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void syncViajesSinEvento()}
                  disabled={viajesSinEventoGC.length === 0 || syncingTransportId != null}
                  className="px-3 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-800 text-xs font-bold hover:bg-indigo-100 disabled:opacity-40"
                >
                  Sincronizar faltantes ({viajesSinEventoGC.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVerHistorialRecorridos((v) => !v)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  {verHistorialRecorridos ? "Ocultar historial" : "Ver historial"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNuevoRecorridoForm((v) => !v)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-bold uppercase tracking-wide hover:bg-slate-50"
                >
                  {showNuevoRecorridoForm ? "Cancelar" : "+ Nuevo Recorrido"}
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 -mt-2">
              Un recorrido por fila (también en horizontal). <span className="font-semibold">Editar</span> ajusta
              fechas y ruta; <span className="font-semibold">Reservas, pasajeros y paradas</span> abre
              la tabla de solicitudes (paradas, plazas y personas) de ese recorrido.
            </p>
            <div className="text-[11px] text-slate-600 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              Google Calendar:{" "}
              <span className="font-semibold">{viajesSinEventoGC.length}</span> recorrido(s) sin evento vinculado.
            </div>
            {viajesFiltradosAdmin.length === 0 && (
              <div className="text-sm text-slate-500">No hay recorridos cargados.</div>
            )}
            {viajesFiltradosAdmin.length > 0 && (
              <div className="grid grid-cols-1 gap-3">
                {viajesFiltradosAdmin.map((item) => {
                  const draft = viajeEdits[item.id] || viajeDraftFromItem(item);
                  const isOpen = editingViajeId === item.id;
                  const isOperativo = operativoViajeId === item.id;
                  const ocupadas = plazasOcupadasPorViaje[Number(item.id)] || 0;
                  const transporteRow =
                    transportMap[item.id_transporte] || item.scrn_transportes || null;
                  const cupo = cupoPasajerosViaje(item, transporteRow);
                  const transporteNombre = transporteRow?.nombre || "-";
                  const syncInfo = syncStatusByTransport[Number(item.id)] || null;
                  const hasGoogleEvent = Boolean(
                    String(item?.google_calendar_event_id || "").trim(),
                  );
                  return (
                    <article
                      key={item.id}
                      className={`flex flex-col border border-slate-200 rounded-2xl bg-slate-50/80 overflow-hidden transition-shadow pl-1 ${
                        isOpen || isOperativo
                          ? "bg-white shadow-md ring-1 ring-slate-200/80"
                          : "hover:bg-white hover:shadow-sm"
                      }`}
                      style={scrnTransporteAccentStyle(transporteRow)}
                    >
                      {!isOpen ? (
                        <>
                          <div className="p-3 sm:p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-4">
                              <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-extrabold text-slate-800 leading-snug line-clamp-2">
                                    {item.motivo?.trim() || `Recorrido #${item.id}`}
                                  </div>
                                  <span
                                    className="shrink-0 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700"
                                    title="Ocupación / tope solo de plazas para pasajeros (el chofer no entra en esta cuenta; ya descuenta 1 asiento de la capacidad del vehículo)."
                                  >
                                    {pad2(ocupadas)} pax / {pad2(cupo)}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-600">
                                  <span className="font-semibold text-slate-700">
                                    {item.origen || "—"}
                                  </span>
                                  <span className="text-slate-400 mx-1">→</span>
                                  <span className="font-semibold text-slate-700">
                                    {item.destino_final || "—"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-600">
                                  <span>
                                    <span className="text-slate-400">Salida</span>{" "}
                                    {formatDateTime(item.fecha_salida)}
                                  </span>
                                  <span className="text-slate-300" aria-hidden>
                                    ·
                                  </span>
                                  <span>
                                    <span className="text-slate-400">Llega a origen</span>{" "}
                                    {formatDateTime(item.fecha_llegada_estimada)}
                                  </span>
                                  <span className="text-slate-300" aria-hidden>
                                    ·
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 min-w-0">
                                    <span
                                      className="inline-block h-3.5 w-3.5 rounded border border-slate-300/90 shrink-0"
                                      style={{
                                        backgroundColor: scrnTransporteColorFromEntity(transporteRow),
                                      }}
                                      title={transporteNombre}
                                    />
                                    <span className="font-medium text-slate-800 truncate">
                                      {transporteNombre}
                                    </span>
                                  </span>
                                  <span className="text-slate-300" aria-hidden>
                                    ·
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 flex-wrap">
                                    <span className="text-slate-400">Cal.</span>
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                        hasGoogleEvent
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                          : "border-amber-200 bg-amber-50 text-amber-700"
                                      }`}
                                    >
                                      {hasGoogleEvent ? "Vinculado" : "Sin evento"}
                                    </span>
                                    {syncInfo ? (
                                      <span
                                        className={`text-[10px] ${
                                          syncInfo.ok ? "text-emerald-700" : "text-rose-700"
                                        }`}
                                      >
                                        {syncInfo.ok
                                          ? `Sync ${syncInfo.action} · ${formatDateTime(syncInfo.at)}`
                                          : `Error · ${formatDateTime(syncInfo.at)}`}
                                      </span>
                                    ) : null}
                                  </span>
                                  {item.paquetes_bodega_llena ? (
                                    <>
                                      <span className="text-slate-300" aria-hidden>
                                        ·
                                      </span>
                                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50/90 border border-amber-200/80 rounded px-1.5 py-0.5">
                                        Bodega llena
                                      </span>
                                    </>
                                  ) : null}
                                </div>
                                {syncInfo && !syncInfo.ok && syncInfo.error ? (
                                  <div className="text-[10px] text-rose-700 line-clamp-2">
                                    {syncInfo.error}
                                  </div>
                                ) : null}
                                {item.observaciones?.trim() ? (
                                  <p className="text-[11px] text-slate-500 line-clamp-2 border-t border-slate-200/70 pt-2">
                                    {item.observaciones}
                                  </p>
                                ) : null}
                              </div>
                              <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2 lg:justify-center lg:min-w-[10.5rem]">
                                <button
                                  type="button"
                                  onClick={() => setEditingViajeId(item.id)}
                                  className="w-full sm:flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-800 hover:bg-slate-50 hover:border-slate-400"
                                >
                                  <IconEdit size={16} />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOperativoViajeId(isOperativo ? null : item.id)
                                  }
                                  title="Reservas, pasajeros y paradas"
                                  className={`w-full sm:flex-1 lg:flex-none rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wide ${
                                    isOperativo
                                      ? "border-blue-500 bg-blue-50 text-blue-900"
                                      : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                                  }`}
                                >
                                  {isOperativo
                                    ? "Cerrar reservas y paradas"
                                    : "Reservas y paradas"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void runSyncCalendarByViaje(item.id)}
                                  disabled={syncingTransportId === Number(item.id)}
                                  title="Sincronizar con Google Calendar"
                                  className="w-full sm:flex-1 lg:flex-none rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
                                >
                                  {syncingTransportId === Number(item.id)
                                    ? "Sincronizando…"
                                    : "Calendario"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setViajeIdToDelete(item.id)}
                                  disabled={
                                    eliminandoViajeId === Number(item.id) ||
                                    syncingTransportId === Number(item.id)
                                  }
                                  title="Borrar todo el recorrido (reservas, envíos, pasajeros)"
                                  className="w-full sm:flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-xl border border-rose-300/90 bg-rose-50/90 px-3 py-2 text-xs font-bold uppercase tracking-wide text-rose-900 hover:bg-rose-100/90 disabled:opacity-50"
                                >
                                  <IconTrash size={16} />
                                  {eliminandoViajeId === Number(item.id)
                                    ? "Borrando…"
                                    : "Eliminar recorrido"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 md:p-5 space-y-4">
                          <div className="border-b border-slate-200 pb-3">
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-800">
                                Editar recorrido
                              </h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Recorrido #{item.id} · creado con origen/destino actuales en base de
                                datos
                              </p>
                            </div>
                          </div>
                          <ViajeFormFields
                            values={draft}
                            onFieldChange={(field, value) => updateViajeEdit(item.id, field, value)}
                            localidades={localidades}
                            transportes={transportes}
                            choferOptions={choferOptions}
                            showChoferField
                            fieldIdPrefix={`edit-viaje-${item.id}`}
                          />
                          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-200">
                            <button
                              type="button"
                              onClick={() => cancelEditViaje(item)}
                              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => updateViaje(item.id)}
                              disabled={savingViajeId === item.id}
                              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-sm font-bold"
                            >
                              {savingViajeId === item.id ? "Guardando…" : "Guardar cambios"}
                            </button>
                          </div>
                          <div className="border-t border-slate-200 pt-3">
                            <button
                              type="button"
                              onClick={() =>
                                setOperativoViajeId(isOperativo ? null : item.id)
                              }
                              className={`w-full rounded-xl border px-3 py-2.5 text-xs font-bold uppercase tracking-wide ${
                                isOperativo
                                  ? "border-blue-500 bg-blue-50 text-blue-900"
                                  : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                              }`}
                            >
                              {isOperativo
                                ? "Ocultar reservas, pasajeros y paradas"
                                : "Reservas, pasajeros y paradas"}
                            </button>
                          </div>
                          <div className="border-t border-rose-200/80 pt-3">
                            <button
                              type="button"
                              onClick={() => setViajeIdToDelete(item.id)}
                              disabled={
                                eliminandoViajeId === Number(item.id) ||
                                syncingTransportId === Number(item.id)
                              }
                              className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-300/90 bg-rose-50/90 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-rose-900 hover:bg-rose-100/90 disabled:opacity-50"
                            >
                              <IconTrash size={16} />
                              {eliminandoViajeId === Number(item.id)
                                ? "Borrando recorrido…"
                                : "Eliminar recorrido completo"}
                            </button>
                            <p className="text-[10px] text-rose-800/90 mt-1.5 text-center">
                              Borra reservas, pasajeros y envíos a bodega vinculados a este recorrido. No
                              se puede deshacer.
                            </p>
                          </div>
                        </div>
                      )}
                      {isOperativo && (
                        <div className="px-4 md:px-5 pb-4 w-full min-w-0">
                          <ViajeReservasOperativoPanel
                            viajeId={item.id}
                            localidades={localidades}
                            allProfiles={uxProfiles}
                            onDataChanged={onDataChanged}
                            isAdmin
                            viajeForDefaults={item}
                          />
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {showNuevoRecorridoForm && (
            <form
              className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 space-y-4"
              onSubmit={createViaje}
            >
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                Nuevo recorrido
              </h3>
              <p className="text-xs text-slate-500 -mt-2">
                Transporte, origen, destino, salida y &quot;Llega a Origen&quot; (cuando se libera el
                vehículo) son obligatorios. El retorno (solo vuelta) y las observaciones son opcionales.
              </p>
              <ViajeFormFields
                values={viajeForm}
                onFieldChange={(field, value) =>
                  setViajeForm((prev) => ({ ...prev, [field]: value }))
                }
                localidades={localidades}
                transportes={transportes}
                choferOptions={choferOptions}
                showChoferField
                fieldIdPrefix="nuevo-viaje"
              />
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingViaje}
                  className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-sm font-semibold"
                >
                  {savingViaje ? "Guardando…" : "Crear recorrido"}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {adminView === "datos_generales" && (
        <section className="space-y-3">
          <div className="md:hidden bg-white rounded-2xl border border-slate-200 p-3">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
              Sección de datos generales
            </label>
            <select
              value={datosGeneralesTab}
              onChange={(e) => setDatosGeneralesTab(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="transportes">Transportes</option>
              <option value="localidades">Localidades</option>
              <option value="tipos">Tipos de transporte</option>
              <option value="ux">Usuarios SCRN</option>
            </select>
          </div>

          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { id: "transportes", label: "Transportes", subtitle: "Flota y capacidad" },
              { id: "localidades", label: "Localidades", subtitle: "Catálogo geográfico" },
              { id: "tipos", label: "Tipos de transporte", subtitle: "Tipo + emoji" },
              { id: "ux", label: "Usuarios SCRN", subtitle: "Perfiles y permisos" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDatosGeneralesTab(tab.id)}
                className={`text-left rounded-xl border p-3 transition-colors ${
                  datosGeneralesTab === tab.id
                    ? "border-blue-400 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="text-sm font-extrabold text-slate-800">{tab.label}</div>
                <div className="text-xs text-slate-500">{tab.subtitle}</div>
              </button>
            ))}
          </div>

          {datosGeneralesTab === "transportes" && (
            <section className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">
                    Transportes
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowNuevoTransporteForm((v) => !v)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-bold uppercase tracking-wide hover:bg-slate-50"
                  >
                    {showNuevoTransporteForm ? "Cancelar" : "+ Nuevo Transporte"}
                  </button>
                </div>
                {transportes.length === 0 && (
                  <div className="text-sm text-slate-500">No hay transportes cargados.</div>
                )}
                {transportes.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="text-left px-3 py-2 font-bold">Nombre</th>
                          <th className="text-left px-3 py-2 font-bold">Tipo</th>
                          <th className="text-left px-3 py-2 font-bold">Patente</th>
                          <th className="text-left px-3 py-2 font-bold">Base</th>
                          <th className="text-left px-3 py-2 font-bold" title="Asientos totales">
                            As.
                          </th>
                          <th
                            className="text-left px-3 py-2 font-bold"
                            title="Máx. plazas para pasajeros (capacidad − 1 chofer, sin contar al chofer en esta cifra)"
                          >
                            Pax
                          </th>
                          <th className="text-left px-3 py-2 font-bold">Estado</th>
                          <th className="text-left px-3 py-2 font-bold w-32">Color</th>
                          <th className="text-right px-3 py-2 font-bold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {transportes.map((item) => {
                          const draft = transportEdits[item.id] || {};
                          const isEditing = editingTransportId === item.id;
                          return (
                            <React.Fragment key={item.id}>
                              <tr className="align-middle">
                                <td className="px-3 py-2">
                                  {isEditing ? (
                                    <input
                                      value={draft.nombre || ""}
                                      onChange={(event) =>
                                        updateTransportEdit(item.id, "nombre", event.target.value)
                                      }
                                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                                    />
                                  ) : (
                                    item.nombre || "-"
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {isEditing ? (
                                    <select
                                      value={draft.tipo || ""}
                                      onChange={(event) =>
                                        updateTransportEdit(item.id, "tipo", event.target.value)
                                      }
                                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white"
                                    >
                                      <option value="">Tipo</option>
                                      {mergedTipoOptions.map((opt) => (
                                        <option key={`tipo-edit-${item.id}-${opt}`} value={opt}>
                                          {opt}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    item.tipo || "-"
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {isEditing ? (
                                    <input
                                      value={draft.patente || ""}
                                      onChange={(event) =>
                                        updateTransportEdit(item.id, "patente", event.target.value)
                                      }
                                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                                    />
                                  ) : (
                                    item.patente || "-"
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {isEditing ? (
                                    <select
                                      value={draft.localidad_base || ""}
                                      onChange={(event) =>
                                        updateTransportEdit(
                                          item.id,
                                          "localidad_base",
                                          event.target.value,
                                        )
                                      }
                                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white"
                                    >
                                      <option value="">Localidad base</option>
                                      {localidades.map((loc) => (
                                        <option
                                          key={`loc-base-edit-${item.id}-${loc.id}`}
                                          value={loc.localidad}
                                        >
                                          {loc.localidad}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    item.localidad_base || "-"
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      min={1}
                                      value={draft.capacidad_max ?? 0}
                                      onChange={(event) =>
                                        updateTransportEdit(
                                          item.id,
                                          "capacidad_max",
                                          event.target.value,
                                        )
                                      }
                                      className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                                    />
                                  ) : (
                                    item.capacidad_max ?? "-"
                                  )}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {topeTransportePasajeros(isEditing ? draft : item)}
                                </td>
                                <td className="px-3 py-2">
                                  {isEditing ? (
                                    <select
                                      value={draft.activo ? "1" : "0"}
                                      onChange={(event) =>
                                        updateTransportEdit(
                                          item.id,
                                          "activo",
                                          event.target.value === "1",
                                        )
                                      }
                                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white"
                                    >
                                      <option value="1">Activo</option>
                                      <option value="0">Inactivo</option>
                                    </select>
                                  ) : item.activo ? (
                                    "Activo"
                                  ) : (
                                    "Inactivo"
                                  )}
                                </td>
                                <td className="px-3 py-2 align-middle">
                                  {isEditing ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 min-w-0">
                                      <input
                                        type="color"
                                        value={normalizeScrnTransporteColor(draft.color)}
                                        onChange={(e) => updateTransportEdit(item.id, "color", e.target.value)}
                                        className="h-9 w-14 shrink-0 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                                        title="Color"
                                      />
                                      <input
                                        type="text"
                                        className="w-full min-w-0 sm:w-24 rounded border border-slate-300 px-1.5 py-1 text-[11px] font-mono"
                                        value={draft.color ?? ""}
                                        onChange={(e) => updateTransportEdit(item.id, "color", e.target.value)}
                                        placeholder="#hex"
                                      />
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-2 min-w-0">
                                      <span
                                        className="h-4 w-4 rounded border border-slate-300 shrink-0"
                                        style={{
                                          backgroundColor: scrnTransporteColorFromEntity({
                                            color: item.color,
                                          }),
                                        }}
                                        title={normalizeScrnTransporteColor(item.color)}
                                      />
                                      <span className="text-[10px] font-mono text-slate-500 truncate max-w-[5rem]">
                                        {normalizeScrnTransporteColor(item.color)}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center justify-end gap-2">
                                    {!isEditing ? (
                                      <button
                                        type="button"
                                        onClick={() => setEditingTransportId(item.id)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold uppercase"
                                      >
                                        <IconEdit size={14} />
                                        Editar
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setEditingTransportId(null)}
                                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold uppercase"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            await updateTransporte(item.id);
                                            setEditingTransportId(null);
                                          }}
                                          disabled={savingTransportId === item.id}
                                          className="px-2.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-xs font-bold uppercase"
                                        >
                                          {savingTransportId === item.id
                                            ? "Guardando..."
                                            : "Guardar"}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {isEditing && (
                                <tr className="bg-slate-50">
                                  <td className="px-3 py-2 text-xs font-bold text-slate-500" colSpan={1}>
                                    Observaciones
                                  </td>
                                  <td className="px-3 py-2" colSpan={8}>
                                    <textarea
                                      value={draft.observaciones_estado || ""}
                                      onChange={(event) =>
                                        updateTransportEdit(
                                          item.id,
                                          "observaciones_estado",
                                          event.target.value,
                                        )
                                      }
                                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm min-h-20 bg-white"
                                    />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {showNuevoTransporteForm && (
                <form
                  className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2"
                  onSubmit={createTransporte}
                >
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">
                    Nuevo transporte
                  </h3>
                  <div className="grid md:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Nombre del transporte
                      </label>
                      <input
                        required
                        value={transporteForm.nombre}
                        onChange={setTransporteField("nombre")}
                        placeholder="Ej: Interno 45"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Tipo de transporte
                      </label>
                      <select
                        required
                        value={transporteForm.tipo}
                        onChange={setTransporteField("tipo")}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                      >
                        <option value="">Seleccionar tipo</option>
                        {mergedTipoOptions.map((item) => (
                          <option key={`tipo-new-${item}`} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Patente
                      </label>
                      <input
                        required
                        value={transporteForm.patente}
                        onChange={setTransporteField("patente")}
                        placeholder="AA123BB"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Localidad base
                      </label>
                      <select
                        required
                        value={transporteForm.localidad_base}
                        onChange={setTransporteField("localidad_base")}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                      >
                        <option value="">Seleccionar localidad base</option>
                        {localidades.map((loc) => (
                          <option key={`loc-base-new-${loc.id}`} value={loc.localidad}>
                            {loc.localidad}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Asientos totales (físico)
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={transporteForm.capacidad_max}
                        onChange={setTransporteField("capacidad_max")}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <p className="text-[10px] text-slate-500">
                        El cupo visible para pasajeros se calcula restando 1 lugar fijo para el chofer.
                      </p>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Color (calendario y listas)
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="color"
                          value={normalizeScrnTransporteColor(transporteForm.color)}
                          onChange={setTransporteField("color")}
                          className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                          title="Elegir color"
                        />
                        <input
                          type="text"
                          value={transporteForm.color}
                          onChange={setTransporteField("color")}
                          placeholder="#6366f1"
                          pattern="^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"
                          className="w-28 rounded-lg border border-slate-300 px-2 py-2 text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Observaciones del transporte
                      </label>
                      <textarea
                        value={transporteForm.observaciones_estado}
                        onChange={setTransporteField("observaciones_estado")}
                        placeholder="Estado, notas internas, restricciones, etc."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-20"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={savingTransporte}
                    className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-sm font-semibold"
                  >
                    {savingTransporte ? "Guardando..." : "Crear transporte"}
                  </button>
                </form>
              )}
            </section>
          )}

          {datosGeneralesTab === "localidades" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
              <div className="px-2 py-1.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wide">Localidades</h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                    {filteredDGLocalidades.length} / {localidades.length} filas
                  </span>
                  <button
                    type="button"
                    onClick={() => setDgCreateModal("localidad")}
                    className={DG_DG_ICON}
                    title="Nueva localidad"
                    aria-label="Nueva localidad"
                  >
                    <IconPlus size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 max-h-[min(70vh,720px)] overflow-x-auto overflow-y-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-slate-700 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className={`${DG_COMPACT_TH} text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200`}>
                        ID
                      </th>
                      <th className={`${DG_COMPACT_TH} text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200`}>
                        Localidad
                      </th>
                      <th className={`text-right ${DG_COMPACT_TH} text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200`}>
                        Acciones
                      </th>
                    </tr>
                    <tr className="bg-white">
                      <th className="p-0.5 border-b border-slate-100 align-top">
                        <input
                          type="text"
                          placeholder="Filtrar…"
                          value={dgFilters.localidades.id}
                          onChange={(e) => setDgFilter("localidades", "id", e.target.value)}
                          className={DG_FILTER_INP}
                        />
                      </th>
                      <th className="p-0.5 border-b border-slate-100 align-top">
                        <input
                          type="text"
                          placeholder="Filtrar…"
                          value={dgFilters.localidades.localidad}
                          onChange={(e) => setDgFilter("localidades", "localidad", e.target.value)}
                          className={DG_FILTER_INP}
                        />
                      </th>
                      <th className="p-0.5 border-b border-slate-100 bg-slate-50/50" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredDGLocalidades.map((item) => {
                      const draft = localidadesEdits[item.id] || {};
                      const locEditing =
                        dgEditing?.kind === "localidad" && String(dgEditing.id) === String(item.id);
                      const isLocDirty =
                        (draft.localidad || "").trim() !== (item.localidad || "").trim();
                      return (
                        <tr key={`loc-general-${item.id}`} className="hover:bg-slate-50/80">
                          <td className={`${DG_COMPACT_TD} text-slate-500 tabular-nums`}>{item.id}</td>
                          <td className={DG_COMPACT_TD}>
                            {locEditing ? (
                              <input
                                value={draft.localidad || ""}
                                onChange={(event) => updateLocalidadEdit(item.id, event.target.value)}
                                className={DG_COMPACT_INP}
                              />
                            ) : (
                              <span className="block min-w-0 max-w-xs truncate" title={item.localidad || ""}>
                                {item.localidad || "—"}
                              </span>
                            )}
                          </td>
                          <td className={`${DG_COMPACT_TD} text-right`}>
                            <div className="inline-flex items-center justify-end gap-0.5">
                              <button
                                type="button"
                                onClick={() => onDgPencil("localidad", item)}
                                className={DG_DG_ICON}
                                title={locEditing ? "Cancelar edición" : "Editar"}
                                aria-label={locEditing ? "Cancelar edición" : "Editar"}
                              >
                                <IconPencil size={15} />
                              </button>
                              {locEditing && (
                                <button
                                  type="button"
                                  onClick={() => saveLocalidad(item.id)}
                                  disabled={!isLocDirty || savingLocalidadId === item.id}
                                  className={DG_DG_ICON_PRIMARY}
                                  title="Guardar"
                                  aria-label="Guardar"
                                >
                                  {savingLocalidadId === item.id ? (
                                    <span className="h-3.5 w-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <IconSave size={15} />
                                  )}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setDgDeleteTarget({
                                    type: "localidad",
                                    id: item.id,
                                    label: draft.localidad || item.localidad || `ID ${item.id}`,
                                  })
                                }
                                className={`${DG_DG_ICON} border-rose-200 text-rose-700 hover:bg-rose-50`}
                                title="Eliminar localidad"
                                aria-label="Eliminar"
                              >
                                <IconTrash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredDGLocalidades.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-10 text-center text-slate-400 text-sm">
                          {localidades.length > 0
                            ? "No hay filas que coincidan con el filtro."
                            : "No hay localidades. Tocá + para añadir la primera."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {datosGeneralesTab === "tipos" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
              <div className="px-2 py-1.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wide">Tipos de transporte</h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                    {filteredDGTipos.length} / {tiposCatalog.length} filas
                  </span>
                  {tiposTableAvailable && (
                    <button
                      type="button"
                      onClick={() => setDgCreateModal("tipo")}
                      className={DG_DG_ICON}
                      title="Nuevo tipo"
                      aria-label="Nuevo tipo"
                    >
                      <IconPlus size={16} />
                    </button>
                  )}
                </div>
              </div>
              {!tiposTableAvailable && (
                <div className="m-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                  No existe la tabla `scrn_tipos_transporte`. Ejecuta el SQL que te pasé para habilitar
                  edición centralizada.
                </div>
              )}
              <div className="flex-1 min-h-0 max-h-[min(70vh,720px)] overflow-x-auto overflow-y-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-slate-700 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className={`${DG_COMPACT_TH} text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200`}>
                        Tipo
                      </th>
                      <th className={`${DG_COMPACT_TH} text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200`}>
                        Emoji
                      </th>
                      <th className={`text-right ${DG_COMPACT_TH} text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200`}>
                        Acciones
                      </th>
                    </tr>
                    <tr className="bg-white">
                      <th className="p-0.5 border-b border-slate-100 align-top">
                        <input
                          type="text"
                          placeholder="Filtrar…"
                          value={dgFilters.tipos.nombre}
                          onChange={(e) => setDgFilter("tipos", "nombre", e.target.value)}
                          className={DG_FILTER_INP}
                        />
                      </th>
                      <th className="p-0.5 border-b border-slate-100 align-top">
                        <input
                          type="text"
                          placeholder="Emoji…"
                          value={dgFilters.tipos.emoji}
                          onChange={(e) => setDgFilter("tipos", "emoji", e.target.value)}
                          className={DG_FILTER_INP}
                        />
                      </th>
                      <th className="p-0.5 border-b border-slate-100 bg-slate-50/50" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredDGTipos.map((item) => {
                      const draft = { ...item, ...tiposEdits[item.id] };
                      const isLegacy = String(item.id).startsWith("legacy-");
                      const tipoEditing =
                        !isLegacy &&
                        tiposTableAvailable &&
                        dgEditing?.kind === "tipo" &&
                        String(dgEditing.id) === String(item.id);
                      const isTipoDirty =
                        (draft.nombre || "").trim() !== (item.nombre || "").trim() ||
                        (draft.emoji || "").trim() !== (item.emoji || "").trim();
                      return (
                        <tr key={`tipo-general-${item.id}`} className="hover:bg-slate-50/80">
                          <td className={DG_COMPACT_TD}>
                            {tipoEditing ? (
                              <input
                                value={draft.nombre || ""}
                                onChange={(event) => updateTipoEdit(item.id, "nombre", event.target.value)}
                                disabled={!tiposTableAvailable}
                                className={`${DG_COMPACT_INP} disabled:bg-slate-100`}
                              />
                            ) : (
                              <span className="block min-w-0 max-w-xs truncate" title={item.nombre || ""}>
                                {item.nombre || "—"}
                              </span>
                            )}
                          </td>
                          <td className={DG_COMPACT_TD}>
                            {tipoEditing ? (
                              <DgEmojiField
                                value={draft.emoji || ""}
                                onChange={(next) => updateTipoEdit(item.id, "emoji", next)}
                                disabled={!tiposTableAvailable}
                                className={`${DG_COMPACT_INP} max-w-[6rem] disabled:bg-slate-100`}
                                placeholder="🚐"
                              />
                            ) : (
                              <span className="block min-w-0 max-w-xs truncate" title={item.emoji || ""}>
                                {item.emoji || "—"}
                              </span>
                            )}
                          </td>
                          <td className={`${DG_COMPACT_TD} text-right`}>
                            <div className="inline-flex items-center justify-end gap-0.5">
                              {!isLegacy && tiposTableAvailable && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onDgPencil("tipo", item)}
                                    className={DG_DG_ICON}
                                    title={tipoEditing ? "Cancelar edición" : "Editar"}
                                    aria-label={tipoEditing ? "Cancelar edición" : "Editar"}
                                  >
                                    <IconPencil size={15} />
                                  </button>
                                  {tipoEditing && (
                                    <button
                                      type="button"
                                      onClick={() => saveTipo(item.id)}
                                      disabled={!isTipoDirty || savingTipoId === item.id}
                                      className={DG_DG_ICON_PRIMARY}
                                      title="Guardar"
                                      aria-label="Guardar"
                                    >
                                      {savingTipoId === item.id ? (
                                        <span className="h-3.5 w-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <IconSave size={15} />
                                      )}
                                    </button>
                                  )}
                                </>
                              )}
                              <button
                                type="button"
                                disabled={!tiposTableAvailable || isLegacy}
                                onClick={() =>
                                  setDgDeleteTarget({
                                    type: "tipo",
                                    id: item.id,
                                    label: draft.nombre || item.nombre || "tipo",
                                  })
                                }
                                className={`${DG_DG_ICON} border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed`}
                                title={isLegacy ? "Entrada de catálogo local (sin fila en base)" : "Eliminar tipo"}
                                aria-label="Eliminar"
                              >
                                <IconTrash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredDGTipos.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-10 text-center text-slate-400 text-sm">
                          {tiposCatalog.length > 0
                            ? "No hay filas que coincidan con el filtro."
                            : !tiposTableAvailable
                              ? "Sin tipos: habilitá la tabla en la base o revisá el aviso de arriba."
                              : "No hay tipos. Tocá + para añadir el primero."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {datosGeneralesTab === "ux" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
              <div className="px-2 py-1.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wide">Usuarios SCRN</h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                    {filteredDGUx.length} / {uxProfiles.length} filas
                  </span>
                  <button
                    type="button"
                    onClick={() => setDgCreateModal("ux")}
                    className={DG_DG_ICON}
                    title="Nuevo perfil"
                    aria-label="Nuevo perfil"
                  >
                    <IconPlus size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 max-h-[min(70vh,720px)] overflow-x-auto overflow-y-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-slate-700 sticky top-0 z-10 shadow-sm">
                    <tr>
                      {[
                        "Nombre",
                        "Apellido",
                        "DNI",
                        "F. nac.",
                        "Mail",
                        "Cargo",
                        "Género",
                        "Admin",
                        "Acciones",
                      ].map(
                        (h) => (
                          <th
                            key={h}
                            className={`${
                              h === "Acciones" ? "text-right text-slate-400" : "text-left"
                            } ${DG_COMPACT_TH} text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200 whitespace-nowrap`}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                    <tr className="bg-white">
                      {[
                        "nombre",
                        "apellido",
                        "dni",
                        "fecha_nacimiento",
                        "email",
                        "cargo",
                        "genero",
                        "admin",
                      ].map((k) => (
                        <th key={k} className="p-0.5 border-b border-slate-100 align-top">
                          <input
                            type="text"
                            placeholder="Filtrar…"
                            value={dgFilters.ux[k]}
                            onChange={(e) => setDgFilter("ux", k, e.target.value)}
                            className={DG_FILTER_INP}
                          />
                        </th>
                      ))}
                      <th className="p-0.5 border-b border-slate-100 bg-slate-50/50" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredDGUx.map((item) => {
                      const draft = { ...item, ...uxEdits[item.id] };
                      const uxEditing =
                        dgEditing?.kind === "ux" && String(dgEditing.id) === String(item.id);
                      const isUxDirty =
                        (draft.nombre || "").trim() !== (item.nombre || "").trim() ||
                        (draft.apellido || "").trim() !== (item.apellido || "").trim() ||
                        (draft.dni || "").trim() !== (item.dni || "").trim() ||
                        (draft.fecha_nacimiento || "") !==
                          (item.fecha_nacimiento ? String(item.fecha_nacimiento).slice(0, 10) : "") ||
                        (draft.email || "").trim() !== (item.email || "").trim() ||
                        (draft.cargo || "").trim() !== (item.cargo || "").trim() ||
                        (draft.genero || "-") !== (item.genero || "-") ||
                        Boolean(draft.es_admin) !== Boolean(item.es_admin);
                      const ro = (v) => (
                        <span
                          className="block min-w-0 max-w-[7rem] truncate text-slate-800"
                          title={v != null && String(v) !== "" ? String(v) : undefined}
                        >
                          {v != null && String(v) !== "" ? String(v) : "—"}
                        </span>
                      );
                      return (
                        <tr key={`ux-general-${item.id}`} className="hover:bg-slate-50/80">
                          <td className={DG_COMPACT_TD}>
                            {uxEditing ? (
                              <input
                                value={draft.nombre || ""}
                                onChange={(event) => updateUxEdit(item.id, "nombre", event.target.value)}
                                className={DG_COMPACT_INP}
                              />
                            ) : (
                              ro(item.nombre)
                            )}
                          </td>
                          <td className={DG_COMPACT_TD}>
                            {uxEditing ? (
                              <input
                                value={draft.apellido || ""}
                                onChange={(event) => updateUxEdit(item.id, "apellido", event.target.value)}
                                className={DG_COMPACT_INP}
                              />
                            ) : (
                              ro(item.apellido)
                            )}
                          </td>
                          <td className={DG_COMPACT_TD}>
                            {uxEditing ? (
                              <input
                                value={draft.dni || ""}
                                onChange={(event) => updateUxEdit(item.id, "dni", event.target.value)}
                                className={DG_COMPACT_INP}
                              />
                            ) : (
                              ro(item.dni)
                            )}
                          </td>
                          <td className={DG_COMPACT_TD}>
                            {uxEditing ? (
                              <input
                                type="date"
                                value={
                                  draft.fecha_nacimiento
                                    ? String(draft.fecha_nacimiento).slice(0, 10)
                                    : ""
                                }
                                onChange={(event) =>
                                  updateUxEdit(item.id, "fecha_nacimiento", event.target.value)
                                }
                                className={DG_COMPACT_INP}
                              />
                            ) : (
                              ro(item.fecha_nacimiento ? String(item.fecha_nacimiento).slice(0, 10) : "")
                            )}
                          </td>
                          <td className={DG_COMPACT_TD}>
                            {uxEditing ? (
                              <input
                                type="email"
                                value={draft.email || ""}
                                onChange={(event) => updateUxEdit(item.id, "email", event.target.value)}
                                className={DG_COMPACT_INP}
                              />
                            ) : (
                              ro(item.email)
                            )}
                          </td>
                          <td className={DG_COMPACT_TD}>
                            {uxEditing ? (
                              <input
                                value={draft.cargo || ""}
                                onChange={(event) => updateUxEdit(item.id, "cargo", event.target.value)}
                                className={DG_COMPACT_INP}
                              />
                            ) : (
                              ro(item.cargo)
                            )}
                          </td>
                          <td className={DG_COMPACT_TD}>
                            {uxEditing ? (
                              <select
                                value={draft.genero || "-"}
                                onChange={(event) => updateUxEdit(item.id, "genero", event.target.value)}
                                className={`${DG_COMPACT_INP} max-w-[4rem] bg-white pr-1`}
                              >
                                <option value="M">M</option>
                                <option value="F">F</option>
                                <option value="-">-</option>
                              </select>
                            ) : (
                              ro(item.genero || "-")
                            )}
                          </td>
                          <td className={DG_COMPACT_TD}>
                            {uxEditing ? (
                              <select
                                value={draft.es_admin ? "1" : "0"}
                                onChange={(event) =>
                                  updateUxEdit(item.id, "es_admin", event.target.value === "1")
                                }
                                className={`${DG_COMPACT_INP} max-w-[4rem] bg-white pr-1`}
                              >
                                <option value="0">No</option>
                                <option value="1">Sí</option>
                              </select>
                            ) : (
                              <span className="text-slate-600">{item.es_admin ? "Sí" : "No"}</span>
                            )}
                          </td>
                          <td className={`${DG_COMPACT_TD} text-right`}>
                            <div className="inline-flex items-center justify-end gap-0.5">
                              <button
                                type="button"
                                onClick={() => onDgPencil("ux", item)}
                                className={DG_DG_ICON}
                                title={uxEditing ? "Cancelar edición" : "Editar"}
                                aria-label={uxEditing ? "Cancelar edición" : "Editar"}
                              >
                                <IconPencil size={15} />
                              </button>
                              {uxEditing && (
                                <button
                                  type="button"
                                  onClick={() => saveUxProfile(item.id)}
                                  disabled={!isUxDirty || savingUxId === item.id}
                                  className={DG_DG_ICON_PRIMARY}
                                  title="Guardar"
                                  aria-label="Guardar"
                                >
                                  {savingUxId === item.id ? (
                                    <span className="h-3.5 w-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <IconSave size={15} />
                                  )}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setDgDeleteTarget({
                                    type: "ux",
                                    id: item.id,
                                    label:
                                      `${draft.nombre || ""} ${draft.apellido || ""}`.trim() ||
                                      String(item.id),
                                  })
                                }
                                className={`${DG_DG_ICON} border-rose-200 text-rose-700 hover:bg-rose-50`}
                                title="Eliminar perfil"
                                aria-label="Eliminar"
                              >
                                <IconTrash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredDGUx.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400 text-sm">
                          {uxProfiles.length > 0
                            ? "No hay filas que coincidan con el filtro."
                            : "No hay perfiles. Tocá + para crear uno o al registrarse con OTP."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {dgCreateModal && (
            <div
              className="fixed inset-0 z-[115] flex items-end sm:items-center justify-center p-3 bg-slate-900/40"
              onClick={() => setDgCreateModal(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                    {dgCreateModal === "localidad" && "Nueva localidad"}
                    {dgCreateModal === "tipo" && "Nuevo tipo de transporte"}
                    {dgCreateModal === "ux" && "Nuevo perfil SCRN"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setDgCreateModal(null)}
                    className={DG_DG_ICON}
                    title="Cerrar"
                    aria-label="Cerrar"
                  >
                    <IconX size={16} />
                  </button>
                </div>

                {dgCreateModal === "localidad" && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const ok = await createLocalidadDatosG(e);
                      if (ok) setDgCreateModal(null);
                    }}
                    className="space-y-3"
                  >
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Nombre</label>
                      <input
                        value={dgNuevaLocalidad}
                        onChange={(e) => setDgNuevaLocalidad(e.target.value)}
                        placeholder="Nombre de la localidad"
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDgCreateModal(null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={dgCreatingLocalidad}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold uppercase disabled:bg-slate-300"
                      >
                        {dgCreatingLocalidad ? "Añadiendo…" : "Añadir"}
                      </button>
                    </div>
                  </form>
                )}

                {dgCreateModal === "tipo" && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const ok = await createTipoDatosG(e);
                      if (ok) setDgCreateModal(null);
                    }}
                    className="space-y-3"
                  >
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Nombre del tipo</label>
                      <input
                        value={dgNuevoTipoNombre}
                        onChange={(e) => setDgNuevoTipoNombre(e.target.value)}
                        placeholder="Ej. combi, micro…"
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        autoFocus
                        disabled={!tiposTableAvailable}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Emoji</label>
                      <DgEmojiField
                        value={dgNuevoTipoEmoji}
                        onChange={(next) => setDgNuevoTipoEmoji(next)}
                        placeholder="🚐"
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm min-w-0"
                        disabled={!tiposTableAvailable}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDgCreateModal(null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={dgCreatingTipo || !tiposTableAvailable}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold uppercase disabled:bg-slate-300"
                      >
                        {dgCreatingTipo ? "Añadiendo…" : "Añadir"}
                      </button>
                    </div>
                  </form>
                )}

                {dgCreateModal === "ux" && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const ok = await createPerfilDatosG(e);
                      if (ok) setDgCreateModal(null);
                    }}
                    className="space-y-3"
                  >
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Se crea la cuenta en Auth con este mail y la fila en SCRN (mismo id). Con OTP
                      entra con esa cuenta y ve su perfil.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Nombre</label>
                        <input
                          value={dgNuevoPerfil.nombre}
                          onChange={(e) => setDgNuevoPerfil((p) => ({ ...p, nombre: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Apellido</label>
                        <input
                          value={dgNuevoPerfil.apellido}
                          onChange={(e) => setDgNuevoPerfil((p) => ({ ...p, apellido: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500">
                          DNI (opcional)
                        </label>
                        <input
                          value={dgNuevoPerfil.dni}
                          onChange={(e) => setDgNuevoPerfil((p) => ({ ...p, dni: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500">
                          Fecha de nacimiento (opcional)
                        </label>
                        <input
                          type="date"
                          value={dgNuevoPerfil.fecha_nacimiento}
                          onChange={(e) =>
                            setDgNuevoPerfil((p) => ({
                              ...p,
                              fecha_nacimiento: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Mail</label>
                        <input
                          type="email"
                          value={dgNuevoPerfil.email}
                          onChange={(e) => setDgNuevoPerfil((p) => ({ ...p, email: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                          placeholder="nombre@dominio.com"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Cargo</label>
                        <input
                          value={dgNuevoPerfil.cargo}
                          onChange={(e) => setDgNuevoPerfil((p) => ({ ...p, cargo: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Género</label>
                        <select
                          value={dgNuevoPerfil.genero}
                          onChange={(e) => setDgNuevoPerfil((p) => ({ ...p, genero: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white"
                        >
                          <option value="M">M</option>
                          <option value="F">F</option>
                          <option value="-">-</option>
                        </select>
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Admin</label>
                        <select
                          value={dgNuevoPerfil.es_admin ? "1" : "0"}
                          onChange={(e) =>
                            setDgNuevoPerfil((p) => ({ ...p, es_admin: e.target.value === "1" }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white"
                        >
                          <option value="0">No</option>
                          <option value="1">Sí</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDgCreateModal(null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={dgCreatingPerfil}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold uppercase disabled:bg-slate-300"
                      >
                        {dgCreatingPerfil ? "Creando…" : "Crear perfil"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {adminView === "pendientes" && (
        <div className="space-y-6">
          {adminPendienteSeccion ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onPendienteSeccionChange?.(null)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
              >
                <IconArrowLeft size={14} aria-hidden />
                Menú pendientes
              </button>
            </div>
          ) : null}

          {!adminPendienteSeccion && (
            <div className="mx-auto w-full max-w-5xl space-y-3">
              <p className="text-sm text-slate-500">
                Elegí qué cola de trabajo abrir. Los números indican cuántas solicitudes hay
                pendientes en cada categoría.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <ManagementSectionCard
                  title="Viajes nuevos"
                  subtitle="Propuestas de recorrido"
                  icon={IconFolderPlus}
                  badge={pendienteCounts.viajes}
                  cardClasses="border-amber-100 hover:border-amber-300 hover:shadow-md focus-visible:ring-amber-300"
                  iconClasses="bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white"
                  titleClasses="text-amber-900 group-hover:text-amber-700"
                  onClick={() => onPendienteSeccionChange?.("viajes")}
                />
                <ManagementSectionCard
                  title="Pasajeros"
                  subtitle="Reservas de plaza"
                  icon={IconUsers}
                  badge={pendienteCounts.pasajeros}
                  cardClasses="border-sky-100 hover:border-sky-300 hover:shadow-md focus-visible:ring-sky-300"
                  iconClasses="bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white"
                  titleClasses="text-sky-900 group-hover:text-sky-700"
                  onClick={() => onPendienteSeccionChange?.("pasajeros")}
                />
                <ManagementSectionCard
                  title="Paquetes"
                  subtitle="Envíos y bodega"
                  icon={IconSend}
                  badge={pendienteCounts.paquetes}
                  cardClasses="border-rose-100 hover:border-rose-300 hover:shadow-md focus-visible:ring-rose-300"
                  iconClasses="bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white"
                  titleClasses="text-rose-900 group-hover:text-rose-700"
                  onClick={() => onPendienteSeccionChange?.("paquetes")}
                />
              </div>
            </div>
          )}

          {adminPendienteSeccion === "viajes" && (
            <div className="bg-white rounded-2xl border border-amber-200/80 p-4 space-y-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-amber-900">
              Propuestas de recorrido nuevo
            </h3>
            <p className="text-xs text-slate-500">
              Al aprobar se crea el viaje, la reserva aceptada de quien inscribe y el resto de las
              personas cargadas. Se vuelve a comprobar la disponibilidad del transporte en el horario
              indicado.
            </p>
            {loadingReservas && (
              <div className="text-sm text-slate-500">Cargando propuestas…</div>
            )}
            {!loadingReservas && pendingPropuestasViaje.length === 0 && (
              <div className="text-sm text-slate-500">No hay propuestas de recorrido pendientes.</div>
            )}
            {!loadingReservas &&
              pendingPropuestasViaje.map((sol) => {
                const pax = parsePaxJson(sol.pasajeros_json);
                const plazas = 1 + pax.length;
                const finUso = propuestaOcupacionWindowFromForm(
                  sol.fecha_salida,
                  sol.fecha_llegada_estimada,
                  sol.fecha_retorno,
                )?.end;
                return (
                  <article
                    key={sol.id}
                    className="border border-amber-200/90 rounded-xl p-3 bg-amber-50/50 space-y-2"
                  >
                    <div className="text-sm font-bold text-slate-800">
                      {(sol.perfil?.nombre || "Usuario")} {sol.perfil?.apellido || ""}
                    </div>
                    <div className="text-xs text-slate-600 grid md:grid-cols-2 gap-2">
                      <span>
                        Recorrido: {sol.origen} — {sol.destino_final}
                      </span>
                      <span>
                        <TransporteInlineLabel
                          idTransporte={sol.id_transporte}
                          transportMap={transportMap}
                        />
                      </span>
                      <span>Salida: {formatDateTime(sol.fecha_salida)}</span>
                      <span>
                        Llega a origen (libre): {formatDateTime(finUso || sol.fecha_llegada_estimada)}
                      </span>
                      {sol.motivo ? (
                        <span className="md:col-span-2">Motivo: {sol.motivo}</span>
                      ) : null}
                      <span>Tramo: {sol.tramo}</span>
                      <span>Plazas: {plazas}</span>
                      <span>Subida: {sol.localidad_subida}</span>
                      <span>Bajada: {sol.localidad_bajada}</span>
                    </div>
                    {sol.observaciones ? (
                      <p className="text-[11px] text-slate-500">{sol.observaciones}</p>
                    ) : null}
                    {pax.length > 0 && (
                      <ul className="text-[11px] text-slate-600 list-disc pl-4">
                        {pax.map((p, i) => (
                          <li key={i}>
                            {p.nombre} {p.apellido}
                            {p.email ? ` · ${p.email}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        disabled={resolviendoPropId === sol.id}
                        onClick={() => rechazarSolicitudNuevoViaje(sol)}
                        className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 text-xs font-bold"
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        disabled={resolviendoPropId === sol.id}
                        onClick={() => aprobarSolicitudNuevoViaje(sol)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        {resolviendoPropId === sol.id ? "Procesando…" : "Aprobar y crear recorrido"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {adminPendienteSeccion === "pasajeros" && (
            <>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">
              Solicitudes pendientes
            </h3>

            {loadingReservas && (
              <div className="text-sm text-slate-500">Cargando solicitudes...</div>
            )}

            {!loadingReservas && pendingReservas.length === 0 && (
              <div className="text-sm text-slate-500">No hay solicitudes pendientes.</div>
            )}

            {!loadingReservas &&
              pendingReservas.map((reserva) => {
                const exp = adminGestionPendId === reserva.id;
                const nPax = (reserva.pasajeros || []).length;
                const plazas = 1 + nPax;
                return (
                  <article
                    key={reserva.id}
                    className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2"
                  >
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-800">
                          {(reserva.perfil?.nombre || "Usuario")} {reserva.perfil?.apellido || ""}
                        </div>
                        <div className="text-xs text-slate-500">DNI: {reserva.perfil?.dni || "-"}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-600 uppercase">
                          {reserva.tramo}
                        </span>
                        <button
                          type="button"
                          title={exp ? "Cerrar gestión" : "Editar pasajeros y paradas"}
                          onClick={() =>
                            setAdminGestionPendId(exp ? null : reserva.id)
                          }
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        >
                          {exp ? <IconX size={16} /> : <IconEdit size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 grid md:grid-cols-2 gap-2">
                      <span>
                        Viaje: {reserva.viaje?.origen || "-"} - {reserva.viaje?.destino_final || "-"}
                      </span>
                      <span>Salida: {formatDateTime(reserva.viaje?.fecha_salida)}</span>
                      <span>
                        <TransporteInlineLabel
                          idTransporte={reserva.viaje?.id_transporte}
                          transportMap={transportMap}
                          viaje={reserva.viaje}
                        />
                      </span>
                      <span>Subida: {reserva.localidad_subida}</span>
                      <span>Bajada: {reserva.localidad_bajada}</span>
                    </div>
                    {!exp && (
                      <p className="text-[11px] text-slate-500">
                        {plazas} plazas totales. Pulsá el lápiz para modificar a otras personas o
                        ajustar cupos; las paradas de subida y bajada siguen arriba.
                      </p>
                    )}
                    {exp && (
                      <ReservaPasajerosEditor
                        reserva={reserva}
                        allProfiles={uxProfiles}
                        disabled={resolvingId === reserva.id}
                        onReload={loadSolicitudesReservas}
                      />
                    )}
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        disabled={resolvingId === reserva.id}
                        onClick={() => resolveReserva(reserva, "rechazada")}
                        className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 text-xs font-bold"
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        disabled={resolvingId === reserva.id}
                        onClick={() => resolveReserva(reserva, "aceptada")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        Aceptar
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">
              Reservas aceptadas
            </h3>
            <p className="text-xs text-slate-500">
              Últimas 100 aceptadas. Podés corregir la lista de personas; si sumás o restás
              plazas, comprobá el cupo del recorrido.
            </p>

            {loadingReservas && (
              <div className="text-sm text-slate-500">Cargando reservas...</div>
            )}

            {!loadingReservas && acceptedReservas.length === 0 && (
              <div className="text-sm text-slate-500">Aún no hay reservas aceptadas (o no cargaron).</div>
            )}

            {!loadingReservas &&
              acceptedReservas.map((reserva) => {
                const exp = adminGestionAccId === reserva.id;
                const plazas = 1 + (reserva.pasajeros || []).length;
                return (
                  <article
                    key={reserva.id}
                    className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2"
                  >
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-800">
                          {(reserva.perfil?.nombre || "Usuario")} {reserva.perfil?.apellido || ""}
                        </div>
                        <div className="text-xs text-slate-500">DNI: {reserva.perfil?.dni || "-"}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5">
                          Aceptada
                        </span>
                        <button
                          type="button"
                          title={exp ? "Cerrar gestión" : "Editar pasajeros"}
                          onClick={() =>
                            setAdminGestionAccId(exp ? null : reserva.id)
                          }
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        >
                          {exp ? <IconX size={16} /> : <IconEdit size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 grid md:grid-cols-2 gap-2">
                      <span>
                        Viaje: {reserva.viaje?.origen || "-"} - {reserva.viaje?.destino_final || "-"}
                      </span>
                      <span>Salida: {formatDateTime(reserva.viaje?.fecha_salida)}</span>
                      <span>
                        <TransporteInlineLabel
                          idTransporte={reserva.viaje?.id_transporte}
                          transportMap={transportMap}
                          viaje={reserva.viaje}
                        />
                      </span>
                      <span>Tramo: {reserva.tramo}</span>
                      <span>Subida: {reserva.localidad_subida}</span>
                      <span>Bajada: {reserva.localidad_bajada}</span>
                    </div>
                    {!exp && (
                      <p className="text-[11px] text-slate-500">
                        {plazas} plazas. Pulsá el lápiz para añadir o quitar personas; si cambian
                        las plazas, comprobá el cupo.
                      </p>
                    )}
                    {exp && (
                      <ReservaPasajerosEditor
                        reserva={reserva}
                        allProfiles={uxProfiles}
                        onReload={loadSolicitudesReservas}
                      />
                    )}
                  </article>
                );
              })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">
              Anulaciones solicitadas
            </h3>
            <p className="text-xs text-slate-500">
              El usuario anuló su reservación. Solo lectura. Las últimas 100 cancelaciones.
            </p>
            {loadingReservas && (
              <div className="text-sm text-slate-500">Cargando…</div>
            )}
            {!loadingReservas && cancelledReservas.length === 0 && (
              <div className="text-sm text-slate-500">No hay anulaciones recientes.</div>
            )}
            {!loadingReservas &&
              cancelledReservas.map((reserva) => {
                const pax = reserva.pasajeros || [];
                const plazas = 1 + pax.length;
                return (
                  <article
                    key={reserva.id}
                    className="border border-slate-200 rounded-xl p-3 bg-slate-50/90 space-y-2"
                  >
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-800">
                          {(reserva.perfil?.nombre || "Usuario")} {reserva.perfil?.apellido || ""}
                        </div>
                        <div className="text-xs text-slate-500">DNI: {reserva.perfil?.dni || "-"}</div>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-200 border border-slate-300 rounded-full px-2 py-0.5">
                        Cancelada
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 grid md:grid-cols-2 gap-2">
                      <span>
                        Viaje: {reserva.viaje?.origen || "-"} - {reserva.viaje?.destino_final || "-"}
                      </span>
                      <span>Salida: {formatDateTime(reserva.viaje?.fecha_salida)}</span>
                      <span>Subida: {reserva.localidad_subida}</span>
                      <span>Bajada: {reserva.localidad_bajada}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {plazas} plazas al momento de la anulación.
                      {pax.length > 0 ? (
                        <span>
                          {" "}
                          Otras personas:{" "}
                          {pax
                            .map((a) => paxNombreCompleto(a, null))
                            .filter((s) => s && s !== "—")
                            .join(" · ")}
                        </span>
                      ) : null}
                    </p>
                  </article>
                );
              })}
          </div>
            </>
          )}

          {adminPendienteSeccion === "paquetes" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-sm">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                Paquetes pendientes
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Listado global; podés afinar el estado de cada envío en &quot;Gestión de
                recorridos&quot; → reservas (panel de bodega por recorrido).
              </p>
              <AdminPendientePaquetesList onDataChanged={onDataChanged} />
            </div>
          )}
        </div>
      )}
    </section>
    <ConfirmModal
      isOpen={dgDeleteTarget != null}
      onClose={() => setDgDeleteTarget(null)}
      onConfirm={runDatosGeneralesDelete}
      title={
        dgDeleteTarget?.type === "localidad"
          ? "Eliminar localidad"
          : dgDeleteTarget?.type === "tipo"
            ? "Eliminar tipo de transporte"
            : "Eliminar perfil SCRN"
      }
      message={
        dgDeleteTarget
          ? `¿Seguro de eliminar «${dgDeleteTarget.label}»?${
              dgDeleteTarget.type === "localidad"
                ? " Si otras tablas la referencian, la base puede rechazar el borrado."
                : dgDeleteTarget.type === "ux"
                  ? " No debe haber reservas ni filas vinculadas a este perfil."
                  : ""
            }`
          : ""
      }
      confirmText="Eliminar"
      confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md w-full sm:w-auto"
    />
    <ConfirmModal
      isOpen={viajeIdToDelete != null}
      onClose={() => setViajeIdToDelete(null)}
      onConfirm={() => viajeIdToDelete != null && runEliminarRecorridoCompleto(viajeIdToDelete)}
      title="Eliminar recorrido"
      message={
        viajeIdToDelete != null
          ? "Se van a borrar este recorrido y todo lo vinculado: solicitudes de reserva (incluidas personas añadidas) y envíos a bodega. El evento de Google Calendar deja de apuntar a un registro: si hace falta, sincronizá de nuevo el transporte. Esta acción no se puede deshacer."
          : ""
      }
      confirmText="Eliminar recorrido"
      confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md w-full sm:w-auto"
    />
    <AlertModal
      isOpen={Boolean(transporteConflictoMsg)}
      onClose={() => setTransporteConflictoMsg(null)}
      title="Transporte no disponible en esa franja"
      message={transporteConflictoMsg || ""}
      buttonText="Entendido"
      panelClassName="max-w-lg"
    />
    </>
  );
}
