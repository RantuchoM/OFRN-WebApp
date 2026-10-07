import { integranteActiveOnProgramRange } from "./ensembleMembership";

/**
 * Nómina que sigue después de ausencias y de EXCL_ENSAMBLE.
 *
 * EXCL_ENSAMBLE saca a quien entra solo por ENSAMBLE o FAMILIA.
 * Una fila personal presente en `giras_integrantes` (`manualIds`,
 * `estado !== 'ausente'`) queda igual: la exclusión de ensamble no la pisa.
 * Ausente sin abono no entra. R/L entran si el ensamble no está excluido.
 */
export function selectRosterIdsAfterExclusions({
  integrantesIds,
  manualIds,
  excludedByEnsamble,
  ausentesIds,
  reemplazoIds,
  licenciaIds,
}) {
  const manual = asSet(manualIds);
  const excluded = asSet(excludedByEnsamble);
  const ausentes = asSet(ausentesIds);

  const allIds = [];
  const seen = new Set();
  for (const id of integrantesIds || []) {
    if (!id || ausentes.has(id)) continue;
    if (!manual.has(id) && excluded.has(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    allIds.push(id);
  }
  for (const id of iterIds(reemplazoIds, licenciaIds)) {
    if (!id || excluded.has(id) || seen.has(id)) continue;
    seen.add(id);
    allIds.push(id);
  }
  return allIds;
}

/**
 * Parte la nómina en marcas de matriz (X / * / R / L).
 * La fila personal presente cuenta siempre (X), sin vigencia de legajo
 * y aunque su ensamble esté excluido. El * de pre-alta no aplica a esa fila.
 */
export function partitionRosterForMatrix({
  allIds,
  manualIds,
  reemplazoIds,
  licenciaIds,
  vigenciaByKey,
  programRefDesde,
  programRefHasta,
}) {
  const manual = asSet(manualIds);
  const reemplazo = asSet(reemplazoIds);
  const licencia = asSet(licenciaIds);
  const vigencia = vigenciaByKey instanceof Map ? vigenciaByKey : new Map();

  const countedIds = new Set();
  const preAltaIds = new Set();
  const reemplazoCountedIds = new Set();
  const licenciaCountedIds = new Set();

  for (const id of allIds || []) {
    if (!id) continue;
    if (manual.has(id)) {
      countedIds.add(id);
      continue;
    }
    const row = vigencia.get(id);
    if (!row) continue;
    if (
      integranteActiveOnProgramRange(row, programRefDesde, programRefHasta)
    ) {
      countedIds.add(id);
      if (reemplazo.has(id)) reemplazoCountedIds.add(id);
      if (licencia.has(id)) licenciaCountedIds.add(id);
    } else {
      preAltaIds.add(id);
    }
  }

  return {
    countedIds,
    preAltaIds,
    reemplazoIds: reemplazoCountedIds,
    licenciaIds: licenciaCountedIds,
  };
}

function asSet(value) {
  if (value instanceof Set) return value;
  return new Set(value || []);
}

function* iterIds(...groups) {
  for (const group of groups) {
    if (!group) continue;
    for (const id of group) yield id;
  }
}
