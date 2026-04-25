/**
 * Pasajeros en scrn_reserva_pasajeros: la identidad canónica es id_perfil → scrn_perfiles.
 * Las columnas nombre/apellido/email en la fila de pax son legado; no denormalizar en altas nuevas.
 */

export function rowReservaPaxDesdePerfil({
  id_reserva,
  id_perfil,
  estado = "pendiente",
  notas = null,
}) {
  return {
    id_reserva,
    id_perfil,
    nombre: null,
    apellido: null,
    email: null,
    notas: notas ?? null,
    estado,
  };
}

function perfilFromPax(p, perfilesById) {
  if (p?.perfil) return p.perfil;
  const id = p?.id_perfil;
  if (id && perfilesById && perfilesById[id]) return perfilesById[id];
  return null;
}

export function paxNombreCompleto(p, perfilesById) {
  const prof = perfilFromPax(p, perfilesById);
  if (prof) {
    const s = `${(prof.nombre || "").trim()} ${(prof.apellido || "").trim()}`.trim();
    return s || "—";
  }
  const s = `${(p?.nombre || "").trim()} ${(p?.apellido || "").trim()}`.trim();
  return s || "—";
}

export function paxApellidoNombre(p, perfilesById) {
  const prof = perfilFromPax(p, perfilesById);
  if (prof) {
    const s = `${(prof.apellido || "").trim()}, ${(prof.nombre || "").trim()}`
      .replace(/^,\s*/, "")
      .trim();
    return s || "—";
  }
  const s = `${(p?.apellido || "").trim()}, ${(p?.nombre || "").trim()}`
    .replace(/^,\s*/, "")
    .trim();
  return s || "—";
}

/** Email guardado solo en filas legado; los perfiles no siempre exponen mail vía PostgREST. */
export function paxEmailMostrar(p) {
  const e = p?.email;
  if (e == null || String(e).trim() === "") return null;
  return String(e).trim();
}
