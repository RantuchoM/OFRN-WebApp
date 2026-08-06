import { useEffect, useRef } from "react";
import { syncEnsayoLocalReminders } from "../utils/ensayoLocalRemindersSync";
import { ensureWebPushSubscription } from "../utils/webPushSubscribe";

/**
 * Revisa y reprograma alarmas locales de ensayo al abrir/volver a la app.
 * También renueva la suscripción Web Push (cron de ingreso T−15 y salida).
 * Gate de prueba: solo corre si `enabled` (admin real), igual que el banner.
 *
 * @param {string|number|null|undefined} integranteId
 * @param {boolean} [enabled=false]
 */
export function useEnsayoLocalRemindersSync(integranteId, enabled = false) {
  const lastKeyRef = useRef(null);
  const inFlightRef = useRef(false);
  const pushTriedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !integranteId || integranteId === "guest-general") {
      return undefined;
    }
    if (Number.isNaN(Number(integranteId))) return undefined;

    // Push para que el cron de ingreso (T−15) pueda llegar sin la app abierta
    if (!pushTriedRef.current) {
      pushTriedRef.current = true;
      ensureWebPushSubscription(integranteId).then((res) => {
        if (!res.ok) pushTriedRef.current = false;
      });
    }

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
