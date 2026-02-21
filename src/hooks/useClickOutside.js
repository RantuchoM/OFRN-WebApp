import { useEffect, useRef } from "react";

/**
 * Cierra menús/dropdowns al hacer click fuera del elemento referenciado.
 *
 * @param {React.RefObject<HTMLElement | null>} ref - Ref del contenedor (no debe ser null)
 * @param {() => void} callback - Se ejecuta cuando se hace mousedown fuera de ref.current
 *
 * @example
 * const menuRef = useRef(null);
 * useClickOutside(menuRef, () => setIsOpen(false));
 */
export function useClickOutside(ref, callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        callbackRef.current();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref]);
}
