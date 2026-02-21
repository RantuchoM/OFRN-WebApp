import { useRef, useCallback } from "react";

/**
 * Devuelve una versión con debounce del callback.
 * @param {Function} callback - Función a ejecutar tras el delay
 * @param {number} delay - Milisegundos de espera
 * @returns {Function} - Función que, al llamarse, programa la ejecución de callback tras delay (reiniciando el timer en cada llamada)
 */
export function useDebouncedCallback(callback, delay) {
  const handler = useRef(null);
  return useCallback(
    (...args) => {
      if (handler.current) clearTimeout(handler.current);
      handler.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay],
  );
}
