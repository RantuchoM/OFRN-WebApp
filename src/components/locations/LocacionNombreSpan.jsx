import React from "react";

export const LOCACION_NO_DEFINIDA_LABEL = "Locación no definida";

function normalizeLocacionLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isLocacionADefinir(nombre) {
  return normalizeLocacionLabel(nombre) === "a definir";
}

export function isLocacionNoDefinida(nombre) {
  return normalizeLocacionLabel(nombre) === "locacion no definida";
}

export function hasLocacionSeleccionada({ nombre, idLocacion, locacion } = {}) {
  const text = String(nombre ?? locacion?.nombre ?? "").trim();
  if (text) return true;

  const id =
    idLocacion != null && idLocacion !== ""
      ? idLocacion
      : locacion?.id;
  return id != null && id !== "" && Number(id) !== 0;
}

export function resolveLocacionNombre({
  nombre,
  idLocacion,
  locacion,
} = {}) {
  const text = String(nombre ?? locacion?.nombre ?? "").trim();
  if (text) return text;
  return LOCACION_NO_DEFINIDA_LABEL;
}

/** Conciertos y ensayos muestran locación aunque no esté asignada. */
export function shouldShowLocacionEnEvento(evt) {
  const type = Number(evt?.id_tipo_evento);
  return (
    type === 1 ||
    type === 13 ||
    hasLocacionSeleccionada({
      nombre: evt?.locaciones?.nombre,
      idLocacion: evt?.id_locacion,
      locacion: evt?.locaciones,
    })
  );
}

function isLocacionNombreDestacado(nombre) {
  return isLocacionADefinir(nombre) || isLocacionNoDefinida(nombre);
}

/** Nombre de locación; "A definir" y "Locación no definida" en naranja oscuro. */
export default function LocacionNombreSpan({
  nombre,
  idLocacion,
  locacion,
  className = "",
}) {
  const display = resolveLocacionNombre({ nombre, idLocacion, locacion });
  const tone = isLocacionNombreDestacado(display) ? "text-orange-700" : "";

  return (
    <span className={[className, tone].filter(Boolean).join(" ")}>{display}</span>
  );
}
