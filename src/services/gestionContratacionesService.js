import { supabase } from "./supabase";
import {
  GESTION_CONTRATACIONES_GIRA_MIN_DATE,
  suggestBrutoFromNeto,
} from "../constants/gestionContrataciones";

async function throwIfError(result, label) {
  if (result.error) {
    console.error(label, result.error);
    throw result.error;
  }
  return result.data;
}

/* ---------- Fondos ---------- */

export async function listGestionFondos() {
  return throwIfError(
    await supabase
      .from("gestion_fondos")
      .select("*")
      .order("id", { ascending: true }),
    "listGestionFondos",
  );
}

export async function listFondoAsignaciones(idFondo) {
  let q = supabase
    .from("gestion_fondo_asignaciones")
    .select("*")
    .order("fecha_asignacion", { ascending: false });
  if (idFondo) q = q.eq("id_fondo", idFondo);
  return throwIfError(await q, "listFondoAsignaciones");
}

export async function createFondoAsignacion(row) {
  return throwIfError(
    await supabase
      .from("gestion_fondo_asignaciones")
      .insert([row])
      .select()
      .single(),
    "createFondoAsignacion",
  );
}

export async function updateFondoAsignacion(id, patch) {
  return throwIfError(
    await supabase
      .from("gestion_fondo_asignaciones")
      .update(patch)
      .eq("id", id)
      .select()
      .single(),
    "updateFondoAsignacion",
  );
}

export async function deleteFondoAsignacion(id) {
  return throwIfError(
    await supabase.from("gestion_fondo_asignaciones").delete().eq("id", id),
    "deleteFondoAsignacion",
  );
}

/** Saldo de un fondo de caja (orquesta). No aplica a modalidades factura/690. */
export async function saldoFondoOrquesta(idFondo) {
  const asignaciones = await listFondoAsignaciones(idFondo);
  const ingresos = (asignaciones || []).reduce(
    (s, a) => s + (Number(a.monto) || 0),
    0,
  );
  const { data: pagos } = await supabase
    .from("gestion_pagos")
    .select("monto")
    .eq("id_fondo", idFondo);
  const { data: contr } = await supabase
    .from("gestion_contrataciones")
    .select("cachet_ars")
    .eq("id_fondo", idFondo);
  const egresos =
    (pagos || []).reduce((s, p) => s + (Number(p.monto) || 0), 0) +
    (contr || []).reduce((s, c) => s + (Number(c.cachet_ars) || 0), 0);
  return ingresos - egresos;
}

/* ---------- Cuentas / movimientos reemplazo ---------- */

export async function listCuentasReemplazo() {
  return throwIfError(
    await supabase
      .from("gestion_cuentas_reemplazo")
      .select("*")
      .order("id", { ascending: true }),
    "listCuentasReemplazo",
  );
}

export async function createCuentaReemplazo(row) {
  return throwIfError(
    await supabase
      .from("gestion_cuentas_reemplazo")
      .insert([row])
      .select()
      .single(),
    "createCuentaReemplazo",
  );
}

export async function listMovimientosReemplazo({ idCuenta } = {}) {
  let q = supabase
    .from("gestion_movimientos_reemplazo")
    .select(
      "*, gestion_cuentas_reemplazo(id, nombre), giras_integrantes(id, id_gira, id_integrante)",
    )
    .order("created_at", { ascending: false });
  if (idCuenta) q = q.eq("id_cuenta", idCuenta);
  return throwIfError(await q, "listMovimientosReemplazo");
}

export async function createMovimientoReemplazo(row) {
  return throwIfError(
    await supabase
      .from("gestion_movimientos_reemplazo")
      .insert([row])
      .select()
      .single(),
    "createMovimientoReemplazo",
  );
}

export async function updateMovimientoReemplazo(id, patch) {
  return throwIfError(
    await supabase
      .from("gestion_movimientos_reemplazo")
      .update(patch)
      .eq("id", id)
      .select()
      .single(),
    "updateMovimientoReemplazo",
  );
}

export async function deleteMovimientoReemplazo(id) {
  return throwIfError(
    await supabase.from("gestion_movimientos_reemplazo").delete().eq("id", id),
    "deleteMovimientoReemplazo",
  );
}

