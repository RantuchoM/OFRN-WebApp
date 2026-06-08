import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  IconMapPin,
  IconX,
  IconLoader,
  IconSearch,
  IconPlus,
  IconEdit,
  IconCheck,
} from "../ui/Icons";
import { toast } from "sonner";
import { getGoogleMapsUrl } from "../../utils/agendaHelpers";
import {
  parseGoogleMapsCoords,
  isShortGoogleMapsLink,
  resolveLocacionCoordsFromData,
} from "../../utils/mapsCoords";

const EMPTY_FORM = {
  id: null,
  nombre: "",
  direccion: "",
  link_mapa: "",
  latitud: "",
  longitud: "",
  id_localidad: "",
  telefono: "",
  mail: "",
};

/**
 * Gestor de locaciones (lista + formulario crear/editar).
 * @param {object} props
 * @param {import('@supabase/supabase-js').SupabaseClient} props.supabase
 * @param {() => void} props.onClose
 * @param {() => void} [props.onSuccess]
 * @param {number|string|null} [props.initialLocationId] - abre directo en edición (p. ej. desde Difusión)
 */
export default function LocationManagerModal({
  supabase,
  onClose,
  onSuccess,
  initialLocationId = null,
}) {
  const singleMode = initialLocationId != null && initialLocationId !== "";
  const [view, setView] = useState(singleMode ? "form" : "list");
  const [locations, setLocations] = useState([]);
  const [cities, setCities] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [formBooting, setFormBooting] = useState(singleMode);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [resolvingCoords, setResolvingCoords] = useState(false);

  const applyLocationToForm = useCallback((loc) => {
    setFormData({
      id: loc.id,
      nombre: loc.nombre || "",
      direccion: loc.direccion || "",
      link_mapa: loc.link_mapa || "",
      latitud: loc.latitud != null ? String(loc.latitud) : "",
      longitud: loc.longitud != null ? String(loc.longitud) : "",
      id_localidad: loc.id_localidad || "",
      telefono: loc.telefono ?? "",
      mail: loc.mail || "",
    });
    setView("form");
  }, []);

  const fetchCities = useCallback(async () => {
    const { data } = await supabase
      .from("localidades")
      .select("id, localidad")
      .order("localidad");
    if (data) setCities(data);
  }, [supabase]);

  const fetchLocations = useCallback(async () => {
    setListLoading(true);
    try {
      const { data } = await supabase
        .from("locaciones")
        .select("*, localidades(localidad)")
        .order("nombre");
      if (data) setLocations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setListLoading(false);
    }
  }, [supabase]);

  const fetchData = useCallback(async () => {
    await Promise.all([fetchLocations(), fetchCities()]);
  }, [fetchLocations, fetchCities]);

  useEffect(() => {
    if (!singleMode) {
      fetchData();
    } else {
      fetchCities();
    }
  }, [singleMode, fetchData, fetchCities]);

  useEffect(() => {
    if (!singleMode || !initialLocationId) return;
    let cancelled = false;
    (async () => {
      setFormBooting(true);
      try {
        const { data, error } = await supabase
          .from("locaciones")
          .select("*, localidades(localidad)")
          .eq("id", initialLocationId)
          .single();
        if (error) throw error;
        if (!cancelled && data) applyLocationToForm(data);
      } catch (err) {
        if (!cancelled) {
          toast.error("No se pudo cargar la locación: " + err.message);
          onClose();
        }
      } finally {
        if (!cancelled) setFormBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [singleMode, initialLocationId, supabase, applyLocationToForm, onClose]);

  const handleEdit = (loc) => {
    applyLocationToForm(loc);
  };

  const handleCreate = () => {
    setFormData({ ...EMPTY_FORM });
    setView("form");
  };

  const canCalcCoords = useMemo(() => {
    const link = formData.link_mapa?.trim();
    const localidad = cities.find(
      (c) => String(c.id) === String(formData.id_localidad),
    )?.localidad;
    return Boolean(
      link ||
        formData.direccion?.trim() ||
        localidad ||
        formData.nombre?.trim(),
    );
  }, [
    formData.link_mapa,
    formData.direccion,
    formData.nombre,
    formData.id_localidad,
    cities,
  ]);

  const handleCalcCoords = async () => {
    const localidad = cities.find(
      (c) => String(c.id) === String(formData.id_localidad),
    )?.localidad;
    if (!canCalcCoords) {
      toast.error("Completá dirección, localidad o link de Google Maps");
      return;
    }
    setResolvingCoords(true);
    try {
      const coords = await resolveLocacionCoordsFromData(
        {
          nombre: formData.nombre,
          direccion: formData.direccion,
          link_mapa: formData.link_mapa,
          localidad,
        },
        { supabase },
      );
      if (!coords) {
        toast.error(
          "No se pudieron obtener coordenadas con los datos ingresados",
        );
        return;
      }
      setFormData((prev) => ({
        ...prev,
        latitud: String(coords.lat),
        longitud: String(coords.lng),
        ...(!prev.link_mapa?.trim() && coords.resolvedFrom?.startsWith("http")
          ? { link_mapa: coords.resolvedFrom }
          : {}),
      }));
      toast.success(
        formData.link_mapa?.trim()
          ? "Coordenadas calculadas desde el link"
          : "Coordenadas calculadas desde dirección y localidad",
      );
    } catch (err) {
      toast.error(err?.message || "Error al calcular coordenadas");
    } finally {
      setResolvingCoords(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre: formData.nombre.trim(),
        direccion: formData.direccion?.trim() || null,
        link_mapa: formData.link_mapa?.trim() || null,
        latitud: formData.latitud !== "" ? Number(formData.latitud) : null,
        longitud: formData.longitud !== "" ? Number(formData.longitud) : null,
        id_localidad: formData.id_localidad || null,
        telefono: formData.telefono ? formData.telefono : null,
        mail: formData.mail?.trim() || null,
      };

      if (formData.id) {
        const { error } = await supabase
          .from("locaciones")
          .update(payload)
          .eq("id", formData.id);
        if (error) throw error;
        toast.success("Locación actualizada");
      } else {
        const { error } = await supabase.from("locaciones").insert([payload]);
        if (error) throw error;
        toast.success("Locación creada");
      }

      if (!singleMode) await fetchLocations();
      if (onSuccess) onSuccess();

      if (singleMode) {
        onClose();
        return;
      }
      setView("list");
    } catch (err) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredLocations = locations.filter(
    (l) =>
      l.nombre.toLowerCase().includes(search.toLowerCase()) ||
      l.localidades?.localidad?.toLowerCase().includes(search.toLowerCase()),
  );

  const previewGoogleMapsUrl = useMemo(() => {
    const localidad = cities.find(
      (c) => String(c.id) === String(formData.id_localidad),
    )?.localidad;
    if (
      !formData.nombre?.trim() &&
      !formData.direccion?.trim() &&
      !formData.link_mapa?.trim() &&
      !localidad
    ) {
      return null;
    }
    return getGoogleMapsUrl({
      nombre: formData.nombre,
      direccion: formData.direccion,
      link_mapa: formData.link_mapa,
      localidades: localidad ? { localidad } : null,
    });
  }, [formData.nombre, formData.direccion, formData.link_mapa, formData.id_localidad, cities]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <IconMapPin className="text-indigo-600" />
            {view === "list"
              ? "Gestionar Locaciones"
              : formData.id
                ? "Editar Locación"
                : "Nueva Locación"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-6">
          {listLoading && view === "list" && (
            <div className="text-center py-4">
              <IconLoader className="animate-spin inline text-indigo-600" />
            </div>
          )}

          {!listLoading && view === "list" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <IconSearch
                    className="absolute left-2 top-2.5 text-slate-400"
                    size={14}
                  />
                  <input
                    type="text"
                    className="w-full pl-7 p-2 text-xs border rounded outline-none focus:border-indigo-500"
                    placeholder="Buscar locación..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="bg-indigo-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-indigo-700 flex items-center gap-1"
                >
                  <IconPlus size={14} /> Nueva
                </button>
              </div>
              <div className="divide-y divide-slate-100 border rounded-lg">
                {filteredLocations.map((loc) => (
                  <div
                    key={loc.id}
                    className="p-3 flex justify-between items-center hover:bg-slate-50"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-700">
                        {loc.nombre}
                      </div>
                      <div className="text-xs text-slate-500 flex gap-2">
                        {loc.localidades?.localidad && (
                          <span>📍 {loc.localidades.localidad}</span>
                        )}
                        {loc.direccion && (
                          <span className="truncate max-w-[150px] opacity-70">
                            {loc.direccion}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEdit(loc)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
                    >
                      <IconEdit size={16} />
                    </button>
                  </div>
                ))}
                {filteredLocations.length === 0 && (
                  <div className="p-4 text-center text-slate-400 text-xs italic">
                    No se encontraron resultados.
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "form" && (
            <div className="space-y-4">
              {formBooting ? (
                <div className="text-center py-6">
                  <IconLoader className="animate-spin inline text-indigo-600" />
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Nombre del lugar
                    </label>
                    <input
                      className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                      value={formData.nombre}
                      onChange={(e) =>
                        setFormData({ ...formData, nombre: e.target.value })
                      }
                      placeholder="Ej: Teatro Municipal"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Ciudad / Localidad
                    </label>
                    <select
                      className="w-full p-2 border rounded text-sm outline-none bg-white"
                      value={formData.id_localidad}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          id_localidad: e.target.value,
                        })
                      }
                    >
                      <option value="">- Sin definir -</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.localidad}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Dirección
                    </label>
                    <input
                      className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                      value={formData.direccion}
                      onChange={(e) =>
                        setFormData({ ...formData, direccion: e.target.value })
                      }
                      placeholder="Calle y número"
                    />
                  </div>
                  {previewGoogleMapsUrl && (
                    <a
                      href={previewGoogleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 hover:text-indigo-700"
                    >
                      <IconMapPin size={14} className="text-indigo-600 shrink-0" />
                      Abrir en Google Maps
                    </a>
                  )}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Link Google Maps (opcional)
                    </label>
                    <input
                      type="url"
                      className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                      value={formData.link_mapa}
                      onChange={(e) =>
                        setFormData({ ...formData, link_mapa: e.target.value })
                      }
                      placeholder="https://maps.google.com/..."
                      onBlur={() => {
                        if (formData.latitud !== "" && formData.longitud !== "")
                          return;
                        const c = parseGoogleMapsCoords(formData.link_mapa);
                        if (c) {
                          setFormData((prev) => ({
                            ...prev,
                            latitud: String(c.lat),
                            longitud: String(c.lng),
                          }));
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={resolvingCoords || !canCalcCoords}
                      onClick={handleCalcCoords}
                      className="mt-1.5 w-full py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {resolvingCoords ? (
                        <>
                          <IconLoader size={14} className="animate-spin" />
                          Calculando…
                        </>
                      ) : (
                        "Calcular coordenadas"
                      )}
                    </button>
                    {isShortGoogleMapsLink(formData.link_mapa) &&
                      (formData.latitud === "" || formData.longitud === "") && (
                        <p className="mt-1 text-[10px] text-slate-500 leading-snug">
                          Link corto detectado: usá el botón de arriba para resolver
                          latitud y longitud.
                        </p>
                      )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Latitud (RRHH / distancia)
                      </label>
                      <input
                        type="number"
                        step="any"
                        className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                        value={formData.latitud}
                        onChange={(e) =>
                          setFormData({ ...formData, latitud: e.target.value })
                        }
                        placeholder="-40.81"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Longitud
                      </label>
                      <input
                        type="number"
                        step="any"
                        className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                        value={formData.longitud}
                        onChange={(e) =>
                          setFormData({ ...formData, longitud: e.target.value })
                        }
                        placeholder="-63.00"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Teléfono
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                        value={formData.telefono}
                        onChange={(e) =>
                          setFormData({ ...formData, telefono: e.target.value })
                        }
                        placeholder="Ej: 0264 1234567"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                        value={formData.mail}
                        onChange={(e) =>
                          setFormData({ ...formData, mail: e.target.value })
                        }
                        placeholder="contacto@lugar.com"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {view === "form" && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
            {!singleMode && (
              <button
                type="button"
                onClick={() => setView("list")}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                Volver
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || formBooting}
              className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <IconLoader size={14} className="animate-spin" />
              ) : (
                <IconCheck size={14} />
              )}{" "}
              Guardar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
