import React, { useMemo } from "react";
import SearchableSelect from "../../../components/ui/SearchableSelect";
import { localidadesToSearchableOptions } from "./localidadesSearchable";
import { scrnTransporteColorFromEntity } from "./scrnTransporteColor";
import { topeTransportePasajeros } from "./scrnPlazasCapacidad";

export const initialViajeForm = {
  id_transporte: "",
  id_chofer: "",
  motivo: "",
  origen: "",
  destino_final: "",
  fecha_salida: "",
  fecha_llegada_estimada: "",
  fecha_retorno: "",
  observaciones: "",
  paquetes_bodega_llena: false,
  plazas_pasajeros: "",
};

export function toLocalInputDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function viajeDraftFromItem(item) {
  if (!item) {
    return { ...initialViajeForm };
  }
  return {
    id_transporte: item.id_transporte != null ? String(item.id_transporte) : "",
    id_chofer: item.id_chofer != null ? String(item.id_chofer) : "",
    motivo: item.motivo || "",
    origen: item.origen || "",
    destino_final: item.destino_final || "",
    fecha_salida: toLocalInputDateTime(item.fecha_salida),
    fecha_llegada_estimada: toLocalInputDateTime(item.fecha_llegada_estimada),
    fecha_retorno: toLocalInputDateTime(item.fecha_retorno),
    observaciones: item.observaciones || "",
    paquetes_bodega_llena: Boolean(item.paquetes_bodega_llena),
    plazas_pasajeros:
      item.plazas_pasajeros != null && item.plazas_pasajeros !== ""
        ? String(item.plazas_pasajeros)
        : "",
  };
}

const labelClass = "text-[11px] font-bold uppercase tracking-wide text-slate-500";
/** Altura fija alineada con SearchableSelect y datetime-local (h-10 = 2.5rem). */
const inputClass =
  "w-full h-10 box-border rounded-lg border border-slate-300 px-3 text-sm leading-none";
const inputClassBg = `${inputClass} bg-white`;

const locSelectClass = "w-full";

