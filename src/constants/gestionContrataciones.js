/** Giras con fecha_desde anterior a esta fecha no entran al módulo (piloto). */
export const GESTION_CONTRATACIONES_GIRA_MIN_DATE = "2026-11-05";

/** Destinatario del recordatorio de facturas (lunes post-gira). */
export const GESTION_CONTRATACIONES_FACTURAS_MAIL =
  "filarmonica.scrn@gmail.com";

/** Bruto sugerido: neto es 85% del bruto base (5% + 10% sobre bruto). */
export const GESTION_BRUTO_NETO_RATIO = 0.85;

/** Comisión productor sugerida sobre el bruto base. */
export const GESTION_COMISION_RATIO = 0.1;

export const FONDO_CODIGOS = {
  FACTURA: "factura",
  APORTE_690: "aporte_690",
  REEMPLAZOS: "reemplazos",
  ORQUESTA: "orquesta",
};

/**
 * Modalidades de liquidación externa: no gastan caja propia.
 * Un pago con factura/690 no genera deuda ni resta saldo de fondos.
 */
export const FONDOS_MODALIDAD_EXTERNA = new Set([
  FONDO_CODIGOS.FACTURA,
  FONDO_CODIGOS.APORTE_690,
]);

/** Fondos de caja real (orquesta / cuentas de reemplazos). */
export const FONDOS_CAJA = new Set([
  FONDO_CODIGOS.ORQUESTA,
  FONDO_CODIGOS.REEMPLAZOS,
]);

export function isFondoModalidadExterna(codigo) {
  return FONDOS_MODALIDAD_EXTERNA.has(String(codigo || ""));
}

export function isFondoCaja(codigo) {
  return FONDOS_CAJA.has(String(codigo || ""));
}

export const AEREO_MODOS = [
  { value: "orquesta", label: "Compra la orquesta" },
  { value: "en_cachet", label: "Va en el cachet" },
  { value: "no_aplica", label: "No aplica" },
];

/** Movimientos en gestion_pagos: liquidación vs costo operativo. */
export const PAGO_CLASES = [
  {
    value: "pago",
    label: "Pago",
    hint: "Desembolso / liquidación del expediente (productor, cachet, etc.)",
  },
  {
    value: "gasto",
    label: "Gasto",
    hint: "Costo operativo incluido en el expediente (aéreo, extras, etc.)",
  },
];

export function pagoClaseLabel(clase) {
  return PAGO_CLASES.find((c) => c.value === clase)?.label || "Pago";
}

export function isGiraEligibleForGestionContrataciones(fechaDesde) {
  if (!fechaDesde) return false;
  const d = String(fechaDesde).slice(0, 10);
  return d >= GESTION_CONTRATACIONES_GIRA_MIN_DATE;
}

/** Invitado no estable (condicion distinta de estable). */
export function isInvitadoNoEstable(person) {
  const c = String(person?.condicion || "")
    .trim()
    .toLowerCase();
  return c !== "estable" && c !== "";
}

export function needsAereoMode(person) {
  if (!isInvitadoNoEstable(person)) return false;
  const f = String(person?.funcion || person?.rol_gira || "")
    .trim()
    .toLowerCase();
  return (
    f.includes("director") ||
    f.includes("solista") ||
    Boolean(person?.es_solista)
  );
}

/**
 * Desglose de bruto sugerido a partir del neto de contrataciones + misceláneo.
 * neto = 85% del bruto_base → bruto_base = neto / 0.85
 * comisión sugerida = 10% del bruto_base
 * bruto sugerido factura = bruto_base + misceláneo
 */
export function buildBrutoBreakdown(netoArs, miscelaneo = 0) {
  const neto = Number(netoArs) || 0;
  const misc = Number(miscelaneo) || 0;
  const brutoBase =
    neto > 0
      ? Math.round((neto / GESTION_BRUTO_NETO_RATIO) * 100) / 100
      : 0;
  const comisionSugerida =
    Math.round(brutoBase * GESTION_COMISION_RATIO * 100) / 100;
  const otrosPorcentaje =
    Math.round(brutoBase * (1 - GESTION_BRUTO_NETO_RATIO - GESTION_COMISION_RATIO) * 100) /
    100;
  const brutoSugerido = Math.round((brutoBase + misc) * 100) / 100;
  return {
    neto,
    miscelaneo: misc,
    brutoBase,
    comisionSugerida,
    otrosPorcentaje,
    brutoSugerido,
  };
}

export function suggestBrutoFromNeto(netoArs, miscelaneo = 0) {
  return buildBrutoBreakdown(netoArs, miscelaneo).brutoSugerido;
}

export function suggestComisionFromNeto(netoArs) {
  return buildBrutoBreakdown(netoArs, 0).comisionSugerida;
}

/** Alerta si la comisión almacenada es < 10% del bruto de factura. */
export function isComisionBelowThreshold(montoComision, montoBrutoFacturar) {
  const bruto = Number(montoBrutoFacturar) || 0;
  const comision = Number(montoComision);
  if (!(bruto > 0) || !Number.isFinite(comision)) return false;
  return comision < bruto * GESTION_COMISION_RATIO - 0.005;
}
