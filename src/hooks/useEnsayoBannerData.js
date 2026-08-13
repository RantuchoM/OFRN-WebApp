import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { getTodayDateStringLocal } from "../utils/dates";
import { membershipActiveOnProgramDate } from "../utils/ensembleMembership";
import { ensayoCheckinEstado } from "../services/ensayoCheckinService";

const ID_TIPO_ENSAYO_ENSAMBLE = 13;

/**
 * Ensayos de ensamble de hoy a los que el integrante está convocado
 * (membresía activa en ensamble del evento, o custom adicional/invitado;
 * no ausente) + mapa de check-in.
 *
 * @param {string|number|null} integranteId
 */
export function useEnsayoBannerData(integranteId) {
  const [events, setEvents] = useState([]);
  const [estadoMap, setEstadoMap] = useState({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!integranteId || integranteId === "guest-general") {
      setEvents([]);
      setEstadoMap({});
      return;
    }
    const id = Number(integranteId);
    if (Number.isNaN(id)) {
      setEvents([]);
      setEstadoMap({});
      return;
    }

    const today = getTodayDateStringLocal();
    setLoading(true);
    try {
      const [{ data: memb }, { data: customs }, { data: myCheckins }] =
        await Promise.all([
          supabase
            .from("integrantes_ensambles")
            .select("id_ensamble, fecha_desde, fecha_hasta")
            .eq("id_integrante", id),
          supabase
            .from("eventos_asistencia_custom")
            .select("id_evento, tipo")
            .eq("id_integrante", id),
          supabase
            .from("eventos_checkin_ensayo")
            .select("id_evento")
            .eq("id_integrante", id),
        ]);

      const ensambleIds = (memb || [])
        .filter((r) => membershipActiveOnProgramDate(r, today))
        .map((r) => Number(r.id_ensamble))
        .filter((n) => !Number.isNaN(n));

      const customByEvent = new Map();
      (customs || []).forEach((c) => {
        customByEvent.set(Number(c.id_evento), c.tipo);
      });

      const eventIds = new Set();

      if (ensambleIds.length) {
        const { data: links, error: linkErr } = await supabase
          .from("eventos_ensambles")
          .select("id_evento, id_ensamble")
          .in("id_ensamble", ensambleIds);
        if (linkErr) throw linkErr;
        (links || []).forEach((l) => eventIds.add(Number(l.id_evento)));
      }

      // Adicional / invitado: convocados aunque no estén en el ensamble
      customByEvent.forEach((tipo, eid) => {
        if (tipo === "adicional" || tipo === "invitado") eventIds.add(eid);
      });

      // Mantener ensayos de hoy si ya hay check-in (timer/salida) aunque cambie membresía
      (myCheckins || []).forEach((r) => {
        const eid = Number(r.id_evento);
        if (!Number.isNaN(eid)) eventIds.add(eid);
      });

      // Ausente: no convocado
      customByEvent.forEach((tipo, eid) => {
        if (tipo === "ausente") eventIds.delete(eid);
      });

      if (eventIds.size === 0) {
        setEvents([]);
        setEstadoMap({});
        return;
      }

      const { data: evts, error: evtErr } = await supabase
        .from("eventos")
        .select(
          `
          id, fecha, hora_inicio, hora_fin, id_tipo_evento, is_deleted, descripcion,
          tipos_evento ( nombre ),
          eventos_ensambles ( id_ensamble, ensambles ( id, ensamble ) )
        `,
        )
        .in("id", [...eventIds])
        .eq("fecha", today)
        .eq("id_tipo_evento", ID_TIPO_ENSAYO_ENSAMBLE)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .order("hora_inicio", { ascending: true });

      if (evtErr) throw evtErr;

      const list = (evts || []).filter((e) => {
        if (e.is_deleted) return false;
        const customTipo = customByEvent.get(Number(e.id));
        if (customTipo === "ausente") return false;
        if (customTipo === "adicional" || customTipo === "invitado") return true;
        // Membresía en algún ensamble del evento
        const ensIds = (e.eventos_ensambles || []).map((ee) =>
          Number(ee.id_ensamble),
        );
        if (ensIds.some((eid) => ensambleIds.includes(eid))) return true;
        // Ya tiene check-in hoy
        return (myCheckins || []).some((c) => Number(c.id_evento) === Number(e.id));
      });

      setEvents(list);

      if (!list.length) {
        setEstadoMap({});
        return {};
      }

      const estado = await ensayoCheckinEstado(
        list.map((e) => e.id),
        id,
      );
      setEstadoMap(estado || {});
      return estado || {};
    } catch (e) {
      console.error("useEnsayoBannerData", e);
      // No vaciar: un fallo de red no debe ocultar el banner (falso "ya registrado").
      return null;
    } finally {
      setLoading(false);
    }
  }, [integranteId]);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [refresh]);

  const getEstado = useCallback(
    (eventoId) => estadoMap[String(eventoId)] ?? null,
    [estadoMap],
  );

  const patchEstado = useCallback((eventoId, partial) => {
    if (eventoId == null || !partial) return;
    const key = String(eventoId);
    setEstadoMap((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), ...partial },
    }));
  }, []);

  return { events, getEstado, patchEstado, loading, refresh };
}
