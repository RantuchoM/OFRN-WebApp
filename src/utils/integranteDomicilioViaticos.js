/**
 * Localidad efectiva para viáticos / destaques / logística de gira:
 * siempre localidad de viáticos, con fallback a residencia.
 *
 * Cuando el integrante tiene sede laboral + viáticos, DJ usa la misma base.
 */

export function usesViaticosLaboralBase(person) {
  if (!person) return false;
  const idViaticos =
    person.id_loc_viaticos ??
    person._loc_viaticos?.id ??
    person.viaticos?.id ??
    null;
  const idLaboral =
    person.id_domicilio_laboral ?? person.laboral?.id ?? null;
  return Boolean(idViaticos && idLaboral);
}

function getResidenciaObjeto(person) {
  return person?._loc_residencia || person?.residencia || null;
}

function getViaticosObjeto(person) {
  return person?._loc_viaticos || person?.viaticos || null;
}

function getResidenciaId(person) {
  const res = getResidenciaObjeto(person);
  return res?.id ?? person?.id_localidad ?? null;
}

function getResidenciaNombre(person) {
  return getResidenciaObjeto(person)?.localidad || "";
}

export function getViaticosId(person) {
  const obj = getViaticosObjeto(person);
  return person?.id_loc_viaticos ?? obj?.id ?? null;
}

/** Integrante con localidad de viáticos explícita (no solo residencia). */
export function hasLocalidadViaticosAsignada(person) {
  const id = getViaticosId(person);
  return id != null && id !== "";
}

function getViaticosNombre(person) {
  return getViaticosObjeto(person)?.localidad || "";
}

function regionIdFromObj(obj) {
  if (!obj) return null;
  return obj.id_region ?? obj.regiones?.id ?? null;
}

/**
 * Fuente única: id, nombre y objeto de localidad (viáticos → residencia).
 * @returns {{ id: number|null, nombre: string, objeto: object|null, regionId: number|null }}
 */
export function resolveLocalidadEfectivaViaticos(person) {
  if (!person) {
    return { id: null, nombre: "", objeto: null, regionId: null };
  }

  const viaticosId = getViaticosId(person);
  if (viaticosId != null) {
    const objeto = getViaticosObjeto(person) || {
      id: viaticosId,
      localidad: getViaticosNombre(person) || undefined,
    };
    const nombre = getViaticosNombre(person) || objeto?.localidad || "";
    return {
      id: Number(viaticosId),
      nombre,
      objeto,
      regionId: regionIdFromObj(objeto),
    };
  }

  const residenciaId = getResidenciaId(person);
  const objeto = getResidenciaObjeto(person);
  const nombre = getResidenciaNombre(person);

  return {
    id: residenciaId != null ? Number(residenciaId) : null,
    nombre,
    objeto:
      objeto ||
      (residenciaId != null
        ? { id: residenciaId, localidad: nombre || undefined }
        : null),
    regionId: regionIdFromObj(objeto),
  };
}

/** @deprecated alias — usar resolveLocalidadEfectivaViaticos(person).id */
export function resolveLocalidadIdReferenciaRecorrido(person) {
  return resolveLocalidadEfectivaViaticos(person).id;
}

/** Nombres para corte en recorrido (compat. configs guardadas con otro id). */
export function resolveLocalidadNombresReferenciaRecorrido(person) {
  const { nombre } = resolveLocalidadEfectivaViaticos(person);
  return nombre ? [nombre] : [];
}

/** Registra id → nombre de la localidad efectiva en un mapa. */
export function registerLocalidadViaticosEnMap(map, person) {
  if (!map || !person) return;
  const { id, nombre } = resolveLocalidadEfectivaViaticos(person);
  const label = String(nombre || "").trim();
  if (id == null || !label) return;
  map[id] = label;
  map[String(id)] = label;
}

/** Localidad para ciudad_origen en planillas de viáticos. */
export function resolveCiudadOrigenViaticos(person, rowOverrides = {}) {
  const fromRow = String(rowOverrides.ciudad_origen || "").trim();
  if (fromRow) return fromRow;
  return resolveLocalidadEfectivaViaticos(person).nombre;
}

/** Localidad de asiento habitual (base de viáticos). */
export function resolveAsientoHabitualViaticos(person, rowOverrides = {}) {
  const fromRow = String(rowOverrides.asiento_habitual || "").trim();
  if (fromRow) return fromRow;
  return resolveLocalidadEfectivaViaticos(person).nombre;
}

/** Domicilio para campos de DJ (texto libre del PDF). */
export function resolveDomicilioDj(m) {
  if (!m) return "";
  if (usesViaticosLaboralBase(m) && m.laboral) {
    const direccion = (m.laboral.direccion || "").trim();
    if (direccion) return direccion;
  }
  return (m.domicilio || "").trim();
}

/** Ciudad para campos de DJ. */
export function resolveCiudadDj(m) {
  if (!m) return "";
  const loc = resolveLocalidadEfectivaViaticos(m);
  if (usesViaticosLaboralBase(m) && loc.nombre) return loc.nombre;
  return loc.nombre || getResidenciaNombre(m);
}
