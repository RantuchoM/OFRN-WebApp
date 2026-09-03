import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconDrive,
  IconExternalLink,
  IconEye,
  IconLayers,
  IconLayout,
  IconX,
} from "../../components/ui/Icons";
import GiraGrupoChips from "../../components/giras/GiraGrupoChips";
import {
  buildDriveFilePreviewUrl,
  formatFimbaMonto,
  resolveFimbaBacklineEstado,
  resolvePlantaEscenarioLabel,
} from "../../services/fimbaService";
import { supabase } from "../../services/supabase";
import {
  extractEventGrupos,
  formatVenueEventDate,
} from "../../utils/venueDisplayUtils";
import {
  isFimbaRiderEmpty,
  sanitizeFimbaRiderHtml,
} from "../../utils/fimbaRider";
import { resolveEventFimbaPropuestas } from "../../utils/fimbaAgendaConsulta";
import StagePlotViewerModal from "../Giras/StagePlotViewerModal";

function eventStagePlotId(evt) {
  const rows = evt?.stage_plot_eventos;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0]?.id_stage_plot || null;
}

function eventStagePlotNombre(evt) {
  const rows = evt?.stage_plot_eventos;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const plot = rows[0]?.stage_plots;
  const raw = Array.isArray(plot) ? plot[0]?.nombre : plot?.nombre;
  const n = String(raw || "").trim();
  return n || null;
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        className="fimba-label"
        style={{ fontSize: "0.68rem", letterSpacing: "0.04em" }}
      >
        {label}
      </div>
      <div style={{ fontSize: "0.88rem", color: "#1e293b" }}>{children}</div>
    </div>
  );
}

