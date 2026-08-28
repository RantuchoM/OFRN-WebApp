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
  regenerateFimbaTokens,
  resolveFimbaEstadoActor,
  resolveFimbaTipoAlimentacion,
  updateFimbaContratacion,
  updateFimbaParticipante,
} from "../../services/fimbaService";
import { resolveParticipanteStay } from "../../utils/fimbaStay";
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
import FimbaArtistaMetaSection from "./FimbaArtistaMetaSection";
import FimbaRoomingPanel from "./FimbaRoomingPanel";

/** Columnas editables en planilla (orden Tab / Enter). */
const EDITABLE_COLS = [
  "apellido",
  "nombre",
  "documento",
  "genero",
  "checkin_at",
  "checkout_at",
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
      checkin_at: p?.checkin_at ? String(p.checkin_at).slice(0, 10) : "",
      checkout_at: p?.checkout_at ? String(p.checkout_at).slice(0, 10) : "",
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
    checkin_at: p?.checkin_at ? String(p.checkin_at).slice(0, 10) : "",
    checkout_at: p?.checkout_at ? String(p.checkout_at).slice(0, 10) : "",
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

function asBool(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function formatFecha(f) {
  if (!f) return "—";
  const [y, m, d] = String(f).split("-");
  if (!d) return f;
  return `${d}/${m}/${y}`;
}

function labelEstado(value) {
  return FIMBA_PROPUESTA_ESTADOS.find((s) => s.value === value)?.label || value || "—";
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

  const checkin = draft.checkin_at ? String(draft.checkin_at).slice(0, 10) : "";
  const checkout = draft.checkout_at ? String(draft.checkout_at).slice(0, 10) : "";
  if (checkin && checkout && checkout < checkin) {
    return { ok: false, error: "El check-out no puede ser anterior al check-in" };
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
      checkin_at: checkin || null,
      checkout_at: checkout || null,
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
        requiere_hotel: propuesta.requiere_hotel !== false,
        requiere_comidas: propuesta.requiere_comidas !== false,
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
    if (propuesta?.requiere_hotel === false) {
      setError("Este artista no requiere hotelería (excluido de rooming).");
      return;
    }
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

      <FimbaArtistaMetaSection
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
              disabled={
                !participantes.filter((p) => p.activo !== false).length ||
                propuesta?.requiere_comidas === false
              }
              onClick={() => setComidasReportOpen(true)}
              title={
                propuesta?.requiere_comidas === false
                  ? "Artista sin comidas"
                  : "Texto pedido, PDF e Excel de regímenes"
              }
            >
              <IconUtensils size={14} /> Reportes comidas
            </button>
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              disabled={
                !participantes.filter((p) => p.activo !== false).length ||
                propuesta?.requiere_hotel === false
              }
              onClick={() => setHotelReportsOpen(true)}
              title={
                propuesta?.requiere_hotel === false
                  ? "Artista sin hotelería"
                  : "Pedido hotel / texto / detalle (este artista)"
              }
            >
              <IconFileText size={14} /> Pedido hotel
            </button>
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              disabled={propuesta?.requiere_hotel === false}
              onClick={printArtistaRooming}
              title={
                propuesta?.requiere_hotel === false
                  ? "Artista sin hotelería"
                  : "Imprimir / PDF habitaciones"
              }
            >
              <IconPrinter size={14} /> Rooming PDF
            </button>
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              disabled={
                !participantes.filter((p) => p.activo !== false).length ||
                propuesta?.requiere_comidas === false
              }
              onClick={async () => {
                try {
                  await exportFimbaComidasExcel({
                    edicionNombre: edicion?.nombre || propuesta?.nombre || "FIMBA",
                    rows: [
                      {
                        propuesta,
                        personas: participantes,
                        participantes,
                        requiere_comidas: propuesta?.requiere_comidas !== false,
                        checkin_at: propuesta?.checkin_at,
                        checkout_at: propuesta?.checkout_at,
                        checkin_early: propuesta?.checkin_early,
                        checkout_late: propuesta?.checkout_late,
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
              {" · "}Check-in/out vacíos = fechas del artista
            </span>
          )}
          </div>
        </div>

        {effectiveReadOnly ? (
          <ParticipantesReadOnlyTable
            participantes={participantes}
            propuesta={propuesta}
          />
        ) : (
          <ParticipantesPlanilla
            propuestaId={propId}
            propuesta={propuesta}
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

function ParticipantesReadOnlyTable({ participantes, propuesta }) {
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
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Alimentación</th>
            <th>Activo</th>
          </tr>
        </thead>
        <tbody>
          {participantes.map((p) => {
            const stay = resolveParticipanteStay(p, propuesta);
            return (
              <tr key={p.id} style={{ opacity: p.activo === false ? 0.5 : 1 }}>
                <td style={{ paddingLeft: "1rem", fontWeight: 600 }}>{p.apellido}</td>
                <td>{p.nombre}</td>
                <td className="fimba-muted">{p.documento || "—"}</td>
                <td>{labelGenero(p.genero)}</td>
                <td
                  className={stay.inherited_checkin ? "fimba-muted" : undefined}
                  title={stay.inherited_checkin ? "Fecha del artista" : "Fecha propia"}
                >
                  {formatFecha(stay.checkin_at)}
                </td>
                <td
                  className={stay.inherited_checkout ? "fimba-muted" : undefined}
                  title={stay.inherited_checkout ? "Fecha del artista" : "Fecha propia"}
                >
                  {formatFecha(stay.checkout_at)}
                </td>
                <td>{labelAlimentacion(p.tipo_alimentacion, p.nota_alimentacion)}</td>
                <td>{p.activo === false ? "No" : "Sí"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Planilla Excel de participantes: celdas inline, blur/Enter guarda, semáforo por fila.
 * Fila inferior `__new__` crea en Supabase al completar apellido+nombre.
 */
function ParticipantesPlanilla({ propuestaId, propuesta, participantes, onListChange, onError }) {
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

  const colCount = 10; // sync + 8 data + actions
  const defaultCheckin = propuesta?.checkin_at
    ? String(propuesta.checkin_at).slice(0, 10)
    : "";
  const defaultCheckout = propuesta?.checkout_at
    ? String(propuesta.checkout_at).slice(0, 10)
    : "";
  const defaultCheckinLabel = defaultCheckin ? formatFecha(defaultCheckin) : "artista";
  const defaultCheckoutLabel = defaultCheckout ? formatFecha(defaultCheckout) : "artista";

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
          <td>
            <input
              data-fimba-part-cell={`${rowIdx}-4`}
              className="fimba-cell-input fimba-cell-date"
              type="date"
              value={draft.checkin_at || ""}
              title={
                draft.checkin_at
                  ? "Check-in propio"
                  : `Vacío = check-in del artista (${defaultCheckinLabel})`
              }
              onChange={(e) => changeAndCommit(rowKey, "checkin_at", e.target.value)}
              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 4, rowKey)}
              disabled={status === "saving"}
            />
            {!draft.checkin_at && defaultCheckin ? (
              <div className="fimba-muted fimba-date-inherit">
                {defaultCheckinLabel}
              </div>
            ) : null}
          </td>
          <td>
            <input
              data-fimba-part-cell={`${rowIdx}-5`}
              className="fimba-cell-input fimba-cell-date"
              type="date"
              value={draft.checkout_at || ""}
              title={
                draft.checkout_at
                  ? "Check-out propio"
                  : `Vacío = check-out del artista (${defaultCheckoutLabel})`
              }
              onChange={(e) => changeAndCommit(rowKey, "checkout_at", e.target.value)}
              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 5, rowKey)}
              disabled={status === "saving"}
            />
            {!draft.checkout_at && defaultCheckout ? (
              <div className="fimba-muted fimba-date-inherit">
                {defaultCheckoutLabel}
              </div>
            ) : null}
          </td>
          <td className="fimba-ali-cell">
            <AlimentacionInput
              tipo={draft.tipo_alimentacion || "regular"}
              nota={draft.nota_alimentacion || ""}
              selectDataAttr={`${rowIdx}-6`}
              onChange={(patch) =>
                applyDraftPatch(rowKey, patch, { commit: false })
              }
              onCommit={() => commitRow(rowKey)}
              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 6, rowKey)}
              disabled={status === "saving"}
            />
          </td>
          <td style={{ textAlign: "center" }}>
            <input
              data-fimba-part-cell={`${rowIdx}-7`}
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
            <th title="Vacío = fechas del artista">Check-in</th>
            <th title="Vacío = fechas del artista">Check-out</th>
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