export function ViajeFormFields({
  values,
  onFieldChange,
  localidades = [],
  transportes = [],
  choferOptions = [],
  showChoferField = false,
  fieldIdPrefix = "viaje",
}) {
  const locOptions = useMemo(
    () => localidadesToSearchableOptions(localidades),
    [localidades],
  );
  const transporteSeleccionado = useMemo(() => {
    const id = values.id_transporte;
    if (id === "" || id == null) return null;
    return transportes.find((t) => String(t.id) === String(id)) || null;
  }, [transportes, values.id_transporte]);
  const topePaxTransporte = useMemo(
    () => topeTransportePasajeros(transporteSeleccionado),
    [transporteSeleccionado],
  );
  const v = (field) => (event) => onFieldChange(field, event.target.value);
  const vBool = (field) => (event) => onFieldChange(field, event.target.checked);
  const setLoc = (field) => (val) =>
    onFieldChange(field, val == null || val === "" ? "" : String(val).trim());

  return (
    <div className="space-y-5">
      {/* Título | Transporte */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor={`${fieldIdPrefix}-motivo`} className={labelClass}>
            Título / motivo del recorrido
          </label>
          <input
            id={`${fieldIdPrefix}-motivo`}
            value={values.motivo || ""}
            onChange={v("motivo")}
            placeholder="Ej: Traslado ensayo general"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <label htmlFor={`${fieldIdPrefix}-id_transporte`} className={labelClass}>
              Transporte asignado
            </label>
            {transporteSeleccionado ? (
              <span
                className="inline-block h-4 w-4 rounded border border-slate-300 shrink-0"
                style={{
                  backgroundColor: scrnTransporteColorFromEntity(transporteSeleccionado),
                }}
                title={transporteSeleccionado.nombre || ""}
                aria-hidden
              />
            ) : null}
          </div>
          <select
            id={`${fieldIdPrefix}-id_transporte`}
            required
            value={values.id_transporte || ""}
            onChange={v("id_transporte")}
            className={inputClassBg}
          >
            <option value="">Seleccionar transporte</option>
            {transportes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} ({t.tipo})
              </option>
            ))}
          </select>
          {transporteSeleccionado ? (
            <p className="text-[11px] text-slate-500 leading-snug">
              Plazas para pasajeros:{" "}
              <span className="font-bold text-slate-700">{topePaxTransporte}</span> (capacidad{" "}
              {Number(transporteSeleccionado.capacidad_max) || 0} − 1 chofer).
            </p>
          ) : null}
        </div>
      </div>

      {/* Chofer | Plazas | Paquetería */}
      <div
        className={`grid gap-3 items-start ${showChoferField ? "md:grid-cols-3" : "md:grid-cols-2"}`}
      >
        {showChoferField ? (
          <div className="space-y-1">
            <label htmlFor={`${fieldIdPrefix}-id_chofer`} className={labelClass}>
              Chofer del viaje
            </label>
            <select
              id={`${fieldIdPrefix}-id_chofer`}
              required
              value={values.id_chofer || ""}
              onChange={v("id_chofer")}
              className={inputClassBg}
            >
              <option value="">Seleccionar chofer</option>
              {choferOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {`${p.apellido || ""}, ${p.nombre || ""}`.replace(/^,\s*/, "").trim() || p.id}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-1 min-w-0">
          <label htmlFor={`${fieldIdPrefix}-plazas_pasajeros`} className={labelClass}>
            Plazas (pasajeros, sin chofer)
          </label>
          <input
            id={`${fieldIdPrefix}-plazas_pasajeros`}
            type="number"
            min={0}
            value={values.plazas_pasajeros ?? ""}
            onChange={v("plazas_pasajeros")}
            placeholder={
              transporteSeleccionado
                ? `Defecto: ${topePaxTransporte} (vacío = tope)`
                : "Elegí transporte"
            }
            className={inputClass}
          />
          <p className="text-[10px] text-slate-500 leading-snug">
            Opcional: limitá plazas si un asiento no se usa. Vacío = tope del transporte.
          </p>
        </div>
        <div className="space-y-1 flex flex-col justify-end min-h-[3.5rem] md:pt-4">
          <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2.5">
            <input
              id={`${fieldIdPrefix}-paquetes_bodega_llena`}
              type="checkbox"
              checked={Boolean(values.paquetes_bodega_llena)}
              onChange={vBool("paquetes_bodega_llena")}
              className="mt-0.5 rounded border-slate-300"
            />
            <div>
              <label
                htmlFor={`${fieldIdPrefix}-paquetes_bodega_llena`}
                className="text-xs font-bold text-slate-800 cursor-pointer"
              >
                Bodega de paquetería llena
              </label>
              <p className="text-[10px] text-slate-500 leading-snug">
                No se aceptan nuevos envíos de paquetes en este recorrido.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Origen | Salida */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1 min-w-0">
          <span className={labelClass}>Origen</span>
          <SearchableSelect
            options={locOptions}
            value={values.origen || null}
            onChange={setLoc("origen")}
            placeholder="Buscar localidad de origen…"
            className={locSelectClass}
            dropdownMinWidth={280}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${fieldIdPrefix}-fecha_salida`} className={labelClass}>
            Fecha y hora de salida
          </label>
          <input
            id={`${fieldIdPrefix}-fecha_salida`}
            type="datetime-local"
            required
            value={values.fecha_salida || ""}
            onChange={v("fecha_salida")}
            className={inputClass}
          />
        </div>
      </div>

      {/* Destino | Llegada | Retorno */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="space-y-1 min-w-0">
          <span className={labelClass}>Destino</span>
          <SearchableSelect
            options={locOptions}
            value={values.destino_final || null}
            onChange={setLoc("destino_final")}
            placeholder="Buscar localidad de destino…"
            className={locSelectClass}
            dropdownMinWidth={280}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${fieldIdPrefix}-fecha_llegada_estimada`} className={labelClass}>
            Fecha y hora de llegada a origen
          </label>
          <input
            id={`${fieldIdPrefix}-fecha_llegada_estimada`}
            type="datetime-local"
            required
            value={values.fecha_llegada_estimada || ""}
            onChange={v("fecha_llegada_estimada")}
            className={inputClass}
          />
          <p className="text-[10px] text-slate-500 leading-snug">
            Cuando el vehículo vuelve al origen y queda libre.
          </p>
        </div>
        <div className="space-y-1">
          <label htmlFor={`${fieldIdPrefix}-fecha_retorno`} className={labelClass}>
            Fecha y hora de retorno
            <span className="font-normal text-slate-400 normal-case"> (opcional)</span>
          </label>
          <input
            id={`${fieldIdPrefix}-fecha_retorno`}
            type="datetime-local"
            value={values.fecha_retorno || ""}
            onChange={v("fecha_retorno")}
            className={inputClass}
          />
          <p className="text-[10px] text-slate-500 leading-snug">
            Tramo de vuelta para quien solo toma la ida y vuelta.
          </p>
        </div>
      </div>

      {/* Observaciones */}
      <div className="space-y-1">
        <label htmlFor={`${fieldIdPrefix}-observaciones`} className={labelClass}>
          Observaciones
        </label>
        <textarea
          id={`${fieldIdPrefix}-observaciones`}
          value={values.observaciones || ""}
          onChange={v("observaciones")}
          placeholder="Notas logísticas, paradas, aclaraciones…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-24"
        />
      </div>
    </div>
  );
}
