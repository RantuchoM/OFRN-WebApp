import React, { useState } from "react";
import { getProgramStyle } from "../../utils/giraUtils";
import { getPercComparableTotal } from "../../utils/instrumentation";
import {
  AUDIT_GRID_COLUMNS,
  buildGiraAppDeepLink,
  diffFuentes,
  resolveEnsambleLabel,
} from "../../utils/instrumentacionSandbox";
import { IconExternalLink, IconLoader } from "../ui/Icons";
import InstrumentationSummaryModal from "../seating/InstrumentationSummaryModal";
import SandboxConvocatoriaInline from "./SandboxConvocatoriaInline";

const SUMMARY_LABEL =
  "w-[2.25rem] min-w-[2.25rem] px-0.5 py-0.5 text-left font-semibold text-[9px]";
const SUMMARY_CELL =
  "w-6 min-w-[1.5rem] px-0.5 py-0.5 text-center font-mono text-[9px]";

function fuenteKey(s) {
  return `${s.tipo}|${s.valor_id ?? ""}|${s.valor_texto ?? ""}`;
}

function isConvocacionFuenteRow(s) {
  if (s.tipo === "ENSAMBLE" || s.tipo === "EXCL_ENSAMBLE") {
    return s.valor_id != null;
  }
  if (s.tipo === "FAMILIA") return !!s.valor_texto;
  return false;
}

function resolveFuenteLabel(s, ensambleLabels, ensemblesList) {
  if (s.tipo === "ENSAMBLE" || s.tipo === "EXCL_ENSAMBLE") {
    return resolveEnsambleLabel(s.valor_id, ensambleLabels, ensemblesList);
  }
  return s.valor_texto;
}

