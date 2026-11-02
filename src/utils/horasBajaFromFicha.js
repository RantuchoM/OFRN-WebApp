import {
  getHorasVigentes,
  HORAS_AREA_ORIGEN,
  HORAS_CONCEPTOS,
} from "./horasNominaReport";

/** Mes calendario siguiente a una fecha ISO `YYYY-MM-DD`. */
export function nextMonthFromIso(iso) {
  const raw = String(iso || "").slice(0, 10);
  const [y, m] = raw.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    const now = new Date();
    const nm = now.getMonth() + 2;
    if (nm > 12) return { year: now.getFullYear() + 1, month: 1 };
    return { year: now.getFullYear(), month: nm };
  }
  if (m === 12) return { year: y + 1, month: 1 };
  return { year: y, month: m + 1 };
}

function rowTotal(record) {
  return HORAS_CONCEPTOS.reduce(
    (acc, c) => acc + (Number(record?.[c.id]) || 0),
    0,
  );
}

function zeroConceptos() {
  return Object.fromEntries(HORAS_CONCEPTOS.map((c) => [c.id, 0]));
}

/**
 * Inserta novedades a 0 hs por cada origen que aún tenga horas vigentes
 * en el mes indicado. No inserta si el origen ya está en 0.
 * @returns {{ inserted: number, origenes: string[] }}
 */
export async function insertBajaHorasNovedadesZero({
  supabase,
  idIntegrante,
  year,
  month,
  observaciones = "Baja de legajo desde ficha",
}) {
  const id = Number(idIntegrante);
  if (!Number.isFinite(id) || id <= 0) {
    return { inserted: 0, origenes: [] };
  }
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    throw new Error("Mes de novedad inválido");
  }

  const { data, error } = await supabase
    .from("horas_catedra")
    .select("*")
    .eq("id_integrante", id);
  if (error) throw error;

  const records = data || [];
  const toInsert = [];
  for (const origen of HORAS_AREA_ORIGEN) {
    const vigente = getHorasVigentes(records, y, m, origen);
    if (rowTotal(vigente) <= 0) continue;
    toInsert.push({
      id_integrante: id,
      origen,
      mes_inicio: m,
      anio_inicio: y,
      mes_fin: null,
      anio_fin: null,
      observaciones,
      ...zeroConceptos(),
    });
  }

  if (!toInsert.length) return { inserted: 0, origenes: [] };

  const { error: insErr } = await supabase
    .from("horas_catedra")
    .insert(toInsert);
  if (insErr) throw insErr;

  return {
    inserted: toInsert.length,
    origenes: toInsert.map((r) => r.origen),
  };
}
