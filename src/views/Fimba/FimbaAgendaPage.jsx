import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  IconArrowLeft,
  IconPlus,
  IconEdit,
  IconTrash,
  IconLoader,
  IconClock,
} from "../../components/ui/Icons";
import MultiSelectDropdown from "../../components/ui/MultiSelectDropdown";
import {
  categoriesFromTiposEvento,
  deleteFimbaEvento,
  FIMBA_DEFAULT_TIPO_EVENTO,
  getFimbaEdicionById,
  labelGiraTransporte,
  listFimbaAgenda,
  listFimbaFlota,
  listFimbaPropuestas,
} from "../../services/fimbaService";
import FimbaEventoFormModal from "./FimbaEventoFormModal";

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

const ORIGEN_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "fimba", label: "Solo FIMBA" },
  { value: "ofrn", label: "Solo OFRN" },
];

/** id_categoria OFRN de una fila de agenda unificada. */
function eventCategoriaId(ev) {
  const raw =
    ev?.tipo_id_categoria ??
    ev?.tipos_evento?.id_categoria ??
    ev?.tipos_evento?.categorias_tipos_eventos?.id ??
    null;
  const id = raw != null ? Number(raw) : NaN;
  return Number.isFinite(id) ? id : null;
}

/**
 * Categorías presentes en filas de agenda (`categorias_tipos_eventos`).
 * Mismo criterio de join que UnifiedAgenda / categoriesFromTiposEvento.
 */
function categoriasFromAgendaRows(eventos) {
  const pseudoTipos = (eventos || []).map((ev) => ({
    id_categoria: eventCategoriaId(ev),
    categoria_nombre:
      ev.categoria_nombre ||
      ev.tipos_evento?.categorias_tipos_eventos?.nombre ||
      null,
    categorias_tipos_eventos: ev.tipos_evento?.categorias_tipos_eventos || null,
  }));
  return categoriesFromTiposEvento(pseudoTipos);
}

/**
 * Agenda unificada FIMBA: planilla de eventos (traslados + actividades)
 * más convocatoria orquesta OFRN de la misma gira.
 */
