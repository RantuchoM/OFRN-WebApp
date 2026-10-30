import { useEffect, useRef, useState } from "react";
import { ZONA_PRESETS, canonicalZona, zonasMatch } from "../../utils/giraZonas";

const OTRA = "otra";

function presetDe(value) {
  return ZONA_PRESETS.find((zona) => zonasMatch(zona, value)) || "";
}

/**
 * Atlántica, Andina, Valle y «Otro...».
 * Con Otro se escribe la zona. `onCommit` se llama al elegir un preset
 * o al salir del texto con un valor.
 */
export default function ZonaSelect({
  value = "",
  onChange,
  onCommit,
  selectClassName = "",
  inputClassName = "",
  className = "",
}) {
  const preset = presetDe(value);
  const [mode, setMode] = useState(() =>
    String(value || "").trim() && !preset ? "otra" : "preset",
  );
  const [draft, setDraft] = useState(() => (preset ? "" : String(value || "")));
  const otraAbierta = useRef(false);
  const ultimoPreset = useRef(preset);
  if (preset) ultimoPreset.current = preset;

  useEffect(() => {
    if (otraAbierta.current) return;
    const raw = String(value || "").trim();
    const nextPreset = presetDe(raw);
    if (!raw || nextPreset) {
      setMode("preset");
      setDraft("");
      return;
    }
    setMode("otra");
    setDraft(raw);
  }, [value]);

  const selectValue = mode === "otra" ? OTRA : preset;

  return (
    <div className={className}>
      <select
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === OTRA) {
            otraAbierta.current = true;
            setMode("otra");
            if (preset) {
              setDraft("");
              onChange("");
            } else {
              setDraft(String(value || "").trim());
            }
            return;
          }
          otraAbierta.current = false;
          setMode("preset");
          setDraft("");
          onChange(next);
          onCommit?.(next);
        }}
        className={selectClassName}
      >
        <option value="" hidden />
        {ZONA_PRESETS.map((zona) => (
          <option key={zona} value={zona}>
            {zona}
          </option>
        ))}
        <option value={OTRA}>Otro...</option>
      </select>
      {mode === "otra" && (
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            onChange(next);
          }}
          onBlur={() => {
            const text = canonicalZona(draft);
            otraAbierta.current = false;
            if (!text) {
              if (ultimoPreset.current) {
                setMode("preset");
                onChange(ultimoPreset.current);
              }
              return;
            }
            if (presetDe(text)) {
              setMode("preset");
              setDraft("");
            } else {
              setDraft(text);
              ultimoPreset.current = "";
            }
            onChange(text);
            onCommit?.(text);
          }}
          placeholder="Escribí la zona"
          className={inputClassName || selectClassName}
          aria-label="Otra zona"
        />
      )}
    </div>
  );
}
