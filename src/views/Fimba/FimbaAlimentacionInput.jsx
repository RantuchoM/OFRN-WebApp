import React, { useEffect, useRef, useState } from "react";
import {
  FIMBA_ALIMENTACION_OTRO,
  FIMBA_ALIMENTACION_PRESETS,
  resolveFimbaTipoAlimentacion,
} from "../../services/fimbaService";

/** Valor interno del <select> al elegir texto libre (coincide con DB `otro`). */
export const ALIMENTACION_OTRO_SELECT = FIMBA_ALIMENTACION_OTRO;

/**
 * CSS del control. Selectores con `.fimba-cell-input` y `!important` en width
 * para ganar a `.fimba-cell-input { width: 100% }` de FimbaLayout (que apilaba
 * select + input en la celda de la planilla artista).
 */
const ALIMENTACION_WRAP_CSS = `
  td.fimba-ali-cell {
    min-width: 11.5rem;
    max-width: 16rem;
    vertical-align: middle;
  }
  .fimba-ali-wrap {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    align-items: center;
    gap: 4px;
    min-width: 0;
    width: 100%;
    max-width: 100%;
  }
  .fimba-ali-wrap > .fimba-cell-input,
  .fimba-ali-wrap > select.fimba-cell-input,
  .fimba-ali-wrap > input.fimba-cell-input {
    width: auto !important;
    min-width: 0 !important;
    box-sizing: border-box;
  }
  .fimba-ali-wrap > select.fimba-cell-input {
    flex: 0 1 auto;
    max-width: 7rem;
  }
  .fimba-ali-wrap > input.fimba-cell-input {
    flex: 1 1 4.5rem;
    min-width: 4rem !important;
    max-width: 8.5rem;
  }
  .fimba-ali-input-free {
    background: #f1f5f9;
    color: #475569;
    font-weight: 600;
  }
`;

/** Layout critical inline: no depende de que el <style> esté montado en el árbol. */
const WRAP_STYLE = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "nowrap",
  alignItems: "center",
  gap: 4,
  minWidth: 0,
  width: "100%",
  maxWidth: "100%",
};

const SELECT_STYLE = {
  width: "auto",
  flex: "0 1 auto",
  maxWidth: "7rem",
  minWidth: 0,
};

const FREE_INPUT_STYLE = {
  width: "auto",
  flex: "1 1 4.5rem",
  minWidth: "4rem",
  maxWidth: "8.5rem",
};

export function FimbaAlimentacionStyles() {
  return <style>{ALIMENTACION_WRAP_CSS}</style>;
}

/**
 * Select de presets + opción «Otros...» con input de texto libre
 * (`tipo_alimentacion` + `nota_alimentacion`).
 * Select + input siempre en una fila (planilla artista y resto).
 */
export function AlimentacionInput({
  tipo,
  nota,
  onChange,
  onCommit,
  onKeyDown,
  disabled,
  selectDataAttr,
  freeDataAttr,
  className = "",
}) {
  const resolved = resolveFimbaTipoAlimentacion(tipo);
  const tipoNorm = String(tipo ?? "")
    .trim()
    .toLowerCase();
  const notaStr = nota != null ? String(nota) : "";
  const notaTrim = notaStr.trim();

  // Custom: DB `otro`, o valor desconocido (defensivo), o nota sin preset clásico.
  const isUnknown = Boolean(tipoNorm) && !resolved;
  const isOtroTipo =
    resolved?.value === FIMBA_ALIMENTACION_OTRO || isUnknown || (!tipoNorm && notaTrim);
  const freeText = isUnknown && !notaTrim ? String(tipo ?? "") : notaStr;

  const [forceOtro, setForceOtro] = useState(false);
  const customRef = useRef(null);
  const showOtroInput = forceOtro || isOtroTipo;

  const selectValue = (() => {
    if (resolved && resolved.value !== FIMBA_ALIMENTACION_OTRO) return resolved.value;
    if (showOtroInput) return ALIMENTACION_OTRO_SELECT;
    return resolved?.value || "regular";
  })();

  useEffect(() => {
    if (resolved && resolved.value !== FIMBA_ALIMENTACION_OTRO) {
      setForceOtro(false);
    }
  }, [resolved]);

  useEffect(() => {
    if (showOtroInput && forceOtro && customRef.current) {
      customRef.current.focus();
      customRef.current.select?.();
    }
  }, [showOtroInput, forceOtro]);

  return (
    <div
      className={`fimba-ali-wrap${className ? ` ${className}` : ""}`}
      style={WRAP_STYLE}
    >
      <select
        data-fimba-part-cell={selectDataAttr}
        className={`fimba-cell-input${
          showOtroInput ? " fimba-ali-input-free" : ""
        }`}
        style={SELECT_STYLE}
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === ALIMENTACION_OTRO_SELECT) {
            setForceOtro(true);
            onChange({
              tipo_alimentacion: FIMBA_ALIMENTACION_OTRO,
              nota_alimentacion: freeText || "",
            });
            return;
          }
          setForceOtro(false);
          onChange({
            tipo_alimentacion: next,
            nota_alimentacion: null,
          });
          onCommit?.();
        }}
        disabled={disabled}
        title={
          showOtroInput
            ? "Alimentación libre (Otros…)"
            : "Tipo de alimentación"
        }
        aria-label="Tipo de alimentación"
      >
        {FIMBA_ALIMENTACION_PRESETS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
        <option value={ALIMENTACION_OTRO_SELECT}>Otros...</option>
      </select>
      {showOtroInput && (
        <input
          ref={customRef}
          data-fimba-part-cell={freeDataAttr}
          className="fimba-cell-input fimba-ali-input-free"
          style={FREE_INPUT_STYLE}
          value={freeText}
          onChange={(e) =>
            onChange({
              tipo_alimentacion: FIMBA_ALIMENTACION_OTRO,
              nota_alimentacion: e.target.value,
            })
          }
          onBlur={() => {
            if (!String(freeText || "").trim()) setForceOtro(false);
            onCommit?.();
          }}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder="Especificar…"
          aria-label="Alimentación personalizada"
        />
      )}
    </div>
  );
}