/** Ensambles/familias convocados y excluidos (estado efectivo; delta si hay borrador). */
function ConvocacionFuentesHeader({
  sources,
  ensambleLabels,
  ensemblesList,
  prodSources,
  hasDraft,
}) {
  const effective = (sources || []).filter(isConvocacionFuenteRow);
  const prod = (prodSources || []).filter(isConvocacionFuenteRow);
  const { added, removed } = hasDraft
    ? diffFuentes(prod, effective)
    : { added: [], removed: [] };
  const addedKeys = new Set(added.map(fuenteKey));
  const rows = effective.length > 0 ? effective : prod;

  if (rows.length === 0 && removed.length === 0) return null;

  return (
    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-1">
      {rows.map((s, idx) => {
        const label = resolveFuenteLabel(s, ensambleLabels, ensemblesList);
        const key = `${fuenteKey(s)}-${idx}`;
        const isNew = hasDraft && addedKeys.has(fuenteKey(s));
        const isExcl = s.tipo === "EXCL_ENSAMBLE";
        return (
          <span
            key={key}
            className={`inline-flex max-w-full items-center px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wide leading-snug ${
              isExcl
                ? isNew
                  ? "bg-red-100 text-red-800 border-red-300 ring-1 ring-red-200"
                  : "bg-red-50 text-red-700 border-red-200"
                : isNew
                  ? "bg-violet-100 text-violet-900 border-violet-400 ring-1 ring-violet-200"
                  : "bg-indigo-50 text-indigo-800 border-indigo-200"
            }`}
          >
            {label}
          </span>
        );
      })}
      {removed.map((s, idx) => {
        const label = resolveFuenteLabel(s, ensambleLabels, ensemblesList);
        return (
          <span
            key={`rm-${fuenteKey(s)}-${idx}`}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border border-slate-300 bg-slate-50 text-slate-500 line-through opacity-60 uppercase"
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

function MiniMatrix({
  required,
  convokedAll,
  convDiffCols,
  organicoRevisado,
  onOpenWorks,
}) {
  const requiredPercTotal = getPercComparableTotal(required);
  const convokedPercTotal = getPercComparableTotal(convokedAll);

  return (
    <table className="w-full border-collapse text-[9px]">
      <thead>
        <tr>
          <th className={`${SUMMARY_LABEL} align-bottom`}>
            {onOpenWorks && (
              <button
                type="button"
                onClick={onOpenWorks}
                className="w-full px-0.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[7px] font-bold leading-tight text-slate-600 hover:bg-slate-100 hover:text-slate-800 text-center"
                title="Ver obras del programa y comparativa requerido vs convocado"
              >
                Ver obras
              </button>
            )}
          </th>
          {AUDIT_GRID_COLUMNS.map((col) => (
            <th
              key={col.id}
              className={`${SUMMARY_CELL} font-semibold text-slate-500`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className={SUMMARY_LABEL}>Conv</td>
          {AUDIT_GRID_COLUMNS.map((col) => {
            const convVal =
              col.id === "Perc"
                ? convokedPercTotal
                : convokedAll[col.id] || 0;
            const reqVal =
              col.id === "Perc"
                ? requiredPercTotal
                : required[col.id] || 0;
            const colDeficit =
              col.id === "Perc"
                ? requiredPercTotal > convokedPercTotal
                : reqVal > convVal;
            const isDraft = convDiffCols?.has(col.id);
            return (
              <td key={col.id} className={SUMMARY_CELL}>
                <span
                  className={
                    isDraft
                      ? "text-violet-700 font-bold"
                      : convVal > reqVal
                        ? organicoRevisado
                          ? "text-blue-700 font-bold"
                          : "text-orange-600 font-bold"
                        : colDeficit
                          ? organicoRevisado
                            ? "text-blue-700"
                            : "text-orange-600"
                          : "text-slate-800"
                  }
                >
                  {convVal}
                </span>
              </td>
            );
          })}
        </tr>
        <tr className="text-slate-600">
          <td className={SUMMARY_LABEL}>Req</td>
          {AUDIT_GRID_COLUMNS.map((col) => {
            const reqVal =
              col.id === "Perc"
                ? requiredPercTotal
                : required[col.id] || 0;
            return (
              <td key={col.id} className={SUMMARY_CELL}>
                {reqVal || "·"}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}

function StringsCompositionBlock({ label, prodLabel, hasDraft }) {
  if (!label) return null;

  const changed = hasDraft && prodLabel != null && label !== prodLabel;

  return (
    <div
      className="shrink-0 min-w-[4.75rem] max-w-[7rem] border-l border-slate-200 pl-1.5 py-0.5 flex items-center"
      title="01 Violín · 02 Viola · 03 Cello · 04 Cb; paréntesis = mismo instrumento en distintos contenedores de seating, orden alfabético por nombre de contenedor; sin ausentes. En borrador, cuerdas nuevas se ubican tentativamente en un contenedor."
    >
      <span
        className={`font-mono text-[9px] leading-tight tabular-nums truncate ${
          changed
            ? "text-violet-800 font-bold"
            : "text-slate-800 font-semibold"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default function SandboxProgramCard({
  program,
  metrics,
  ensambleLabels,
  hasDraft,
  supabase,
  sandboxId,
  sandboxDisabled,
  draftEntry,
  ensemblesList,
  familiesList,
  integrantesList,
  onDraftSaved,
  onRequestApply,
  onDiscarded,
  isRefreshing,
  onOrganicoSave,
}) {
  const [showOrganicoModal, setShowOrganicoModal] = useState(false);
  const style = getProgramStyle(program.tipo);
  const cardClasses = style?.color
    ? style.color
    : "bg-white text-slate-800 border border-slate-200";
  const title =
    [program.mes_letra, program.nomenclador].filter(Boolean).join(" | ") ||
    program.nombre_gira;
  const giraLink = buildGiraAppDeepLink(program.id, "ROSTER");
  const effectiveSources = hasDraft
    ? metrics?.draftSources ?? metrics?.prodSources
    : metrics?.prodSources;
  const effectiveRoster = metrics?.draftRoster ?? metrics?.prodRoster ?? [];

  return (
    <div
      className={`relative grid grid-cols-[1fr_minmax(9.5rem,11.5rem)] rounded-lg border shadow-sm overflow-hidden transition-opacity ${
        hasDraft ? "ring-1 ring-violet-200 border-violet-100" : "border-slate-200"
      } ${isRefreshing ? "opacity-75" : ""}`}
    >
      {isRefreshing && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-violet-50/50 pointer-events-none"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 border border-violet-200 text-[9px] font-bold text-violet-700 shadow-sm">
            <IconLoader size={11} className="animate-spin" />
            Actualizando…
          </span>
        </div>
      )}
      <div className="min-w-0 flex flex-col">
        <div className={`px-2 py-1.5 ${cardClasses}`}>
          <div className="flex items-start gap-1.5 min-w-0">
            <a
              href={giraLink}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-0.5 max-w-[42%] text-xs font-bold hover:underline underline-offset-2"
              title="Abrir gira (roster) en nueva pestaña"
            >
              <span className="truncate">{title}</span>
              <IconExternalLink size={11} className="shrink-0 opacity-80" />
            </a>
            <ConvocacionFuentesHeader
              sources={effectiveSources}
              prodSources={metrics?.prodSources}
              ensambleLabels={ensambleLabels}
              ensemblesList={ensemblesList}
              hasDraft={hasDraft}
            />
            {hasDraft && (
              <span className="shrink-0 text-[9px] font-bold uppercase text-violet-700 bg-violet-50 px-1 py-0.5 rounded border border-violet-200">
                Borrador
              </span>
            )}
          </div>
          <div className="text-[10px] opacity-80 truncate mt-0.5">
            {program.fecha_desde}
            {program.fecha_hasta &&
            program.fecha_hasta !== program.fecha_desde
              ? ` → ${program.fecha_hasta}`
              : ""}
            {program.zona ? ` · ${program.zona}` : ""}
          </div>
        </div>
        <div className="px-1 py-0.5 bg-white border-t border-slate-100 flex-1 flex min-w-0">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <MiniMatrix
              required={metrics?.required}
              convokedAll={metrics?.draftConvoked}
              convDiffCols={metrics?.convDiffCols}
              organicoRevisado={!!program.organico_revisado}
              onOpenWorks={() => setShowOrganicoModal(true)}
            />
          </div>
          <StringsCompositionBlock
            label={metrics?.stringsLabel}
            prodLabel={metrics?.prodStringsLabel}
            hasDraft={hasDraft}
          />
        </div>
      </div>

      {showOrganicoModal && (
        <InstrumentationSummaryModal
          isOpen={showOrganicoModal}
          onClose={() => setShowOrganicoModal(false)}
          works={metrics?.works || []}
          required={metrics?.required || {}}
          convoked={metrics?.draftConvoked || {}}
          roster={effectiveRoster}
          programId={program.id}
          supabase={supabase}
          organicoRevisado={!!program.organico_revisado}
          organicoComentario={program.organico_comentario ?? null}
          onOrganicoSave={(payload) => onOrganicoSave?.(program.id, payload)}
        />
      )}

      <SandboxConvocatoriaInline
        supabase={supabase}
        sandboxId={sandboxId}
        sandboxDisabled={sandboxDisabled}
        program={program}
        draftEntry={draftEntry}
        draftRoster={metrics?.draftRoster}
        prodRoster={metrics?.prodRoster}
        prodIntegrantes={metrics?.prodIntegrantes}
        prodSources={metrics?.prodSources}
        draftSources={metrics?.draftSources}
        convDiffCols={metrics?.convDiffCols}
        stringsLabel={metrics?.stringsLabel}
        prodStringsLabel={metrics?.prodStringsLabel}
        ensambleLabels={ensambleLabels}
        ensemblesList={ensemblesList}
        familiesList={familiesList}
        integrantesList={integrantesList}
        onDraftSaved={onDraftSaved}
        onRequestApply={onRequestApply}
        onDiscarded={onDiscarded}
      />
    </div>
  );
}
