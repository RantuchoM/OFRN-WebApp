import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { format, startOfDay } from "date-fns";
import { toast } from "sonner";
import {
  IconArrowLeft,
  IconChevronDown,
  IconChevronUp,
  IconEye,
  IconHistory,
  IconLayout,
  IconLoader,
  IconMapPin,
} from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";
import SearchableSelect from "../../components/ui/SearchableSelect";
import GiraGrupoChips from "../../components/giras/GiraGrupoChips";
import {
  getFimbaEdicionById,
  listFimbaConcertVenues,
  listFimbaFlota,
  listFimbaPropuestas,
  listFimbaVenueInfo,
  updateEventoObservacionesAforo,
} from "../../services/fimbaService";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";
import { useFimbaAccess } from "../../context/FimbaAccessContext";
import {
  extractEventArtistas,
  extractEventGrupos,
  formatVenueEventDate,
  formatVenueShowsDateRange,
  formatVenueStageDims,
  groupEventsByLocacion,
} from "../../utils/venueDisplayUtils";
import { buildAppTo } from "../../utils/appNavigation";
import StagePlotViewerModal from "../Giras/StagePlotViewerModal";
import FimbaEventoFormModal from "./FimbaEventoFormModal";
import { FimbaEventDetallePreview } from "./FimbaEventDetalleField";
import FimbaVenueInfoSection from "./FimbaVenueInfoSection";

function FimbaArtistaChips({ artistas }) {
  if (!artistas?.length) {
    return <span className="fimba-muted" style={{ fontSize: "0.72rem" }}>—</span>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
      {artistas.map((a) => (
        <span
          key={a.id}
          className="fimba-badge fimba-badge-fimba"
          style={
            a.color
              ? {
                  backgroundColor: `${a.color}22`,
                  borderColor: `${a.color}55`,
                  color: "#222",
                }
              : undefined
          }
        >
          {a.nombre}
        </span>
      ))}
    </div>
  );
}

function FimbaVenueAforoCell({
  eventoId,
  value,
  readOnly,
  onSaved,
}) {
  const [draft, setDraft] = useState(() => value || "");
  const [saving, setSaving] = useState(false);
  const lastSavedRef = useRef(String(value || "").trim());
  const timerRef = useRef(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    const next = value || "";
    setDraft(next);
    lastSavedRef.current = String(next).trim();
  }, [eventoId, value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const persist = useCallback(async () => {
    const trimmed = String(draftRef.current || "").trim();
    if (trimmed === lastSavedRef.current) return;
    setSaving(true);
    const { evento, error } = await updateEventoObservacionesAforo(
      eventoId,
      trimmed,
    );
    setSaving(false);
    if (error) {
      toast.error(error.message || "No se pudo guardar observaciones aforo");
      return;
    }
    lastSavedRef.current = String(evento?.observaciones_aforo || "").trim();
    onSaved?.(eventoId, evento?.observaciones_aforo || null);
  }, [eventoId, onSaved]);

  const onChange = (e) => {
    const next = e.target.value;
    setDraft(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void persist();
    }, 600);
  };

  if (readOnly) {
    const text = String(value || "").trim();
    return text ? (
      <p style={{ margin: 0, fontSize: "0.78rem", whiteSpace: "pre-wrap" }}>
        {text}
      </p>
    ) : (
      <span className="fimba-muted" style={{ fontSize: "0.72rem", fontStyle: "italic" }}>
        —
      </span>
    );
  }

  return (
    <div style={{ minWidth: "10rem", maxWidth: "16rem" }}>
      <textarea
        className="fimba-input"
        rows={2}
        value={draft}
        onChange={onChange}
        onBlur={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          void persist();
        }}
        placeholder="Obs. aforo…"
        style={{ resize: "vertical", fontSize: "0.78rem", width: "100%" }}
      />
      {saving && (
        <span className="fimba-muted" style={{ fontSize: "0.65rem" }}>
          Guardando…
        </span>
      )}
    </div>
  );
}