export default function FimbaAgendaPage() {
  const { edicionId, artistaId } = useParams();
  const [searchParams] = useSearchParams();
  const filterFromQuery = searchParams.get("artista") || artistaId || null;

  const [edicion, setEdicion] = useState(null);
  const [propuestas, setPropuestas] = useState([]);
  const [flota, setFlota] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [filtroArtista, setFiltroArtista] = useState(filterFromQuery || "");
  /** Default: Solo FIMBA (no Todos). */
  const [filtroOrigen, setFiltroOrigen] = useState("fimba");
  /**
   * Multi-select de categorías (`id_categoria` / categorias_tipos_eventos),
   * semántica UnifiedAgenda: array vacío = todas visibles; con ids = solo esas.
   * Sin persistencia de preferencias en agenda FIMBA.
   */
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    const edRes = await getFimbaEdicionById(edicionId);
    if (edRes.error || !edRes.edicion) {
      setError(edRes.error?.message || "Edición no encontrada");
      setEdicion(null);
      setLoading(false);
      return;
    }
    const ed = edRes.edicion;
    const [propsRes, flotaRes, agendaRes] = await Promise.all([
      listFimbaPropuestas(edicionId),
      listFimbaFlota(ed.id_gira),
      listFimbaAgenda(edicionId, {
        id_propuesta: filtroArtista || null,
      }),
    ]);
    if (propsRes.error || flotaRes.error || agendaRes.error) {
      setError(
        (propsRes.error || flotaRes.error || agendaRes.error).message ||
          "Error al cargar",
      );
    }
    setEdicion(ed);
    setPropuestas(propsRes.propuestas || []);
    setFlota(flotaRes.flota || []);
    setEventos(agendaRes.eventos || []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicionId, filtroArtista]);

  // Con filtro por artista no hay orquesta pura; reset origen
  useEffect(() => {
    if (filtroArtista) setFiltroOrigen("all");
  }, [filtroArtista]);

  const availableCategories = useMemo(
    () => categoriasFromAgendaRows(eventos),
    [eventos],
  );

  const categoryOptions = useMemo(
    () =>
      availableCategories.map((c) => ({
        value: c.id,
        label: c.nombre,
      })),
    [availableCategories],
  );

  // Quitar de la selección ids que ya no existen en la agenda cargada
  useEffect(() => {
    setSelectedCategoryIds((prev) => {
      if (prev.length === 0) return prev;
      const valid = new Set(availableCategories.map((c) => c.id));
      const next = prev.filter((id) => valid.has(Number(id)));
      if (next.length === prev.length) return prev;
      return next;
    });
  }, [availableCategories]);

  const categoryFilterActive =
    selectedCategoryIds.length > 0 &&
    selectedCategoryIds.length < availableCategories.length;

  const eventosFiltrados = useMemo(() => {
    let list = eventos;
    if (filtroOrigen === "fimba") {
      list = list.filter((ev) => ev.es_fimba);
    } else if (filtroOrigen === "ofrn") {
      list = list.filter((ev) => ev.es_ofrn);
    }
    // UnifiedAgenda: length > 0 acota por id_categoria; vacío = sin filtro
    if (selectedCategoryIds.length > 0) {
      const want = new Set(selectedCategoryIds.map(Number));
      list = list.filter((ev) => {
        const catId = eventCategoriaId(ev);
        // Sin categoría conocida: no ocultar (igual que UnifiedAgenda)
        if (catId == null) return true;
        return want.has(catId);
      });
    }
    return list;
  }, [eventos, filtroOrigen, selectedCategoryIds]);

  const handleDelete = async (ev) => {
    const label = ev.actividad || ev.tipo_nombre || "evento";
    const ofrnNote =
      ev.es_ofrn && !ev.es_fimba
        ? "\n\nEs un evento de orquesta OFRN: se eliminará de la agenda de la gira."
        : "";
    if (
      !window.confirm(
        `¿Eliminar «${label}» del ${formatFecha(ev.fecha)}?${ofrnNote}`,
      )
    ) {
      return;
    }
    const { error: err } = await deleteFimbaEvento(ev.id);
    if (err) {
      setError(err.message || "No se pudo eliminar");
      return;
    }
    reload();
  };

  const backHref = artistaId
    ? `/fimba/edicion/${edicionId}/artista/${artistaId}`
    : `/fimba/edicion/${edicionId}`;

  if (loading) {
    return (
      <div className="fimba-card fimba-muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <IconLoader size={18} className="animate-spin" /> Cargando agenda…
      </div>
    );
  }

  if (!edicion) {
    return (
      <div>
        <div className="fimba-error">{error || "Edición no encontrada."}</div>
        <Link to="/fimba" className="fimba-btn fimba-btn-ghost" style={{ marginTop: 12, textDecoration: "none" }}>
          <IconArrowLeft size={14} /> Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="fimba-transport-wide">
      <Link
        to={backHref}
        className="fimba-btn fimba-btn-ghost"
        style={{ textDecoration: "none", marginBottom: 12 }}
      >
        <IconArrowLeft size={14} /> {artistaId ? "Artista" : edicion.nombre}
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "flex-start",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--fimba-deep)" }}>
            Agenda
          </h1>
          <p className="fimba-muted" style={{ margin: "0.35rem 0 0" }}>
            Planilla unificada · FIMBA + orquesta OFRN (misma gira)
          </p>
        </div>
        <button
          type="button"
          className="fimba-btn fimba-btn-primary"
          onClick={() =>
            setModal({
              mode: "create",
              preselectPropuesta: filtroArtista || artistaId || null,
            })
          }
        >
          <IconPlus size={16} /> Nuevo evento
        </button>
      </div>

      {error && (
        <div className="fimba-error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.05rem", color: "var(--fimba-deep)", display: "flex", alignItems: "center", gap: 6 }}>
          <IconClock size={16} /> Planilla
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {!filtroArtista && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {ORIGEN_FILTERS.map((f) => {
                const on = filtroOrigen === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    className={`fimba-btn fimba-chip${on ? " fimba-chip-on" : ""}`}
                    onClick={() => setFiltroOrigen(f.value)}
                    style={{
                      padding: "0.3rem 0.65rem",
                      fontSize: "0.78rem",
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          )}
          {availableCategories.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 200 }}>
              <label className="fimba-label" style={{ margin: 0 }}>
                Categoría
              </label>
              <div style={{ minWidth: 200, width: 220 }}>
                <MultiSelectDropdown
                  label="Categoría"
                  placeholder="Todas las categorías"
                  options={categoryOptions}
                  value={selectedCategoryIds}
                  onChange={setSelectedCategoryIds}
                  compact
                  summaryMode="names"
                  summaryMaxNames={2}
                />
              </div>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label className="fimba-label" style={{ margin: 0 }}>
              Artista
            </label>
            <select
              className="fimba-select"
              style={{ width: "auto", minWidth: 180 }}
              value={filtroArtista || ""}
              onChange={(e) => setFiltroArtista(e.target.value)}
            >
              <option value="">Toda la edición</option>
              {propuestas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {eventosFiltrados.length === 0 ? (
        <div className="fimba-card fimba-muted">
          No hay eventos
          {filtroArtista ? " para este artista" : " cargados"}
          {filtroOrigen === "fimba" ? " (origen FIMBA)" : ""}
          {filtroOrigen === "ofrn" ? " (origen OFRN)" : ""}
          {categoryFilterActive ? " con las categorías seleccionadas" : ""}.
          {eventos.length === 0
            ? " Creá el primero con «Nuevo evento»."
            : " Probá otro origen o categoría."}
        </div>
      ) : (
        <div className="fimba-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="fimba-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: "1rem" }}>Origen</th>
                  <th>Fecha</th>
                  <th>Hora com</th>
                  <th>Hora fin</th>
                  <th>Tipo</th>
                  <th>Actividad</th>
                  <th>Destino / Vuelo</th>
                  <th>Vehículo</th>
                  <th># PAX</th>
                  <th>OFRN</th>
                  <th>Artistas</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {eventosFiltrados.map((ev) => {
                  const isTx =
                    Boolean(ev.es_traslado) ||
                    (ev.vehiculos || []).length > 0 ||
                    ev.id_gira_transporte != null;
                  const ofrnVeh =
                    flota.find((g) => Number(g.id) === Number(ev.id_gira_transporte)) ||
                    null;
                  const vehLabel =
                    (ev.vehiculos || []).length > 0
                      ? (ev.vehiculos || [])
                          .map((r) => {
                            const label = labelGiraTransporte(r.giras_transportes);
                            const pl = Number(r.plazas) || 0;
                            return pl ? `${label} (${pl})` : label;
                          })
                          .join(", ") || "—"
                      : ofrnVeh
                        ? labelGiraTransporte(ofrnVeh)
                        : !isTx
                          ? "—"
                          : ev.es_ofrn && !ev.es_fimba
                            ? "—"
                            : "SIN SERVICIO";
                  const destVuelo = [ev.destino, ev.vuelo].filter(Boolean).join(" · ") || "—";
                  const rowClass =
                    ev.origen === "ofrn"
                      ? "fimba-row-ofrn"
                      : ev.origen === "ambos"
                        ? "fimba-row-ambos"
                        : "";
                  const aoLabel =
                    ev.audiencia_ofrn === "grupos" || (ev.grupos || []).length > 0
                      ? "Grupos"
                      : ev.audiencia_ofrn === "tutti" || (ev.es_ofrn && !ev.audiencia_ofrn)
                        ? "Tutti"
                        : ev.es_ofrn
                          ? "OFRN"
                          : "—";
                  return (
                    <tr key={ev.id} className={rowClass}>
                      <td style={{ paddingLeft: "1rem", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {ev.es_fimba && (
                            <span className="fimba-badge fimba-badge-fimba">FIMBA</span>
                          )}
                          {ev.es_ofrn && (
                            <span className="fimba-badge fimba-badge-ofrn">OFRN</span>
                          )}
                          {!ev.es_fimba && !ev.es_ofrn && (
                            <span className="fimba-muted" style={{ fontSize: "0.75rem" }}>—</span>
                          )}
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{formatFecha(ev.fecha)}</td>
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
                          title={
                            ev.categoria_nombre
                              ? `${ev.tipo_nombre || ""} · ${ev.categoria_nombre}`
                              : ev.tipo_nombre || undefined
                          }
                        >
                          {ev.tipo_nombre || "—"}
                        </span>
                        {ev.categoria_nombre && (
                          <span
                            className="fimba-muted"
                            style={{ display: "block", fontSize: "0.68rem", marginTop: 2 }}
                          >
                            {ev.categoria_nombre}
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600, maxWidth: 180 }}>
                        {ev.actividad || "—"}
                        {ev.observaciones ? (
                          <span className="fimba-muted" style={{ display: "block", fontSize: "0.75rem", fontWeight: 400 }}>
                            {ev.observaciones}
                          </span>
                        ) : null}
                      </td>
                      <td className="fimba-muted" style={{ maxWidth: 140 }}>
                        {destVuelo}
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        {vehLabel === "SIN SERVICIO" ? (
                          <span className="fimba-badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                            SIN SERVICIO
                          </span>
                        ) : (
                          vehLabel
                        )}
                      </td>
                      <td>{ev.pax || "—"}</td>
                      <td>
                        {ev.es_ofrn ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span className="fimba-muted" style={{ fontSize: "0.72rem" }}>
                              {aoLabel}
                            </span>
                            {(ev.grupos || []).length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {(ev.grupos || []).map((g) => (
                                  <span
                                    key={g.id}
                                    className="fimba-badge"
                                    style={{
                                      background: g.color ? `${g.color}22` : "#e0f2fe",
                                      color: g.color || "#0369a1",
                                      border: `1px solid ${g.color || "#7dd3fc"}44`,
                                    }}
                                  >
                                    {g.nombre}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="fimba-muted" style={{ fontSize: "0.8rem" }}>
                            —
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {(ev.propuestas || []).map((p) => (
                            <span
                              key={p.id}
                              className="fimba-badge"
                              style={{
                                background: p.color ? `${p.color}22` : undefined,
                                color: p.color || undefined,
                              }}
                            >
                              {p.nombre}
                            </span>
                          ))}
                          {ev.orquesta_label ? (
                            <span
                              className="fimba-muted"
                              style={{ fontSize: "0.8rem" }}
                            >
                              {ev.orquesta_label}
                            </span>
                          ) : null}
                          {(ev.propuestas || []).length === 0 && !ev.orquesta_label ? (
                            <span
                              className="fimba-muted"
                              style={{ fontSize: "0.8rem" }}
                            >
                              Edición
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "0.75rem", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="fimba-btn fimba-btn-ghost"
                          onClick={() => setModal({ mode: "edit", evento: ev })}
                          title="Editar"
                        >
                          <IconEdit size={14} />
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal &&
        createPortal(
          <FimbaEventoFormModal
            mode={modal.mode}
            evento={modal.evento}
            edicion={edicion}
            flota={flota}
            propuestas={propuestas}
            preselectPropuesta={modal.preselectPropuesta}
            defaultTipoId={FIMBA_DEFAULT_TIPO_EVENTO}
            forceTransporte={false}
            onClose={() => setModal(null)}
            onSaved={() => {
              setModal(null);
              reload();
            }}
          />,
          document.body,
        )}
    </div>
  );
}
