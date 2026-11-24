import React from "react";
import {
  buildStringsCompositionDetail,
  formatStringsCompositionParen,
} from "../../utils/seatingStringsComposition";
import { normalizeStringsComposition } from "../../utils/organicoConvocado";

/**
 * Conformación de cuerdas al lado de Str: `(5.5.4.3.3)` = Vn1.Vn2.Va.Vc.Cb.
 * Si los violines aún no están en contenedores distintos, la mitad calculada
 * (impar → +1 a 1ros) se muestra en itálica.
 */
export default function StringsCompositionMark({
  detail = null,
  roster = null,
  musicianContainerLabels = null,
  className = "",
  prefix = null,
  title,
}) {
  const resolved =
    detail ||
    (roster
      ? buildStringsCompositionDetail(roster, musicianContainerLabels)
      : null);
  const paren = formatStringsCompositionParen(resolved);
  if (!paren || !resolved) return null;

  const tip =
    title ??
    (resolved.vnEstimated
      ? "Vn1.Vn2.Va.Vc.Cb — violines sin dividir en contenedores: mitad calculada (itálica; impar → +1 a 1ros)"
      : "Vn1.Vn2.Va.Vc.Cb según contenedores de seating (sin ausentes)");

  return (
    <span
      className={`inline-flex items-baseline font-mono tabular-nums ${className}`.trim()}
      title={tip}
    >
      {prefix}
      <span>(</span>
      <span className={resolved.vnEstimated ? "italic opacity-90" : undefined}>
        {resolved.vn1}.{resolved.vn2}
      </span>
      <span>
        .{resolved.va}.{resolved.vc}.{resolved.cb})
      </span>
    </span>
  );
}

/**
 * Texto de orgánico convocado con Str + conformación tipográfica.
 * Quita un `Str (…)` plano del string y lo reemplaza por el mark (itálica si aplica).
 */
export function OrganicoConvocadoWithStrings({
  text = "",
  detail = null,
  organicoMap = null,
  className = "",
}) {
  const raw = String(text || "").trim();
  const resolved =
    detail || normalizeStringsComposition(organicoMap) || null;
  if (!raw) return null;

  // Quita " - Str (…)" al final o un orgánico que es solo "Str" / "Str (…)".
  const stripped = raw
    .replace(/\s*-\s*Str(?:\s*\([^)]*\))?$/i, "")
    .replace(/^Str(?:\s*\([^)]*\))?$/i, "")
    .trim();
  const showStr = /\bStr\b/i.test(raw) || !!resolved;

  if (!showStr) {
    return <span className={className}>{raw}</span>;
  }

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1 ${className}`.trim()}>
      {stripped ? <span>{stripped}</span> : null}
      <span className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
        <span>{stripped ? "- Str" : "Str"}</span>
        {resolved ? (
          <StringsCompositionMark
            detail={resolved}
            className="text-[inherit] font-semibold"
          />
        ) : null}
      </span>
    </span>
  );
}
