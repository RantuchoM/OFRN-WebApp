import React, { useEffect, useRef, useState } from "react";
import {
  FIMBA_ESTADO_CONOCIDO_PRESETS,
  resolveFimbaEstadoConocidoPreset,
} from "../../services/fimbaService";

/** Valor interno del <select> de estado cuando se elige texto libre. */
export const ESTADO_OTRO = "__otro__";

/** CSS compartido (planilla contrataciones + ficha artista). */
export const FIMBA_ESTADO_CONOCIDO_CSS = `
  .fimba-ctr-estado-cell {
    min-width: 11.5rem;
    max-width: 14rem;
  }
  .fimba-ctr-estado-wrap {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 10rem;
  }
  .fimba-ctr-estado-input {
    font-size: 0.8rem !important;
    width: 100%;
    border-radius: 999px !important;
  }
  .fimba-ctr-estado-input.fimba-ctr-estado-empty {
    color: #94a3b8;
  }
  .fimba-ctr-estado-input option {
    color: #0f172a;
    font-weight: 500;
    background: #fff;
  }
  .fimba-ctr-estado-input-free {
    background: #f1f5f9;
    color: #475569;
    font-weight: 600;
  }
  .fimba-ctr-estado-badge {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    border-radius: 999px;
    padding: 0.12rem 0.5rem;
    font-size: 0.68rem;
    font-weight: 700;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fimba-ctr-estado-free {
    background: #f1f5f9;
    color: #475569;
    font-weight: 600;
  }
  .fimba-ctr-hist-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    max-height: 55vh;
    overflow: auto;
  }
  .fimba-ctr-hist-item {
    border: 1px solid var(--fimba-border, #e2e8f0);
    border-radius: 10px;
    padding: 0.65rem 0.8rem;
    background: #fafbfc;
  }
  .fimba-ctr-hist-estado {
    margin-bottom: 0.35rem;
  }
  .fimba-ctr-hist-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.85rem;
    font-size: 0.78rem;
    color: var(--fimba-muted, #5c5c5c);
  }
  .fimba-ctr-hist-when {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .fimba-ctr-hist-who {
    color: var(--fimba-deep, #94216d);
    font-weight: 600;
  }
`;

export function FimbaEstadoConocidoStyles() {
  return <style>{FIMBA_ESTADO_CONOCIDO_CSS}</style>;
}

export function formatFimbaEstadoTimestamp(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

/** Badge coloreado para presets conocidos; texto plano si es libre. */
export function EstadoConocidoBadge({ estado, style }) {
  const text = estado != null ? String(estado).trim() : "";
  if (!text) {
    return (
      <span className="fimba-muted" style={{ fontSize: "0.78rem", ...style }}>
        —
      </span>
    );
  }
  const preset = resolveFimbaEstadoConocidoPreset(text);
  if (preset) {
    return (
      <span
        className="fimba-ctr-estado-badge"
        style={{
          background: preset.bg,
          color: preset.color,
          ...style,
        }}
        title={text}
      >
        {text}
      </span>
    );
  }
  return (
    <span className="fimba-ctr-estado-badge fimba-ctr-estado-free" title={text} style={style}>
      {text}
    </span>
  );
}

/**
 * Select de presets coloreados + opción «Otro...» con input de texto libre.
 * Un solo control visual por estado (sin badge duplicado). Native <select>
 * para que las opciones no queden clippeadas por overflow de la tabla.
 */
export function EstadoConocidoInput({
  value,
  onChange,
  onCommit,
  onKeyDown,
  disabled,
  placeholder,
  className = "",
}) {
  const preset = resolveFimbaEstadoConocidoPreset(value);
  const text = value != null ? String(value).trim() : "";
  const isCustom = text !== "" && !preset;
  const [forceOtro, setForceOtro] = useState(false);
  const customRef = useRef(null);
  const showOtroInput = forceOtro || isCustom;
  const selectValue = preset ? preset.value : showOtroInput ? ESTADO_OTRO : "";

  useEffect(() => {
    if (preset) setForceOtro(false);
  }, [preset]);

  useEffect(() => {
    if (showOtroInput && forceOtro && customRef.current) {
      customRef.current.focus();
      customRef.current.select?.();
    }
  }, [showOtroInput, forceOtro]);

  const selectStyle = preset
    ? {
        background: preset.bg,
        color: preset.color,
        fontWeight: 700,
        borderColor: "transparent",
      }
    : undefined;

  return (
    <div className={`fimba-ctr-estado-wrap${className ? ` ${className}` : ""}`}>
      <select
        className={`fimba-cell-input fimba-ctr-estado-input${
          !selectValue ? " fimba-ctr-estado-empty" : ""
        }${showOtroInput && !preset ? " fimba-ctr-estado-input-free" : ""}`}
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === ESTADO_OTRO) {
            setForceOtro(true);
            if (preset) onChange("");
            return;
          }
          setForceOtro(false);
          onChange(next);
          onCommit?.();
        }}
        disabled={disabled}
        style={selectStyle}
        title={
          preset
            ? `Preset: ${preset.label}`
            : showOtroInput
              ? "Estado libre (Otro…)"
              : "Elegí un preset o Otro…"
        }
        aria-label="Último estado conocido"
      >
        <option value="">— Estado —</option>
        {FIMBA_ESTADO_CONOCIDO_PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
        <option value={ESTADO_OTRO}>Otro...</option>
      </select>
      {showOtroInput && (
        <input
          ref={customRef}
          className="fimba-cell-input fimba-ctr-estado-input fimba-ctr-estado-input-free"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (!String(value || "").trim()) setForceOtro(false);
            onCommit?.();
          }}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={placeholder || "Estado personalizado…"}
          aria-label="Estado personalizado"
        />
      )}
    </div>
  );
}
