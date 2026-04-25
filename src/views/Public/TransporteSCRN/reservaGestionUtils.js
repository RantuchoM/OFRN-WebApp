import { supabase } from "../../../services/supabase";

/**
 * Si la reserva estaba aceptada, pasa a pendiente para que el admin vuelva a revisar
 * (cambio de plazas o de paradas).
 */
export async function requeueAceptadaToPendiente(reservaId) {
  return supabase
    .from("scrn_reservas")
    .update({ estado: "pendiente" })
    .eq("id", reservaId)
    .eq("estado", "aceptada");
}
