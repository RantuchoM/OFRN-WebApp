/**
 * Persistencia del lote pendiente de resumen a Marko (jefe de fila).
 * El cron envía si pasó ~1h sin clear/notificación manual.
 */

import { seatingApellidoNombre } from "./integranteDisplayName";
import { formatAtrilSillaLabel } from "./seatingAtrilMail";

export function buildAtrilNovedadesForMarko(
  atrilMoves = [],
  roster = [],
  bloqueNombre = "",
) {
  const byId = new Map();
  (roster || []).forEach((m) => {
    if (m?.id != null) byId.set(String(m.id), m);
  });
  const bloque = String(bloqueNombre || "").trim();
  return (atrilMoves || [])
    .map((move) => {
      const person = byId.get(String(move.musicianId));
      const who =
        seatingApellidoNombre(person) ||
        person?.nombre_completo ||
        person?.displayName ||
        `ID ${move.musicianId}`;
      const from =
        move.fromLabel || formatAtrilSillaLabel(move.fromAtril, move.fromLado);
      const to =
        move.toLabel || formatAtrilSillaLabel(move.toAtril, move.toLado);
      const contenedor = String(move.containerName || "").trim();
      const lugarBits = [bloque ? `bloque ${bloque}` : "", contenedor]
        .filter(Boolean)
        .join(" · ");
      return {
        tipo: "atril",
        musico: who,
        obra: lugarBits || "Ubicación",
        from,
        to,
        cambio: `${from} → ${to}`,
        bloque,
        contenedor,
      };
    })
    .filter(Boolean);
}

export function buildParticellaNovedadForMarko({
  musician,
  obraTitle,
  fromLabel,
  toLabel,
}) {
  const who =
    musician?.displayName ||
    seatingApellidoNombre(musician) ||
    musician?.nombreCompleto ||
    musician?.nombre_completo ||
    (musician?.id != null ? `ID ${musician.id}` : "Músico");
  return {
    tipo: "particella",
    musico: who,
    obra: obraTitle || "Obra",
    from: fromLabel || "sin asignación",
    to: toLabel || "sin asignación",
    cambio: `${fromLabel || "sin asignación"} → ${toLabel || "sin asignación"}`,
  };
}

export async function upsertSeatingJefeMarkoPendiente(
  supabase,
  {
    actorId,
    programId,
    actorNombre = "",
    bloqueNombre = "",
    novedades = [],
  },
) {
  if (!supabase || actorId == null || programId == null) {
    return { error: new Error("supabase/actor/programa requeridos") };
  }
  const items = (novedades || []).filter(Boolean);
  if (!items.length) return { data: null, error: null };
  const { data, error } = await supabase.rpc(
    "upsert_seating_jefe_marko_pendiente",
    {
      p_actor_id: Number(actorId),
      p_programa_id: Number(programId),
      p_actor_nombre: String(actorNombre || "").trim(),
      p_bloque_nombre: String(bloqueNombre || "").trim(),
      p_novedades: items,
    },
  );
  return { data, error };
}

export async function clearSeatingJefeMarkoPendiente(
  supabase,
  { actorId, programId, via = "manual" },
) {
  if (!supabase || actorId == null || programId == null) {
    return { error: null };
  }
  const { data, error } = await supabase.rpc(
    "clear_seating_jefe_marko_pendiente",
    {
      p_actor_id: Number(actorId),
      p_programa_id: Number(programId),
      p_via: via,
    },
  );
  return { data, error };
}
