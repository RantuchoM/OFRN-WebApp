import React from "react";
import {
  IconMail,
  IconCamera,
  IconClipboard,
} from "../../components/ui/Icons";
import SearchableSelect from "../../components/ui/SearchableSelect";
import DateInput from "../../components/ui/DateInput";
import WhatsAppLink from "../../components/ui/WhatsAppLink";
import EnsembleMultiSelect from "../../components/filters/EnsembleMultiSelect";
import { useMusicianFormContext } from "./MusicianFormContext";

const DIET_OPTIONS = [
  "General",
  "Celíaca",
  "Diabética",
  "Vegetariana",
  "Vegana",
  "Sin Sal",
  "Sin Lactosa",
];

export default function MusicianPersonalSection() {
  const {
    formData,
    formState: { errors = {} } = {},
    updateField,
    getInputStatusClass,
    labelClass,
    uploadToSupabase,
    handleClipboardClick,
    catalogoInstrumentos,
    locationsOptions,
    locacionesOptions,
    ensemblesOptions,
    selectedEnsembles,
    handleEnsemblesChange,
  } = useMusicianFormContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* --- HEADER PERSONAL: AVATAR Y NOMBRES --- */}
      <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
        {/* AVATAR */}
        <div className="shrink-0 flex flex-col items-center gap-4 w-40">
          <div className="relative group w-32 h-32 rounded-full shadow-lg ring-4 ring-white overflow-hidden bg-slate-200">
            {formData.avatar_url ? (
              <img
                src={formData.avatar_url}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-4xl font-black text-white"
                style={{ backgroundColor: formData.avatar_color }}
              >
                {formData.nombre?.[0]}
                {formData.apellido?.[0]}
              </div>
            )}

            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <label
                className="cursor-pointer text-white hover:text-indigo-300 transition-colors"
                title="Subir Foto"
              >
                <IconCamera size={24} />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) =>
                    uploadToSupabase(
                      e.target.files[0],
                      "avatar_url",
                      formData.avatar_url,
                    )
                  }
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  handleClipboardClick(
                    "avatar_url",
                    formData.avatar_url,
                  )
                }
                className="text-white hover:text-indigo-300"
                title="Pegar del portapapeles"
              >
                <IconClipboard size={20} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase">
              Color
            </span>
            <input
              type="color"
              value={formData.avatar_color || "#4f46e5"}
              onChange={(e) =>
                updateField("avatar_color", e.target.value)
              }
              className="w-6 h-6 rounded-full border-none cursor-pointer overflow-hidden p-0"
            />
          </div>
          <div className="w-full mt-2">
            <label className={labelClass + " text-center"}>
              Nota Interna
            </label>
            <textarea
              className={
                getInputStatusClass("nota_interna") +
                " h-24 text-xs resize-none bg-yellow-50 border-yellow-200 text-slate-600 focus:ring-yellow-100"
              }
              placeholder="Notas..."
              value={formData.nota_interna || ""}
              onChange={(e) => updateField("nota_interna", e.target.value)}
            />
          </div>
        </div>

        {/* DATOS PRINCIPALES */}
        <div className="flex-1 w-full space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Apellido</label>
              <input
                type="text"
                className={getInputStatusClass("apellido")}
                value={formData.apellido || ""}
                onChange={(e) =>
                  updateField("apellido", e.target.value)
                }
              />
              {errors.apellido && (
                <span className="text-red-500 text-[10px]">{errors.apellido.message}</span>
              )}
            </div>
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                type="text"
                className={getInputStatusClass("nombre")}
                value={formData.nombre || ""}
                onChange={(e) =>
                  updateField("nombre", e.target.value)
                }
              />
              {errors.nombre && (
                <span className="text-red-500 text-[10px]">{errors.nombre.message}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Email Personal</label>
              <div className="relative">
                <IconMail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  className={`${getInputStatusClass("mail")} pl-9`}
                  value={formData.mail || ""}
                  onChange={(e) =>
                    updateField("mail", e.target.value)
                  }
                />
              </div>
              {errors.mail && (
                <span className="text-red-500 text-[10px]">{errors.mail.message}</span>
              )}
            </div>
            <div>
              <label className={labelClass}>Teléfono Móvil</label>
              <div className="relative">
                <input
                  type="tel"
                  className={`${getInputStatusClass("telefono")} pr-10`}
                  value={formData.telefono || ""}
                  onChange={(e) =>
                    updateField("telefono", e.target.value)
                  }
                  placeholder="Ej: 2914556677"
                />
                <WhatsAppLink
                  phone={formData.telefono}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 p-1.5 rounded-full transition-colors"
                  iconSize={18}
                  title="Abrir chat de WhatsApp"
                />
              </div>
            </div>
          </div>

          {/* Datos complementarios: domicilio, sede, género, alimentación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Domicilio</label>
              <input
                type="text"
                className={getInputStatusClass("domicilio")}
                value={formData.domicilio || ""}
                onChange={(e) => updateField("domicilio", e.target.value)}
              />
            </div>

            <div className="relative z-30">
              <label className={labelClass}>Domicilio Laboral (Sede)</label>
              <SearchableSelect
                options={locacionesOptions}
                value={formData.id_domicilio_laboral}
                onChange={(val) => updateField("id_domicilio_laboral", val)}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Sexo (M/F/-)</label>
              <select
                value={
                  ["M", "F", "-"].includes(formData.genero)
                    ? formData.genero
                    : "-"
                }
                onChange={(e) => updateField("genero", e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="-">-</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Tipo de Alimentación</label>
              <select
                value={formData.alimentacion || "General"}
                onChange={(e) => updateField("alimentacion", e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {DIET_OPTIONS.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* --- CAMPOS ADICIONALES --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className={labelClass}>Instrumento</label>
          <SearchableSelect
            options={catalogoInstrumentos.map((i) => ({
              id: i.id,
              label: i.instrumento,
              value: i.id,
            }))}
            value={formData.id_instr}
            onChange={(val) => updateField("id_instr", val)}
            placeholder="Seleccionar instrumento..."
          />
          {errors.id_instr && (
            <span className="text-red-500 text-[10px]">{errors.id_instr.message}</span>
          )}
        </div>
        <div>
          <label className={labelClass}>Ensambles</label>
          <EnsembleMultiSelect
            ensembles={ensemblesOptions.map((o) => ({
              id: o.value,
              ensamble: o.label,
            }))}
            selectedEnsembleIds={selectedEnsembles}
            onChange={handleEnsemblesChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div>
          <label className={labelClass}>DNI</label>
          <input
            type="text"
            className={getInputStatusClass("dni")}
            value={formData.dni || ""}
            onChange={(e) => updateField("dni", e.target.value)}
          />
          {errors.dni && (
            <span className="text-red-500 text-[10px]">{errors.dni.message}</span>
          )}
        </div>
        <div>
          <label className={labelClass}>CUIL</label>
          <input
            type="text"
            className={getInputStatusClass("cuil")}
            value={formData.cuil || ""}
            onChange={(e) => updateField("cuil", e.target.value)}
          />
          {errors.cuil && (
            <span className="text-red-500 text-[10px]">{errors.cuil.message}</span>
          )}
        </div>
        <div>
          <label className={labelClass}>Nacionalidad</label>
          <input
            type="text"
            className={getInputStatusClass("nacionalidad")}
            value={formData.nacionalidad || ""}
            onChange={(e) =>
              updateField("nacionalidad", e.target.value)
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div>
          <DateInput
            label="Nacimiento"
            value={formData.fecha_nac || ""}
            onChange={(val) => updateField("fecha_nac", val)}
          />
        </div>
        <div className="relative z-50">
          <label className={labelClass}>Residencia</label>
          <SearchableSelect
            options={locationsOptions}
            value={formData.id_localidad}
            onChange={(val) => updateField("id_localidad", val)}
          />
        </div>
        <div className="relative z-40">
          <label className={labelClass}>Viáticos</label>
          <SearchableSelect
            options={locationsOptions}
            value={formData.id_loc_viaticos}
            onChange={(val) => updateField("id_loc_viaticos", val)}
          />
        </div>
      </div>
    </div>
  );
}
