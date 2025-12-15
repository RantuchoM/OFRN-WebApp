import React, { useState, useEffect } from "react";
import {
  IconEdit,
  IconCheck,
  IconX,
  IconLoader,
  IconLink,
  IconArrowLeft,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";

// --- UTILIDADES DE FORMATO ---

// Formato extendido: "Viernes 20 de Febrero | 20:00 hs"
const formatDateExtended = (dateStr, timeStr) => {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T12:00:00`);
  const options = { weekday: "long", day: "numeric", month: "long" };
  const datePart = date.toLocaleDateString("es-ES", options);
  const timePart = timeStr ? ` | ${timeStr.slice(0, 5)} hs` : "";
  return datePart.charAt(0).toUpperCase() + datePart.slice(1) + timePart;
};

// Formato Header: "Febrero 20 y 21"
const formatHeaderDates = (events) => {
  if (!events || events.length === 0) return "Fechas a confirmar";

  const dates = events
    .map((e) => new Date(e.fecha + "T12:00:00"))
    .sort((a, b) => a - b);

  const groups = {};
  dates.forEach((date) => {
    const month = date.toLocaleDateString("es-ES", { month: "long" });
    const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
    if (!groups[monthCap]) groups[monthCap] = [];
    groups[monthCap].push(date.getDate());
  });

  return Object.entries(groups)
    .map(([month, days]) => {
      const uniqueDays = [...new Set(days)].sort((a, b) => a - b);
      const dayStr = uniqueDays.join(" y ");
      return `${month} ${dayStr}`;
    })
    .join(" | ");
};

// --- COMPONENTE DE CAMPO EDITABLE ---
const EditableField = ({
  label,
  value,
  timestamp,
  editorId,
  onSave,
  allIntegrantes,
  isLink = false,
  textArea = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || "");
  const [loading, setLoading] = useState(false);

  // Nombre del editor
  const editorInfo = allIntegrantes.find((i) => i.id == editorId);
  const editorLabel = editorInfo
    ? `${editorInfo.nombre} ${editorInfo.apellido}`
    : "Desconocido";

  const handleSave = async () => {
    setLoading(true);
    await onSave(tempValue);
    setLoading(false);
    setIsEditing(false);
  };

  return (
    <div className="mb-6 group">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        {!isEditing && (
          <button
            onClick={() => {
              setTempValue(value || "");
              setIsEditing(true);
            }}
            className="text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Editar"
          >
            <IconEdit size={14} />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="flex items-start gap-2 animate-in fade-in zoom-in-95">
          {textArea ? (
            <textarea
              className="w-full text-sm p-2 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white shadow-sm"
              rows={3}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
            />
          ) : (
            <input
              type="text"
              className="w-full text-sm p-2 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white shadow-sm"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              placeholder="Pegar enlace o texto..."
            />
          )}
          <button
            onClick={handleSave}
            disabled={loading}
            className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <IconLoader className="animate-spin" size={16} />
            ) : (
              <IconCheck size={16} />
            )}
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="p-2 text-slate-400 hover:text-slate-600"
          >
            <IconX size={16} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="text-sm text-slate-800 break-words min-h-[20px]">
            {value ? (
              isLink ? (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <IconLink size={14} /> {value}
                </a>
              ) : (
                <p className="whitespace-pre-wrap">{value}</p>
              )
            ) : (
              <span className="text-slate-300 italic text-xs">
                Sin información cargada
              </span>
            )}
          </div>

          {(timestamp || editorId) && value && (
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span>
                Editado por <strong>{editorLabel}</strong> el{" "}
                {new Date(timestamp).toLocaleString("es-ES", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function GiraDifusion({ supabase, gira, onBack }) {
  const { user } = useAuth();
  const [difusionData, setDifusionData] = useState(null);
  const [allIntegrantes, setAllIntegrantes] = useState([]);
  const [localEvents, setLocalEvents] = useState([]);
  const [localidadesMap, setLocalidadesMap] = useState({}); // Mapa ID -> Nombre Ciudad
  const [loading, setLoading] = useState(true);
  const [artistsDetails, setArtistsDetails] = useState({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Cargar integrantes
        const { data: integrantes } = await supabase
          .from("integrantes")
          .select(
            "id, nombre, apellido, link_bio, link_foto_popup, mail, email_google"
          );
        setAllIntegrantes(integrantes || []);

        const artistMap = {};
        integrantes?.forEach((i) => {
          artistMap[i.id] = {
            link_bio: i.link_bio,
            link_foto_popup: i.link_foto_popup,
          };
        });
        setArtistsDetails(artistMap);

        // 2. Cargar Localidades (Ciudades) por separado
        const { data: localidadesData } = await supabase
          .from("localidades")
          .select("id, localidad"); // Ojo: Verifica si la columna se llama 'localidad' o 'nombre' en tu DB real

        const locMap = {};
        if (localidadesData) {
          localidadesData.forEach((l) => {
            locMap[l.id] = l.localidad;
          });
        }
        setLocalidadesMap(locMap);

        // 3. Cargar eventos
        const { data: eventosData } = await supabase
          .from("eventos")
          .select(
            "*, locaciones(id, nombre, id_localidad), tipos_evento(id, nombre)"
          )
          .eq("id_gira", gira.id)
          .order("fecha", { ascending: true });

        setLocalEvents(eventosData || []);

        // 4. Cargar o crear registro de difusión
        const { data: existingData, error: fetchError } = await supabase
          .from("gira_difusion")
          .select("*")
          .eq("id_gira", gira.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingData) {
          setDifusionData(existingData);
        } else {
          // Crear registro vacío si no existe
          console.log("Registro no encontrado, creando...");
          const { data: newData, error: insertError } = await supabase
            .from("gira_difusion")
            .insert([{ id_gira: gira.id }])
            .select()
            .maybeSingle();

          if (insertError) throw insertError;
          setDifusionData(newData);
        }
      } catch (error) {
        console.error("Error crítico cargando difusión:", error);
      } finally {
        setLoading(false);
      }
    };

    if (gira?.id) loadData();
  }, [gira?.id, supabase]);

  // --- LÓGICA DE GUARDADO ---
  const handleUpdateDifusion = async (fieldBaseName, value) => {
    try {
      // 1. Buscar ID del usuario logueado
      const currentEditor = allIntegrantes.find(
        (i) =>
          i.id == user.id ||
          (user.email &&
            (i.mail === user.email || i.email_google === user.email))
      );
      const editorIdToSave = currentEditor ? currentEditor.id : null;

      const updatePayload = {
        [fieldBaseName]: value,
        [`timestamp_${fieldBaseName}`]: new Date().toISOString(),
        [`editor_${fieldBaseName}`]: editorIdToSave,
      };

      const { data, error } = await supabase
        .from("gira_difusion")
        .update(updatePayload)
        .eq("id_gira", gira.id)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setDifusionData(data[0]);
      }
    } catch (err) {
      console.error(err);
      alert("Error al guardar: " + (err.message || "Verifica permisos"));
    }
  };

  const handleUpdateIntegrante = async (integranteId, field, value) => {
    try {
      const { error } = await supabase
        .from("integrantes")
        .update({ [field]: value })
        .eq("id", integranteId);

      if (error) throw error;

      setArtistsDetails((prev) => ({
        ...prev,
        [integranteId]: { ...prev[integranteId], [field]: value },
      }));
    } catch (err) {
      alert("Error actualizando integrante: " + err.message);
    }
  };

  // --- PREPARACIÓN DE DATOS ---
  const filteredEvents = localEvents.filter((e) => e.id_tipo_evento === 1);

  // CORRECCIÓN 1: Filtramos nulos o vacíos antes del join
  const getCitiesList = () => {
    const cities = [
      ...new Set(
        filteredEvents.map((e) => {
          const idLoc = e.locaciones?.id_localidad;
          return localidadesMap[idLoc] || null;
        })
      ),
    ].filter((c) => c); // Filtra null, undefined y strings vacíos

    return cities.join(" / ");
  };

  const getGroupedEvents = () => {
    const groups = {};
    filteredEvents.forEach((ev) => {
      const key = ev.locaciones?.id || "unknown";
      const venueName = ev.locaciones?.nombre || "Locación a confirmar";
      // Buscar nombre de ciudad en el mapa
      const idLoc = ev.locaciones?.id_localidad;
      const cityName = localidadesMap[idLoc] || "";

      if (!groups[key])
        groups[key] = { locacion: venueName, localidad: cityName, dates: [] };
      groups[key].dates.push({ fecha: ev.fecha, hora: ev.hora_inicio });
    });
    return Object.values(groups);
  };

  const staff =
    gira.giras_integrantes?.filter(
      (gi) =>
        ["director", "solista"].includes(gi.rol) && gi.estado === "confirmado"
    ) || [];

  // CORRECCIÓN PRINCIPAL: FILTRO DE COMPOSITORES
  const getComposerName = (obra) => {
    // Verificar si existe la relación obras_compositores
    if (obra.obras_compositores && obra.obras_compositores.length > 0) {
      
      // 1. Filtrar los que tienen rol 'compositor'
      const compositores = obra.obras_compositores
        .filter((oc) => oc.rol === "compositor" && oc.compositores)
        .map((oc) => oc.compositores);

      // 2. Formatear y Unir (por si hay más de uno)
      if (compositores.length > 0) {
        return compositores
          .map((c) => `${c.nombre} ${c.apellido}`)
          .join("\n");
      }
    }
    
    // Fallback: Por si la data viniera plana (poco probable con tu query actual)
    if (obra.compositores) {
        const c = Array.isArray(obra.compositores) ? obra.compositores[0] : obra.compositores;
        if(c && c.nombre && c.apellido) return `${c.nombre} ${c.apellido}`;
    }

    return "Autor Desconocido";
  };

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <IconLoader className="animate-spin text-indigo-600" size={32} />
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-slate-50 relative animate-in fade-in">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
        >
          <IconArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Material de Prensa
          </h2>
          <p className="text-xs text-slate-500">
            Gestión de contenidos para difusión
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-8 pb-20">
        {/* --- SECCIÓN HOME --- */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-indigo-700 uppercase mb-4 border-b border-indigo-100 pb-2">
            Sección Home
          </h3>

          <EditableField
            label="Link Foto Home"
            value={difusionData?.link_foto_home}
            timestamp={difusionData?.timestamp_link_foto_home}
            editorId={difusionData?.editor_link_foto_home}
            allIntegrantes={allIntegrantes}
            onSave={(val) => handleUpdateDifusion("link_foto_home", val)}
            isLink
          />

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3 mt-4">
            <div className="text-xs text-slate-400 font-bold uppercase mb-2">
              Vista Previa Datos Fijos
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900">
                {gira.nombre_gira}
              </h4>
              <p className="text-slate-600 font-medium">{gira.subtitulo}</p>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <p className="text-indigo-600 font-bold text-lg">
                {formatHeaderDates(filteredEvents)}
              </p>
              <p className="text-slate-500 text-sm font-medium uppercase tracking-wide mt-1">
                {getCitiesList()}
              </p>
            </div>
          </div>
        </section>

        {/* --- SECCIÓN DETALLE --- */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-indigo-700 uppercase mb-4 border-b border-indigo-100 pb-2">
            Sección Detalle
          </h3>

          <EditableField
            label="Link Foto Banner"
            value={difusionData?.link_foto_banner}
            timestamp={difusionData?.timestamp_link_foto_banner}
            editorId={difusionData?.editor_link_foto_banner}
            allIntegrantes={allIntegrantes}
            onSave={(val) => handleUpdateDifusion("link_foto_banner", val)}
            isLink
          />

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mt-4">
            <div className="text-xs text-slate-400 font-bold uppercase mb-2">
              Vista Previa Agenda Detallada
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-3">
              {gira.nombre_gira}
            </h4>

            <div className="space-y-4">
              {getGroupedEvents().length > 0 ? (
                getGroupedEvents().map((group, idx) => (
                  <div key={idx} className="border-l-2 border-indigo-400 pl-3">
                    {group.dates.map((d, i) => (
                      <p key={i} className="text-slate-700 font-medium text-sm">
                        {formatDateExtended(d.fecha, d.hora)}
                      </p>
                    ))}
                    <div className="mt-1">
                      <p className="text-sm font-bold text-slate-800">
                        {group.locacion}
                      </p>

                      {/* CORRECCIÓN 2: Usamos group.localidad que ya llenamos en getGroupedEvents */}
                      {group.localidad && (
                        <p className="text-xs text-slate-500 uppercase">
                          {group.localidad}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 italic text-sm p-2 border border-dashed border-slate-300 rounded">
                  No se encontraron conciertos (ID Tipo Evento = 1).
                </div>
              )}
            </div>
          </div>
        </section>

        {/* --- SECCIÓN PROGRAMA --- */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-indigo-700 uppercase mb-4 border-b border-indigo-100 pb-2">
            Sección Programa
          </h3>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <ul className="space-y-2">
              {gira.programas_repertorios?.map((rep) => (
                <React.Fragment key={rep.id}>
                  {rep.repertorio_obras
                    ?.filter((o) => !o.excluir)
                    .map((obraItem) => {
                      const obra = obraItem.obras;
                      const nombreCompositor = getComposerName(obra);

                      return (
                        <li
                          key={obraItem.id}
                          className="text-sm border-b border-slate-200 last:border-0 pb-1 flex flex-wrap gap-x-2"
                        >
                          <span className="font-bold text-slate-700">
                            {nombreCompositor}
                          </span>
                          <span className="text-slate-300 hidden sm:inline">
                            |
                          </span>
                          <span className="text-slate-600 italic whitespace-pre-wrap">
                            {obra.titulo}
                          </span>{" "}
                        </li>
                      );
                    })}
                </React.Fragment>
              ))}
              {(!gira.programas_repertorios ||
                gira.programas_repertorios.length === 0) && (
                <p className="text-slate-400 italic text-sm">
                  No hay repertorio cargado.
                </p>
              )}
            </ul>
          </div>
        </section>

        {/* --- SECCIÓN ARTISTAS --- */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-indigo-700 uppercase mb-4 border-b border-indigo-100 pb-2">
            Sección Artistas
          </h3>

          <div className="space-y-6">
            {staff.map((person) => {
              const fullName = `${person.integrantes?.nombre} ${person.integrantes?.apellido}`;
              const details = artistsDetails[person.id_integrante] || {};

              return (
                <div
                  key={person.id_integrante}
                  className="p-4 border border-slate-200 rounded-lg bg-slate-50/50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg text-slate-800">
                      {fullName}
                    </h4>
                    <div className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded uppercase">
                      {person.rol}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">
                        Link Bio
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="w-full text-xs p-2 border rounded bg-white shadow-sm"
                          placeholder="Enlace a la biografía..."
                          defaultValue={details.link_bio || ""}
                          onBlur={(e) => {
                            if (e.target.value !== details.link_bio) {
                              handleUpdateIntegrante(
                                person.id_integrante,
                                "link_bio",
                                e.target.value
                              );
                            }
                          }}
                        />
                        {details.link_bio && (
                          <a
                            href={details.link_bio}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-indigo-50 rounded hover:bg-indigo-100 text-indigo-600"
                          >
                            <IconLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">
                        Link Foto Pop-up
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="w-full text-xs p-2 border rounded bg-white shadow-sm"
                          placeholder="Enlace a la foto..."
                          defaultValue={details.link_foto_popup || ""}
                          onBlur={(e) => {
                            if (e.target.value !== details.link_foto_popup) {
                              handleUpdateIntegrante(
                                person.id_integrante,
                                "link_foto_popup",
                                e.target.value
                              );
                            }
                          }}
                        />
                        {details.link_foto_popup && (
                          <a
                            href={details.link_foto_popup}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-indigo-50 rounded hover:bg-indigo-100 text-indigo-600"
                          >
                            <IconLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="p-4 bg-slate-100 rounded border border-slate-200 text-center">
              <span className="font-serif font-bold text-slate-700 text-lg">
                Orquesta Filarmónica de Río Negro
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <EditableField
              label="Link Logo 1"
              value={difusionData?.link_logo_1}
              timestamp={difusionData?.timestamp_link_logo_1}
              editorId={difusionData?.editor_link_logo_1}
              allIntegrantes={allIntegrantes}
              onSave={(val) => handleUpdateDifusion("link_logo_1", val)}
              isLink
            />
            <EditableField
              label="Link Logo 2"
              value={difusionData?.link_logo_2}
              timestamp={difusionData?.timestamp_link_logo_2}
              editorId={difusionData?.editor_link_logo_2}
              allIntegrantes={allIntegrantes}
              onSave={(val) => handleUpdateDifusion("link_logo_2", val)}
              isLink
            />
          </div>
        </section>

        {/* --- COMENTARIOS --- */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <EditableField
            label="Otros Comentarios"
            value={difusionData?.otros_comentarios}
            timestamp={difusionData?.timestamp_otros_comentarios}
            editorId={difusionData?.editor_otros_comentarios}
            allIntegrantes={allIntegrantes}
            onSave={(val) => handleUpdateDifusion("otros_comentarios", val)}
            textArea
          />
        </section>
      </div>
    </div>
  );
}