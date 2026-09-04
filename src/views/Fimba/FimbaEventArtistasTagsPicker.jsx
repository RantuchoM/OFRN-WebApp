import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconCheck,
  IconLoader,
  IconTag,
  IconX,
} from "../../components/ui/Icons";
import { supabase } from "../../services/supabase";
import {
  listFimbaGiraGrupos,
  listFimbaPropuestas,
  setEventoFimbaPropuestas,
} from "../../services/fimbaService";
import {
  eventGrupoIdsFromEvent,
  setEventoGrupos,
} from "../../services/giraGruposService";
import { sortFimbaPropuestasByNombre } from "../../utils/fimbaAgendaSort";

function grupoIdsFromEvent(ev) {
  const fromRaw = eventGrupoIdsFromEvent(ev);
  if (fromRaw.length > 0) return fromRaw;
  return (ev?.grupos || [])
    .map((g) => Number(g?.id ?? g))
    .filter((id) => Number.isFinite(id));
}

function initialAudienciaOfrn(evento) {
  const ao = evento?.audiencia_ofrn;
  const grupoIds = grupoIdsFromEvent(evento);
  if (grupoIds.length > 0 || ao === "grupos") return "grupos";
  if (ao === "tutti") return "tutti";
  if (ao === "none") return "none";
  if (!evento) return "none";
  if (ao == null || ao === "") return "tutti";
  return "none";
}

function eventLabel(ev) {
  const raw =
    ev?.actividad ||
    ev?.descripcion?.replace(/<[^>]+>/g, "").trim() ||
    ev?.tipos_evento?.nombre ||
    ev?.tipo_nombre ||
    "";
  const text = String(raw).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "Evento";
  return text.length > 64 ? `${text.slice(0, 64)}…` : text;
}

/**
 * Modal compacto (portal z-100): multi-select de artistas FIMBA + audiencia OFRN
 * (Ninguna / Tutti / grupos de gira). Persistencia vía setEventoFimbaPropuestas,
 * setEventoGrupos y eventos.audiencia_ofrn.
 *
 * Con `draftMode` no escribe en DB: `onApply({ id_propuestas, id_grupos, audiencia_ofrn })`.
 * Útil al crear eventos (p.ej. recorrido intermedio) antes de tener `evento.id`.
 */
