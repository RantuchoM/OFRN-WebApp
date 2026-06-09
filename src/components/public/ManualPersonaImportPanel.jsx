import React from "react";
import SearchableSelect from "../ui/SearchableSelect";
import { IconEdit, IconUserPlus, IconUsers, IconX } from "../ui/Icons";
import { baseFieldClass, inputClass, MANUAL_PERSONA_FIELDS } from "../../utils/manualFieldClasses";

const LOCALIDADES_DATALIST_ID = "viaticos_manual_localidades";

const FIELD_LABELS = {
  apellido: "Apellido",
  nombre: "Nombre",
  dni: "DNI",
  cargo: "Cargo",
  jornada_laboral: "Jornada",
  ciudad_origen: "Ciudad origen",
  asiento_habitual: "Asiento habitual",
};

const FIELD_PLACEHOLDERS = {
  apellido: "Apellido",
  nombre: "Nombre",
  dni: "DNI",
  cargo: "Cargo",
  jornada_laboral: "Ej: 8 a 14",
  ciudad_origen: "Ciudad origen (p/ el campo Lugar y fecha)",
  asiento_habitual: "Asiento habitual",
};

const FIELD_COLS = {
  apellido: "md:col-span-2",
  nombre: "md:col-span-2",
  dni: "md:col-span-2",
  cargo: "md:col-span-4",
  jornada_laboral: "md:col-span-2",
  ciudad_origen: "md:col-span-3",
  asiento_habitual: "md:col-span-3",
};

const actionBtnClass = (active) =>
  [
    "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition",
    active
      ? "bg-slate-200 text-slate-900"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800",
  ].join(" ");

export default function ManualPersonaImportPanel({
  data = {},
  onFieldChange,
  getCloudFieldClass = (_, cls) => cls,
  localidades = [],
  hasPersonaLoaded = false,
  isEditing = false,
  editMode = null,
  changePersonaOpen = false,
  onStartEdit,
  onFinishEditing,
  onCreateNewPersona,
  onSelectExistingPersona,
  onAddNewPersona,
  onChangePersona,
  onCancelChangePersona,
  personaOptions,
  selectedPersonaId,
  onPersonaSelect,
  catalogStatus,
  personasCount = 0,
  personaLabel = "",
}) {
  const fieldClass = (key) => {
    if (!isEditing) {
      const filled = String(data?.[key] ?? "").trim();
      return `${baseFieldClass} border-transparent bg-transparent text-slate-800 shadow-none ${
        filled ? "" : "text-slate-400 italic"
      }`;
    }
    return getCloudFieldClass(key, inputClass(data?.[key]));
  };

  const displayValue = (key) => {
    const val = String(data?.[key] ?? "").trim();
    return val || (isEditing ? "" : "—");
  };

  const showFields = hasPersonaLoaded || isEditing;
  const showPicker = changePersonaOpen;

  const handleCreateFromSearch = (query) => {
    onCreateNewPersona(query);
  };

  return (
    <section className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Persona
          </div>
          <div className="text-sm font-semibold text-slate-800 mt-0.5">
            {personaLabel || "Sin persona cargada"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 shrink-0">
          {hasPersonaLoaded ? (
            <>
              <button
                type="button"
                onClick={onStartEdit}
                className={actionBtnClass(editMode === "edit")}
                title="Editar los datos personales de la planilla"
              >
                <IconEdit size={13} />
                Editar
              </button>
              <button
                type="button"
                onClick={onAddNewPersona}
                className={actionBtnClass(editMode === "add")}
                title="Agregar una persona nueva"
              >
                <IconUserPlus size={13} />
                Agregar
              </button>
              <button
                type="button"
                onClick={onChangePersona}
                className={actionBtnClass(changePersonaOpen)}
                title="Elegir otra persona de la base comunitaria"
              >
                <IconUsers size={13} />
                Cambiar persona
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onCreateNewPersona}
                className={actionBtnClass(editMode === "add")}
                title="Crear una persona nueva en la planilla"
              >
                <IconUserPlus size={13} />
                Crear nueva
              </button>
              <button
                type="button"
                onClick={onSelectExistingPersona}
                className={actionBtnClass(changePersonaOpen)}
                title="Seleccionar una persona de la base comunitaria"
              >
                <IconUsers size={13} />
                Seleccionar existente
              </button>
            </>
          )}
          {isEditing ? (
            <button
              type="button"
              onClick={onFinishEditing}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition"
            >
              Listo
            </button>
          ) : null}
        </div>
      </div>

      {showPicker ? (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              {hasPersonaLoaded
                ? "Elegir de la base comunitaria"
                : "Seleccionar de la base comunitaria"}
            </span>
            <button
              type="button"
              onClick={onCancelChangePersona}
              className="text-slate-400 hover:text-slate-600 transition"
              aria-label="Cerrar"
            >
              <IconX size={16} />
            </button>
          </div>
          <SearchableSelect
            options={personaOptions}
            value={selectedPersonaId}
            onChange={onPersonaSelect}
            onCreateWhenEmpty={handleCreateFromSearch}
            createWhenEmptyLabel={(query) =>
              query
                ? `Crear nueva persona: ${query}`
                : "Crear nueva persona"
            }
            placeholder={
              catalogStatus.loading
                ? "Cargando base..."
                : personasCount > 0
                  ? "Buscar por apellido, nombre o DNI..."
                  : "Buscar o crear nueva persona..."
            }
          />
          {catalogStatus.error ? (
            <div className="text-[11px] text-rose-700">{catalogStatus.error}</div>
          ) : null}
        </div>
      ) : null}

      {showFields ? (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3">
          {MANUAL_PERSONA_FIELDS.map((key) => (
            <label
              key={key}
              className={`text-[11px] font-semibold text-slate-500 ${FIELD_COLS[key] || ""}`}
            >
              {FIELD_LABELS[key]}
              <input
                type="text"
                autoComplete="off"
                readOnly={!isEditing}
                tabIndex={isEditing ? 0 : -1}
                list={
                  isEditing && (key === "ciudad_origen" || key === "asiento_habitual")
                    ? LOCALIDADES_DATALIST_ID
                    : undefined
                }
                className={`mt-0.5 w-full ${fieldClass(key)} ${!isEditing ? "cursor-default focus:ring-0" : ""}`}
                value={isEditing ? (data?.[key] ?? "") : displayValue(key)}
                onChange={onFieldChange(key)}
                placeholder={isEditing ? FIELD_PLACEHOLDERS[key] : undefined}
              />
            </label>
          ))}
        </div>
      ) : null}

      {isEditing ? (
        <datalist id={LOCALIDADES_DATALIST_ID}>
          {(localidades || []).map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
      ) : null}
    </section>
  );
}
