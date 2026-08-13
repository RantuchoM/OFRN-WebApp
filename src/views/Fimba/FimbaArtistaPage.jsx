import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  IconArrowLeft,
  IconTrash,
  IconLoader,
  IconCopy,
  IconRefresh,
  IconLink,
  IconEye,
  IconEdit,
  IconCheck,
  IconAlertTriangle,
  IconCalendar,
  IconClipboardCheck,
  IconFileExcel,
  IconFileText,
  IconPrinter,
  IconUtensils,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import { useFimbaAccess } from "../../context/FimbaAccessContext";
import { useFimbaUserSession } from "../../hooks/useFimbaUserSession";
import {
  FIMBA_GENEROS,
  FIMBA_GENERO_DEFAULT,
  FIMBA_ALIMENTACION_OTRO,
  FIMBA_TIPOS_ALIMENTACION,
  FIMBA_ARTISTA_COLORS,
  FIMBA_PROPUESTA_ESTADOS,
  computeFimbaCapacity,
  countActiveParticipantes,
  createFimbaParticipante,
  deleteFimbaParticipante,
  fimbaTokenUrl,
  formatFimbaMonto,
  getFimbaEdicionById,
  getFimbaPropuestaById,
  labelFimbaAlimentacion,
  listFimbaContratacionesByPropuesta,
  listFimbaHabitaciones,
  listFimbaParticipantes,
  listHotelesCatalog,
  regenerateFimbaTokens,
  resolveFimbaEstadoActor,
  resolveFimbaTipoAlimentacion,
  updateFimbaContratacion,
  updateFimbaParticipante,
  updateFimbaPropuesta,
} from "../../services/fimbaService";
import { DocumentacionDrivePreview } from "./FimbaDocumentacionDrivePreview";
import { exportFimbaComidasExcel } from "../../utils/fimbaExport";
import FimbaComidasReportModal from "./FimbaComidasReportModal";
import FimbaHoteleriaReports from "./FimbaHoteleriaReports";
import { printFimbaRooming } from "../../utils/fimbaReports";
import FimbaConsultaAgenda from "./FimbaConsultaAgenda";
import {
  AlimentacionInput,
  FimbaAlimentacionStyles,
} from "./FimbaAlimentacionInput";
import {
  EstadoConocidoInput,
  FimbaEstadoConocidoStyles,
} from "./FimbaEstadoConocido";
import FimbaRoomingPanel from "./FimbaRoomingPanel";
import FimbaRichTextEditor from "./FimbaRichTextEditor";
import {
  isFimbaRiderEmpty,
  normalizeFimbaRiderHtml,
  sanitizeFimbaRiderHtml,
} from "../../utils/fimbaRider";

/** Columnas editables en planilla (orden Tab / Enter). */
const EDITABLE_COLS = [
  "apellido",
  "nombre",
  "documento",
  "genero",
  "tipo_alimentacion",
  "nota_alimentacion",
  "activo",
];

const NEW_ROW_KEY = "__new__";

function draftFromParticipante(p) {
  const tipoRaw = p?.tipo_alimentacion || "regular";
  const resolved = resolveFimbaTipoAlimentacion(tipoRaw);
  // Valor desconocido → modo Otros con el texto original en la nota.
  if (tipoRaw && !resolved) {
    return {
      apellido: p?.apellido || "",
      nombre: p?.nombre || "",
      documento: p?.documento || "",
      genero: p?.genero || FIMBA_GENERO_DEFAULT,
      tipo_alimentacion: FIMBA_ALIMENTACION_OTRO,
      nota_alimentacion: p?.nota_alimentacion || tipoRaw,
      activo: p?.activo !== false,
    };
  }
  return {
    apellido: p?.apellido || "",
    nombre: p?.nombre || "",
    documento: p?.documento || "",
    genero: p?.genero || FIMBA_GENERO_DEFAULT,
    tipo_alimentacion: resolved?.value || "regular",
    nota_alimentacion: p?.nota_alimentacion || "",
    activo: p?.activo !== false,
  };
}

function emptyDraft() {
  return draftFromParticipante({});
}

function draftsEqual(a, b) {
  return EDITABLE_COLS.every((k) => {
    if (k === "activo") return asBool(a?.[k]) === asBool(b?.[k]);
    return String(a?.[k] ?? "") === String(b?.[k] ?? "");
  });
}

function labelEstado(value) {
  return FIMBA_PROPUESTA_ESTADOS.find((s) => s.value === value)?.label || value || "—";
}

