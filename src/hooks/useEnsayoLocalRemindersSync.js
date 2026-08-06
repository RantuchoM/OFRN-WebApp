import { useEffect, useRef } from "react";
import { syncEnsayoLocalReminders } from "../utils/ensayoLocalRemindersSync";

/**
 * Revisa y reprograma alarmas locales de ensayo al abrir/volver a la app.
 * Gate de prueba: solo corre si `enabled` (admin real), igual que el banner.
 *
 * @param {string|number|null|undefined} integranteId
 * @param {boolean} [enabled=false]
 */
export function useEnsayoLocalRemindersSync(integranteId, enabled = false) {
  const lastKeyRef = useRef(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled || !integranteId || integranteId === "guest-general") {
      return undefined;
    }
    if (Number.isNaN(Number(integranteId))) return undefined;

    const run = async (reason) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const res = await syncEnsayoLocalReminders(integranteId);
        if (res?.ok) {
          lastKeyRef.current = `${res.action}:${res.eventoId || ""}:${reason}`;
        }
      } catch {
        /* ignore */
      } finally {
        inFlightRef.current = false;
      }
    };

    run("mount");

    const onVis = () => {
      if (document.visibilityState === "visible") run("visible");
    };
    const onFocus = () => run("focus");

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    const interval = setInterval(() => run("interval"), 60_000);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [integranteId, enabled]);
}
