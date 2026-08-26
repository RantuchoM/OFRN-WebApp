import React, { useCallback, useEffect, useRef, useState } from "react";
import { IconSearch, IconX } from "../../components/ui/Icons";

const DEFAULT_DEBOUNCE_MS = 180;

/**
 * Búsqueda Artistas/Hotelería: texto local inmediato; filtro padre con debounce.
 * Placeholder: «Buscar Artistas o Integrantes».
 */
export default function FimbaArtistaPersonSearchField({
  onQueryChange,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  style,
}) {
  const [localQuery, setLocalQuery] = useState("");
  const onQueryChangeRef = useRef(onQueryChange);
  const timerRef = useRef(null);

  useEffect(() => {
    onQueryChangeRef.current = onQueryChange;
  }, [onQueryChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const commitQuery = useCallback(
    (value, { immediate = false } = {}) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (immediate) {
        onQueryChangeRef.current(value);
        return;
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        onQueryChangeRef.current(value);
      }, debounceMs);
    },
    [debounceMs],
  );

  const handleChange = (e) => {
    const next = e.target.value;
    setLocalQuery(next);
    commitQuery(next);
  };

  const handleClear = () => {
    setLocalQuery("");
    commitQuery("", { immediate: true });
  };

  const isActive = Boolean(localQuery.trim());

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        minWidth: "14rem",
        maxWidth: "22rem",
        flex: "1 1 14rem",
        border: `1px solid ${isActive ? "var(--fimba-accent, #d73289)" : "var(--fimba-border, #e2e8f0)"}`,
        borderRadius: 999,
        background: "var(--fimba-surface, #fff)",
        boxShadow: isActive
          ? "0 0 0 1px rgba(215, 50, 137, 0.22)"
          : "0 1px 2px rgba(15, 23, 42, 0.04)",
        ...style,
      }}
    >
      <span
        className="fimba-muted"
        style={{
          position: "absolute",
          left: 10,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
        }}
        aria-hidden
      >
        <IconSearch size={14} />
      </span>
      <input
        type="search"
        value={localQuery}
        onChange={handleChange}
        placeholder="Buscar Artistas o Integrantes"
        title="Buscar por nombre de artista o de participantes / integrantes"
        aria-label="Buscar Artistas o Integrantes"
        className="fimba-input"
        style={{
          width: "100%",
          border: 0,
          borderRadius: 999,
          background: "transparent",
          padding: "0.45rem 2rem 0.45rem 2rem",
          fontSize: "0.82rem",
          fontWeight: 500,
          outline: "none",
          boxShadow: "none",
        }}
      />
      {isActive && (
        <button
          type="button"
          onClick={handleClear}
          className="fimba-btn fimba-btn-ghost"
          title="Limpiar búsqueda"
          aria-label="Limpiar búsqueda"
          style={{
            position: "absolute",
            right: 4,
            padding: 4,
            minWidth: 0,
            borderRadius: 999,
          }}
        >
          <IconX size={12} />
        </button>
      )}
    </div>
  );
}
