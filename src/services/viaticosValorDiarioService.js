import { supabase, supabaseViaticosManualPublic } from "./supabase";

const pickClient = (client) => client || supabase;

export async function listValorDiarioVigencias(client) {
  const sb = pickClient(client);
  const { data, error } = await sb
    .from("viaticos_valor_diario_vigencia")
    .select("*")
    .order("vigencia_desde", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getValorDiarioVigente(fecha, client) {
  const fechaRef = String(fecha || "").trim();
  if (!fechaRef) return 0;
  const sb = pickClient(client);
  const { data, error } = await sb.rpc("viaticos_valor_diario_vigente", {
    p_fecha: fechaRef,
  });
  if (error) throw error;
  const value = Number(data);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export async function insertValorDiarioVigencia(
  { vigencia_desde, monto, nota },
  client,
) {
  const sb = pickClient(client);
  const { data, error } = await sb.rpc("viaticos_valor_diario_insert_vigencia", {
    p_vigencia_desde: vigencia_desde,
    p_monto: Number(monto),
    p_nota: nota || null,
  });
  if (error) throw error;
  return data;
}

export async function updateValorDiarioVigencia(
  { id, vigencia_desde, monto, nota },
  client,
) {
  const sb = pickClient(client);
  const { data, error } = await sb.rpc("viaticos_valor_diario_update_vigencia", {
    p_id: id,
    p_vigencia_desde: vigencia_desde,
    p_monto: Number(monto),
    p_nota: nota || null,
  });
  if (error) throw error;
  return data;
}

export async function deleteValorDiarioVigencia(id, client) {
  const sb = pickClient(client);
  const { error } = await sb.rpc("viaticos_valor_diario_delete_vigencia", {
    p_id: id,
  });
  if (error) throw error;
}

export const viaticosValorDiarioManualClient = supabaseViaticosManualPublic;
