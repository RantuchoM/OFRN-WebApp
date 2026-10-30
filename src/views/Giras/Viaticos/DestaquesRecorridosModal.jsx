import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconEdit,
  IconLoader,
  IconMap,
  IconPlus,
  IconTrash,
  IconX,
} from "../../../components/ui/Icons";
import {
  applyPlantillaToGira,
  formatRecorridosSummary,
  normalizeLocalidadName,
  parseLugarComisionStored,
  parsePlantillaRecorridos,
  resolveLugarComisionDestaque,
  serializeRecorridos,
} from "../../../utils/destaquesLugarComisionRecorridos";
import { canonicalZona, ZONA_PRESETS, zonasMatch } from "../../../utils/giraZonas";
import ZonaSelect from "../../../components/forms/ZonaSelect";
import {
  deleteRecorridosPlantilla,
  listRecorridosPlantillas,
  saveRecorridosPlantilla,
  setPlantillaPreferida,
} from "../../../services/viaticosRecorridosPlantillasService";

function LocalityAdder({ addableLocalities, onAdd }) {
  const [query, setQuery] = useState("");
  if (addableLocalities.length === 0) return null;

  if (addableLocalities.length <= 12) {
    return (
      <select
        className="text-xs border border-slate-200 rounded px-2 py-1 max-w-[220px]"
        value=""
        onChange={(e) => {
          const id = Number(e.target.value);
          if (id) onAdd(id);
          e.target.value = "";
        }}
      >
        <option value="">+ Agregar localidad</option>
        {addableLocalities.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
            {loc.inOtherRoute ? " (ya en otro recorrido)" : ""}
          </option>
        ))}
      </select>
    );
  }

  const nq = normalizeLocalidadName(query);
  const matches = (
    nq
      ? addableLocalities.filter((loc) => normalizeLocalidadName(loc.name).includes(nq))
      : []
  ).slice(0, 8);

  return (
    <div className="w-full sm:max-w-[240px]">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="+ Agregar localidad"
        className="w-full text-xs border border-slate-200 rounded px-2 py-1"
      />
      {query.trim() && (
        <div className="mt-1 border border-slate-200 rounded bg-white max-h-32 overflow-y-auto">
          {matches.length === 0 ? (
            <p className="px-2 py-1 text-[11px] text-slate-400">Sin coincidencias</p>
          ) : (
            matches.map((loc) => (
              <button
                key={loc.id}
                type="button"
                className="block w-full text-left px-2 py-1 text-xs hover:bg-indigo-50"
                onClick={() => {
                  onAdd(loc.id);
                  setQuery("");
                }}
              >
                {loc.name}
                {loc.inOtherRoute ? " (ya en otro recorrido)" : ""}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function RecorridoEditor({
  title,
  routeIndex,
  orderedIds,
  onChange,
  localitiesById,
  addableLocalities,
  showCrossActions = false,
  onMoveToOther,
  onCopyToOther,
  otherRouteLabel,
}) {
  const move = (index, dir) => {
    const next = [...orderedIds];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  };

  const remove = (index) => {
    onChange(orderedIds.filter((_, i) => i !== index));
  };

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h4 className="text-xs font-bold text-indigo-800 uppercase">{title}</h4>
        <LocalityAdder
          addableLocalities={addableLocalities}
          onAdd={(id) => {
            if (id && !orderedIds.includes(id)) onChange([...orderedIds, id]);
          }}
        />
      </div>
      {orderedIds.length === 0 ? (
        <p className="text-[11px] text-slate-400 italic">Sin localidades en este recorrido.</p>
      ) : (
        <ol className="space-y-1">
          {orderedIds.map((id, index) => (
            <li
              key={`${routeIndex}-${id}-${index}`}
              className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-100 rounded px-2 py-1"
            >
              <span className="text-slate-400 font-mono w-4">{index + 1}.</span>
              <span className="flex-1 font-medium text-slate-800 truncate">
                {localitiesById[id]?.name || `#${id}`}
              </span>
              <div className="flex shrink-0 flex-wrap gap-0.5 justify-end">
                {showCrossActions && onMoveToOther && (
                  <button
                    type="button"
                    onClick={() => onMoveToOther(index)}
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                    title={`Quitar de aquí y agregar al final de ${otherRouteLabel}`}
                  >
                    → {otherRouteLabel}
                  </button>
                )}
                {showCrossActions && onCopyToOther && (
                  <button
                    type="button"
                    onClick={() => onCopyToOther(id)}
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-100 text-cyan-900 hover:bg-cyan-200"
                    title={`Mantener aquí y agregar también a ${otherRouteLabel} (ej. localidad final)`}
                  >
                    + {otherRouteLabel}
                  </button>
                )}
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30"
                  title="Subir"
                >
                  <IconChevronUp size={14} />
                </button>
                <button
                  type="button"
                  disabled={index === orderedIds.length - 1}
                  onClick={() => move(index, 1)}
                  className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30"
                  title="Bajar"
                >
                  <IconChevronDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="p-0.5 rounded hover:bg-red-100 text-red-600"
                  title="Quitar de este recorrido"
                >
                  <IconX size={14} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PlantillaRutaDetalle({ recorridos, names, presentIds }) {
  const present = new Set(presentIds.map((id) => String(id)));
  if (!recorridos.length) {
    return <p className="text-[11px] text-slate-400 italic">Sin localidades.</p>;
  }
  return (
    <div className="mt-1.5 space-y-0.5">
      {recorridos.map((ids, routeIndex) => (
        <p key={routeIndex} className="text-[11px] leading-snug">
          {recorridos.length > 1 ? (
            <span className="font-bold text-indigo-400 mr-1">R{routeIndex + 1}</span>
          ) : null}
          {ids.length === 0 ? (
            <span className="text-slate-400 italic">vacío</span>
          ) : (
            ids.map((id, index) => {
              const name = names[id] || names[String(id)] || `#${id}`;
              const enGira = present.has(String(id));
              return (
                <span key={`${id}-${index}`}>
                  {index > 0 ? <span className="text-slate-300"> → </span> : null}
                  <span
                    className={enGira ? "text-slate-700" : "text-slate-400"}
                    title={enGira ? undefined : "No está en esta gira"}
                  >
                    {name}
                  </span>
                </span>
              );
            })
          )}
        </p>
      ))}
    </div>
  );
}

function emptyEditor(zona) {
  return {
    id: null,
    nombre: "",
    zona: zona || "",
    esPreferida: false,
    r1: [],
    r2: [],
    useSecond: false,
  };
}

export default function DestaquesRecorridosModal({
  isOpen,
  onClose,
  storedValue,
  onSave,
  localities = [],
  supabase = null,
  giraZona = "",
}) {
  const [recorrido1, setRecorrido1] = useState([]);
  const [recorrido2, setRecorrido2] = useState([]);
  const [useSecond, setUseSecond] = useState(false);
  const [personalizados, setPersonalizados] = useState({});
  const [plantillas, setPlantillas] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);
  const [plantillasError, setPlantillasError] = useState("");
  const [zonaFiltro, setZonaFiltro] = useState("");
  const [plantillasAbiertas, setPlantillasAbiertas] = useState(false);
  const [editor, setEditor] = useState(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [savingPlantilla, setSavingPlantilla] = useState(false);
  const [banner, setBanner] = useState(null);
  const wasOpenRef = useRef(false);
  const hadStoredRecorridosRef = useRef(false);
  const storedIsEmptyRef = useRef(false);
  const userTouchedDraftRef = useRef(false);
  const autoAppliedRef = useRef(false);
  const filtroTouchedRef = useRef(false);
  const localitiesRef = useRef(localities);
  const namesRef = useRef({});
  const draftRef = useRef({ r1: [], r2: [] });

  localitiesRef.current = localities;
  draftRef.current = { r1: recorrido1, r2: recorrido2 };

  const localitiesById = useMemo(() => {
    const m = {};
    localities.forEach((loc) => {
      m[loc.id] = loc;
    });
    return m;
  }, [localities]);

  const nameById = useMemo(() => {
    const m = {};
    localities.forEach((loc) => {
      m[loc.id] = loc.name;
      m[String(loc.id)] = loc.name;
    });
    return m;
  }, [localities]);

  const editorLocalities = useMemo(() => {
    const map = new Map();
    catalog.forEach((loc) => map.set(loc.id, loc));
    localities.forEach((loc) => {
      if (!map.has(loc.id)) map.set(loc.id, loc);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [catalog, localities]);

  const editorLocalitiesById = useMemo(() => {
    const m = {};
    editorLocalities.forEach((loc) => {
      m[loc.id] = loc;
    });
    return m;
  }, [editorLocalities]);

  const allNames = useMemo(() => {
    const m = { ...nameById };
    editorLocalities.forEach((loc) => {
      if (!m[loc.id]) {
        m[loc.id] = loc.name;
        m[String(loc.id)] = loc.name;
      }
    });
    return m;
  }, [nameById, editorLocalities]);

  namesRef.current = allNames;

  const knownZonas = useMemo(() => plantillas.map((p) => p.zona), [plantillas]);

  const zonaChips = useMemo(() => {
    const chips = [...ZONA_PRESETS];
    const seen = new Set(ZONA_PRESETS.map((z) => z.toLowerCase()));
    const extras = [];
    if (giraZona) extras.push(canonicalZona(giraZona, knownZonas));
    knownZonas.forEach((z) => extras.push(z));
    extras.forEach((z) => {
      const label = String(z || "").trim();
      if (!label) return;
      const key = label.toLowerCase();
      if (seen.has(key)) return;
      if (ZONA_PRESETS.some((preset) => zonasMatch(preset, label))) return;
      seen.add(key);
      chips.push(label);
    });
    return chips;
  }, [giraZona, knownZonas]);

  const plantillasVisibles = useMemo(() => {
    const rows = zonaFiltro
      ? plantillas.filter((p) => zonasMatch(p.zona, zonaFiltro))
      : [...plantillas];
    return rows.sort((a, b) => {
      if (a.es_preferida !== b.es_preferida) return a.es_preferida ? -1 : 1;
      return String(a.nombre).localeCompare(String(b.nombre), "es");
    });
  }, [plantillas, zonaFiltro]);

  const markDraftTouched = () => {
    userTouchedDraftRef.current = true;
  };

  const changeR1 = (next) => {
    markDraftTouched();
    setRecorrido1(next);
  };
  const changeR2 = (next) => {
    markDraftTouched();
    setRecorrido2(next);
  };

  useEffect(() => {
    const isOpening = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!isOpening) return;

    userTouchedDraftRef.current = false;
    autoAppliedRef.current = false;
    filtroTouchedRef.current = false;
    setEditor(null);
    setEditorDirty(false);
    setBanner(null);
    setPlantillasError("");
    setZonaFiltro(giraZona ? canonicalZona(giraZona, []) : "");

    const parsed = parseLugarComisionStored(storedValue);
    const hasRoutes = parsed.tipo === "recorridos" && parsed.recorridos.length > 0;
    const tieneTextoPlano = parsed.tipo === "plano" && !!String(parsed.texto || "").trim();
    hadStoredRecorridosRef.current = hasRoutes;
    storedIsEmptyRef.current = !hasRoutes && !tieneTextoPlano;
    setPlantillasAbiertas(!hasRoutes && !tieneTextoPlano);
    if (hasRoutes) {
      setRecorrido1(parsed.recorridos[0] || []);
      setRecorrido2(parsed.recorridos[1] || []);
      setUseSecond(parsed.recorridos.length > 1);
      setPersonalizados(parsed.personalizados || {});
    } else {
      setRecorrido1(localities.map((l) => l.id));
      setRecorrido2([]);
      setUseSecond(false);
      setPersonalizados({});
    }
  }, [isOpen, storedValue, localities, giraZona]);

  useEffect(() => {
    if (!isOpen || filtroTouchedRef.current || !giraZona) return;
    setZonaFiltro(canonicalZona(giraZona, knownZonas));
  }, [isOpen, giraZona, knownZonas]);

  useEffect(() => {
    if (!isOpen || !supabase) return undefined;
    let cancelled = false;
    setLoadingPlantillas(true);
    Promise.all([
      listRecorridosPlantillas(supabase),
      supabase.from("localidades").select("id, localidad").order("localidad"),
    ])
      .then(([rows, locRes]) => {
        if (cancelled) return;
        setPlantillas(rows);
        if (locRes.error) {
          setPlantillasError(locRes.error.message || "No se pudo leer el catálogo de localidades.");
          return;
        }
        setCatalog(
          (locRes.data || []).map((row) => ({
            id: Number(row.id),
            name: row.localidad,
          })),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setPlantillasError(err?.message || "No se pudieron cargar las plantillas.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPlantillas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, supabase]);

  const generarDesdeIds = useCallback((recorridosIds, label, { silent = false } = {}) => {
    const present = localitiesRef.current.map((loc) => loc.id);
    const { routes, omittedIds } = applyPlantillaToGira(recorridosIds, present);
    if (silent) autoAppliedRef.current = true;
    if (routes.length === 0) {
      setBanner({
        type: "warn",
        text: `«${label}» no comparte localidades con esta gira.`,
      });
      return false;
    }
    const { r1, r2 } = draftRef.current;
    const hasDraft = r1.length > 0 || r2.length > 0;
    const untouchedAutofill =
      !hadStoredRecorridosRef.current &&
      !userTouchedDraftRef.current &&
      !autoAppliedRef.current;
    if (!silent && hasDraft && !untouchedAutofill) {
      const ok = window.confirm(
        `Aplicar «${label}» reemplaza el recorrido de esta gira en el editor. Los casos particulares se mantienen.`,
      );
      if (!ok) return false;
    }
    setRecorrido1(routes[0] || []);
    setRecorrido2(routes[1] || []);
    setUseSecond(routes.length > 1);
    if (!silent) userTouchedDraftRef.current = true;
    const names = omittedIds
      .map((id) => namesRef.current[id] || namesRef.current[String(id)])
      .filter(Boolean);
    setBanner({
      type: "info",
      text: names.length
        ? `«${label}» quedó en esta gira. No están en la gira: ${names.join(", ")}. Ajustá el caso y guardá.`
        : `«${label}» quedó en esta gira. Ajustá lo que haga falta y guardá el recorrido.`,
    });
    return true;
  }, []);

  useEffect(() => {
    if (!isOpen || loadingPlantillas || autoAppliedRef.current) return;
    if (!storedIsEmptyRef.current || userTouchedDraftRef.current) return;
    if (!localities.length || !giraZona) return;
    const preferida = plantillas.find(
      (p) => p.es_preferida && zonasMatch(p.zona, giraZona),
    );
    if (!preferida) return;
    generarDesdeIds(parsePlantillaRecorridos(preferida.recorridos), preferida.nombre, {
      silent: true,
    });
  }, [isOpen, loadingPlantillas, plantillas, giraZona, localities, generarDesdeIds]);

  const addableFor = (orderedIds, otherIds, otherActive) =>
    editorLocalities
      .filter((loc) => !orderedIds.includes(loc.id))
      .map((loc) => ({
        ...loc,
        inOtherRoute: otherActive && otherIds.includes(loc.id),
      }));

  const addableForR1 = useMemo(
    () =>
      localities
        .filter((l) => !recorrido1.includes(l.id))
        .map((l) => ({ ...l, inOtherRoute: useSecond && recorrido2.includes(l.id) })),
    [localities, recorrido1, recorrido2, useSecond],
  );

  const addableForR2 = useMemo(
    () =>
      localities
        .filter((l) => !recorrido2.includes(l.id))
        .map((l) => ({ ...l, inOtherRoute: recorrido1.includes(l.id) })),
    [localities, recorrido1, recorrido2],
  );

  const neverAssigned = useMemo(() => {
    const inAny = new Set([...recorrido1, ...(useSecond ? recorrido2 : [])]);
    return localities.filter((l) => !inAny.has(l.id));
  }, [localities, recorrido1, recorrido2, useSecond]);

  const previewParsed = useMemo(() => {
    const recs = [recorrido1];
    if (useSecond && recorrido2.length > 0) recs.push(recorrido2);
    return { tipo: "recorridos", recorridos: recs };
  }, [recorrido1, recorrido2, useSecond]);

  const previewRows = useMemo(() => {
    const serialized = serializeRecorridos(previewParsed.recorridos, personalizados);
    return localities.map((loc) => ({
      ...loc,
      lugar: resolveLugarComisionDestaque(serialized, loc.id, nameById) || "—",
      personalizado: personalizados[String(loc.id)] || "",
      enR1: recorrido1.includes(loc.id),
      enR2: useSecond && recorrido2.includes(loc.id),
    }));
  }, [
    previewParsed,
    localities,
    nameById,
    recorrido1,
    recorrido2,
    useSecond,
    personalizados,
  ]);

  const summary = formatRecorridosSummary(previewParsed, nameById);

  const moveFromR1ToR2 = (index) => {
    const id = recorrido1[index];
    if (id == null) return;
    markDraftTouched();
    setRecorrido1(recorrido1.filter((_, i) => i !== index));
    if (!recorrido2.includes(id)) setRecorrido2([...recorrido2, id]);
  };

  const moveFromR2ToR1 = (index) => {
    const id = recorrido2[index];
    if (id == null) return;
    markDraftTouched();
    setRecorrido2(recorrido2.filter((_, i) => i !== index));
    if (!recorrido1.includes(id)) setRecorrido1([...recorrido1, id]);
  };

  const copyToR2 = (id) => {
    markDraftTouched();
    if (!recorrido2.includes(id)) setRecorrido2([...recorrido2, id]);
  };

  const copyToR1 = (id) => {
    markDraftTouched();
    if (!recorrido1.includes(id)) setRecorrido1([...recorrido1, id]);
  };

  const handleSave = () => {
    const recs = [recorrido1];
    if (useSecond && recorrido2.length > 0) recs.push(recorrido2);
    if (recs.every((r) => r.length === 0)) {
      alert("Agregá al menos una localidad a un recorrido.");
      return;
    }
    onSave(serializeRecorridos(recs, personalizados));
    onClose();
  };

  const discardEditorIfDirty = () => {
    if (!editor || !editorDirty) return true;
    return window.confirm("Hay cambios sin guardar en la plantilla. ¿Descartarlos?");
  };

  const openEditor = (next) => {
    if (editor && editor.id !== next.id && !discardEditorIfDirty()) return;
    setEditor(next);
    setEditorDirty(false);
    setPlantillasError("");
  };

  const abrirPlantilla = (plantilla) => {
    const ids = parsePlantillaRecorridos(plantilla.recorridos);
    openEditor({
      id: plantilla.id,
      nombre: plantilla.nombre,
      zona: plantilla.zona,
      esPreferida: !!plantilla.es_preferida,
      r1: ids[0] || [],
      r2: ids[1] || [],
      useSecond: ids.length > 1,
    });
  };

  const zonaPorDefecto = () =>
    canonicalZona(zonaFiltro || giraZona, knownZonas) || ZONA_PRESETS[0];

  const nuevaPlantilla = () => {
    const zona = zonaPorDefecto();
    const yaHayPreferida = plantillas.some(
      (p) => p.es_preferida && zonasMatch(p.zona, zona),
    );
    openEditor({
      ...emptyEditor(zona),
      esPreferida: !yaHayPreferida,
    });
  };

  const plantillaDesdeGira = () => {
    const zona = zonaPorDefecto();
    const yaHayPreferida = plantillas.some(
      (p) => p.es_preferida && zonasMatch(p.zona, zona),
    );
    openEditor({
      id: null,
      nombre: "",
      zona,
      esPreferida: !yaHayPreferida,
      r1: [...recorrido1],
      r2: [...recorrido2],
      useSecond: useSecond && recorrido2.length > 0,
    });
  };

  const patchEditor = (patch) => {
    setEditor((prev) => (prev ? { ...prev, ...patch } : prev));
    setEditorDirty(true);
  };

  const editorRoutes = () => {
    if (!editor) return [];
    const recs = [editor.r1];
    if (editor.useSecond && editor.r2.length > 0) recs.push(editor.r2);
    return recs.filter((ids) => ids.length > 0);
  };

  const guardarPlantilla = async () => {
    if (!editor || !supabase) return;
    const nombre = editor.nombre.trim();
    const zona = canonicalZona(editor.zona, knownZonas);
    const recorridosIds = editorRoutes();
    if (!nombre) {
      setPlantillasError("Poné un nombre a la plantilla.");
      return;
    }
    if (!zona) {
      setPlantillasError("Elegí Atlántica, Andina, Valle, o escribí la zona en Otro...");
      return;
    }
    if (recorridosIds.length === 0) {
      setPlantillasError("Agregá al menos una localidad a la plantilla.");
      return;
    }
    setSavingPlantilla(true);
    setPlantillasError("");
    try {
      const saved = await saveRecorridosPlantilla(supabase, {
        id: editor.id,
        nombre,
        zona,
        esPreferida: editor.esPreferida,
        recorridosIds,
      });
      setPlantillas((prev) => {
        const without = prev.filter((p) => p.id !== saved.id);
        const next = editor.esPreferida
          ? without.map((p) =>
              zonasMatch(p.zona, saved.zona) ? { ...p, es_preferida: false } : p,
            )
          : without;
        return [...next, saved];
      });
      setEditor({
        id: saved.id,
        nombre: saved.nombre,
        zona: saved.zona,
        esPreferida: !!saved.es_preferida,
        r1: editor.r1,
        r2: editor.r2,
        useSecond: editor.useSecond,
      });
      setEditorDirty(false);
      setZonaFiltro(saved.zona);
      filtroTouchedRef.current = true;
      setBanner({
        type: "info",
        text: `Plantilla «${saved.nombre}» guardada para ${saved.zona}. La gira no cambia hasta que generes y guardes el recorrido.`,
      });
    } catch (err) {
      setPlantillasError(err?.message || "No se pudo guardar la plantilla.");
    } finally {
      setSavingPlantilla(false);
    }
  };

  const marcarPreferida = async (plantilla) => {
    if (!supabase || plantilla.es_preferida) return;
    setPlantillasError("");
    try {
      const saved = await setPlantillaPreferida(supabase, plantilla.id, plantilla.zona);
      setPlantillas((prev) =>
        prev.map((p) => {
          if (p.id === saved.id) return saved;
          if (zonasMatch(p.zona, saved.zona)) return { ...p, es_preferida: false };
          return p;
        }),
      );
      setEditor((prev) =>
        prev && prev.id === saved.id ? { ...prev, esPreferida: true } : prev,
      );
    } catch (err) {
      setPlantillasError(err?.message || "No se pudo marcar la preferida.");
    }
  };

  const eliminarPlantilla = async () => {
    if (!editor?.id || !supabase) return;
    const ok = window.confirm(
      `¿Eliminar la plantilla «${editor.nombre}»? Los recorridos ya guardados en las giras no cambian.`,
    );
    if (!ok) return;
    setSavingPlantilla(true);
    setPlantillasError("");
    try {
      await deleteRecorridosPlantilla(supabase, editor.id);
      setPlantillas((prev) => prev.filter((p) => p.id !== editor.id));
      setEditor(null);
      setEditorDirty(false);
    } catch (err) {
      setPlantillasError(err?.message || "No se pudo eliminar la plantilla.");
    } finally {
      setSavingPlantilla(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const editorAddableR1 = editor
    ? addableFor(editor.r1, editor.r2, editor.useSecond)
    : [];
  const editorAddableR2 = editor ? addableFor(editor.r2, editor.r1, true) : [];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recorridos-modal-title"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <IconMap className="text-indigo-600 shrink-0" size={20} />
            <div className="min-w-0">
              <h3 id="recorridos-modal-title" className="text-base font-bold text-slate-800">
                Recorridos — Lugar de comisión
              </h3>
              <p className="text-[11px] text-slate-500">
                Plantilla por zona, y abajo el recorrido de esta gira. Podés repetir una
                localidad en ambos recorridos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <section className="rounded-lg border border-indigo-100 bg-indigo-50/40">
            <button
              type="button"
              onClick={() => setPlantillasAbiertas((open) => !open)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
              aria-expanded={plantillasAbiertas}
            >
              <span className="inline-flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase">
                <IconChevronDown
                  size={14}
                  className={`transition-transform ${plantillasAbiertas ? "rotate-180" : ""}`}
                />
                Plantillas
              </span>
              {loadingPlantillas ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 normal-case">
                  <IconLoader size={12} className="animate-spin" /> Cargando
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-500 normal-case">
                  {plantillas.length}
                </span>
              )}
            </button>

            {plantillasAbiertas && (
            <div className="px-3 pb-3 space-y-3">
            <p className="text-[11px] text-slate-600">
              Elegí la preferida de cada zona. Aplicar copia la plantilla a esta gira; editar
              la plantilla no cambia las giras ya guardadas. En gris, localidades que esta
              gira no tiene.
              {giraZona ? ` Esta gira es ${canonicalZona(giraZona, knownZonas)}.` : ""}
            </p>

            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => {
                  filtroTouchedRef.current = true;
                  setZonaFiltro("");
                }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  zonaFiltro === ""
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                }`}
              >
                Todas
              </button>
              {zonaChips.map((zona) => (
                <button
                  key={zona}
                  type="button"
                  onClick={() => {
                    filtroTouchedRef.current = true;
                    setZonaFiltro(zona);
                  }}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    zonasMatch(zonaFiltro, zona)
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                  }`}
                >
                  {zona}
                </button>
              ))}
            </div>

            {plantillasVisibles.length === 0 && !loadingPlantillas ? (
              <p className="text-[11px] text-slate-500">
                {zonaFiltro
                  ? `No hay plantillas para ${zonaFiltro}. Creá una o guardá el recorrido de esta gira.`
                  : "Todavía no hay plantillas. Creá la primera para una zona."}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {plantillasVisibles.map((plantilla) => {
                  const parsed = {
                    tipo: "recorridos",
                    recorridos: parsePlantillaRecorridos(plantilla.recorridos),
                  };
                  const abierta = editor?.id === plantilla.id;
                  return (
                    <li
                      key={plantilla.id}
                      className={`rounded-lg border bg-white px-2 py-1.5 ${
                        abierta ? "border-indigo-400" : "border-slate-200"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => marcarPreferida(plantilla)}
                          disabled={plantilla.es_preferida}
                          className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            plantilla.es_preferida
                              ? "bg-amber-100 text-amber-900"
                              : "bg-slate-100 text-slate-600 hover:bg-amber-50"
                          }`}
                          title={
                            plantilla.es_preferida
                              ? `Preferida de ${plantilla.zona}`
                              : `Hacer preferida de ${plantilla.zona}`
                          }
                        >
                          {plantilla.es_preferida ? <IconCheck size={11} /> : null}
                          {plantilla.es_preferida ? "Preferida" : "Hacer preferida"}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800">
                            {plantilla.nombre}
                            <span className="ml-1 font-medium text-slate-400">
                              {plantilla.zona}
                            </span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            generarDesdeIds(
                              parsePlantillaRecorridos(plantilla.recorridos),
                              plantilla.nombre,
                            )
                          }
                          className="px-2 py-1 rounded text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          Aplicar
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirPlantilla(plantilla)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          <IconEdit size={12} /> Editar
                        </button>
                      </div>
                      <PlantillaRutaDetalle
                        recorridos={parsed.recorridos}
                        names={allNames}
                        presentIds={localities.map((loc) => loc.id)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={nuevaPlantilla}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50"
              >
                <IconPlus size={12} /> Nueva plantilla
              </button>
              <button
                type="button"
                onClick={plantillaDesdeGira}
                disabled={recorrido1.length === 0 && recorrido2.length === 0}
                className="px-2 py-1 rounded text-[10px] font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Guardar este recorrido como plantilla
              </button>
            </div>

            {editor && (
              <div className="rounded-lg border border-indigo-200 bg-white p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-bold text-slate-800">
                    {editor.id ? "Editar plantilla" : "Nueva plantilla"}
                  </h5>
                  <button
                    type="button"
                    onClick={() => {
                      if (!discardEditorIfDirty()) return;
                      setEditor(null);
                      setEditorDirty(false);
                    }}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Nombre
                    <input
                      type="text"
                      value={editor.nombre}
                      onChange={(e) => patchEditor({ nombre: e.target.value })}
                      className="mt-1 w-full text-xs font-medium text-slate-800 border border-slate-200 rounded px-2 py-1"
                      placeholder="Viedma → Bariloche"
                    />
                  </label>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Zona
                    <ZonaSelect
                      value={editor.zona}
                      onChange={(zona) => patchEditor({ zona })}
                      className="mt-1 space-y-1"
                      selectClassName="w-full text-xs font-medium text-slate-800 border border-slate-200 rounded px-2 py-1 bg-white"
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={editor.esPreferida}
                    onChange={(e) => patchEditor({ esPreferida: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  Preferida de esta zona
                </label>
                <RecorridoEditor
                  title="Recorrido 1 de la plantilla"
                  routeIndex="tpl-1"
                  orderedIds={editor.r1}
                  onChange={(next) => patchEditor({ r1: next })}
                  localitiesById={editorLocalitiesById}
                  addableLocalities={editorAddableR1}
                  showCrossActions={editor.useSecond}
                  otherRouteLabel="R2"
                  onMoveToOther={
                    editor.useSecond
                      ? (index) => {
                          const id = editor.r1[index];
                          if (id == null) return;
                          patchEditor({
                            r1: editor.r1.filter((_, i) => i !== index),
                            r2: editor.r2.includes(id) ? editor.r2 : [...editor.r2, id],
                          });
                        }
                      : undefined
                  }
                  onCopyToOther={
                    editor.useSecond
                      ? (id) => {
                          if (!editor.r2.includes(id)) patchEditor({ r2: [...editor.r2, id] });
                        }
                      : undefined
                  }
                />
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={editor.useSecond}
                    onChange={(e) => patchEditor({ useSecond: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  Segundo recorrido en la plantilla
                </label>
                {editor.useSecond && (
                  <RecorridoEditor
                    title="Recorrido 2 de la plantilla"
                    routeIndex="tpl-2"
                    orderedIds={editor.r2}
                    onChange={(next) => patchEditor({ r2: next })}
                    localitiesById={editorLocalitiesById}
                    addableLocalities={editorAddableR2}
                    showCrossActions
                    otherRouteLabel="R1"
                    onMoveToOther={(index) => {
                      const id = editor.r2[index];
                      if (id == null) return;
                      patchEditor({
                        r2: editor.r2.filter((_, i) => i !== index),
                        r1: editor.r1.includes(id) ? editor.r1 : [...editor.r1, id],
                      });
                    }}
                    onCopyToOther={(id) => {
                      if (!editor.r1.includes(id)) patchEditor({ r1: [...editor.r1, id] });
                    }}
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={guardarPlantilla}
                    disabled={savingPlantilla}
                    className="px-3 py-1.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                  >
                    {savingPlantilla ? "Guardando…" : "Guardar plantilla"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      generarDesdeIds(editorRoutes(), editor.nombre.trim() || "plantilla")
                    }
                    className="px-3 py-1.5 text-[11px] font-bold text-indigo-800 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                  >
                    Aplicar en esta gira
                  </button>
                  {editor.id && (
                    <button
                      type="button"
                      onClick={eliminarPlantilla}
                      disabled={savingPlantilla}
                      className="ml-auto inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      <IconTrash size={12} /> Eliminar
                    </button>
                  )}
                </div>
              </div>
            )}

            {plantillasError && (
              <p className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">
                {plantillasError}
              </p>
            )}
            </div>
            )}
          </section>

          {banner && (
            <p
              className={`text-[11px] rounded px-2 py-1 border ${
                banner.type === "warn"
                  ? "text-amber-900 bg-amber-50 border-amber-200"
                  : "text-indigo-900 bg-indigo-50 border-indigo-100"
              }`}
            >
              {banner.text}
            </p>
          )}

          {localities.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              No hay localidades en el panel de destaques. Agregá músicos con localidad asignada primero.
            </p>
          ) : (
            <>
              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">
                  Recorrido de esta gira
                </h4>
                <p className="text-[11px] text-slate-500 mb-2">
                  <strong>→ R2</strong> mueve y <strong>+ R2</strong> duplica (ciudad final).
                  Guardar aplica solo a esta gira.
                </p>
              </div>
              <RecorridoEditor
                title="Recorrido 1"
                routeIndex={1}
                orderedIds={recorrido1}
                onChange={changeR1}
                localitiesById={localitiesById}
                addableLocalities={addableForR1}
                showCrossActions={useSecond}
                otherRouteLabel="R2"
                onMoveToOther={useSecond ? moveFromR1ToR2 : undefined}
                onCopyToOther={useSecond ? copyToR2 : undefined}
              />

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSecond}
                  onChange={(e) => {
                    markDraftTouched();
                    setUseSecond(e.target.checked);
                  }}
                  className="rounded text-indigo-600"
                />
                Usar segundo recorrido
              </label>

              {useSecond && (
                <RecorridoEditor
                  title="Recorrido 2"
                  routeIndex={2}
                  orderedIds={recorrido2}
                  onChange={changeR2}
                  localitiesById={localitiesById}
                  addableLocalities={addableForR2}
                  showCrossActions
                  otherRouteLabel="R1"
                  onMoveToOther={moveFromR2ToR1}
                  onCopyToOther={copyToR1}
                />
              )}

              {neverAssigned.length > 0 && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  Sin asignar a ningún recorrido:{" "}
                  {neverAssigned.map((l) => l.name).join(", ")}
                </p>
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">
                  Vista previa — Lugar de comisión por localidad
                </h4>
                <p className="mb-2 text-[11px] text-slate-500">
                  Escribí un caso particular para reemplazar el cálculo automático solo
                  en esa localidad.
                </p>
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1.5 font-bold">Localidad</th>
                        <th className="text-left px-2 py-1.5 font-bold">En</th>
                        <th className="text-left px-2 py-1.5 font-bold">Caso particular</th>
                        <th className="text-left px-2 py-1.5 font-bold">Lugar comisión (PDF)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-2 py-1 font-medium text-slate-800">{row.name}</td>
                          <td className="px-2 py-1 text-slate-500 whitespace-nowrap">
                            {[row.enR1 && "R1", row.enR2 && "R2"].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={row.personalizado}
                              onChange={(e) => {
                                markDraftTouched();
                                const value = e.target.value;
                                setPersonalizados((prev) => ({
                                  ...prev,
                                  [String(row.id)]: value,
                                }));
                              }}
                              placeholder="Automático"
                              className="w-full min-w-[130px] rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                              aria-label={`Lugar de comisión particular para ${row.name}`}
                            />
                          </td>
                          <td className="px-2 py-1 text-slate-600">{row.lugar}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {summary && (
                <p className="text-[11px] text-slate-500 font-mono bg-slate-50 rounded px-2 py-1 border border-slate-100">
                  {summary}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={() => {
              onSave("");
              onClose();
            }}
            className="mr-auto text-xs text-slate-500 hover:text-slate-800 underline"
          >
            Usar texto libre
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={localities.length === 0}
            className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
          >
            Guardar recorridos
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
