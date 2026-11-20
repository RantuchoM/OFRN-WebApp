import React, { useEffect, useId, useRef, useState } from "react";
import { IconSearch } from "../ui/Icons";
import { buscarPersonasConEntradas } from "../../services/entradaService";

function etiquetaPersona(persona) {
  const apellido = String(persona?.apellido || "").trim();
  const nombre = String(persona?.nombre || "").trim();
  const nombreCompleto = [apellido, nombre].filter(Boolean).join(", ");
  if (nombreCompleto) return nombreCompleto;
  const nota = String(persona?.nota || "").trim();
  if (nota) return nota;
  return persona?.email || "";
}

function textoReservas(n) {
  const count = Number(n) || 0;
  return count === 1 ? "1 reserva" : `${count} reservas`;
}

/**
 * Mail del beneficiario con búsqueda de quien ya tuvo entradas.
 * El valor sigue siendo texto libre: un mail nuevo que no está en la lista también vale.
 */
export default function EntradasTerceroPersonaSearch({
  value,
  onChange,
  onPick,
  ui,
  isDark,
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = String(value || "");
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) {
      setResults([]);
      setBusy(false);
      setActiveIndex(-1);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setBusy(true);
      try {
        const rows = await buscarPersonasConEntradas(trimmed);
        if (cancelled) return;
        setResults(rows);
        setActiveIndex(rows.length ? 0 : -1);
      } catch {
        if (!cancelled) {
          setResults([]);
          setActiveIndex(-1);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  useEffect(() => {
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function elegir(persona) {
    if (!persona?.email) return;
    onChange(persona.email);
    onPick?.(persona);
    setOpen(false);
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || !results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      elegir(results[activeIndex]);
    }
  }

  const showPanel = open && trimmed.length >= 2;
  const panelClass = isDark
    ? "border-slate-600 bg-slate-900 text-slate-100"
    : "border-slate-200 bg-white text-slate-800";
  const activeClass = isDark ? "bg-slate-800" : "bg-slate-100";

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <div className="relative">
      <IconSearch
        size={16}
        className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${ui.textMuted}`}
      />
      <input
        type="text"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        className={`${ui.input} pl-9`}
        value={query}
        placeholder="Mail o nombre de quien ya tuvo entradas"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      </div>
      {showPanel && (
        <ul
          id={listId}
          role="listbox"
          className={`absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border shadow-lg ${panelClass}`}
        >
          {busy && (
            <li className={`px-3 py-2 text-xs ${ui.textMuted}`}>Buscando…</li>
          )}
          {!busy && results.length === 0 && (
            <li className={`px-3 py-2 text-xs ${ui.textMuted}`}>
              Nadie con entradas coincide. Podés escribir un mail nuevo.
            </li>
          )}
          {results.map((persona, index) => {
            const titulo = etiquetaPersona(persona);
            const mostrarMail = titulo !== persona.email;
            return (
              <li key={persona.email} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left ${
                    index === activeIndex ? activeClass : ""
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => elegir(persona)}
                >
                  <span className="text-sm font-semibold">{titulo}</span>
                  {mostrarMail && (
                    <span className={`text-xs ${ui.textMuted}`}>{persona.email}</span>
                  )}
                  <span className={`text-[11px] ${ui.textMuted}`}>
                    {textoReservas(persona.reservas)}
                    {persona.tiene_cuenta ? "" : " · Sin cuenta"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