/**
 * Saldo por cuenta:
 * + movimientos efectuados
 * + misceláneos de expediente asignados a la cuenta
 * − pagos/gastos con id_cuenta_reemplazo
 * (negativo = a reponer).
 */
export async function saldosCuentasReemplazo() {
  const cuentas = await listCuentasReemplazo();
  const [movs, pagosCuenta, miscExps] = await Promise.all([
    throwIfError(
      await supabase
        .from("gestion_movimientos_reemplazo")
        .select("id_cuenta, monto, estado")
        .eq("estado", "efectuado"),
      "saldosCuentasReemplazo.movs",
    ),
    throwIfError(
      await supabase
        .from("gestion_pagos")
        .select("id_cuenta_reemplazo, monto")
        .not("id_cuenta_reemplazo", "is", null),
      "saldosCuentasReemplazo.pagos",
    ),
    throwIfError(
      await supabase
        .from("gestion_expedientes")
        .select("id_cuenta_miscelaneo, monto_miscelaneo")
        .not("id_cuenta_miscelaneo", "is", null),
      "saldosCuentasReemplazo.misc",
    ),
  ]);
  const byCuenta = new Map();
  for (const m of movs || []) {
    if (m.id_cuenta == null) continue;
    const prev = byCuenta.get(m.id_cuenta) || 0;
    byCuenta.set(m.id_cuenta, prev + (Number(m.monto) || 0));
  }
  for (const ex of miscExps || []) {
    if (ex.id_cuenta_miscelaneo == null) continue;
    const prev = byCuenta.get(ex.id_cuenta_miscelaneo) || 0;
    byCuenta.set(
      ex.id_cuenta_miscelaneo,
      prev + (Number(ex.monto_miscelaneo) || 0),
    );
  }
  for (const p of pagosCuenta || []) {
    if (p.id_cuenta_reemplazo == null) continue;
    const prev = byCuenta.get(p.id_cuenta_reemplazo) || 0;
    byCuenta.set(p.id_cuenta_reemplazo, prev - (Number(p.monto) || 0));
  }
  return (cuentas || []).map((c) => ({
    ...c,
    saldo: byCuenta.get(c.id) || 0,
  }));
}

/* ---------- Productores ---------- */

export async function listProductores() {
  return throwIfError(
    await supabase
      .from("gestion_productores")
      .select("*")
      .order("nombre", { ascending: true }),
    "listProductores",
  );
}

export async function createProductor(row) {
  return throwIfError(
    await supabase.from("gestion_productores").insert([row]).select().single(),
    "createProductor",
  );
}

export async function updateProductor(id, patch) {
  return throwIfError(
    await supabase
      .from("gestion_productores")
      .update(patch)
      .eq("id", id)
      .select()
      .single(),
    "updateProductor",
  );
}

/* ---------- Expedientes ---------- */

export async function listExpedientes({ idGira } = {}) {
  // No embeber gestion_fondos acá: hay 2 FKs (id_fondo + id_fondo_miscelaneo)
  // y PostgREST exige hint; el hub ya resuelve fondos por id desde listGestionFondos.
  let q = supabase
    .from("gestion_expedientes")
    .select(
      `*,
      gestion_productores(id, nombre),
      programas:id_gira(id, nomenclador, fecha_desde, mes_letra, zona, nombre_gira)`,
    )
    .order("created_at", { ascending: false });
  if (idGira) q = q.eq("id_gira", idGira);
  return throwIfError(await q, "listExpedientes");
}

export async function getExpediente(id) {
  return throwIfError(
    await supabase
      .from("gestion_expedientes")
      .select(
        `*,
        gestion_productores(*),
        fondo:gestion_fondos!gestion_expedientes_id_fondo_fkey(*),
        fondo_miscelaneo:gestion_fondos!gestion_expedientes_id_fondo_miscelaneo_fkey(*),
        gestion_contrataciones(*),
        gestion_pagos(*)`,
      )
      .eq("id", id)
      .single(),
    "getExpediente",
  );
}

export async function createExpediente(row) {
  return throwIfError(
    await supabase.from("gestion_expedientes").insert([row]).select().single(),
    "createExpediente",
  );
}

export async function updateExpediente(id, patch) {
  return throwIfError(
    await supabase
      .from("gestion_expedientes")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single(),
    "updateExpediente",
  );
}

