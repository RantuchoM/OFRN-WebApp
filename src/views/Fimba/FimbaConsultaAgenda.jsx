import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconClock,
  IconCopy,
  IconEdit,
  IconLoader,
  IconPlus,
  IconPrinter,
  IconTrash,
} from "../../components/ui/Icons";
import {
  deleteFimbaEvento,
  duplicateFimbaEvento,
  FIMBA_DEFAULT_TIPO_EVENTO,
  getFimbaEdicionById,
  giraTransporteIdsFromEvent,
  labelGiraTransporte,
  listFimbaAgenda,
  listFimbaFlota,
  listFimbaPropuestaRutas,
  listFimbaPropuestas,
  loadFimbaTransportLogisticsSummary,
  computeFimbaCapacity,
} from "../../services/fimbaService";
import { sortFimbaAgendaRows } from "../../utils/fimbaAgendaSort";
import { exportFimbaAgendaToPDF } from "../../utils/fimbaAgendaPdf";
import {
  buildAllVehicleBoardingSequences,
  formatAgendaOrigenLabel,
  resolveAgendaDestinoLabel,
  resolveEventAboardCount,
  TRANSPORT_DESTINO_SIN_SIGUIENTE,
  TRANSPORT_DESTINO_SIN_LOCACION,
} from "../../utils/fimbaTransportBoarding";
import FimbaEventoFormModal from "./FimbaEventoFormModal";
import { FimbaEventDetallePreview } from "./FimbaEventDetalleField";
import { stripHtml } from "../../utils/eventDisplayUtils";
import { fimbaTipoRowTintStyle } from "../../utils/fimbaEventCategories";
import { formatWeekdayFullLocal } from "../../utils/dates";
import FimbaAgendaEventCard, {
  FimbaAgendaDayDividerMobile,
} from "./FimbaAgendaEventCard";
import { buildAgendaCardMenuItems } from "./fimbaAgendaCardMenuItems";

function sliceTime(t) {
  if (!t) return "—";
  return String(t).slice(0, 5);
}

function formatFecha(f) {
  if (!f) return "—";
  const [y, m, d] = String(f).split("-");
  if (!d) return f;
  return `${d}/${m}/${y}`;
}

function FechaCellLabel({ fecha }) {
  if (!fecha) return "—";
  const weekday = formatWeekdayFullLocal(fecha);
  return (
    <div className="fimba-fecha-stack">
      {weekday ? <span className="fimba-fecha-weekday">{weekday}</span> : null}
      <span className="fimba-fecha-value">{formatFecha(fecha)}</span>
    </div>
  );
}

function vehicleLabel(ev, flota) {
  const isTx =
    Boolean(ev.es_traslado) ||
    (ev.vehiculos || []).length > 0 ||
    ev.id_gira_transporte != null;
  if ((ev.vehiculos || []).length > 0) {
    return (
      (ev.vehiculos || [])
        .map((r) => {
          const label = labelGiraTransporte(r.giras_transportes);
          const pl = Math.max(0, Number(r.plazas) || 0);
          return `${label} (${pl})`;
        })
        .join(", ") || "—"
    );
  }
  const ofrnVeh =
    (flota || []).find((g) => Number(g.id) === Number(ev.id_gira_transporte)) ||
    null;
  if (ofrnVeh) return labelGiraTransporte(ofrnVeh);
  if (!isTx) return "—";
  return "SIN SERVICIO";
}

/**
 * Agenda del artista: eventos tagged + paradas de transporte vía `fimba_propuesta_rutas`.
 * - Consulta token / readOnly: solo lectura.
 * - Superficies editables (`editable`): alta/edición/baja con FimbaEventoFormModal
 *   y propuesta fija (lockPropuesta).
 */
