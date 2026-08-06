/**
 * Sincroniza alarmas locales de ensayo al abrir/volver a la app:
 * - Próximo ensayo convocado sin llegada → recordatorio de inicio (T−15).
 * - Ensayo con llegada y sin salida → cancela inicio y programa salida.
 */
import { format, addDays, parseISO } from "date-fns";
import { supabase } from "../services/supabase";
import { getTodayDateStringLocal } from "./dates";
import { membershipActiveOnProgramDate } from "./ensembleMembership";
import { ensayoCheckinEstado } from "../services/ensayoCheckinService";
import {
  ensayoEndMs,
  ensayoStartMs,
} from "./ensayoCheckinBanner";
import {
  scheduleLocalInicioReminders,
  cancelAllLocalInicioReminders,
  cancelLocalInicioReminders,
  pingLocalInicioReminders,
} from "./ensayoLocalInicioReminders";
import {
  scheduleLocalSalidaReminders,
  cancelLocalSalidaReminders,
  pingLocalSalidaReminders,
} from "./ensayoLocalSalidaReminders";

const ID_TIPO_ENSAYO_ENSAMBLE = 13;
/** Horizonte para elegir el “próximo” ensayo. */
const LOOKAHEAD_DAYS = 30;

/**
 * Tras marcar alta/llegada: corta el aviso de inicio y arma salida.
 * @param {object} evt
 * @param {{ registrado_at?: string, salida_at?: string, justificado?: boolean }|null} estado
 */
export async function onEnsayoAltaLocalReminders(evt, estado) {
  if (!evt?.id) return { ok: false, reason: "no_evento" };
  await cancelLocalInicioReminders(evt.id);
  return scheduleLocalSalidaReminders(evt, estado);
}

/**
 * @param {string|number} integranteId
 * @returns {Promise<{ ok: boolean, action?: string, eventoId?: number|string, reason?: string }>}
 */
export async function syncEnsayoLocalReminders(integranteId) {
  await Promise.all([
    pingLocalInicioReminders(),
    pingLocalSalidaReminders(),
  ]);

  if (!integranteId || integranteId === "guest-general") {
    return { ok: false, reason: "no_integrante" };
  }
  const id = Number(integranteId);
  if (Number.isNaN(id)) return { ok: false, reason: "no_integrante" };

  const today = getTodayDateStringLocal();
  let hasta;
  try {
    hasta = format(addDays(parseISO(today), LOOKAHEAD_DAYS), "yyyy-MM-dd");
  } catch {
    hasta = today;
  }

  try {
    const [{ data: memb }, { data: customs }] = await Promise.all([
      supabase
        .from("integrantes_ensambles")
        .select("id_ensamble, fecha_desde, fecha_hasta")
        .eq("id_integrante", id),
      supabase
        .from("eventos_asistencia_custom")
        .select("id_evento, tipo")
        .eq("id_integrante", id),
    ]);

    const customByEvent = new Map();
    (customs || []).forEach((c) => {
      customByEvent.set(Number(c.id_evento), c.tipo);
    });

    const memberships = memb || [];
    const eventIds = new Set();

    // Links por ensamble: no filtramos membresía aquí (depende de fecha del evento)
    const ensambleIdsAll = [
      ...new Set(
        memberships
          .map((r) => Number(r.id_ensamble))
          .filter((n) => !Number.isNaN(n)),
      ),
    ];

    if (ensambleIdsAll.length) {
      const { data: links, error: linkErr } = await supabase
        .from("eventos_ensambles")
        .select("id_evento, id_ensamble")
        .in("id_ensamble", ensambleIdsAll);
      if (linkErr) throw linkErr;
      (links || []).forEach((l) => eventIds.add(Number(l.id_evento)));
    }

    customByEvent.forEach((tipo, eid) => {
      if (tipo === "adicional" || tipo === "invitado") eventIds.add(eid);
    });
    customByEvent.forEach((tipo, eid) => {
      if (tipo === "ausente") eventIds.delete(eid);
    });

    if (eventIds.size === 0) {
      await cancelAllLocalInicioReminders();
      return { ok: true, action: "cleared", reason: "sin_eventos" };
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
      .gte("fecha", today)
      .lte("fecha", hasta)
      .eq("id_tipo_evento", ID_TIPO_ENSAYO_ENSAMBLE)
      .or("is_deleted.is.null,is_deleted.eq.false")
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true });

    if (evtErr) throw evtErr;

    const list = (evts || []).filter((e) => {
      if (e.is_deleted) return false;
      const customTipo = customByEvent.get(Number(e.id));
      if (customTipo === "ausente") return false;
      if (customTipo === "adicional" || customTipo === "invitado") return true;
      const ensIds = (e.eventos_ensambles || []).map((ee) =>
        Number(ee.id_ensamble),
      );
      return memberships.some(
        (m) =>
          ensIds.includes(Number(m.id_ensamble)) &&
          membershipActiveOnProgramDate(m, e.fecha),
      );
    });

    if (!list.length) {
      await cancelAllLocalInicioReminders();
      return { ok: true, action: "cleared", reason: "sin_proximos" };
    }

    const estadoMap = await ensayoCheckinEstado(
      list.map((e) => e.id),
      id,
    );
    const nowMs = Date.now();

    for (const evt of list) {
      const estado = estadoMap[String(evt.id)] || null;
      if (estado?.salida_at || estado?.justificado) continue;

      if (estado?.registrado_at) {
        await cancelLocalInicioReminders(evt.id);
        await scheduleLocalSalidaReminders(evt, estado);
        return {
          ok: true,
          action: "salida",
          eventoId: evt.id,
        };
      }

      const end = ensayoEndMs(evt);
      const start = ensayoStartMs(evt);
      // Ensayo ya terminado sin llegada → mirar el siguiente
      if (Number.isFinite(end) && nowMs > end) continue;
      if (!Number.isFinite(start)) continue;

      await scheduleLocalInicioReminders(evt);
      return {
        ok: true,
        action: "inicio",
        eventoId: evt.id,
      };
    }

    await cancelAllLocalInicioReminders();
    return { ok: true, action: "cleared", reason: "todos_cerrados" };
  } catch (e) {
    console.error("syncEnsayoLocalReminders", e);
    return { ok: false, reason: "error" };
  }
}