function FimbaVenueEventRow({
  evt,
  readOnly,
  showStagePlotEditorLink,
  onViewStagePlot,
  onEditEvent,
  onAforoSaved,
}) {
  const fechaFormatted = formatVenueEventDate(evt.fecha);
  const hora = evt.hora_inicio ? evt.hora_inicio.slice(0, 5) : "";
  const artistas = extractEventArtistas(evt);
  const grupos = extractEventGrupos(evt);
  const bloque = evt.programas_repertorios?.nombre || null;
  const stagePlotTo =
    showStagePlotEditorLink && evt.id_gira != null
      ? buildAppTo({
          mode: "GIRAS",
          giraId: evt.id_gira,
          subTab: "seating",
          seatingView: "escenario",
        })
      : null;

  return (
    <tr>
      <td style={{ whiteSpace: "nowrap" }}>
        <div>
          <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{fechaFormatted}</div>
          {hora && (
            <div className="fimba-muted" style={{ fontSize: "0.72rem" }}>
              {hora} hs
            </div>
          )}
        </div>
      </td>
      <td className="fimba-planilla-wrap" style={{ minWidth: "10rem", maxWidth: "16rem" }}>
        <button
          type="button"
          className="fimba-artista-name-btn"
          onClick={() => onEditEvent(evt)}
          disabled={readOnly}
          style={readOnly ? { cursor: "default" } : undefined}
        >
          <FimbaEventDetallePreview
            html={evt.descripcion}
            empty="Concierto"
            className=""
          />
        </button>
        {bloque && (
          <div className="fimba-muted" style={{ fontSize: "0.68rem", marginTop: "0.15rem" }}>
            {bloque}
          </div>
        )}
      </td>
      <td className="fimba-planilla-wrap">
        <FimbaArtistaChips artistas={artistas} />
      </td>
      <td>
        {grupos.length > 0 ? (
          <GiraGrupoChips grupos={grupos} compact />
        ) : (
          <span className="fimba-muted" style={{ fontSize: "0.72rem" }}>—</span>
        )}
      </td>
      <td className="fimba-planilla-wrap">
        <FimbaVenueAforoCell
          eventoId={evt.id}
          value={evt.observaciones_aforo}
          readOnly={readOnly}
          onSaved={onAforoSaved}
        />
      </td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        <div style={{ display: "inline-flex", gap: "0.15rem" }}>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            style={{ padding: "0.3rem 0.45rem" }}
            title="Ver escenario"
            onClick={() => onViewStagePlot(evt)}
          >
            <IconEye size={14} />
          </button>
          {stagePlotTo && (
            <Link
              to={stagePlotTo}
              className="fimba-btn fimba-btn-ghost"
              style={{ padding: "0.3rem 0.45rem", textDecoration: "none" }}
              title="Editar escenario en la gira OFRN"
            >
              <IconLayout size={14} />
            </Link>
          )}
          {!readOnly && (
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              style={{ padding: "0.3rem 0.45rem" }}
              title="Editar evento"
              onClick={() => onEditEvent(evt)}
            >
              <IconHistory size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Venues FIMBA: locaciones con conciertos de la edición + metadata operativa.
 */
export default function FimbaVenuesPage() {
  const { edicionId } = useParams();
  const { readOnly } = useFimbaAccess();
  const { isManagement } = useAuth();
  const canEditVenueInfo = !readOnly;

  const [edicion, setEdicion] = useState(null);
  const [events, setEvents] = useState([]);
  const [venueInfoRows, setVenueInfoRows] = useState([]);
  const [propuestas, setPropuestas] = useState([]);
  const [flota, setFlota] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dateFrom, setDateFrom] = useState(() =>
    format(startOfDay(new Date()), "yyyy-MM-dd"),
  );
  const [dateTo, setDateTo] = useState("");
  const [selectedLocationIds, setSelectedLocationIds] = useState([]);
  /** Venue-level accordion: all collapsed on load (no auto-expand). */
  const [expandedVenueIds, setExpandedVenueIds] = useState(() => new Set());
  /** Nested: Información / Espectáculos — both start collapsed until user opens. */
  const [expandedInfoIds, setExpandedInfoIds] = useState(() => new Set());
  const [expandedShowsIds, setExpandedShowsIds] = useState(() => new Set());

  const [stagePlotViewerEvent, setStagePlotViewerEvent] = useState(null);
  const [editModal, setEditModal] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { edicion: ed, error: eEd },
        { events: evts, error: eEv },
        { propuestas: props, error: eProp },
        { venueInfo, error: eInfo },
      ] = await Promise.all([
        getFimbaEdicionById(edicionId),
        listFimbaConcertVenues(edicionId),
        listFimbaPropuestas(edicionId),
        listFimbaVenueInfo(edicionId),
      ]);
      if (eEd) throw eEd;
      if (eEv) throw eEv;
      if (eProp) throw eProp;
      if (eInfo) throw eInfo;
      setEdicion(ed);
      setEvents(evts || []);
      setPropuestas(props || []);
      setVenueInfoRows(venueInfo || []);

      if (ed?.id_gira) {
        const { flota: fleet, error: eFleet } = await listFimbaFlota(ed.id_gira);
        if (eFleet) throw eFleet;
        setFlota(fleet || []);
      } else {
        setFlota([]);
      }
    } catch (err) {
      console.error("[FimbaVenuesPage] reload:", err);
      setError(err?.message || "No se pudieron cargar los venues.");
    } finally {
      setLoading(false);
    }
  }, [edicionId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const venueInfoByLocId = useMemo(() => {
    const map = new Map();
    venueInfoRows.forEach((row) => {
      if (row.id_locacion != null) map.set(row.id_locacion, row);
    });
    return map;
  }, [venueInfoRows]);

  const locationOptions = useMemo(() => {
    const byId = new Map();
    events.forEach((evt) => {
      const loc = evt.locaciones;
      if (loc && loc.id != null && !byId.has(loc.id)) {
        const localidad = loc.localidades?.localidad || null;
        const dims = formatVenueStageDims(loc);
        byId.set(loc.id, {
          id: loc.id,
          label: loc.nombre || "Sin nombre",
          subLabel: [localidad, dims].filter(Boolean).join(" · ") || loc.direccion || null,
        });
      }
    });
    return Array.from(byId.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es"),
    );
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const evtDate = evt.fecha || "";
      if (dateFrom && evtDate < dateFrom) return false;
      if (dateTo && evtDate > dateTo) return false;
      if (selectedLocationIds.length > 0) {
        const locId = evt.locaciones?.id ?? evt.id_locacion ?? null;
        if (!locId || !selectedLocationIds.includes(locId)) return false;
      }
      return true;
    });
  }, [events, dateFrom, dateTo, selectedLocationIds]);

  const venuesGrouped = useMemo(
    () => groupEventsByLocacion(filteredEvents),
    [filteredEvents],
  );

  const toggleVenueExpanded = useCallback((locId) => {
    setExpandedVenueIds((prev) => {
      const next = new Set(prev);
      if (next.has(locId)) next.delete(locId);
      else next.add(locId);
      return next;
    });
  }, []);

  const toggleSetId = useCallback((setter, id) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleVenueInfoSaved = useCallback((locId, draft) => {
    const capacidadParsed =
      draft.capacidad == null || String(draft.capacidad).trim() === ""
        ? null
        : Number(draft.capacidad);
    setEvents((prev) =>
      prev.map((evt) => {
        const loc = evt.locaciones;
        if (!loc || loc.id !== locId) return evt;
        return {
          ...evt,
          locaciones: {
            ...loc,
            nombre: draft.nombre,
            direccion: draft.direccion,
            capacidad: Number.isFinite(capacidadParsed) ? capacidadParsed : null,
          },
        };
      }),
    );
    setVenueInfoRows((prev) => {
      const idx = prev.findIndex((r) => r.id_locacion === locId);
      const patch = {
        id_edicion: Number(edicionId),
        id_locacion: locId,
        referente_nombre: draft.referente_nombre || null,
        referente_telefono: draft.referente_telefono || null,
        rider_disponible: draft.rider_disponible || null,
        sillas_disponibles: draft.sillas_disponibles || null,
        agua: draft.agua || null,
        observaciones: draft.observaciones || null,
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...patch };
        return next;
      }
      return [...prev, patch];
    });
  }, [edicionId]);

  const handleAforoSaved = useCallback((eventoId, observacionesAforo) => {
    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === eventoId
          ? { ...evt, observaciones_aforo: observacionesAforo }
          : evt,
      ),
    );
  }, []);

  const openEditEvent = useCallback(
    (evt) => {
      if (readOnly) return;
      setEditModal({
        mode: "edit",
        evento: {
          ...evt,
          propuestas: extractEventArtistas(evt),
        },
      });
    },
    [readOnly],
  );

  const edicionLabel = edicion?.nombre || `Edición ${edicionId}`;
  const giraProgram = edicion?.programas || null;

  return (
    <div className="fimba-venues-wide">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <div>
          <Link
            to={`/fimba/edicion/${edicionId}`}
            className="fimba-btn fimba-btn-ghost"
            style={{ marginBottom: "0.5rem", textDecoration: "none", display: "inline-flex" }}
          >
            <IconArrowLeft size={14} /> Artistas
          </Link>
          <h1 style={{ margin: 0, fontSize: "1.35rem", color: "var(--fimba-deep)" }}>
            Venues
          </h1>
          <p className="fimba-muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
            {edicionLabel}
            {giraProgram?.nomenclador ? ` · ${giraProgram.nomenclador}` : ""}
          </p>
        </div>
        {loading && (
          <span className="fimba-muted" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IconLoader className="animate-spin" size={16} /> Cargando…
          </span>
        )}
      </div>

      {error && <div className="fimba-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      <div className="fimba-card" style={{ marginBottom: "1rem" }}>
        <div className="fimba-grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <DateInput label="Fecha desde" value={dateFrom} onChange={setDateFrom} />
          <DateInput label="Fecha hasta" value={dateTo} onChange={setDateTo} />
          <div>
            <label className="fimba-label">Locaciones</label>
            <SearchableSelect
              options={locationOptions}
              value={selectedLocationIds}
              onChange={setSelectedLocationIds}
              isMulti
              placeholder="Todas…"
              dropdownMinWidth={260}
            />
          </div>
        </div>
      </div>

      <div className="fimba-card fimba-planilla-card">
        <div
          style={{
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--fimba-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div>
            <strong style={{ fontSize: "0.9rem" }}>Venues con espectáculos</strong>
            <div className="fimba-muted" style={{ fontSize: "0.75rem", marginTop: "0.15rem" }}>
              {venuesGrouped.length} venue{venuesGrouped.length === 1 ? "" : "s"} ·{" "}
              {filteredEvents.length} espectáculo
              {filteredEvents.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {filteredEvents.length === 0 && !loading ? (
          <p className="fimba-muted" style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            No hay conciertos con locación en esta edición para los filtros actuales.
          </p>
        ) : (
          <div>
            {venuesGrouped.map(({ locacion, events: venueEvents }) => {
              const locId = locacion.id;
              const isExpanded = expandedVenueIds.has(locId);
              const infoOpen = expandedInfoIds.has(locId);
              const showsOpen = expandedShowsIds.has(locId);
              const localidad = locacion.localidades?.localidad || null;
              const stageDims = formatVenueStageDims(locacion);
              const venueInfo = venueInfoByLocId.get(locId) || null;
              const agendaHref = `/fimba/edicion/${edicionId}/agenda?locacion=${locId}`;
              const dateRange = formatVenueShowsDateRange(venueEvents);
              const badgeLabel = [
                `${venueEvents.length} espectáculo${venueEvents.length === 1 ? "" : "s"}`,
                dateRange,
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <section
                  key={locId}
                  style={{ borderTop: "1px solid #f1f5f9" }}
                >
                  <button
                    type="button"
                    onClick={() => toggleVenueExpanded(locId)}
                    aria-expanded={isExpanded}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.65rem",
                      padding: "0.85rem 1rem",
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span className="fimba-muted" style={{ marginTop: 2 }}>
                      {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                    </span>
                    <span style={{ color: "var(--fimba-accent)", marginTop: 2 }}>
                      <IconMapPin size={16} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem 0.65rem", alignItems: "center" }}>
                        <strong style={{ fontSize: "0.92rem" }}>
                          {locacion.nombre || "Sin nombre"}
                        </strong>
                        {localidad && (
                          <span className="fimba-muted" style={{ fontSize: "0.78rem" }}>
                            {localidad}
                          </span>
                        )}
                        <span className="fimba-badge fimba-badge-fimba">
                          {badgeLabel}
                        </span>
                      </div>
                      <div
                        className="fimba-muted"
                        style={{
                          fontSize: "0.72rem",
                          marginTop: "0.25rem",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem 1rem",
                        }}
                      >
                        {locacion.direccion && <span>{locacion.direccion}</span>}
                        {stageDims ? (
                          <span>
                            Escenario: <strong>{stageDims}</strong>
                          </span>
                        ) : (
                          <span style={{ fontStyle: "italic" }}>Sin medidas de escenario</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      style={{
                        /* Align body under venue name (past chevron + pin). */
                        padding:
                          "0 1rem 0.85rem calc(1rem + 32px + 1.3rem)",
                      }}
                    >
                      <div
                        style={{
                          border: "1px solid #eef2f7",
                          borderRadius: 8,
                          overflow: "hidden",
                          background: "#fafbfc",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSetId(setExpandedInfoIds, locId)}
                          aria-expanded={infoOpen}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.55rem 0.75rem",
                            border: 0,
                            borderBottom: "1px solid #eef2f7",
                            background: "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span className="fimba-muted">
                            {infoOpen ? (
                              <IconChevronUp size={14} />
                            ) : (
                              <IconChevronDown size={14} />
                            )}
                          </span>
                          <strong style={{ fontSize: "0.8rem", color: "var(--fimba-deep)" }}>
                            Información
                          </strong>
                        </button>
                        {infoOpen && (
                          <div style={{ padding: "0 0.75rem" }}>
                            <FimbaVenueInfoSection
                              edicionId={edicionId}
                              locacion={locacion}
                              venueInfo={venueInfo}
                              canEdit={canEditVenueInfo}
                              onSaved={handleVenueInfoSaved}
                              agendaHref={agendaHref}
                              hideTitle
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleSetId(setExpandedShowsIds, locId)}
                          aria-expanded={showsOpen}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.55rem 0.75rem",
                            border: 0,
                            borderTop: infoOpen ? "1px solid #eef2f7" : undefined,
                            borderBottom: showsOpen ? "1px solid #eef2f7" : undefined,
                            background: "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span className="fimba-muted">
                            {showsOpen ? (
                              <IconChevronUp size={14} />
                            ) : (
                              <IconChevronDown size={14} />
                            )}
                          </span>
                          <strong style={{ fontSize: "0.8rem", color: "var(--fimba-deep)" }}>
                            Espectáculos
                          </strong>
                          <span className="fimba-muted" style={{ fontSize: "0.72rem" }}>
                            ({venueEvents.length})
                          </span>
                        </button>
                        {showsOpen && (
                          <div className="fimba-planilla-scroll">
                            <table className="fimba-table fimba-planilla-table">
                              <thead>
                                <tr>
                                  <th>Fecha</th>
                                  <th>Actividad</th>
                                  <th>Artistas</th>
                                  <th>Grupos OFRN</th>
                                  <th>Obs. aforo</th>
                                  <th style={{ textAlign: "right" }}>Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {venueEvents.map((evt) => (
                                  <FimbaVenueEventRow
                                    key={evt.id}
                                    evt={evt}
                                    readOnly={readOnly}
                                    showStagePlotEditorLink={isManagement}
                                    onViewStagePlot={setStagePlotViewerEvent}
                                    onEditEvent={openEditEvent}
                                    onAforoSaved={handleAforoSaved}
                                  />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <StagePlotViewerModal
        open={!!stagePlotViewerEvent}
        onClose={() => setStagePlotViewerEvent(null)}
        supabase={supabase}
        evento={stagePlotViewerEvent}
        gira={giraProgram}
      />

      {editModal &&
        edicion &&
        createPortal(
          <FimbaEventoFormModal
            mode={editModal.mode}
            evento={editModal.evento}
            edicion={edicion}
            flota={flota}
            propuestas={propuestas}
            onClose={() => setEditModal(null)}
            onSaved={() => {
              setEditModal(null);
              reload();
            }}
          />,
          document.body,
        )}
    </div>
  );
}