function ArtistaChips({ artistas }) {
  if (!artistas?.length) {
    return <span className="fimba-muted">—</span>;
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

/**
 * Modal consulta (solo lectura) de Backline para un evento de agenda.
 * Portal a document.body, z-[100].
 */
export default function FimbaBacklineConsultaModal({
  open,
  onClose,
  evento,
  supabaseClient = supabase,
}) {
  const [stagePlotOpen, setStagePlotOpen] = useState(false);

  const artistas = useMemo(
    () => (evento ? resolveEventFimbaPropuestas(evento) : []),
    [evento],
  );
  const grupos = useMemo(
    () => (evento ? extractEventGrupos(evento) : []),
    [evento],
  );
  const estado = useMemo(
    () => resolveFimbaBacklineEstado(evento?.backline_estado),
    [evento?.backline_estado],
  );
  const fechaFormatted = formatVenueEventDate(evento?.fecha);
  const hora = evento?.hora_inicio ? String(evento.hora_inicio).slice(0, 5) : "";
  const venueName = evento?.locaciones?.nombre || evento?.locacion_nombre || null;
  const localidad =
    evento?.locaciones?.localidades?.localidad ||
    evento?.locacion_ciudad ||
    null;
  const montoLabel = formatFimbaMonto(evento?.backline_monto);
  const plantaUrl = String(evento?.planta_escenario_url || "").trim();
  const plantaLabel = resolvePlantaEscenarioLabel({
    url: plantaUrl,
    nombre: evento?.planta_escenario_nombre,
  });
  const previewUrl = buildDriveFilePreviewUrl(plantaUrl);
  const plotId = eventStagePlotId(evento);
  const plotNombre = eventStagePlotNombre(evento);
  const descHtml = evento?.backline_descripcion;

  if (!open || !evento) return null;

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4"
          onClick={onClose}
          role="presentation"
        >
          <div
            className="bg-white w-full max-w-lg max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fimba-backline-consulta-title"
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3 bg-slate-50 shrink-0">
              <div className="min-w-0 flex items-start gap-2">
                <span className="mt-0.5 text-fuchsia-700 shrink-0">
                  <IconLayers size={18} />
                </span>
                <div className="min-w-0">
                  <h3
                    id="fimba-backline-consulta-title"
                    className="font-bold text-slate-800 text-base"
                  >
                    Backline
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    {[fechaFormatted, hora ? `${hora} hs` : null]
                      .filter(Boolean)
                      .join(" · ") || "Consulta"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Cerrar"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-4">
              <div
                className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col gap-3.5 shadow-sm"
                style={
                  estado
                    ? { backgroundColor: `${estado.bg}22`, borderColor: `${estado.border}55` }
                    : undefined
                }
              >
                <Field label="Estado">
                  {estado ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden
                        style={{
                          width: "0.9rem",
                          height: "0.9rem",
                          borderRadius: "999px",
                          background: estado.bg,
                          border: `2px solid ${estado.border}`,
                          display: "inline-block",
                        }}
                      />
                      <span style={{ fontWeight: 600 }}>{estado.label}</span>
                    </span>
                  ) : (
                    <span className="fimba-muted">Sin estado</span>
                  )}
                </Field>

                <Field label="Artista">
                  <ArtistaChips artistas={artistas} />
                </Field>

                {grupos.length > 0 ? (
                  <Field label="Grupos OFRN">
                    <GiraGrupoChips
                      grupos={grupos}
                      className="fimba-ofrn-grupo-chips"
                    />
                  </Field>
                ) : null}

                <Field label="Venue">
                  {venueName ? (
                    <div>
                      <div style={{ fontWeight: 600 }}>{venueName}</div>
                      {localidad ? (
                        <div className="fimba-muted" style={{ fontSize: "0.75rem" }}>
                          {localidad}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <span className="fimba-muted" style={{ fontStyle: "italic" }}>
                      Sin locación
                    </span>
                  )}
                </Field>

                <Field label="Fecha">
                  <div style={{ fontWeight: 600 }}>
                    {fechaFormatted || "—"}
                    {hora ? (
                      <span className="fimba-muted" style={{ fontWeight: 400 }}>
                        {" "}
                        · {hora} hs
                      </span>
                    ) : null}
                  </div>
                </Field>

                <Field label="Descripción">
                  {isFimbaRiderEmpty(descHtml) ? (
                    <span className="fimba-muted" style={{ fontStyle: "italic" }}>
                      —
                    </span>
                  ) : (
                    <div
                      className="fimba-rider-html"
                      style={{ fontSize: "0.85rem", lineHeight: 1.45 }}
                      dangerouslySetInnerHTML={{
                        __html: sanitizeFimbaRiderHtml(descHtml),
                      }}
                    />
                  )}
                </Field>

                <Field label="Planta de escenario">
                  <div className="flex flex-col gap-2">
                    {plantaUrl ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={plantaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:text-sky-900"
                        >
                          <IconDrive size={14} />
                          {plantaLabel || "Abrir planta"}
                          <IconExternalLink size={12} />
                        </a>
                        {previewUrl ? (
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                          >
                            <IconEye size={12} />
                            Vista previa
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                    {plotId ? (
                      <button
                        type="button"
                        onClick={() => setStagePlotOpen(true)}
                        className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                      >
                        <IconLayout size={14} />
                        {plotNombre || "Ver escenario"}
                      </button>
                    ) : null}
                    {!plantaUrl && !plotId ? (
                      <span className="fimba-muted" style={{ fontStyle: "italic" }}>
                        Sin planta
                      </span>
                    ) : null}
                  </div>
                </Field>

                <Field label="Monto">
                  {montoLabel ? (
                    <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {montoLabel}
                    </span>
                  ) : (
                    <span className="fimba-muted">—</span>
                  )}
                </Field>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <StagePlotViewerModal
        open={stagePlotOpen && !!plotId}
        onClose={() => setStagePlotOpen(false)}
        supabase={supabaseClient}
        evento={evento}
        gira={evento?.programas || { id: evento?.id_gira }}
      />
    </>
  );
}
