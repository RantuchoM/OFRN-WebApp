import React, { useState } from "react";

/** Parsea montos es-AR (`1.234,56`, `1234,56`, `$ 10`) a número. */
export function parseArsAmount(val) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  let s = String(val).trim().replace(/[$\s]/g, "");
  if (!s) return 0;
  if (/,\d{1,2}$/.test(s) && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function formatArsAmount(val) {
  return parseArsAmount(val).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Input de pesos: muestra `$ 1.234,56` en reposo y deja editar con coma decimal.
 * `onValueChange` recibe un número. No formatea el cálculo, solo la captura.
 */
export default function ArsAmountInput({
  id,
  value,
  onValueChange,
  className = "",
  placeholder = "$ 0,00",
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  const n = parseArsAmount(value);
  const display = n ? formatArsAmount(n) : "";

  return (
    <input
      id={id}
      inputMode="decimal"
      autoComplete="off"
      className={className}
      placeholder={placeholder}
      value={focused ? draft : display}
      onFocus={() => {
        setDraft(
          n
            ? n.toLocaleString("es-AR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })
            : "",
        );
        setFocused(true);
      }}
      onChange={(e) => {
        const next = e.target.value.replace(/[^\d.,]/g, "");
        setDraft(next);
        onValueChange(parseArsAmount(next));
      }}
      onBlur={() => {
        setFocused(false);
        onValueChange(parseArsAmount(draft));
      }}
    />
  );
}
