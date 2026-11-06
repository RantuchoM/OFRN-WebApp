/** "Apellido, Nombre", o solo el apellido si no hay nombre (evita "Tradicional, null"). */
export function composerPersonLabel(person) {
  const apellido = typeof person?.apellido === "string" ? person.apellido.trim() : "";
  const nombre = typeof person?.nombre === "string" ? person.nombre.trim() : "";
  if (apellido && nombre) return `${apellido}, ${nombre}`;
  return apellido || nombre;
}