export function computeBrutoSugeridoExpediente(contrataciones, miscelaneo = 0) {
  const neto = (contrataciones || []).reduce(
    (s, c) => s + (Number(c.cachet_ars) || 0),
    0,
  );
  return suggestBrutoFromNeto(neto, miscelaneo);
}

/* ---------- Contrataciones ---------- */

export async function listGirasElegiblesGestion() {
  const rows = await throwIfError(
    await supabase
      .from("programas")
      .select(
        "id, nomenclador, fecha_desde, fecha_hasta, mes_letra, zona, nombre_gira, tipo",
      )
      .gte("fecha_desde", GESTION_CONTRATACIONES_GIRA_MIN_DATE)
      .order("fecha_desde", { ascending: true }),
    "listGirasElegiblesGestion",
  );
  // Preferir giras con nomenclador (las del piloto operativo) al frente del selector.
  return [...(rows || [])].sort((a, b) => {
    const aNom = (a.nomenclador || "").trim() ? 0 : 1;
    const bNom = (b.nomenclador || "").trim() ? 0 : 1;
    if (aNom !== bNom) return aNom - bNom;
    return String(a.fecha_desde || "").localeCompare(String(b.fecha_desde || ""));
  });
}

export async function listContrataciones({ idExpediente, idGira } = {}) {
  let q = supabase
    .from("gestion_contrataciones")
    .select(
      `*,
      gestion_expedientes(
        id, nombre, numero_expediente, titular_nombre, id_gira,
        programas:id_gira(id, nomenclador, fecha_desde, mes_letra, zona, nombre_gira)
      ),
      gestion_fondos!gestion_contrataciones_id_fondo_fkey(id, codigo, nombre),
      giras_integrantes(
        id, id_gira, id_integrante, funcion, rol,
        integrantes!giras_integrantes_id_integrante_fkey(id, nombre, apellido, condicion),
        programas:id_gira(id, nomenclador, fecha_desde, mes_letra, zona, nombre_gira, tipo)
      )`,
    )
    .order("created_at", { ascending: false });
  if (idExpediente) q = q.eq("id_expediente", idExpediente);
  const data = await throwIfError(await q, "listContrataciones");
  if (idGira == null) return data;
  return (data || []).filter(
    (c) => String(c.giras_integrantes?.id_gira) === String(idGira),
  );
}

export async function getContratacionByGirasIntegrante(idGirasIntegrantes) {
  const { data, error } = await supabase
    .from("gestion_contrataciones")
    .select("*")
    .eq("id_giras_integrantes", idGirasIntegrantes)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertContratacion(row) {
  return throwIfError(
    await supabase
      .from("gestion_contrataciones")
      .upsert(row, { onConflict: "id_giras_integrantes" })
      .select()
      .single(),
    "upsertContratacion",
  );
}

export async function updateContratacion(id, patch) {
  return throwIfError(
    await supabase
      .from("gestion_contrataciones")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single(),
    "updateContratacion",
  );
}

/* ---------- Pagos ---------- */

export async function listPagos({ idExpediente } = {}) {
  let q = supabase
    .from("gestion_pagos")
    .select(
      `*,
      gestion_fondos!gestion_pagos_id_fondo_fkey(id, codigo, nombre),
      gestion_cuentas_reemplazo!gestion_pagos_id_cuenta_reemplazo_fkey(id, nombre),
      gestion_expedientes(
        id, nombre, numero_expediente,
        programas:id_gira(id, nomenclador, fecha_desde)
      )`,
    )
    .order("created_at", { ascending: false });
  if (idExpediente) q = q.eq("id_expediente", idExpediente);
  return throwIfError(await q, "listPagos");
}

export async function createPago(row) {
  return throwIfError(
    await supabase.from("gestion_pagos").insert([row]).select().single(),
    "createPago",
  );
}

export async function updatePago(id, patch) {
  return throwIfError(
    await supabase
      .from("gestion_pagos")
      .update(patch)
      .eq("id", id)
      .select()
      .single(),
    "updatePago",
  );
}

export async function deletePago(id) {
  return throwIfError(
    await supabase.from("gestion_pagos").delete().eq("id", id),
    "deletePago",
  );
}
