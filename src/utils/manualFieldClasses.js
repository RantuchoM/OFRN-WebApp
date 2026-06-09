export const occupiedFieldClass =
  "border-sky-300 bg-sky-50 text-sky-950 focus:ring-2 focus:ring-sky-400/25 focus:border-sky-400";

export const occupiedDateInputClass = "!border-sky-300 !bg-sky-50/80";

export const occupiedTimeInputClass = "border-sky-300 bg-sky-50";

export const baseFieldClass =
  "border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none px-3 py-2";

export const isFieldFilled = (val) =>
  String(val ?? "").trim() !== "" && String(val ?? "").trim() !== "0";

export const inputClass = (val) => {
  return `${baseFieldClass} ${isFieldFilled(val) ? occupiedFieldClass : "bg-white"}`;
};

export const MANUAL_PERSONA_FIELDS = [
  "apellido",
  "nombre",
  "dni",
  "cargo",
  "jornada_laboral",
  "ciudad_origen",
  "asiento_habitual",
];

export const mapPersonaToFormFields = (persona) => ({
  apellido: persona?.apellido || "",
  nombre: persona?.nombre || "",
  dni: persona?.dni || "",
  cargo: persona?.cargo || "",
  jornada_laboral: persona?.jornada_laboral || persona?.jornada || "",
  ciudad_origen: persona?.ciudad_origen || "",
  asiento_habitual: persona?.asiento_habitual || "",
});

export const emptyPersonaFields = () =>
  Object.fromEntries(MANUAL_PERSONA_FIELDS.map((key) => [key, ""]));

export const buildPersonaLabel = (data) => {
  const apellido = String(data?.apellido || "").trim();
  const nombre = String(data?.nombre || "").trim();
  const dni = String(data?.dni || "").trim();
  if (!apellido && !nombre) return "";
  const name = [apellido, nombre].filter(Boolean).join(", ");
  return dni ? `${name} (${dni})` : name;
};

export const hasManualPersonaData = (data) =>
  MANUAL_PERSONA_FIELDS.some((key) => String(data?.[key] ?? "").trim() !== "");

export const parsePersonaSearchQuery = (query) => {
  const q = String(query || "").trim();
  if (!q) return emptyPersonaFields();
  if (q.includes(",")) {
    const [apellido, ...rest] = q.split(",");
    return {
      ...emptyPersonaFields(),
      apellido: apellido.trim(),
      nombre: rest.join(",").trim(),
    };
  }
  return { ...emptyPersonaFields(), apellido: q };
};