function asBool(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function formatFecha(f) {
  if (!f) return "—";
  const [y, m, d] = String(f).split("-");
  if (!d) return f;
  return `${d}/${m}/${y}`;
}

function draftFromPropuestaMeta(p) {
  return {
    nombre: p?.nombre || "",
    color: p?.color || FIMBA_ARTISTA_COLORS[0],
    estado: p?.estado || "activa",
    cantidad_planificada: p?.cantidad_planificada ?? 1,
    plazas_extra_materiales: p?.plazas_extra_materiales ?? 0,
    checkin_at: p?.checkin_at ? String(p.checkin_at).slice(0, 10) : "",
    checkin_early: asBool(p?.checkin_early),
    checkout_at: p?.checkout_at ? String(p.checkout_at).slice(0, 10) : "",
    checkout_late: asBool(p?.checkout_late),
    id_hotel: p?.id_hotel != null && p?.id_hotel !== "" ? String(p.id_hotel) : "",
    observaciones_logisticas: p?.observaciones_logisticas || "",
    rider: p?.rider || "",
  };
}

/**
 * Valida meta de propuesta (admin / editor_general).
 * @returns {{ ok: true, patch: object } | { ok: false, error: string }}
 */
function validatePropuestaMetaDraft(draft) {
  const nombre = String(draft.nombre || "").trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio" };

  const planRaw = Number(draft.cantidad_planificada);
  if (!Number.isFinite(planRaw)) {
    return { ok: false, error: "Planificada debe ser un número entre 1 y 200" };
  }
  const plan = Math.round(planRaw);
  if (plan < 1 || plan > 200) {
    return { ok: false, error: "Planificada debe ser entre 1 y 200" };
  }

  const extraRaw = Number(draft.plazas_extra_materiales);
  if (!Number.isFinite(extraRaw) || extraRaw < 0) {
    return { ok: false, error: "Extra equip. debe ser ≥ 0" };
  }
  const extra = Math.round(extraRaw);

  const checkin = draft.checkin_at ? String(draft.checkin_at).slice(0, 10) : "";
  const checkout = draft.checkout_at ? String(draft.checkout_at).slice(0, 10) : "";
  if (checkin && !/^\d{4}-\d{2}-\d{2}$/.test(checkin)) {
    return { ok: false, error: "Check-in: fecha inválida" };
  }
  if (checkout && !/^\d{4}-\d{2}-\d{2}$/.test(checkout)) {
    return { ok: false, error: "Check-out: fecha inválida" };
  }
  if (checkin && checkout && checkout < checkin) {
    return { ok: false, error: "Check-out no puede ser anterior al check-in" };
  }

  const estadoOk = FIMBA_PROPUESTA_ESTADOS.some((s) => s.value === draft.estado);
  if (!estadoOk) return { ok: false, error: "Estado inválido" };

  return {
    ok: true,
    patch: {
      nombre,
      color: draft.color || FIMBA_ARTISTA_COLORS[0],
      estado: draft.estado,
      cantidad_planificada: plan,
      plazas_extra_materiales: extra,
      checkin_at: checkin || null,
      checkout_at: checkout || null,
      checkin_early: asBool(draft.checkin_early),
      checkout_late: asBool(draft.checkout_late),
      id_hotel: draft.id_hotel !== "" && draft.id_hotel != null ? Number(draft.id_hotel) : null,
      observaciones_logisticas: String(draft.observaciones_logisticas || "").trim() || null,
      rider: normalizeFimbaRiderHtml(draft.rider),
    },
  };
}

/** Campos con debounce (texto/número); el resto se guarda casi al instante. */
const META_DEBOUNCE_MS = 500;
const META_IMMEDIATE_FIELDS = new Set([
  "color",
  "estado",
  "id_hotel",
  "checkin_at",
  "checkout_at",
  "checkin_early",
  "checkout_late",
]);

/**
 * Draft incompleto en edición (no thrash de errores ni save).
 * Hard validation (rango, fechas cruzadas) sí puede marcar error.
 */
function isSoftInvalidMetaDraft(draft) {
  if (!String(draft?.nombre || "").trim()) return true;
  if (
    draft?.cantidad_planificada === "" ||
    draft?.cantidad_planificada == null ||
    !Number.isFinite(Number(draft.cantidad_planificada))
  ) {
    return true;
  }
  if (
    draft?.plazas_extra_materiales === "" ||
    draft?.plazas_extra_materiales == null ||
    !Number.isFinite(Number(draft.plazas_extra_materiales))
  ) {
    return true;
  }
  return false;
}

function metaPatchesEqual(a, b) {
  if (!a || !b) return false;
  const keys = [
    "nombre",
    "color",
    "estado",
    "cantidad_planificada",
    "plazas_extra_materiales",
    "checkin_at",
    "checkout_at",
    "checkin_early",
    "checkout_late",
    "id_hotel",
    "observaciones_logisticas",
    "rider",
  ];
  return keys.every((k) => {
    const av = a[k];
    const bv = b[k];
    if (k === "rider") {
      return normalizeFimbaRiderHtml(av) === normalizeFimbaRiderHtml(bv);
    }
    if (av == null && bv == null) return true;
    if (typeof av === "boolean" || typeof bv === "boolean") {
      return asBool(av) === asBool(bv);
    }
    if (typeof av === "number" || typeof bv === "number") {
      return Number(av) === Number(bv);
    }
    return String(av ?? "") === String(bv ?? "");
  });
}


/**
 * @returns {{ ok: true, patch: object } | { ok: false, error?: string, empty?: boolean, incomplete?: boolean }}
 */
function validateParticipanteDraft(draft, { isCreate = false } = {}) {
  const nombre = String(draft.nombre || "").trim();
  const apellido = String(draft.apellido || "").trim();
  const doc = String(draft.documento || "").trim();

  if (isCreate && !nombre && !apellido && !doc) {
    return { ok: false, empty: true };
  }
  // Alta: no marcar error rojo hasta tener ambos campos de identidad (celda-a-celda vía Tab).
  if (isCreate && (!nombre || !apellido)) {
    return { ok: false, incomplete: true };
  }
  if (!apellido) return { ok: false, error: "El apellido es obligatorio" };
  if (!nombre) return { ok: false, error: "El nombre es obligatorio" };

  const genero = draft.genero || FIMBA_GENERO_DEFAULT;
  if (!FIMBA_GENEROS.some((g) => g.value === genero)) {
    return { ok: false, error: "Género inválido" };
  }

  let tipo = draft.tipo_alimentacion || "regular";
  let nota =
    draft.nota_alimentacion != null ? String(draft.nota_alimentacion).trim() : "";
  const resolved = resolveFimbaTipoAlimentacion(tipo);
  if (!resolved) {
    // Defensivo: texto no listado → guardar como Otros + nota.
    nota = nota || String(tipo).trim();
    tipo = FIMBA_ALIMENTACION_OTRO;
  } else {
    tipo = resolved.value;
  }
  if (!FIMBA_TIPOS_ALIMENTACION.some((t) => t.value === tipo)) {
    return { ok: false, error: "Tipo de alimentación inválido" };
  }
  if (tipo !== FIMBA_ALIMENTACION_OTRO) {
    nota = "";
  }

  return {
    ok: true,
    patch: {
      nombre,
      apellido,
      documento: doc || null,
      genero,
      tipo_alimentacion: tipo,
      nota_alimentacion: nota || null,
      activo: draft.activo !== false,
    },
  };
}

function labelAlimentacion(tipo, nota) {
  return labelFimbaAlimentacion(tipo, nota);
}

function labelGenero(value) {
  return FIMBA_GENEROS.find((g) => g.value === value)?.label || value || "—";
}

function statusMeta(status) {
  switch (status) {
    case "saving":
      return { cls: "fimba-sync-saving", title: "Guardando…", label: "Guardando" };
    case "dirty":
      return { cls: "fimba-sync-pending", title: "Cambios pendientes", label: "Pendiente" };
    case "saved":
      return { cls: "fimba-sync-saved", title: "Guardado", label: "Guardado" };
    case "error":
      return { cls: "fimba-sync-error", title: "Error al guardar", label: "Error" };
    default:
      return { cls: "fimba-sync-idle", title: "Sincronizado", label: "" };
  }
}

export default function FimbaArtistaPage({ readOnly = false, propuestaOverride = null, modeLabel }) {
  const { edicionId, artistaId } = useParams();
  const access = useFimbaAccess();
  const effectiveReadOnly = Boolean(readOnly || access.readOnly);
  /** Solo editor_general / OFRN management — nunca consulta ni tokens (canSeeContrataciones). */
  const canSeeFinanzas = Boolean(access.canSeeContrataciones);
  /**
   * Meta administrativa del artista (color, cupos, hotel, estado, obs. log.).
   * Solo OFRN management / editor_general — NO usa !readOnly (tokens /e pueden editar nómina).
   */
  const canEditPropuestaMeta = Boolean(access.canEditPropuestaMeta);
  /** Rider = logística interna: staff ficha (RO consulta); no tokens `/a` `/e` ni `/c`. */
  const showRider = Boolean(access.canSeeRider) && !propuestaOverride;
  const [edicion, setEdicion] = useState(null);
  const [propuesta, setPropuesta] = useState(propuestaOverride);
  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(!propuestaOverride);
  const [error, setError] = useState(null);
  const [tokenMsg, setTokenMsg] = useState(null);
  const [comidasReportOpen, setComidasReportOpen] = useState(false);
  const [hotelReportsOpen, setHotelReportsOpen] = useState(false);

  const propId = propuestaOverride?.id || artistaId;

  const artistaHoteleriaRows = useMemo(() => {
    if (!propuesta) return [];
    return [
      {
        propuesta,
        id_propuesta: propuesta.id,
        hotel: propuesta.hoteles || null,
        checkin_at: propuesta.checkin_at,
        checkout_at: propuesta.checkout_at,
        checkin_early: propuesta.checkin_early,
        checkout_late: propuesta.checkout_late,
        personas: participantes,
        participantes,
        sin_nombre: Math.max(
          0,
          (propuesta.cantidad_planificada || 0) -
            countActiveParticipantes(participantes),
        ),
        habitaciones: [],
      },
    ];
  }, [propuesta, participantes]);

  const edicionLabel =
    edicion?.nombre || propuesta?.nombre || "FIMBA";

  const printArtistaRooming = async () => {
    try {
      const { habitaciones, error: err } = await listFimbaHabitaciones(propId);
      if (err) throw err;
      printFimbaRooming(
        [
          {
            ...artistaHoteleriaRows[0],
            hotel: propuesta?.hoteles || { nombre: "Hotel" },
            habitaciones: habitaciones || [],
          },
        ],
        { edicionNombre: `${edicionLabel} · ${propuesta?.nombre || ""}` },
      );
    } catch (err) {
      setError(err?.message || "No se pudo imprimir rooming");
    }
  };

  const reload = async () => {
    setLoading(true);
    setError(null);
    const tasks = [
      getFimbaPropuestaById(propId),
      listFimbaParticipantes(propId),
    ];
    if (edicionId && !propuestaOverride) {
      tasks.push(getFimbaEdicionById(edicionId));
    }
    const results = await Promise.all(tasks);
    const { propuesta: prop, error: e1 } = results[0];
    const { participantes: parts, error: e2 } = results[1];
    if (e1 || e2) setError((e1 || e2).message || "Error al cargar");
    setPropuesta(prop);
    setParticipantes(parts || []);
    if (results[2]) setEdicion(results[2].edicion);
    setLoading(false);
  };

  useEffect(() => {
    if (propuestaOverride) {
      setPropuesta(propuestaOverride);
      listFimbaParticipantes(propuestaOverride.id).then(({ participantes: parts, error: err }) => {
        if (err) setError(err.message);
        setParticipantes(parts || []);
        setLoading(false);
      });
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propId, edicionId]);

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setTokenMsg(`${label} copiado`);
      setTimeout(() => setTokenMsg(null), 2000);
    } catch {
      setTokenMsg("No se pudo copiar");
    }
  };

  const regen = async (which) => {
    if (
      !window.confirm(
        which.consulta && which.edicion
          ? "¿Regenerar ambos enlaces? Los anteriores dejarán de funcionar."
          : which.consulta
            ? "¿Regenerar enlace de consulta?"
            : "¿Regenerar enlace de edición?",
      )
    ) {
      return;
    }
    const { propuesta: next, error: err } = await regenerateFimbaTokens(propId, which);
    if (err) {
      setError(err.message || "No se pudo regenerar");
      return;
    }
    setPropuesta(next);
    setTokenMsg("Tokens actualizados");
    setTimeout(() => setTokenMsg(null), 2000);
  };

  if (loading) {
    return (
      <div className="fimba-card fimba-muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <IconLoader size={18} className="animate-spin" /> Cargando…
      </div>
    );
  }

  if (!propuesta) {
    return <div className="fimba-error">Artista no encontrado.</div>;
  }

  const cap = computeFimbaCapacity(propuesta);
  const activos = countActiveParticipantes(participantes);
  const overHotel = activos > cap.para_hotel_comida;
  const backHref = edicionId ? `/fimba/edicion/${edicionId}` : "/fimba";
  const hotelNombre = propuesta.hoteles?.nombre || null;
  const edicionNombre =
    propuesta.fimba_ediciones?.nombre || edicion?.nombre || null;

  return (
    <div>
      {!effectiveReadOnly && edicionId && (
        <Link
          to={backHref}
          className="fimba-btn fimba-btn-ghost"
          style={{ textDecoration: "none", marginBottom: 12 }}
        >
          <IconArrowLeft size={14} /> {edicion?.nombre || "Edición"}
        </Link>
      )}

      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            className="fimba-swatch"
            style={{ width: 14, height: 14, background: propuesta.color || "var(--fimba-accent)" }}
          />
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--fimba-deep)" }}>
            {propuesta.nombre}
          </h1>
          {modeLabel && <span className="fimba-badge">{modeLabel}</span>}
          {propuesta.estado && (
            <span className="fimba-badge" title="Estado">
              {labelEstado(propuesta.estado)}
            </span>
          )}
        </div>
        {edicionNombre && effectiveReadOnly && (
          <p className="fimba-muted" style={{ margin: "0.35rem 0 0", fontSize: "0.9rem" }}>
            {edicionNombre}
          </p>
        )}
        <p className="fimba-muted" style={{ margin: "0.4rem 0 0" }}>
          {effectiveReadOnly ? (
            <>
              Planificada: {cap.tope_personas} pax
              {" · "}
              Transporte tope: {cap.para_transporte}
            </>
          ) : (
            <>
              Activos: {activos}/{cap.para_hotel_comida} (hotel/comida)
              {" · "}
              Transporte tope: {cap.para_transporte}
              {overHotel && (
                <span style={{ color: "#b91c1c", fontWeight: 700 }}> · Sobre planificado</span>
              )}
            </>
          )}
        </p>
      </div>

      {error && <div className="fimba-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      <ArtistaMetaSection
        propuesta={propuesta}
        hotelNombre={hotelNombre}
        canEdit={canEditPropuestaMeta}
        showRider={showRider}
        onSaved={(next) => setPropuesta((p) => ({ ...(p || {}), ...(next || {}) }))}
        onError={setError}
      />

      {canSeeFinanzas && (
        <ArtistaFinanzasSection
          propuestaId={propId}
          artistaNombre={propuesta.nombre}
          edicionId={edicionId || propuesta.id_edicion}
          canUploadDocs={canEditPropuestaMeta}
        />
      )}

      {effectiveReadOnly && <FimbaConsultaAgenda propuesta={propuesta} />}

      {!effectiveReadOnly && (
        <FimbaConsultaAgenda propuesta={propuesta} editable />
      )}

      <FimbaRoomingPanel
        propuestaId={propId}
        participantes={participantes}
        readOnly={effectiveReadOnly}
        mode={
          effectiveReadOnly
            ? "readonly"
            : edicionId
              ? "admin"
              : "assign"
        }
        artistaNombre={propuesta.nombre}
        hotelNombre={propuesta.hoteles?.nombre || ""}
        checkinAt={propuesta.checkin_at}
        checkoutAt={propuesta.checkout_at}
        onError={(msg) => setError(msg || "Error de rooming")}
      />

      {!effectiveReadOnly && edicionId && (
        <section className="fimba-card" style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: "1rem", color: "var(--fimba-deep)", display: "flex", alignItems: "center", gap: 6 }}>
              <IconLink size={16} /> Enlaces externos
            </h2>
            {tokenMsg && <span className="fimba-muted" style={{ fontSize: "0.8rem" }}>{tokenMsg}</span>}
          </div>
          <TokenRow
            label="Consulta (solo lectura)"
            url={fimbaTokenUrl("consulta", propuesta.token_consulta)}
            icon={<IconEye size={14} />}
            onCopy={() => copy(fimbaTokenUrl("consulta", propuesta.token_consulta), "Consulta")}
            onRegen={() => regen({ consulta: true, edicion: false })}
          />
          <TokenRow
            label="Edición externa"
            url={fimbaTokenUrl("edicion", propuesta.token_edicion)}
            icon={<IconEdit size={14} />}
            onCopy={() => copy(fimbaTokenUrl("edicion", propuesta.token_edicion), "Edición")}
            onRegen={() => regen({ consulta: false, edicion: true })}
          />
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            style={{ marginTop: 8 }}
            onClick={() => regen({ consulta: true, edicion: true })}
          >
            <IconRefresh size={14} /> Regenerar ambos
          </button>
        </section>
      )}

      <section>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.05rem", color: "var(--fimba-deep)" }}>
            Participantes
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              disabled={!participantes.filter((p) => p.activo !== false).length}
              onClick={() => setComidasReportOpen(true)}
              title="Texto pedido, PDF e Excel de regímenes"
            >
              <IconUtensils size={14} /> Reportes comidas
            </button>
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              disabled={!participantes.filter((p) => p.activo !== false).length}
              onClick={() => setHotelReportsOpen(true)}
              title="Pedido hotel / texto / detalle (este artista)"
            >
              <IconFileText size={14} /> Pedido hotel
            </button>
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              onClick={printArtistaRooming}
              title="Imprimir / PDF habitaciones"
            >
              <IconPrinter size={14} /> Rooming PDF
            </button>
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              disabled={!participantes.filter((p) => p.activo !== false).length}
              onClick={async () => {
                try {
                  await exportFimbaComidasExcel({
                    edicionNombre: edicion?.nombre || propuesta?.nombre || "FIMBA",
                    rows: [
                      {
                        propuesta,
                        personas: participantes,
                        participantes,
                      },
                    ],
                    fileName: `FIMBA_Comidas_${propuesta?.nombre || propId}`,
                  });
                } catch (err) {
                  setError(err?.message || "No se pudo exportar comidas");
                }
              }}
              title="Exportar regímenes de alimentación (Excel)"
            >
              <IconFileExcel size={14} /> Exportar comidas
            </button>
          {!effectiveReadOnly && (
            <span className="fimba-muted" style={{ fontSize: "0.78rem" }}>
              Semáforo:{" "}
              <span className="fimba-sync-legend">
                <i className="fimba-sync-dot fimba-sync-saved" /> guardado
              </span>
              {" · "}
              <span className="fimba-sync-legend">
                <i className="fimba-sync-dot fimba-sync-pending" /> pendiente / guardando
              </span>
              {" · "}
              <span className="fimba-sync-legend">
                <i className="fimba-sync-dot fimba-sync-error" /> error
              </span>
              {" — "}Enter o blur guarda · Tab navega · fila inferior = alta
            </span>
          )}
          </div>
        </div>

        {effectiveReadOnly ? (
          <ParticipantesReadOnlyTable participantes={participantes} />
        ) : (
          <ParticipantesPlanilla
            propuestaId={propId}
            participantes={participantes}
            onListChange={setParticipantes}
            onError={setError}
          />
        )}
      </section>

      <FimbaComidasReportModal
        open={comidasReportOpen}
        onClose={() => setComidasReportOpen(false)}
        hoteleriaRows={artistaHoteleriaRows}
        edicionNombre={`${edicionLabel} · ${propuesta?.nombre || ""}`}
      />
      <FimbaHoteleriaReports
        open={hotelReportsOpen}
        onClose={() => setHotelReportsOpen(false)}
        hoteleriaRows={artistaHoteleriaRows}
        edicionNombre={`${edicionLabel} · ${propuesta?.nombre || ""}`}
      />
    </div>
  );
}

