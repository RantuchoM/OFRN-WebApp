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
  labelGiraTransporte,
  listFimbaAgenda,
  listFimbaFlota,
  listFimbaPropuestas,
} from "../../services/fimbaService";
import { sortFimbaAgendaRows } from "../../utils/fimbaAgendaSort";
import { exportFimbaAgendaToPDF } from "../../utils/fimbaAgendaPdf";
import FimbaEventoFormModal from "./FimbaEventoFormModal";
import { FimbaEventDetallePreview } from "./FimbaEventDetalleField";
import { stripHtml } from "../../utils/eventDisplayUtils";

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
          const pl = Number(r.plazas) || 0;
          return pl ? `${label} (${pl})` : label;
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
 * Agenda del artista filtrada por tags `eventos_fimba_propuestas`.
 * Incluye bloques calculados de traslado (suben→bajan vía `fimba_propuesta_rutas`).
 * - Consulta token / readOnly: solo lectura.
 * - Superficies editables (`editable`): alta/edición/baja con FimbaEventoFormModal
 *   y propuesta fija (lockPropuesta). Los segmentos de bus son siempre RO.
 */
export default function FimbaConsultaAgenda({ propuesta, editable = false }) {
  const [eventos, setEventos] = useState([]);
  const [flota, setFlota] = useState([]);
  const [edicion, setEdicion] = useState(null);
  const [propuestas, setPropuestas] = useState([]);
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
    ];
    if (editable) {
      tasks.push(listFimbaPropuestas(edicionId));
    }

    const results = await Promise.all(tasks);
    const [agendaRes, flotaRes, propsRes] = results;

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
        <div className="fimba-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="fimba-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: "1rem" }}>Fecha</th>
                  <th>Hora com</th>
                  <th>Hora fin</th>
                  <th>Tipo</th>
                  <th>Detalle</th>
                  <th>Destino / Vuelo</th>
                  <th>Vehículo</th>
                  <th style={{ paddingRight: editable ? undefined : "1rem" }}>
                    As. Equipaje
                  </th>
                  {editable && <th style={{ paddingRight: "0.75rem" }} />}
                </tr>
              </thead>
              <tbody>
                {eventosOrdenados.map((ev) => {
                  const isRide = Boolean(ev.es_ride_segment);
                  const veh = isRide
                    ? ev.vehicle_label || vehicleLabel(ev, flota)
                    : vehicleLabel(ev, flota);
                  const dest = isRide
                    ? ev.route_snippet ||
                      [ev.destino, ev.vuelo].filter(Boolean).join(" · ") ||
                      "—"
                    : [ev.destino, ev.vuelo].filter(Boolean).join(" · ") || "—";
                  return (
                    <tr
                      key={ev.id}
                      style={
                        isRide
                          ? { background: "rgba(0, 177, 235, 0.06)" }
                          : undefined
                      }
                    >
                      <td style={{ paddingLeft: "1rem", whiteSpace: "nowrap" }}>
                        {formatFecha(ev.fecha)}
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
                      <td style={{ fontWeight: 600, maxWidth: 220 }}>
                        <FimbaEventDetallePreview html={ev.actividad} />
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
                        {isRide ? (
                          <span
                            className="fimba-muted"
                            style={{
                              display: "block",
                              fontSize: "0.72rem",
                              fontWeight: 500,
                              marginTop: 2,
                            }}
                          >
                            A bordo (planilla transportes)
                          </span>
                        ) : null}
                      </td>
                      <td className="fimba-muted" style={{ maxWidth: 180 }}>
                        {dest}
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
                        }}
                      >
                        {ev.asientos_equipaje || ev.pax || "—"}
                      </td>
                      {editable && (
                        <td
                          style={{
                            textAlign: "right",
                            paddingRight: "0.75rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isRide ? (
                            <span
                              className="fimba-muted"
                              style={{ fontSize: "0.72rem", paddingRight: 4 }}
                              title="Definido en Transportes (suben/bajan)"
                            >
                              —
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="fimba-btn fimba-btn-ghost"
                                onClick={() =>
                                  setModal({ mode: "edit", evento: ev })
                                }
                                title="Editar"
                              >
                                <IconEdit size={14} />
                              </button>
                              <button
                                type="button"
                                className="fimba-btn fimba-btn-ghost"
                                style={{ marginLeft: 4 }}
                                onClick={() => handleDuplicate(ev)}
                                title="Duplicar"
                              >
                                <IconCopy size={14} />
                              </button>
                              <button
                                type="button"
                                className="fimba-btn fimba-btn-danger"
                                style={{ marginLeft: 4 }}
                                onClick={() => handleDelete(ev)}
                                title="Eliminar"
                              >
                                <IconTrash size={14} />
                              </button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
