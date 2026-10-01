import React from "react";
import {
  CONFLICTO_KIND,
  ENSAYO_CONFLICTO_BG,
  ENSAYO_CONFLICTO_COLOR,
  getEnsayoImpact,
  overlappingGirasFromPeople,
} from "../../utils/serviciosEnsayosConflicto";
import { ConflictoResolvedChip } from "../../views/Management/ConflictoEnsayoActions";
import EnsayoConflictoTag from "./EnsayoConflictoTag";
import EnsayoTuttiMinusTag from "./EnsayoTuttiMinusTag";

/** nomenclador + nombre_gira, mismo texto que Servicios. */
export function ensayoConflictoOverlapLabels(impact) {
  if (!impact || impact.conflictKind !== CONFLICTO_KIND.full) return [];
  const list = impact.overlappingGiras?.length
    ? impact.overlappingGiras
    : overlappingGirasFromPeople(impact.people);
  return (list || []).map((g) => g.label).filter(Boolean);
}

/**
 * Título de gira/programa superpuesto, junto al nombre del ensayo.
 * Más grande que el tag «Ensayo en conflicto» (9–10px).
 */
export function EnsayoConflictoOverlapTitle({
  impact,
  className = "mt-0.5 text-xs sm:text-[13px] font-semibold leading-snug text-amber-900 not-italic",
}) {
  const labels = ensayoConflictoOverlapLabels(impact);
  if (!labels.length) return null;
  return (
    <div className={className} title={labels.join(" · ")}>
      {labels.map((label, i) => (
        <div key={`${label}-${i}`} className={i > 0 ? "opacity-80" : undefined}>
          {label}
        </div>
      ))}
    </div>
  );
}

export function EnsayoPeseJustificacionNote({
  justificacion,
  className = "mt-0.5 text-[11px] leading-snug text-slate-600 whitespace-pre-wrap not-italic font-normal",
}) {
  const text = String(justificacion || "").trim();
  if (!text) return null;
  return <p className={className}>{text}</p>;
}

export function EnsayoImpactTags({
  eventId,
  impactByEventId,
  impact: impactProp,
  supabase,
  ensambles = [],
  canAct = false,
  onChanged,
  compact = false,
  showTuttiN = false,
}) {
  const impact = impactProp || getEnsayoImpact(impactByEventId, eventId);
  if (!impact) return null;
  const showConflicto =
    impact.conflictKind === CONFLICTO_KIND.full && !impact.resolvedKind;
  const showResolved =
    impact.conflictKind === CONFLICTO_KIND.full && impact.resolvedKind;
  const showTutti =
    showTuttiN &&
    impact.conflictKind === CONFLICTO_KIND.partial &&
    !impact.resolvedKind;
  if (!showConflicto && !showResolved && !showTutti) return null;
  return (
    <>
      <EnsayoConflictoTag
        impact={impact}
        supabase={supabase}
        ensambles={ensambles}
        canAct={canAct}
        onChanged={onChanged}
        compact={compact}
      />
      {impact.conflictKind === CONFLICTO_KIND.full && impact.resolvedKind ? (
        <ConflictoResolvedChip
          kind={impact.resolvedKind}
          justificacion={impact.justificacion}
        />
      ) : null}
      {showTutti ? (
        <EnsayoTuttiMinusTag
          impact={impact}
          compact={compact}
          supabase={supabase}
          canAct={canAct}
          eventId={eventId ?? impact.eventId}
        />
      ) : null}
    </>
  );
}

export function isPendingFullEnsayoImpact(impact) {
  return (
    impact?.conflictKind === CONFLICTO_KIND.full && !impact?.resolvedKind
  );
}

export function ensayoConflictoCardTint(impact) {
  if (!isPendingFullEnsayoImpact(impact)) return null;
  return {
    color: ENSAYO_CONFLICTO_COLOR,
    backgroundColor: ENSAYO_CONFLICTO_BG,
  };
}
