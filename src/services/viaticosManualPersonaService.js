import { supabaseViaticosManualPublic } from "./supabase";

export async function listManualPersonas() {
  const { data, error } = await supabaseViaticosManualPublic
    .from("viaticos_manual_persona")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data || [];
}

export async function listManualLocalidades() {
  const { data, error } = await supabaseViaticosManualPublic
    .from("viaticos_manual_localidad")
    .select("nombre")
    .order("nombre", { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => row.nombre).filter(Boolean);
}

export async function getMaxValorDiarioFromPersonas() {
  const { data, error } = await supabaseViaticosManualPublic
    .from("viaticos_manual_persona")
    .select("valor_diario_base")
    .not("valor_diario_base", "is", null)
    .order("valor_diario_base", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const value = Number(data?.valor_diario_base);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export async function upsertPersonaFromFormData(datos = {}) {
  const apellido = String(datos.apellido || "").trim();
  const nombre = String(datos.nombre || "").trim();
  if (!apellido || !nombre) return null;

  const toNumber = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const { data, error } = await supabaseViaticosManualPublic.rpc("viaticos_manual_upsert_persona", {
    p_apellido: apellido,
    p_nombre: nombre,
    p_dni: String(datos.dni || "").trim(),
    p_cargo: String(datos.cargo || "").trim(),
    p_jornada_laboral: String(datos.jornada_laboral || "").trim(),
    p_ciudad_origen: String(datos.ciudad_origen || "").trim(),
    p_asiento_habitual: String(datos.asiento_habitual || "").trim(),
    p_valor_diario_base: toNumber(datos.valor_diario_base || datos.valorDiarioCalc),
    p_lugar_comision: String(datos.lugar_comision || "").trim(),
  });
  if (error) throw error;
  return data;
}
