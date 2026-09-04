import React, { useState } from "react";
import { IconPlus } from "../../components/ui/Icons";
import { sortFimbaPropuestasByNombre } from "../../utils/fimbaAgendaSort";
import FimbaEventArtistasTagsPicker from "./FimbaEventArtistasTagsPicker";

/**
 * Celda ARTISTAS (Agenda / Transportes): chips de propuestas + convocatoria OFRN,
 * vacío accionable (no el dead label «Edición»).
 *
 * Clic en «+ Artistas» o en chips existentes abre el picker compacto
 * (`FimbaEventArtistasTagsPicker`) — no el form completo.
 *
 * «Edición» era un placeholder de evento sin tags de artista ni orquesta_label
 * (visible en toda la edición). No era audiencia_ofrn=tutti ni un estado disabled.
 *
 * @param {object} props
 * @param {object} props.ev
 * @param {boolean} [props.canEdit]
 * @param {Array} [props.propuestas] — catálogo edición (reutilizado de Agenda/Transportes)
 * @param {Array} [props.giraGrupos] — grupos OFRN de la gira
 * @param {object|null} [props.edicion]
 * @param {(eventoId: number|string, tags?: object) => void|Promise} [props.onSaved]
 * @param {boolean} [props.showOfrnChips] — Transportes: mostrar Tutti/grupos (no hay col. OFRN).
 */
export default function FimbaEventArtistasTagsCell({
  ev,
  canEdit = false,
  propuestas = [],
  giraGrupos = [],
  edicion = null,
  onSaved = null,
  showOfrnChips = false,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const taggedPropuestas = sortFimbaPropuestasByNombre(ev?.propuestas || []);
  const grupos = Array.isArray(ev?.grupos) ? ev.grupos : [];
  const ao = ev?.audiencia_ofrn;
  const orquestaLabel = ev?.orquesta_label || null;

  const showTuttiChip =
    showOfrnChips &&
    (ao === "tutti" || (ev?.es_ofrn && (ao == null || ao === "") && grupos.length === 0));
  const showGrupoChips = showOfrnChips && grupos.length > 0;
  const showOrquestaFallback =
    Boolean(orquestaLabel) && !showTuttiChip && !showGrupoChips;

  const hasAny =
    taggedPropuestas.length > 0 ||
    showTuttiChip ||
    showGrupoChips ||
    showOrquestaFallback;

  const interactive = Boolean(canEdit && onSaved);

  const openPicker = (e) => {
    if (!interactive) return;
    e?.stopPropagation?.();
    e?.preventDefault?.();
    setPickerOpen(true);
  };

  const shellProps = interactive
    ? {
        role: "button",
        tabIndex: 0,
        onClick: openPicker,
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") openPicker(e);
        },
      }
    : {};

  return (
    <>
      <div
        className={
          interactive
            ? "fimba-artistas-tags-cell fimba-artistas-tags-cell--editable"
            : "fimba-artistas-tags-cell"
        }
        {...shellProps}
        onDoubleClick={(e) => e.stopPropagation()}
        title={
          interactive
            ? hasAny
              ? "Clic para editar artistas / grupos OFRN"
              : "Sin tags de artista: visible en toda la edición. Clic para etiquetar."
            : hasAny
              ? undefined
              : "Sin tags de artista (evento de toda la edición)"
        }
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          alignItems: "center",
          cursor: interactive ? "pointer" : undefined,
          minHeight: "1.5rem",
        }}
      >
        {taggedPropuestas.map((p) => (
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
        {showGrupoChips
          ? grupos.map((g) => (
              <span
                key={g.id}
                className="fimba-badge fimba-badge-ofrn-grupo"
                style={{
                  background: g.color ? `${g.color}22` : "#e0f2fe",
                  color: g.color || "#0369a1",
                  border: `1px solid ${g.color || "#7dd3fc"}44`,
                }}
              >
                {g.nombre}
              </span>
            ))
          : null}
        {showTuttiChip ? (
          <span
            className="fimba-badge fimba-badge-ofrn-grupo"
            style={{
              background: "#e0f2fe",
              color: "#0369a1",
              border: "1px solid #7dd3fc44",
            }}
          >
            {orquestaLabel || "Tutti"}
          </span>
        ) : null}
        {showOrquestaFallback ? (
          <span className="fimba-muted" style={{ fontSize: "0.8rem" }}>
            {orquestaLabel}
          </span>
        ) : null}
        {!hasAny ? (
          interactive ? (
            <span
              className="fimba-muted"
              style={{
                fontSize: "0.75rem",
                color: "var(--fimba-cyan, #0e7490)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontWeight: 600,
              }}
            >
              <IconPlus size={12} aria-hidden />
              Artistas
            </span>
          ) : (
            <span className="fimba-muted" style={{ fontSize: "0.8rem" }}>
              Sin artistas
            </span>
          )
        ) : null}
      </div>

      {interactive && (
        <FimbaEventArtistasTagsPicker
          open={pickerOpen}
          evento={ev}
          propuestas={propuestas}
          giraGrupos={giraGrupos}
          edicion={edicion}
          onClose={() => setPickerOpen(false)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
