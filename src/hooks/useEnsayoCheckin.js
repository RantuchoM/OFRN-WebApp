import { useCallback, useEffect, useMemo, useState } from "react";
import { ensayoCheckinEstado } from "../services/ensayoCheckinService";

const ID_TIPO_ENSAYO_ENSAMBLE = 13;

/**
 * Estado de check-in para ensayos tipo 13 visibles hoy.
 * @param {object} opts
 * @param {import('@supabase/supabase-js').SupabaseClient} opts.supabase
 * @param {string|number} opts.integranteId
 * @param {Array<{ id, id_tipo_evento, fecha }>} opts.events
 * @param {string} opts.todayStr yyyy-MM-dd
 */
export function useEnsayoCheckin({ integranteId, events, todayStr }) {
  const [estadoMap, setEstadoMap] = useState({});
  const [loading, setLoading] = useState(false);

  const eventoIdsHoy = useMemo(() => {
    if (!todayStr || !events?.length) return [];
    return events
      .filter(
        (e) =>
          Number(e.id_tipo_evento) === ID_TIPO_ENSAYO_ENSAMBLE &&
          e.fecha === todayStr &&
          e.id,
      )
      .map((e) => Number(e.id));
  }, [events, todayStr]);

  const refresh = useCallback(async () => {
    if (!integranteId || integranteId === "guest-general" || !eventoIdsHoy.length) {
      setEstadoMap({});
      return;
    }
    setLoading(true);
    try {
      const data = await ensayoCheckinEstado(eventoIdsHoy, integranteId);
      setEstadoMap(data || {});
    } catch (e) {
      console.error("useEnsayoCheckin", e);
      setEstadoMap({});
    } finally {
      setLoading(false);
    }
  }, [integranteId, eventoIdsHoy]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getEstado = useCallback(
    (eventoId) => estadoMap[String(eventoId)] ?? null,
    [estadoMap],
  );

  return { estadoMap, getEstado, loading, refresh };
}