export default function FimbaConsultaAgenda({ propuesta, editable = false }) {
  const [eventos, setEventos] = useState([]);
  const [flota, setFlota] = useState([]);
  const [edicion, setEdicion] = useState(null);
  const [propuestas, setPropuestas] = useState([]);
  const [logisticsSummary, setLogisticsSummary] = useState([]);
  const [propuestaRoutes, setPropuestaRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);

  const edicionId = propuesta?.id_edicion;
  const propId = propuesta?.id;
  const giraFromProp = propuesta?.fimba_ediciones?.id_gira ?? null;

  const reloadAgenda = useCallback(async () => {
    if (propId == null || edicionId == null) return;
    setLoading(true);
    setError(null);

    let ed =
      giraFromProp != null
        ? {
            id: propuesta?.fimba_ediciones?.id ?? edicionId,
            nombre: propuesta?.fimba_ediciones?.nombre,
            anio: propuesta?.fimba_ediciones?.anio,
            id_gira: giraFromProp,
          }
        : null;

    // Staff detalle no trae join fimba_ediciones; token sí. En editable necesitamos id_gira.
    if (editable && !ed?.id_gira) {
      const edRes = await getFimbaEdicionById(edicionId);
      if (edRes.error) {
        setError(edRes.error.message || "No se pudo cargar la edición");
        setLoading(false);
        return;
      }
      ed = edRes.edicion;
    }

    const giraId = ed?.id_gira ?? giraFromProp;

    const tasks = [
      listFimbaAgenda(edicionId, { id_propuesta: propId }),
      giraId != null
        ? listFimbaFlota(giraId)
        : Promise.resolve({ flota: [], error: null }),
      giraId != null
        ? loadFimbaTransportLogisticsSummary(giraId)
        : Promise.resolve({ summary: [], error: null }),
      listFimbaPropuestaRutas(edicionId),
    ];
    if (editable) {
      tasks.push(listFimbaPropuestas(edicionId));
    }

    const results = await Promise.all(tasks);
    const [agendaRes, flotaRes, logRes, rutasRes, propsRes] = results;

    if (agendaRes.error) {
      setError(agendaRes.error.message || "No se pudo cargar la agenda");
      setEventos([]);
    } else {
      setEventos(agendaRes.eventos || []);
    }
    if (flotaRes.error) {
      setError((prev) => prev || flotaRes.error.message || "Error al cargar flota");
    }
    setFlota(flotaRes.flota || []);
    setLogisticsSummary(logRes?.error ? [] : logRes?.summary || []);
    setPropuestaRoutes(rutasRes?.error ? [] : rutasRes?.rutas || []);
    if (ed) setEdicion(ed);
    if (propsRes) {
      if (propsRes.error) {
        setError((prev) => prev || propsRes.error.message || "Error al cargar artistas");
      }
      setPropuestas(propsRes.propuestas || []);
    }
    setLoading(false);
  }, [propId, edicionId, giraFromProp, editable, propuesta?.fimba_ediciones?.id, propuesta?.fimba_ediciones?.nombre, propuesta?.fimba_ediciones?.anio]);

  useEffect(() => {
    if (propId == null || edicionId == null) return undefined;
    reloadAgenda();
  }, [propId, edicionId, reloadAgenda]);

  /** Misma orden contractual que planilla staff (post-merge rides). */
  const eventosOrdenados = useMemo(
    () => sortFimbaAgendaRows(eventos),
    [eventos],
  );

  const flotaById = useMemo(() => {
    const map = new Map();
    for (const g of flota || []) {
      map.set(Number(g.id), g);
    }
    return map;
  }, [flota]);

  const sequencesByVehicle = useMemo(
    () =>
      buildAllVehicleBoardingSequences({
        vehiculos: flota,
        eventos,
        logisticsSummary,
        capacityFn: computeFimbaCapacity,
        eventVehicleIds: giraTransporteIdsFromEvent,
        propuestaRoutes,
      }),
    [flota, eventos, logisticsSummary, propuestaRoutes],
  );

  const handleExportPdf = () => {
    if (eventosOrdenados.length === 0) return;
    const artistName = propuesta?.nombre || "Artista";
    const edName = edicion?.nombre || propuesta?.fimba_ediciones?.nombre || "";
    exportFimbaAgendaToPDF(eventosOrdenados, {
      title: `Agenda FIMBA — ${artistName}`,
      subTitle: [edName, `Artista: ${artistName}`].filter(Boolean).join(" · "),
      flotaById,
    });
  };

  const handleDelete = async (ev) => {
    const label =
      stripHtml(ev.actividad) || ev.tipo_nombre || "evento";
    if (
      !window.confirm(`¿Eliminar «${label}» del ${formatFecha(ev.fecha)}?`)
    ) {
      return;
    }
    const { error: err } = await deleteFimbaEvento(ev.id);
    if (err) {
      setError(err.message || "No se pudo eliminar");
      return;
    }
    await reloadAgenda();
  };

  const edicionForModal =
    edicion ||
    (propuesta?.fimba_ediciones
      ? {
          id: propuesta.fimba_ediciones.id ?? edicionId,
          nombre: propuesta.fimba_ediciones.nombre,
          anio: propuesta.fimba_ediciones.anio,
          id_gira: propuesta.fimba_ediciones.id_gira,
        }
      : null);

  const handleDuplicate = async (ev) => {
    const label = stripHtml(ev.actividad) || ev.tipo_nombre || "evento";
    if (
      !window.confirm(
        `¿Duplicar «${label}» del ${formatFecha(ev.fecha)}?\n\nSe copia tipo, horarios, detalle, locación, equipaje, tags y flota. No se copian subidas/bajadas de artistas.`,
      )
    ) {
      return;
    }
    setError(null);
    const { evento: copy, error: err } = await duplicateFimbaEvento(ev, {
      id_gira: edicionForModal?.id_gira ?? ev.id_gira,
      lockPropuesta: propuesta?.id,
    });
    if (err || !copy?.id) {
      setError(err?.message || "No se pudo duplicar");
      return;
    }
    await reloadAgenda();
    setModal({ mode: "edit", evento: copy });
  };

  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          flexWrap: "wrap",
          gap: 8,
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
          <IconClock size={16} /> Agenda
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            onClick={handleExportPdf}
            disabled={loading || eventosOrdenados.length === 0}
            title="Descargar PDF de la agenda de este artista"
          >
            <IconPrinter size={14} /> Descargar PDF
          </button>
          {editable ? (
            <button
              type="button"
              className="fimba-btn fimba-btn-primary"
              disabled={!edicionForModal?.id_gira || loading}
              onClick={() =>
                setModal({
                  mode: "create",
                  preselectPropuesta: propuesta.id,
                })
              }
            >
              <IconPlus size={16} /> Nuevo evento
            </button>
          ) : (
            <span className="fimba-muted" style={{ fontSize: "0.8rem" }}>
              Solo lectura · eventos y traslados de este artista
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="fimba-error" style={{ marginBottom: "0.75rem" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div
          className="fimba-card fimba-muted"
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <IconLoader size={18} className="animate-spin" /> Cargando agenda…
        </div>
      ) : eventosOrdenados.length === 0 && !error ? (
        <div className="fimba-card fimba-muted">
          {editable
            ? "No hay eventos de este artista. Usá «Nuevo evento» para crear uno."
            : "No hay eventos ni traslados asignados a este artista."}
        </div>
      ) : eventosOrdenados.length > 0 ? (
        <div className="fimba-card fimba-agenda-card">
          <div className="fimba-agenda-mobile">
            {eventosOrdenados.map((ev, idx) => {
              const dayKey = String(ev.fecha || "").slice(0, 10);
              const prevDayKey =
                idx > 0
                  ? String(eventosOrdenados[idx - 1]?.fecha || "").slice(0, 10)
                  : "";
              const showDayDivider =
                idx === 0 || (dayKey && dayKey !== prevDayKey);
              const isTx =
                Boolean(ev.es_traslado) ||
                (ev.vehiculos || []).length > 0 ||
                ev.id_gira_transporte != null;
              const veh = vehicleLabel(ev, flota);
              const origen = formatAgendaOrigenLabel(ev, {
                skipDestinoFallback: isTx,
              });
              const destino = resolveAgendaDestinoLabel(ev, sequencesByVehicle, {
                isTransport: isTx,
              });
              const vuelo = ev.vuelo || "—";
              const aboard = isTx
                ? resolveEventAboardCount(ev, sequencesByVehicle, null)
                : null;
              const openEdit = () => setModal({ mode: "edit", evento: ev });
              const menuItems = buildAgendaCardMenuItems({
                canEdit: editable,
                onDuplicate: () => handleDuplicate(ev),
                onDelete: () => handleDelete(ev),
              });
              return (
                <React.Fragment key={`m-${ev.id}`}>
                  {showDayDivider ? (
                    <FimbaAgendaDayDividerMobile
                      fecha={dayKey}
                      first={idx === 0}
                    />
                  ) : null}
                  <FimbaAgendaEventCard
                    ev={ev}
                    origenLabel={origen}
                    destinoLabel={destino}
                    vueloLabel={vuelo}
                    vehicleLabel={veh}
                    aboardCount={aboard}
                    showAboard={isTx}
                    showOrigenBadges={Boolean(ev.es_fimba || ev.es_ofrn)}
                    readOnly={!editable}
                    onActivate={editable ? openEdit : null}
                    onEdit={editable ? openEdit : null}
                    menuItems={menuItems}
                  />
                </React.Fragment>
              );
            })}
          </div>
          <div className="fimba-agenda-desktop">
          <div className="fimba-agenda-scroll">
            <table className="fimba-table fimba-agenda-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: "1rem" }}>Fecha</th>
                  <th>Hora com</th>
                  <th>Hora fin</th>
                  <th>Tipo</th>
                  <th className="fimba-detalle-cell">Detalle</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Vuelo</th>
                  <th>Vehículo</th>
                  <th
                    style={{ paddingRight: editable ? undefined : "1rem" }}
                    title="Personas a bordo en el/los vehículo(s) al salir de esta parada (OFRN + FIMBA). No es el campo de asientos de equipaje del modal."
                  >
                    As. Equipaje
                  </th>
                  {editable && <th style={{ paddingRight: "0.75rem" }} />}
                </tr>
              </thead>
              <tbody>
                {eventosOrdenados.map((ev) => {
                  const isTx =
                    Boolean(ev.es_traslado) ||
                    (ev.vehiculos || []).length > 0 ||
                    ev.id_gira_transporte != null;
                  const veh = vehicleLabel(ev, flota);
                  const origen = formatAgendaOrigenLabel(ev, {
                    skipDestinoFallback: isTx,
                  });
                  const destino = resolveAgendaDestinoLabel(ev, sequencesByVehicle, {
                    isTransport: isTx,
                  });
                  const vuelo = ev.vuelo || "—";
                  const aboard = isTx
                    ? resolveEventAboardCount(ev, sequencesByVehicle, null)
                    : null;
                  const tipoTint = fimbaTipoRowTintStyle(ev.tipo_color);
                  return (
                    <tr
                      key={ev.id}
                      className={tipoTint ? "fimba-has-tipo-tint" : undefined}
                      style={tipoTint}
                      onDoubleClick={
                        editable
                          ? (e) => {
                              if (
                                e.target.closest(
                                  "button, a, input, select, textarea, label",
                                )
                              ) {
                                return;
                              }
                              setModal({ mode: "edit", evento: ev });
                            }
                          : undefined
                      }
                    >
                      <td style={{ paddingLeft: "1rem", whiteSpace: "nowrap" }}>
                        <FechaCellLabel fecha={ev.fecha} />
                      </td>
                      <td>{sliceTime(ev.hora_inicio)}</td>
                      <td>{sliceTime(ev.hora_fin)}</td>
                      <td>
                        <span
                          className="fimba-badge"
                          style={
                            ev.tipo_color
                              ? {
                                  background: `${ev.tipo_color}22`,
                                  color: ev.tipo_color,
                                  borderColor: `${ev.tipo_color}44`,
                                }
                              : undefined
                          }
                        >
                          {ev.tipo_nombre || "—"}
                        </span>
                      </td>
                      <td className="fimba-detalle-cell" style={{ fontWeight: 600 }}>
                        <FimbaEventDetallePreview html={ev.actividad} clamp />
                        {ev.observaciones ? (
                          <span
                            className="fimba-muted"
                            style={{
                              display: "block",
                              fontSize: "0.75rem",
                              fontWeight: 400,
                            }}
                          >
                            {ev.observaciones}
                          </span>
                        ) : null}
                      </td>
                      <td className="fimba-muted" style={{ maxWidth: 160 }} title={origen}>
                        {origen}
                      </td>
                      <td
                        className="fimba-muted"
                        style={{
                          maxWidth: 160,
                          fontStyle:
                            destino === TRANSPORT_DESTINO_SIN_SIGUIENTE ||
                            destino === TRANSPORT_DESTINO_SIN_LOCACION
                              ? "italic"
                              : undefined,
                        }}
                        title={
                          isTx && destino !== "—"
                            ? destino === TRANSPORT_DESTINO_SIN_SIGUIENTE
                              ? "Sin siguiente parada en la secuencia del vehículo"
                              : destino === TRANSPORT_DESTINO_SIN_LOCACION
                                ? "La siguiente parada no tiene locación de catálogo"
                                : `Siguiente parada del mismo vehículo: ${destino}`
                            : undefined
                        }
                      >
                        {destino}
                      </td>
                      <td className="fimba-muted" style={{ maxWidth: 100 }}>
                        {vuelo}
                      </td>
                      <td style={{ maxWidth: 200 }}>
                        {veh === "SIN SERVICIO" ? (
                          <span
                            className="fimba-badge"
                            style={{ background: "#fef3c7", color: "#92400e" }}
                          >
                            SIN SERVICIO
                          </span>
                        ) : (
                          veh
                        )}
                      </td>
                      <td
                        style={{
                          paddingRight: editable ? undefined : "1rem",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: isTx ? 600 : undefined,
                        }}
                        title={
                          isTx
                            ? "A bordo al salir (misma métrica que Tránsito/cap en Transportes)"
                            : "Solo aplica a eventos con transporte"
                        }
                      >
                        {isTx ? (aboard != null ? aboard : "—") : "—"}
                      </td>
                      {editable && (
                        <td
                          style={{
                            textAlign: "right",
                            paddingRight: "0.75rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <>
                            <button
                              type="button"
                              className="fimba-btn fimba-btn-ghost"
                              onClick={() =>
                                setModal({ mode: "edit", evento: ev })
                              }
                              onDoubleClick={(e) => e.stopPropagation()}
                              title="Editar"
                            >
                              <IconEdit size={14} />
                            </button>
                            <button
                              type="button"
                              className="fimba-btn fimba-btn-ghost"
                              style={{ marginLeft: 4 }}
                              onClick={() => handleDuplicate(ev)}
                              onDoubleClick={(e) => e.stopPropagation()}
                              title="Duplicar"
                            >
                              <IconCopy size={14} />
                            </button>
                            <button
                              type="button"
                              className="fimba-btn fimba-btn-danger"
                              style={{ marginLeft: 4 }}
                              onClick={() => handleDelete(ev)}
                              onDoubleClick={(e) => e.stopPropagation()}
                              title="Eliminar"
                            >
                              <IconTrash size={14} />
                            </button>
                          </>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      ) : null}

      {editable &&
        modal &&
        edicionForModal?.id_gira != null &&
        createPortal(
          <FimbaEventoFormModal
            mode={modal.mode}
            evento={modal.evento}
            edicion={edicionForModal}
            flota={flota}
            propuestas={propuestas.length ? propuestas : propuesta ? [propuesta] : []}
            preselectPropuesta={
              modal.preselectPropuesta ?? propuesta?.id ?? null
            }
            lockPropuesta={propuesta?.id}
            defaultTipoId={FIMBA_DEFAULT_TIPO_EVENTO}
            forceTransporte={false}
            onClose={() => setModal(null)}
            onSaved={() => {
              setModal(null);
              reloadAgenda();
            }}
            onDuplicate={
              modal.mode === "edit" && modal.evento
                ? () => handleDuplicate(modal.evento)
                : undefined
            }
          />,
          document.body,
        )}
    </section>
  );
}
