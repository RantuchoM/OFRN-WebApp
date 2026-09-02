import React from "react";

const TRIVIAL_GRUPO_WORDS = new Set([
  "a",
  "and",
  "con",
  "da",
  "de",
  "del",
  "di",
  "do",
  "dos",
  "e",
  "el",
  "en",
  "la",
  "las",
  "los",
  "o",
  "of",
  "para",
  "por",
  "the",
  "u",
  "un",
  "una",
  "unas",
  "unos",
  "y",
]);

const stripOuterPunctuation = (token) =>
  String(token || "").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

/**
 * Iniciales del nombre de un grupo: primera letra de cada token significativo.
 * Ej.: "King Crimson (OFRN)" → "KCO", "Gala Lírica" → "GL", "Bahiano" → "B".
 */
export function grupoNombreInitials(nombre) {
  const raw = String(nombre || "").trim();
  if (!raw) return "";

  const tokens = raw.split(/[\s/_-]+/).map(stripOuterPunctuation).filter(Boolean);
  const significant = tokens.filter(
    (t) => !TRIVIAL_GRUPO_WORDS.has(t.toLowerCase()),
  );
  const source = significant.length ? significant : tokens;
  if (!source.length) {
    const fallback = stripOuterPunctuation(raw);
    return fallback ? [...fallback][0].toUpperCase() : "";
  }
  return source
    .map((t) => {
      const ch = [...t][0];
      return ch ? ch.toUpperCase() : "";
    })
    .join("");
}

/**
 * Chips de grupos de convocatoria (mismo estilo que UnifiedAgenda / roster).
 * Esquinas rectangulares (`border-radius: 2px`), nunca píldora.
 * `compact`: muestra iniciales (tooltip con nombre completo). Default: nombre completo.
 * En FIMBA (Backline / Venues / Agenda) preferir default (nombre completo).
 */
export default function GiraGrupoChips({
  grupos = [],
  className = "",
  compact = false,
}) {
  if (!grupos?.length) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1 min-w-0 ${className}`}>
      {grupos.map((g) => {
        const color = g.color || "#6366f1";
        const nombre = g.nombre || "";
        const label = compact ? grupoNombreInitials(nombre) || nombre : nombre;
        return (
          <span
            key={`grp-${g.id}`}
            className={`inline-flex items-center text-[10px] font-black border uppercase w-fit ${
              compact
                ? "px-1.5 py-0.5 tracking-wide shrink-0"
                : "px-2 py-0.5 tracking-tight max-w-full truncate"
            }`}
            style={{
              backgroundColor: `${color}18`,
              color: color || "#4338ca",
              borderColor: `${color}44`,
              borderRadius: 2,
            }}
            title={nombre}
            aria-label={compact && nombre ? nombre : undefined}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
