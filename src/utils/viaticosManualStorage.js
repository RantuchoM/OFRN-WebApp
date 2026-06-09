export const STORAGE_KEY = "ofrn_manual_viatico_data";
export const VIATICO_ORIGEN_SESSION_KEY = "viaticos_manual_viatico_origen_id";
export const GUEST_BYPASS_SESSION_KEY = "viaticos_manual_guest_bypass";

export function readGuestBypass() {
  try {
    return sessionStorage.getItem(GUEST_BYPASS_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setGuestBypass() {
  try {
    sessionStorage.setItem(GUEST_BYPASS_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearGuestBypass() {
  try {
    sessionStorage.removeItem(GUEST_BYPASS_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function readManualStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Persiste formulario de viático sin pisar manual_rendicion existente. */
export function writeViaticoToStorage(form) {
  try {
    const existing = readManualStorage();
    const payload = { ...(existing || {}), ...form };
    if (existing?.manual_rendicion) {
      payload.manual_rendicion = existing.manual_rendicion;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return payload;
  } catch {
    return form;
  }
}

export function writeRendicionToStorage(base, ant, rend) {
  try {
    const payload = { ...base, manual_rendicion: { ant, rend } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return payload;
  } catch {
    return { ...base, manual_rendicion: { ant, rend } };
  }
}

const toStorageNumber = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const hasText = (value) => String(value ?? "").trim() !== "";

export function hasMeaningfulViaticoData(form) {
  if (!form || typeof form !== "object") return false;

  const identityKeys = [
    "apellido",
    "nombre",
    "dni",
    "cargo",
    "jornada_laboral",
    "ciudad_origen",
    "asiento_habitual",
    "motivo",
    "lugar_comision",
    "fecha_salida",
    "hora_salida",
    "fecha_llegada",
    "hora_llegada",
    "patente_oficial",
    "patente_particular",
    "transporte_otros",
    "transporte_otros_detalle",
  ];
  if (identityKeys.some((key) => hasText(form[key]))) return true;

  if (
    form.check_aereo ||
    form.check_terrestre ||
    form.check_patente_oficial ||
    form.check_patente_particular ||
    form.temporada_alta
  ) {
    return true;
  }

  const gastoKeys = [
    "gasto_alojamiento",
    "gasto_pasajes",
    "gasto_combustible",
    "gasto_otros",
    "gastos_capacit",
    "gastos_movil_otros",
    "gasto_ceremonial",
  ];
  return gastoKeys.some((key) => toStorageNumber(form[key]) > 0);
}

export function hasMeaningfulRendicionData(base, ant, rend) {
  if (hasMeaningfulViaticoData(base)) return true;

  const moneyValues = [...Object.values(ant || {}), ...Object.values(rend || {})];
  return moneyValues.some((value) => toStorageNumber(value) > 0);
}

export function formatSavedDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return String(iso);
  }
}