/**
 * Datos generales / meta logística del artista.
 * Editable solo con `canEditPropuestaMeta` (editor_general / OFRN); el resto ve RO.
 * No confundir con `!readOnly` (editores de token /e pueden nómina pero no meta).
 * En edición: autosave debounced + semáforo (idle/dirty/saving/saved/error).
 */
function ArtistaMetaSection({ propuesta, hotelNombre, canEdit, showRider = false, onSaved, onError }) {
  const [draft, setDraft] = useState(() => draftFromPropuestaMeta(propuesta));
  const [hoteles, setHoteles] = useState([]);
  /** idle | dirty | saving | saved | error — mismo semáforo FIMBA que planillas. */
  const [saveStatus, setSaveStatus] = useState("idle");
  const [formError, setFormError] = useState(null);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const lastSavedPatchRef = useRef(null);
  if (lastSavedPatchRef.current == null) {
    const v0 = validatePropuestaMetaDraft(draftFromPropuestaMeta(propuesta));
    lastSavedPatchRef.current = v0.ok ? v0.patch : null;
  }

  const propuestaIdRef = useRef(propuesta?.id);
  const saveTimerRef = useRef(null);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const hotelesRef = useRef(hoteles);
  hotelesRef.current = hoteles;
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Solo resincronizar draft al cambiar de artista (no al eco de onSaved).
  useEffect(() => {
    if (propuesta?.id === propuestaIdRef.current && propuestaIdRef.current != null) {
      return;
    }
    propuestaIdRef.current = propuesta?.id;
    const d = draftFromPropuestaMeta(propuesta);
    setDraft(d);
    draftRef.current = d;
    const v = validatePropuestaMetaDraft(d);
    lastSavedPatchRef.current = v.ok ? v.patch : null;
    setSaveStatus("idle");
    setFormError(null);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, [propuesta]);

  useEffect(() => {
    if (!canEdit) return undefined;
    let cancelled = false;
    listHotelesCatalog().then(({ hoteles: list, error: err }) => {
      if (cancelled) return;
      if (err) {
        // no bloquear form
        return;
      }
      setHoteles(list || []);
    });
    return () => {
      cancelled = true;
    };
  }, [canEdit]);

  // Guardado → idle tras flash verde
  useEffect(() => {
    if (saveStatus !== "saved") return undefined;
    const t = setTimeout(() => {
      setSaveStatus((s) => (s === "saved" ? "idle" : s));
    }, 2200);
    return () => clearTimeout(t);
  }, [saveStatus]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const commitMeta = async () => {
    if (!canEdit || !propuesta?.id) return;
    if (savingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    const current = draftRef.current;
    const validated = validatePropuestaMetaDraft(current);

    if (!validated.ok) {
      if (isSoftInvalidMetaDraft(current)) {
        setSaveStatus("dirty");
        setFormError(null);
      } else {
        setSaveStatus("error");
        setFormError(validated.error);
      }
      return;
    }

    if (metaPatchesEqual(validated.patch, lastSavedPatchRef.current)) {
      setFormError(null);
      setSaveStatus("idle");
      return;
    }

    savingRef.current = true;
    setSaveStatus("saving");
    setFormError(null);

    const { propuesta: updated, error: err } = await updateFimbaPropuesta(
      propuesta.id,
      validated.patch,
    );
    savingRef.current = false;

    if (err) {
      const msg = err.message || "No se pudo guardar";
      setFormError(msg);
      setSaveStatus("error");
      onErrorRef.current?.(msg);
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        void commitMeta();
      }
      return;
    }

    lastSavedPatchRef.current = validated.patch;
    const next = { ...(updated || {}), ...validated.patch };
    if (validated.patch.id_hotel != null) {
      const h = (hotelesRef.current || []).find(
        (x) => Number(x.id) === Number(validated.patch.id_hotel),
      );
      if (h) next.hoteles = h;
    } else {
      next.hoteles = null;
    }
    onSavedRef.current?.(next);

    // Cambios tipados durante el request → re-encolar
    const after = draftRef.current;
    const revalidate = validatePropuestaMetaDraft(after);
    if (
      revalidate.ok &&
      !metaPatchesEqual(revalidate.patch, lastSavedPatchRef.current)
    ) {
      setSaveStatus("dirty");
      pendingSaveRef.current = false;
      void commitMeta();
      return;
    }
    if (pendingSaveRef.current) {
      pendingSaveRef.current = false;
      setSaveStatus("dirty");
      void commitMeta();
      return;
    }

    setSaveStatus("saved");
  };

  const scheduleSave = (delayMs) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (delayMs <= 0) {
      void commitMeta();
      return;
    }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void commitMeta();
    }, delayMs);
  };

  const setField = (field, value) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value };
      draftRef.current = next;
      return next;
    });
    setFormError(null);
    setSaveStatus((prev) => (prev === "saving" ? "saving" : "dirty"));
    const delay = META_IMMEDIATE_FIELDS.has(field) ? 80 : META_DEBOUNCE_MS;
    scheduleSave(delay);
  };

  const flushSave = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void commitMeta();
  };

  const cap = computeFimbaCapacity({
    cantidad_planificada: canEdit ? draft.cantidad_planificada : propuesta.cantidad_planificada,
    plazas_extra_materiales: canEdit ? draft.plazas_extra_materiales : propuesta.plazas_extra_materiales,
  });

  const syncMeta = statusMeta(saveStatus);

  if (!canEdit) {
    return (
      <section className="fimba-card" style={{ marginBottom: "1.25rem" }}>
        <h2
          style={{
            margin: "0 0 10px",
            fontSize: "1rem",
            color: "var(--fimba-deep)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <IconCalendar size={16} /> Datos del artista
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "0.85rem 1.25rem",
          }}
        >
          <div>
            <div className="fimba-label">Estado</div>
            <div style={{ fontWeight: 600 }}>{labelEstado(propuesta.estado)}</div>
          </div>
          <div>
            <div className="fimba-label">Planificada</div>
            <div style={{ fontWeight: 600 }}>{cap.tope_personas} pax</div>
          </div>
          <div>
            <div className="fimba-label">Extra Equip.</div>
            <div style={{ fontWeight: 600 }}>{propuesta.plazas_extra_materiales ?? 0}</div>
          </div>
          <div>
            <div className="fimba-label">Transporte tope</div>
            <div style={{ fontWeight: 600 }}>{cap.para_transporte}</div>
          </div>
          <div>
            <div className="fimba-label">Check-in</div>
            <div style={{ fontWeight: 600 }}>
              {formatFecha(propuesta.checkin_at)}
              {asBool(propuesta.checkin_early) && (
                <span className="fimba-badge" style={{ marginLeft: 6, fontSize: "0.7rem" }}>
                  Early
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="fimba-label">Check-out</div>
            <div style={{ fontWeight: 600 }}>
              {formatFecha(propuesta.checkout_at)}
              {asBool(propuesta.checkout_late) && (
                <span className="fimba-badge" style={{ marginLeft: 6, fontSize: "0.7rem" }}>
                  Late
                </span>
              )}
            </div>
          </div>
          {hotelNombre && (
            <div>
              <div className="fimba-label">Hotel</div>
              <div style={{ fontWeight: 600 }}>{hotelNombre}</div>
            </div>
          )}
        </div>
        {propuesta.observaciones_logisticas ? (
          <div style={{ marginTop: "0.85rem" }}>
            <div className="fimba-label">Observaciones logísticas</div>
            <div style={{ fontWeight: 500, whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>
              {propuesta.observaciones_logisticas}
            </div>
          </div>
        ) : null}
        {showRider ? (
          <div style={{ marginTop: "0.85rem" }}>
            <div className="fimba-label">Rider</div>
            {isFimbaRiderEmpty(propuesta.rider) ? (
              <div className="fimba-muted">Sin rider</div>
            ) : (
              <div
                className="fimba-rider-html"
                dangerouslySetInnerHTML={{
                  __html: sanitizeFimbaRiderHtml(propuesta.rider),
                }}
              />
            )}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="fimba-card" style={{ marginBottom: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "1.05rem",
            color: "var(--fimba-deep)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <IconCalendar size={16} /> Datos generales
        </h2>
        <span
          className={`fimba-sync-legend ${syncMeta.cls}`}
          title={formError || syncMeta.title}
          aria-label={formError || syncMeta.title}
          role="status"
        >
          <i className={`fimba-sync-dot ${syncMeta.cls}`} />
        </span>
      </div>

      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          flushSave();
        }}
      >
        <div className="fimba-field">
          <label className="fimba-label" htmlFor="fimba-artista-nombre">
            Nombre
          </label>
          <input
            id="fimba-artista-nombre"
            className="fimba-input"
            value={draft.nombre}
            onChange={(e) => setField("nombre", e.target.value)}
            onBlur={flushSave}
            required
            autoComplete="off"
          />
        </div>

        <div className="fimba-field">
          <span className="fimba-label">Color</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {FIMBA_ARTISTA_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setField("color", c)}
                title={c}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: c,
                  border: draft.color === c ? "3px solid #222" : "2px solid transparent",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>

        <div className="fimba-grid-2">
          <div className="fimba-field">
            <label className="fimba-label" htmlFor="fimba-artista-planif">
              Cantidad planificada (1–200)
            </label>
            <input
              id="fimba-artista-planif"
              className="fimba-input"
              type="number"
              min={1}
              max={200}
              value={draft.cantidad_planificada}
              onChange={(e) => setField("cantidad_planificada", e.target.value)}
              onBlur={flushSave}
              required
            />
          </div>
          <div className="fimba-field">
            <label className="fimba-label" htmlFor="fimba-artista-extra">
              Extra Equip.
            </label>
            <input
              id="fimba-artista-extra"
              className="fimba-input"
              type="number"
              min={0}
              value={draft.plazas_extra_materiales}
              onChange={(e) => setField("plazas_extra_materiales", e.target.value)}
              onBlur={flushSave}
            />
          </div>
        </div>

        <p className="fimba-muted" style={{ margin: "-0.15rem 0 0.9rem", fontSize: "0.8rem" }}>
          Hotel/comida: {cap.para_hotel_comida} · Transporte: {cap.para_transporte}
          {" "}(extra solo transporte)
        </p>

        <div className="fimba-grid-2">
          <div className="fimba-field">
            <label className="fimba-label" htmlFor="fimba-artista-checkin">
              Check-in (opc.)
            </label>
            <input
              id="fimba-artista-checkin"
              className="fimba-input"
              type="date"
              value={draft.checkin_at || ""}
              onChange={(e) => setField("checkin_at", e.target.value)}
            />
            <label className="fimba-flag-check" style={{ marginTop: 6 }}>
              <input
                type="checkbox"
                checked={asBool(draft.checkin_early)}
                onChange={(e) => setField("checkin_early", e.target.checked)}
              />
              Early check-in
            </label>
          </div>
          <div className="fimba-field">
            <label className="fimba-label" htmlFor="fimba-artista-checkout">
              Check-out (opc.)
            </label>
            <input
              id="fimba-artista-checkout"
              className="fimba-input"
              type="date"
              value={draft.checkout_at || ""}
              onChange={(e) => setField("checkout_at", e.target.value)}
            />
            <label className="fimba-flag-check" style={{ marginTop: 6 }}>
              <input
                type="checkbox"
                checked={asBool(draft.checkout_late)}
                onChange={(e) => setField("checkout_late", e.target.checked)}
              />
              Late check-out
            </label>
          </div>
        </div>

        <div className="fimba-field">
          <label className="fimba-label" htmlFor="fimba-artista-hotel">
            Hotel (opc.)
          </label>
          <select
            id="fimba-artista-hotel"
            className="fimba-select"
            value={draft.id_hotel}
            onChange={(e) => setField("id_hotel", e.target.value)}
          >
            <option value="">— Sin hotel —</option>
            {(hoteles || []).map((h) => (
              <option key={h.id} value={h.id}>
                {h.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="fimba-field">
          <label className="fimba-label" htmlFor="fimba-artista-obs">
            Observaciones logísticas
          </label>
          <textarea
            id="fimba-artista-obs"
            className="fimba-textarea"
            rows={3}
            value={draft.observaciones_logisticas}
            onChange={(e) => setField("observaciones_logisticas", e.target.value)}
            onBlur={flushSave}
            placeholder="Early/late, transfer, equipaje, notas de hotel…"
          />
        </div>

        {showRider ? (
          <div className="fimba-field">
            <span className="fimba-label">Rider</span>
            <FimbaRichTextEditor
              value={draft.rider}
              onChange={(html) => setField("rider", html)}
              onBlur={flushSave}
              placeholder="Escenario, backline, catering, accesos, horarios…"
              edicionId={propuesta?.id_edicion}
              propuestaId={propuesta?.id}
            />
          </div>
        ) : null}

        <div className="fimba-field">
          <label className="fimba-label" htmlFor="fimba-artista-estado">
            Estado
          </label>
          <select
            id="fimba-artista-estado"
            className="fimba-select"
            value={draft.estado}
            onChange={(e) => setField("estado", e.target.value)}
          >
            {FIMBA_PROPUESTA_ESTADOS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {formError && (
          <div className="fimba-error" style={{ marginBottom: 0 }}>
            {formError}
          </div>
        )}
      </form>
    </section>
  );
}

/**
 * Finanzas del artista (contrataciones vinculadas). Solo montar si
 * `canSeeContrataciones` (editor_general / OFRN management).
 * «Último estado» editable con mismo control/presets que la planilla; persiste vía
 * `updateFimbaContratacion` → `appendFimbaContratacionEstado` (denorm + log).
 */
function ArtistaFinanzasSection({
  propuestaId,
  artistaNombre,
  edicionId,
  canUploadDocs = false,
}) {
  const { user, isManagement } = useAuth();
  const fimbaUser = useFimbaUserSession();
  const actor = useMemo(
    () =>
      resolveFimbaEstadoActor({
        ofrnUser: user,
        fimbaUser,
        isOfrnStaff: Boolean(user && isManagement),
      }),
    [user, fimbaUser, isManagement],
  );

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  /** Drafts de estado por id de contratación (string). */
  const [estadoDrafts, setEstadoDrafts] = useState({});
  const [estadoStatus, setEstadoStatus] = useState({});
  const [estadoErrors, setEstadoErrors] = useState({});
  const savingEstadoRef = useRef(new Set());
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const draftsRef = useRef(estadoDrafts);
  draftsRef.current = estadoDrafts;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { contrataciones, error: err } =
        await listFimbaContratacionesByPropuesta(propuestaId);
      if (cancelled) return;
      if (err) {
        setError(err.message || "Error al cargar contrataciones");
        setRows([]);
      } else {
        setRows(contrataciones || []);
        setEstadoDrafts({});
        draftsRef.current = {};
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [propuestaId]);

  useEffect(() => {
    const ids = Object.entries(estadoStatus)
      .filter(([, s]) => s === "saved")
      .map(([id]) => id);
    if (ids.length === 0) return undefined;
    const t = setTimeout(() => {
      setEstadoStatus((prev) => {
        const n = { ...prev };
        for (const id of ids) {
          if (n[id] === "saved") n[id] = "idle";
        }
        return n;
      });
    }, 2200);
    return () => clearTimeout(t);
  }, [estadoStatus]);

  const setEstadoField = (rowId, value) => {
    const k = String(rowId);
    setEstadoDrafts((prev) => {
      const next = { ...prev, [k]: value };
      draftsRef.current = next;
      return next;
    });
    setEstadoStatus((prev) => ({
      ...prev,
      [k]: prev[k] === "saving" ? "saving" : "dirty",
    }));
    setEstadoErrors((prev) => {
      if (!prev[k]) return prev;
      const n = { ...prev };
      delete n[k];
      return n;
    });
  };

  const commitEstado = async (rowId) => {
    const k = String(rowId);
    if (savingEstadoRef.current.has(k)) return;

    const row = (rowsRef.current || []).find((r) => String(r.id) === k);
    if (!row) return;

    const draftRaw = Object.prototype.hasOwnProperty.call(draftsRef.current, k)
      ? draftsRef.current[k]
      : row.ultimo_estado_conocido || "";
    const next = String(draftRaw || "").trim();
    const prev = String(row.ultimo_estado_conocido || "").trim();

    if (next === prev) {
      setEstadoStatus((s) => ({
        ...s,
        [k]: s[k] === "error" ? "error" : "idle",
      }));
      setEstadoDrafts((d) => {
        if (!Object.prototype.hasOwnProperty.call(d, k)) return d;
        const n = { ...d };
        delete n[k];
        draftsRef.current = n;
        return n;
      });
      return;
    }

    savingEstadoRef.current.add(k);
    setEstadoStatus((s) => ({ ...s, [k]: "saving" }));
    setEstadoErrors((e) => {
      if (!e[k]) return e;
      const n = { ...e };
      delete n[k];
      return n;
    });

    const { contratacion: updated, error: err } = await updateFimbaContratacion(
      row.id,
      { ultimo_estado_conocido: next || null },
      { actor },
    );
    savingEstadoRef.current.delete(k);

    if (err) {
      setEstadoStatus((s) => ({ ...s, [k]: "error" }));
      setEstadoErrors((e) => ({
        ...e,
        [k]: err.message || "Error al guardar estado",
      }));
      return;
    }

    setEstadoDrafts((d) => {
      if (!Object.prototype.hasOwnProperty.call(d, k)) return d;
      const n = { ...d };
      delete n[k];
      draftsRef.current = n;
      return n;
    });
    setEstadoStatus((s) => ({ ...s, [k]: "saved" }));
    setRows((list) => {
      const nextList = (list || []).map((r) =>
        String(r.id) === String(updated.id) ? updated : r,
      );
      rowsRef.current = nextList;
      return nextList;
    });
  };

  const planillaHref =
    edicionId != null && edicionId !== ""
      ? `/fimba/edicion/${edicionId}/contrataciones`
      : null;

  return (
    <section className="fimba-card" style={{ marginBottom: "1.25rem" }}>
      <FimbaEstadoConocidoStyles />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "1rem",
            color: "var(--fimba-deep)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <IconClipboardCheck size={16} /> Finanzas / contrataciones
        </h2>
        {planillaHref && (
          <Link
            to={planillaHref}
            className="fimba-btn fimba-btn-ghost"
            style={{ textDecoration: "none", fontSize: "0.8rem" }}
          >
            Ver planilla
          </Link>
        )}
      </div>

      {loading && (
        <div className="fimba-muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <IconLoader size={16} className="animate-spin" /> Cargando…
        </div>
      )}

      {!loading && error && <div className="fimba-error">{error}</div>}

      {!loading && !error && rows.length === 0 && (
        <p className="fimba-muted" style={{ margin: 0 }}>
          Sin contrataciones
        </p>
      )}

      {!loading &&
        !error &&
        rows.map((row, idx) => {
          const nombre =
            String(row.nombre || "").trim() ||
            row.fimba_propuestas?.nombre ||
            artistaNombre ||
            "—";
          const montoLabel = formatFimbaMonto(row.monto);
          const expediente = String(row.numero_expediente || "").trim();
          const tipo = String(row.tipo_contratacion || "").trim();
          const rowKey = String(row.id);
          const estadoVal = Object.prototype.hasOwnProperty.call(estadoDrafts, rowKey)
            ? estadoDrafts[rowKey]
            : row.ultimo_estado_conocido || "";
          const st = estadoStatus[rowKey] || "idle";
          const meta = statusMeta(st);
          const saving = st === "saving";

          return (
            <div
              key={row.id}
              style={{
                marginTop: idx === 0 ? 0 : "1rem",
                paddingTop: idx === 0 ? 0 : "1rem",
                borderTop: idx === 0 ? "none" : "1px solid var(--fimba-border, #e8d4e0)",
              }}
            >
              {rows.length > 1 && (
                <div
                  className="fimba-muted"
                  style={{ fontSize: "0.75rem", marginBottom: 8, fontWeight: 600 }}
                >
                  Contratación {idx + 1}
                  {expediente ? ` · Exp. ${expediente}` : ""}
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: "0.75rem 1.25rem",
                }}
              >
                <div className="fimba-field" style={{ marginBottom: 0 }}>
                  <div className="fimba-label">Nombre</div>
                  <input className="fimba-input" readOnly value={nombre} tabIndex={-1} />
                </div>
                <div className="fimba-field" style={{ marginBottom: 0 }}>
                  <div className="fimba-label">Monto</div>
                  <input
                    className="fimba-input"
                    readOnly
                    value={montoLabel || "—"}
                    tabIndex={-1}
                  />
                </div>
                <div
                  className="fimba-field"
                  style={{ marginBottom: 0, minWidth: "11.5rem", gridColumn: "span 1" }}
                >
                  <div
                    className="fimba-label"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Último estado</span>
                    {meta.label ? (
                      <span
                        className={`fimba-sync-legend ${meta.cls}`}
                        title={meta.title}
                        style={{ fontSize: "0.68rem", fontWeight: 600 }}
                      >
                        <i className={`fimba-sync-dot ${meta.cls}`} /> {meta.label}
                      </span>
                    ) : null}
                  </div>
                  <EstadoConocidoInput
                    value={estadoVal}
                    onChange={(v) => setEstadoField(row.id, v)}
                    onCommit={() => commitEstado(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    disabled={saving}
                    placeholder="Estado personalizado…"
                  />
                  {estadoErrors[rowKey] && (
                    <div className="fimba-error" style={{ marginTop: 4, fontSize: "0.78rem" }}>
                      {estadoErrors[rowKey]}
                    </div>
                  )}
                </div>
                <div className="fimba-field" style={{ marginBottom: 0 }}>
                  <div className="fimba-label">Nº expediente</div>
                  <input
                    className="fimba-input"
                    readOnly
                    value={expediente || "—"}
                    tabIndex={-1}
                  />
                </div>
                <div className="fimba-field" style={{ marginBottom: 0 }}>
                  <div className="fimba-label">Tipo</div>
                  <input
                    className="fimba-input"
                    readOnly
                    value={tipo || "—"}
                    tabIndex={-1}
                  />
                </div>
              </div>
              {String(row.carpeta_documentacion || "").trim() ? (
                <div style={{ marginTop: "0.85rem" }}>
                  <DocumentacionDrivePreview
                    carpetaDocumentacion={row.carpeta_documentacion}
                    canUpload={canUploadDocs}
                  >
                    {({ exploreButton, driveLink }) => (
                      <>
                        <div
                          className="fimba-label"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 6,
                          }}
                        >
                          Documentación (Drive)
                          {rows.length > 1 || nombre ? (
                            <span
                              className="fimba-muted"
                              style={{ fontWeight: 500, fontSize: "0.78rem" }}
                            >
                              · {nombre}
                              {expediente ? ` · Exp. ${expediente}` : ""}
                            </span>
                          ) : null}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          {exploreButton}
                          {driveLink}
                        </div>
                        <p className="fimba-muted" style={{ margin: "6px 0 0", fontSize: "0.75rem" }}>
                          Listado solo al pulsar Explorar. Configurar enlace en planilla
                          Contrataciones (botón carpeta).
                        </p>
                      </>
                    )}
                  </DocumentacionDrivePreview>
                </div>
              ) : (
                <p
                  className="fimba-muted"
                  style={{ margin: "0.75rem 0 0", fontSize: "0.8rem" }}
                >
                  Sin carpeta Drive en esta contratación
                  {planillaHref ? (
                    <>
                      {" "}
                      — configurá en{" "}
                      <Link to={planillaHref} style={{ color: "inherit" }}>
                        planilla
                      </Link>
                      .
                    </>
                  ) : (
                    "."
                  )}
                </p>
              )}
            </div>
          );
        })}
    </section>
  );
}

function TokenRow({ label, url, icon, onCopy, onRegen }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="fimba-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {icon} {label}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input className="fimba-input" readOnly value={url} style={{ fontSize: "0.8rem" }} />
        <button type="button" className="fimba-btn fimba-btn-ghost" onClick={onCopy} title="Copiar">
          <IconCopy size={14} />
        </button>
        <button type="button" className="fimba-btn fimba-btn-ghost" onClick={onRegen} title="Regenerar">
          <IconRefresh size={14} />
        </button>
      </div>
    </div>
  );
}

function ParticipantesReadOnlyTable({ participantes }) {
  if (!participantes?.length) {
    return <div className="fimba-card fimba-muted">Sin participantes cargados.</div>;
  }
  return (
    <div className="fimba-card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="fimba-table">
        <thead>
          <tr>
            <th style={{ paddingLeft: "1rem" }}>Apellido</th>
            <th>Nombre</th>
            <th>Documento</th>
            <th>Género</th>
            <th>Alimentación</th>
            <th>Activo</th>
          </tr>
        </thead>
        <tbody>
          {participantes.map((p) => (
            <tr key={p.id} style={{ opacity: p.activo === false ? 0.5 : 1 }}>
              <td style={{ paddingLeft: "1rem", fontWeight: 600 }}>{p.apellido}</td>
              <td>{p.nombre}</td>
              <td className="fimba-muted">{p.documento || "—"}</td>
              <td>{labelGenero(p.genero)}</td>
              <td>{labelAlimentacion(p.tipo_alimentacion, p.nota_alimentacion)}</td>
              <td>{p.activo === false ? "No" : "Sí"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Planilla Excel de participantes: celdas inline, blur/Enter guarda, semáforo por fila.
 * Fila inferior `__new__` crea en Supabase al completar apellido+nombre.
 */
function ParticipantesPlanilla({ propuestaId, participantes, onListChange, onError }) {
  const [drafts, setDrafts] = useState({});
  const [rowStatus, setRowStatus] = useState({});
  const [rowErrors, setRowErrors] = useState({});
  const savingRef = useRef(new Set());
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const listRef = useRef(participantes);
  listRef.current = participantes;

  // Hidratar drafts: no pisar celdas locales pendientes (mismo criterio que planilla artistas).
  useEffect(() => {
    setDrafts((prev) => {
      const next = { [NEW_ROW_KEY]: prev[NEW_ROW_KEY] ?? emptyDraft() };
      for (const p of participantes || []) {
        const k = String(p.id);
        next[k] = prev[k] ?? draftFromParticipante(p);
      }
      draftsRef.current = next;
      return next;
    });
  }, [participantes]);

  // Flash saved → idle
  useEffect(() => {
    const ids = Object.entries(rowStatus)
      .filter(([, s]) => s === "saved")
      .map(([id]) => id);
    if (ids.length === 0) return undefined;
    const t = setTimeout(() => {
      setRowStatus((prev) => {
        const n = { ...prev };
        for (const id of ids) {
          if (n[id] === "saved") n[id] = "idle";
        }
        return n;
      });
    }, 2200);
    return () => clearTimeout(t);
  }, [rowStatus]);

  const setField = (rowKey, field, value) => {
    setDrafts((prev) => {
      const base =
        prev[rowKey] ||
        (rowKey === NEW_ROW_KEY
          ? emptyDraft()
          : draftFromParticipante(
              (listRef.current || []).find((x) => String(x.id) === String(rowKey)) || {},
            ));
      const nextDraft = { ...base, [field]: value };
      draftsRef.current = { ...prev, [rowKey]: nextDraft };
      return draftsRef.current;
    });
    setRowStatus((prev) => ({
      ...prev,
      [rowKey]: prev[rowKey] === "saving" ? "saving" : "dirty",
    }));
    setRowErrors((prev) => {
      if (!prev[rowKey]) return prev;
      const n = { ...prev };
      delete n[rowKey];
      return n;
    });
  };

  const commitRow = async (rowKey, draftOverride = null) => {
    if (savingRef.current.has(rowKey)) return;

    const isCreate = rowKey === NEW_ROW_KEY;
    const existing = isCreate
      ? null
      : (listRef.current || []).find((x) => String(x.id) === String(rowKey));

    if (!isCreate && !existing) return;

    const draft =
      draftOverride ||
      draftsRef.current[rowKey] ||
      (isCreate ? emptyDraft() : draftFromParticipante(existing));

    if (!isCreate) {
      const baseline = draftFromParticipante(existing);
      if (draftsEqual(draft, baseline)) {
        setRowStatus((prev) => ({
          ...prev,
          [rowKey]: prev[rowKey] === "error" ? "error" : "idle",
        }));
        return;
      }
    }

    const validated = validateParticipanteDraft(draft, { isCreate });
    if (validated.empty) {
      setRowStatus((prev) => ({ ...prev, [rowKey]: "idle" }));
      return;
    }
    if (validated.incomplete) {
      // Sigue dirty / pendiente hasta apellido+nombre
      setRowStatus((prev) => ({
        ...prev,
        [rowKey]: prev[rowKey] === "error" ? "error" : "dirty",
      }));
      return;
    }
    if (!validated.ok) {
      setRowStatus((prev) => ({ ...prev, [rowKey]: "error" }));
      setRowErrors((prev) => ({ ...prev, [rowKey]: validated.error }));
      return;
    }

    savingRef.current.add(rowKey);
    setRowStatus((prev) => ({ ...prev, [rowKey]: "saving" }));
    setRowErrors((prev) => {
      const n = { ...prev };
      delete n[rowKey];
      return n;
    });

    if (isCreate) {
      const { participante: created, error: err } = await createFimbaParticipante({
        id_propuesta: propuestaId,
        ...validated.patch,
      });
      savingRef.current.delete(rowKey);
      if (err) {
        setRowStatus((prev) => ({ ...prev, [rowKey]: "error" }));
        setRowErrors((prev) => ({
          ...prev,
          [rowKey]: err.message || "Error al crear",
        }));
        return;
      }
      setDrafts((prev) => {
        const n = { ...prev, [NEW_ROW_KEY]: emptyDraft() };
        draftsRef.current = n;
        return n;
      });
      setRowStatus((prev) => ({ ...prev, [NEW_ROW_KEY]: "idle" }));
      onListChange((list) => {
        const next = [...(list || []), created].sort((a, b) => {
          const ap = String(a.apellido || "").localeCompare(String(b.apellido || ""), "es");
          if (ap !== 0) return ap;
          return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
        });
        listRef.current = next;
        return next;
      });
      // Flash saved on the new row id briefly via list join — mark create success on empty
      return;
    }

    const { participante: updated, error: err } = await updateFimbaParticipante(
      existing.id,
      validated.patch,
    );
    savingRef.current.delete(rowKey);

    if (err) {
      setRowStatus((prev) => ({ ...prev, [rowKey]: "error" }));
      setRowErrors((prev) => ({
        ...prev,
        [rowKey]: err.message || "Error al guardar",
      }));
      return;
    }

    const nextDraft = draftFromParticipante(updated);
    setDrafts((prev) => {
      const n = { ...prev, [rowKey]: nextDraft };
      draftsRef.current = n;
      return n;
    });
    setRowStatus((prev) => ({ ...prev, [rowKey]: "saved" }));
    onListChange((list) => {
      const next = (list || []).map((p) =>
        String(p.id) === String(updated.id) ? updated : p,
      );
      listRef.current = next;
      return next;
    });
  };

  const applyDraftPatch = (rowKey, patch, { commit = true } = {}) => {
    const existing =
      rowKey === NEW_ROW_KEY
        ? null
        : (listRef.current || []).find((x) => String(x.id) === String(rowKey));
    const base =
      draftsRef.current[rowKey] ||
      (existing ? draftFromParticipante(existing) : emptyDraft());
    const nextDraft = { ...base, ...patch };
    setDrafts((prev) => {
      const n = { ...prev, [rowKey]: nextDraft };
      draftsRef.current = n;
      return n;
    });
    setRowStatus((prev) => ({ ...prev, [rowKey]: "dirty" }));
    setRowErrors((prev) => {
      if (!prev[rowKey]) return prev;
      const n = { ...prev };
      delete n[rowKey];
      return n;
    });
    if (commit) commitRow(rowKey, nextDraft);
  };

  const changeAndCommit = (rowKey, field, value) => {
    applyDraftPatch(rowKey, { [field]: value }, { commit: true });
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`¿Eliminar a ${p.apellido}, ${p.nombre}?`)) return;
    const { error: err } = await deleteFimbaParticipante(p.id);
    if (err) {
      onError?.(err.message || "No se pudo eliminar");
      return;
    }
    const k = String(p.id);
    setDrafts((prev) => {
      const n = { ...prev };
      delete n[k];
      draftsRef.current = n;
      return n;
    });
    setRowStatus((prev) => {
      const n = { ...prev };
      delete n[k];
      return n;
    });
    setRowErrors((prev) => {
      const n = { ...prev };
      delete n[k];
      return n;
    });
    onListChange((list) => {
      const next = (list || []).filter((x) => String(x.id) !== k);
      listRef.current = next;
      return next;
    });
  };

  const focusCell = (rowIdx, colIdx) => {
    const el = document.querySelector(`[data-fimba-part-cell="${rowIdx}-${colIdx}"]`);
    if (el && typeof el.focus === "function") el.focus();
  };

  const rows = participantes || [];
  const totalRows = rows.length + 1; // + new row

  const handleCellKeyDown = (e, rowIdx, colIdx, rowKey) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      commitRow(rowKey).then(() => {
        const nextRow = Math.min(rowIdx + 1, totalRows - 1);
        focusCell(nextRow, colIdx);
      });
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (rowKey === NEW_ROW_KEY) {
        setDrafts((prev) => {
          const n = { ...prev, [NEW_ROW_KEY]: emptyDraft() };
          draftsRef.current = n;
          return n;
        });
      } else {
        const p = rows[rowIdx];
        if (p) {
          setDrafts((prev) => {
            const n = { ...prev, [rowKey]: draftFromParticipante(p) };
            draftsRef.current = n;
            return n;
          });
        }
      }
      setRowStatus((prev) => ({ ...prev, [rowKey]: "idle" }));
      setRowErrors((prev) => {
        const n = { ...prev };
        delete n[rowKey];
        return n;
      });
      e.target.blur();
    }
  };

  const colCount = 8; // sync + 6 data + actions

  const renderRow = (rowKey, rowIdx, draft, { isNew = false } = {}) => {
    const status = rowStatus[rowKey] || "idle";
    const meta = statusMeta(status);
    const rowCls =
      status === "saving"
        ? "fimba-row-saving"
        : status === "saved"
          ? "fimba-row-saved"
          : status === "dirty"
            ? "fimba-row-dirty"
            : status === "error"
              ? "fimba-row-error"
              : "";
    const inactive = !isNew && draft.activo === false;

    return (
      <React.Fragment key={rowKey}>
        <tr className={rowCls} style={inactive ? { opacity: 0.65 } : undefined}>
          <td className={`fimba-sync-col ${meta.cls}`} title={rowErrors[rowKey] || meta.title}>
            <span className={`fimba-sync-dot ${meta.cls}`} aria-hidden />
            {status === "saving" && (
              <IconLoader size={10} className="animate-spin fimba-sync-icon" />
            )}
            {status === "saved" && <IconCheck size={10} className="fimba-sync-icon" />}
            {status === "error" && (
              <IconAlertTriangle size={10} className="fimba-sync-icon" />
            )}
          </td>
          <td>
            <input
              data-fimba-part-cell={`${rowIdx}-0`}
              className="fimba-cell-input"
              placeholder={isNew ? "Apellido…" : undefined}
              value={draft.apellido}
              onChange={(e) => setField(rowKey, "apellido", e.target.value)}
              onBlur={() => commitRow(rowKey)}
              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 0, rowKey)}
              disabled={status === "saving"}
            />
          </td>
          <td>
            <input
              data-fimba-part-cell={`${rowIdx}-1`}
              className="fimba-cell-input"
              placeholder={isNew ? "Nombre…" : undefined}
              value={draft.nombre}
              onChange={(e) => setField(rowKey, "nombre", e.target.value)}
              onBlur={() => commitRow(rowKey)}
              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 1, rowKey)}
              disabled={status === "saving"}
            />
          </td>
          <td>
            <input
              data-fimba-part-cell={`${rowIdx}-2`}
              className="fimba-cell-input"
              placeholder={isNew ? "Documento…" : undefined}
              value={draft.documento}
              onChange={(e) => setField(rowKey, "documento", e.target.value)}
              onBlur={() => commitRow(rowKey)}
              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 2, rowKey)}
              disabled={status === "saving"}
            />
          </td>
          <td>
            <select
              data-fimba-part-cell={`${rowIdx}-3`}
              className="fimba-cell-input"
              value={draft.genero || FIMBA_GENERO_DEFAULT}
              onChange={(e) => changeAndCommit(rowKey, "genero", e.target.value)}
              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 3, rowKey)}
              disabled={status === "saving"}
            >
              {FIMBA_GENEROS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </td>
          <td className="fimba-ali-cell">
            <AlimentacionInput
              tipo={draft.tipo_alimentacion || "regular"}
              nota={draft.nota_alimentacion || ""}
              selectDataAttr={`${rowIdx}-4`}
              onChange={(patch) =>
                applyDraftPatch(rowKey, patch, { commit: false })
              }
              onCommit={() => commitRow(rowKey)}
              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 4, rowKey)}
              disabled={status === "saving"}
            />
          </td>
          <td style={{ textAlign: "center" }}>
            <input
              data-fimba-part-cell={`${rowIdx}-5`}
              type="checkbox"
              checked={asBool(draft.activo)}
              onChange={(e) => changeAndCommit(rowKey, "activo", e.target.checked)}
              disabled={status === "saving"}
              title="Activo"
              aria-label="Activo"
            />
          </td>
          <td style={{ textAlign: "right", paddingRight: "0.75rem", whiteSpace: "nowrap" }}>
            {!isNew && (
              <button
                type="button"
                className="fimba-btn fimba-btn-danger"
                onClick={() => {
                  const p = rows.find((x) => String(x.id) === String(rowKey));
                  if (p) handleDelete(p);
                }}
                title="Eliminar"
                disabled={status === "saving"}
              >
                <IconTrash size={14} />
              </button>
            )}
          </td>
        </tr>
        {rowErrors[rowKey] && (
          <tr className="fimba-row-error-msg">
            <td colSpan={colCount} className="fimba-cell-error-msg">
              {rowErrors[rowKey]}
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const newDraft = drafts[NEW_ROW_KEY] || emptyDraft();

  return (
    <div className="fimba-card" style={{ padding: 0, overflow: "auto" }}>
      {/* Estilos del select+input "Otros..." (antes solo en finanzas → no aplicaban a la planilla). */}
      <FimbaAlimentacionStyles />
      <table className="fimba-table fimba-table-edit">
        <thead>
          <tr>
            <th className="fimba-sync-col" title="Semáforo" />
            <th style={{ paddingLeft: "0.5rem" }}>Apellido</th>
            <th>Nombre</th>
            <th>Documento</th>
            <th>Género</th>
            <th className="fimba-ali-cell">Alimentación</th>
            <th style={{ textAlign: "center" }}>Activo</th>
            <th className="fimba-col-actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((p, rowIdx) => {
            const rowKey = String(p.id);
            const draft = drafts[rowKey] || draftFromParticipante(p);
            return renderRow(rowKey, rowIdx, draft);
          })}
          {renderRow(NEW_ROW_KEY, rows.length, newDraft, { isNew: true })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="fimba-muted" style={{ padding: "0.5rem 1rem 0.85rem", fontSize: "0.8rem" }}>
          Escribí apellido y nombre en la fila vacía para dar de alta el primer participante.
        </div>
      )}
    </div>
  );
}