export default function FimbaEventArtistasTagsPicker({
  open,
  evento,
  propuestas: propuestasProp = [],
  giraGrupos: giraGruposProp = [],
  edicion = null,
  draftMode = false,
  onClose,
  onSaved,
  onApply,
}) {
  const [selectedProps, setSelectedProps] = useState([]);
  const [audienciaOfrn, setAudienciaOfrn] = useState("none");
  const [selectedGrupoIds, setSelectedGrupoIds] = useState([]);
  const [propuestas, setPropuestas] = useState([]);
  const [giraGrupos, setGiraGrupos] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [tagFilter, setTagFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !evento) return;
    setSelectedProps(
      (evento.propuestas || []).map((p) => String(p.id ?? p)).filter(Boolean),
    );
    setAudienciaOfrn(initialAudienciaOfrn(evento));
    setSelectedGrupoIds(grupoIdsFromEvent(evento).map(String));
    setTagFilter("");
    setError(null);
  }, [open, evento]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      const haveProps = (propuestasProp || []).length > 0;
      const haveGrupos = (giraGruposProp || []).length > 0;
      if (haveProps) setPropuestas(propuestasProp);
      if (haveGrupos) setGiraGrupos(giraGruposProp);
      if (haveProps && haveGrupos) return;

      const edicionId = edicion?.id ?? null;
      const idGira = edicion?.id_gira ?? evento?.id_gira ?? null;
      if (!edicionId && !idGira) return;

      setCatalogLoading(true);
      try {
        const tasks = [];
        if (!haveProps && edicionId != null) {
          tasks.push(
            listFimbaPropuestas(edicionId).then((res) => {
              if (!cancelled && !res.error) {
                setPropuestas(res.propuestas || []);
              }
            }),
          );
        }
        if (!haveGrupos && idGira != null) {
          tasks.push(
            listFimbaGiraGrupos(idGira).then((res) => {
              if (!cancelled && !res.error) {
                setGiraGrupos(res.grupos || []);
              }
            }),
          );
        }
        await Promise.all(tasks);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, propuestasProp, giraGruposProp, edicion, evento]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  const sortedPropuestas = useMemo(
    () => sortFimbaPropuestasByNombre(propuestas),
    [propuestas],
  );

  const filteredPropuestas = useMemo(() => {
    const q = tagFilter.trim().toLowerCase();
    if (!q) return sortedPropuestas;
    return sortedPropuestas.filter((p) =>
      String(p.nombre || "")
        .toLowerCase()
        .includes(q),
    );
  }, [sortedPropuestas, tagFilter]);

  if (!open || !evento) return null;

  const selectedPropSet = new Set(selectedProps.map(String));
  const selectedGrupoSet = new Set(selectedGrupoIds.map(String));

  const toggleProp = (id) => {
    const sid = String(id);
    setSelectedProps((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid],
    );
  };

  const toggleGrupo = (id) => {
    const sid = String(id);
    setSelectedGrupoIds((prev) => {
      const next = prev.includes(sid)
        ? prev.filter((x) => x !== sid)
        : [...prev, sid];
      if (next.length > 0) setAudienciaOfrn("grupos");
      return next;
    });
  };

  const setAudienciaMode = (mode) => {
    setAudienciaOfrn(mode);
    if (mode !== "grupos") setSelectedGrupoIds([]);
  };

  const handleSave = async () => {
    let ao = audienciaOfrn || "none";
    const idGrupos =
      ao === "grupos"
        ? selectedGrupoIds.map(Number).filter((n) => Number.isFinite(n))
        : [];
    if (ao === "grupos" && idGrupos.length === 0) {
      setError("Seleccioná uno o más grupos OFRN de la gira");
      return;
    }
    const propIds = selectedProps.map(Number).filter(Number.isFinite);
    const tagsPayload = {
      id_propuestas: propIds,
      id_grupos: idGrupos,
      audiencia_ofrn: ao,
    };

    if (draftMode) {
      setError(null);
      await onApply?.(tagsPayload);
      onClose?.();
      return;
    }

    if (!evento?.id) return;

    setSaving(true);
    setError(null);
    try {
      const { error: propErr } = await setEventoFimbaPropuestas(
        evento.id,
        propIds,
      );
      if (propErr) throw propErr;

      const { error: gruposErr } = await setEventoGrupos(
        supabase,
        evento.id,
        idGrupos,
      );
      if (gruposErr) throw gruposErr;

      const { error: aoErr } = await supabase
        .from("eventos")
        .update({ audiencia_ofrn: ao })
        .eq("id", evento.id);
      if (aoErr) throw aoErr;

      await onSaved?.(evento.id, tagsPayload);
      onClose?.();
    } catch (err) {
      setError(err?.message || String(err) || "No se pudieron guardar los tags");
    } finally {
      setSaving(false);
    }
  };

  const modal = (
    <div
      className="fimba-modal-backdrop"
      onClick={() => {
        if (!saving) onClose?.();
      }}
      role="presentation"
    >
      <div
        className="fimba-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fimba-artistas-tags-picker-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 420,
          width: "min(420px, 96vw)",
          maxHeight: "min(90vh, 36rem)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
            padding: "1rem 1.15rem 0.75rem",
            borderBottom: "1px solid var(--fimba-border, #e2e8f0)",
            flexShrink: 0,
          }}
        >
          <div className="min-w-0" style={{ minWidth: 0 }}>
            <h2
              id="fimba-artistas-tags-picker-title"
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "1.05rem",
                color: "var(--fimba-deep)",
              }}
            >
              <IconTag size={16} style={{ color: "var(--fimba-accent)" }} />
              Artistas / grupos
            </h2>
            <p
              className="fimba-muted"
              style={{ margin: "0.25rem 0 0", fontSize: "0.75rem" }}
              title={eventLabel(evento)}
            >
              {eventLabel(evento)}
            </p>
          </div>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            style={{ padding: "0.25rem 0.4rem", flexShrink: 0 }}
          >
            <IconX size={16} />
          </button>
        </div>

        <div
          style={{
            overflowY: "auto",
            flex: 1,
            padding: "0.85rem 1.15rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {error && <div className="fimba-error">{error}</div>}

          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <label className="fimba-label" style={{ margin: 0 }}>
                Artistas FIMBA
              </label>
              {sortedPropuestas.length > 0 && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="fimba-btn fimba-btn-ghost"
                    disabled={saving}
                    onClick={() =>
                      setSelectedProps(sortedPropuestas.map((p) => String(p.id)))
                    }
                    style={{
                      padding: 0,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "var(--fimba-accent)",
                    }}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className="fimba-btn fimba-btn-ghost"
                    disabled={saving || selectedProps.length === 0}
                    onClick={() => setSelectedProps([])}
                    style={{
                      padding: 0,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "var(--fimba-muted)",
                    }}
                  >
                    Ninguno
                  </button>
                </div>
              )}
            </div>
            {catalogLoading && sortedPropuestas.length === 0 ? (
              <p className="fimba-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                Cargando artistas…
              </p>
            ) : sortedPropuestas.length === 0 ? (
              <p className="fimba-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                Sin artistas en la edición. Podés guardar igual (evento de edición).
              </p>
            ) : (
              <>
                <input
                  type="search"
                  className="fimba-input"
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  placeholder="Filtrar artistas…"
                  aria-label="Filtrar artistas"
                  disabled={saving}
                  style={{
                    width: "100%",
                    marginBottom: 8,
                    padding: "0.4rem 0.65rem",
                    fontSize: "0.8rem",
                  }}
                />
                {filteredPropuestas.length === 0 ? (
                  <p className="fimba-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                    Ningún artista coincide con el filtro.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      maxHeight: "11rem",
                      overflowY: "auto",
                    }}
                  >
                    {filteredPropuestas.map((p) => {
                      const on = selectedPropSet.has(String(p.id));
                      const color = p.color || "var(--fimba-accent, #d73289)";
                      return (
                        <label
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "0.45rem 0.55rem",
                            borderRadius: 8,
                            cursor: saving ? "default" : "pointer",
                            border: `1px solid ${on ? color : "transparent"}`,
                            background: on ? `${color}18` : "transparent",
                            userSelect: "none",
                          }}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={on}
                            disabled={saving}
                            onChange={() => toggleProp(p.id)}
                          />
                          <span
                            aria-hidden
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              border: `1.5px solid ${on ? color : "#cbd5e1"}`,
                              background: on ? color : "#fff",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {on && <IconCheck size={11} style={{ color: "#fff" }} />}
                          </span>
                          <span
                            aria-hidden
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background: color,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: on ? 700 : 500,
                              color: on ? "var(--fimba-deep)" : "var(--fimba-text)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.nombre}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>

          <section>
            <label className="fimba-label">Audiencia OFRN</label>
            <div
              style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}
            >
              {[
                { value: "none", label: "Ninguna" },
                { value: "tutti", label: "Tutti" },
                { value: "grupos", label: "Grupos" },
              ].map((opt) => {
                const on = audienciaOfrn === opt.value;
                const ofrnShape = opt.value !== "none";
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`fimba-btn fimba-chip${on ? " fimba-chip-on" : ""}${
                      ofrnShape ? " fimba-chip-ofrn" : ""
                    }`}
                    onClick={() => setAudienciaMode(opt.value)}
                    disabled={saving}
                    style={{ padding: "0.35rem 0.7rem", fontSize: "0.8rem" }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {audienciaOfrn === "grupos" && (
              <div>
                {catalogLoading && giraGrupos.length === 0 ? (
                  <p className="fimba-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                    Cargando grupos de la gira…
                  </p>
                ) : giraGrupos.length === 0 ? (
                  <p className="fimba-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                    Esta gira no tiene grupos de convocatoria. Creálos en roster
                    OFRN (Grupos) o elegí Tutti / Ninguna.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      maxHeight: "9rem",
                      overflowY: "auto",
                    }}
                  >
                    {giraGrupos.map((g) => {
                      const on = selectedGrupoSet.has(String(g.id));
                      const color = g.color || "#0369a1";
                      return (
                        <label
                          key={g.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "0.45rem 0.55rem",
                            borderRadius: 8,
                            cursor: saving ? "default" : "pointer",
                            border: `1px solid ${on ? color : "transparent"}`,
                            background: on ? `${color}18` : "transparent",
                            userSelect: "none",
                          }}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={on}
                            disabled={saving}
                            onChange={() => toggleGrupo(g.id)}
                          />
                          <span
                            aria-hidden
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 2,
                              border: `1.5px solid ${on ? color : "#cbd5e1"}`,
                              background: on ? color : "#fff",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {on && <IconCheck size={11} style={{ color: "#fff" }} />}
                          </span>
                          <span
                            aria-hidden
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 2,
                              background: color,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: on ? 700 : 500,
                              color: on ? "#0c4a6e" : "var(--fimba-text)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {g.nombre}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <p
              className="fimba-muted"
              style={{ margin: "0.35rem 0 0", fontSize: "0.72rem" }}
            >
              {audienciaOfrn === "none" && "Solo FIMBA — no convoca roster OFRN."}
              {audienciaOfrn === "tutti" &&
                "Convoca toda la gira (evento general OFRN)."}
              {audienciaOfrn === "grupos" &&
                (draftMode
                  ? "Se aplicará audiencia_ofrn=grupos + eventos_grupos al crear."
                  : "Persistido en audiencia_ofrn=grupos + eventos_grupos.")}
            </p>
          </section>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "0.85rem 1.15rem",
            borderTop: "1px solid var(--fimba-border, #e2e8f0)",
            background: "var(--fimba-bg, #f6f8fb)",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="fimba-btn fimba-btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {saving ? (
              <>
                <IconLoader size={14} className="animate-spin" /> Guardando…
              </>
            ) : (
              <>
                <IconCheck size={14} /> {draftMode ? "Aplicar" : "Guardar"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
