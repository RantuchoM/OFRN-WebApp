import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import {
  IconEdit,
  IconLoader,
  IconTrophy,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "../../components/ui/Icons";
import {
  clearUnsavedWork,
  markUnsavedWork,
  registerUnsavedLeaveGuard,
} from "../../utils/unsavedWork";
import {
  createEdicion,
  createInstancia,
  deleteInstancia,
  deleteParticipante,
  fetchEditionBundle,
  fetchEditionChoices,
  fetchIntegrantesOptions,
  fetchProgramasOptions,
  fetchPromedios,
  formatCantidadBoletas,
  formatDateTimeAR,
  formatGiraLabel,
  formatGiraRango,
  formatParticipanteNombres,
  formatPuntaje,
  friendlySchemaError,
  fromDatetimeLocalAR,
  isConcertoStaff,
  nextOrden,
  pickDefaultEdition,
  saveObservaciones,
  saveParticipante,
  toDatetimeLocalAR,
  updateEdicion,
  updateInstancia,
  windowState,
} from "../../utils/concertoCompeticion";
import ConcertoBallot, { ParticipanteVotoIdentidad } from "./ConcertoBallot";
import ConcertoParticipantesTable from "./ConcertoParticipantesTable";
import { EdicionModal, InstanciaModal, ParticipanteModal } from "./ConcertoModals";

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

const UNSAVED_TOKEN = "concerto-competition";

const DISCARD_CONFIRM = {
  title: "Cambios sin guardar",
  message: "Hay cambios sin guardar.",
  confirmText: "Descartar",
  cancelText: "Seguir editando",
  destructive: true,
};

function fechaTexto(value) {
  return formatDateTimeAR(value) || "Sin definir";
}

function nombresDe(participante) {
  return formatParticipanteNombres(participante.integrantes) || "Sin nombre";
}

function giraSubtitulo(gira) {
  const label = formatGiraLabel(gira);
  const rango = formatGiraRango(gira);
  return rango ? `${label} (${rango})` : label;
}

function errorText(error) {
  if (!error) return "";
  return friendlySchemaError(error);
}

function hasPromedios(rows) {
  return (rows || []).some(
    (row) => row?.promedio != null && row.promedio !== "" && Number(row.cantidad) > 0,
  );
}

function Resultados({ participantes, promedios }) {
  const pending = promedios == null;
  const rows = promedios?.rows || [];
  const byId = new Map(rows.map((row) => [String(row.id_participante), row]));
  const voted = hasPromedios(rows);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Resultados</h4>
      </div>
      {promedios?.error ? <p className="text-sm text-rose-600">{promedios.error}</p> : null}
      {pending ? <p className="text-sm text-slate-400">Cargando promedios…</p> : null}
      {!pending && !voted ? (
        <p className="text-sm text-slate-500">Todavía no hay puntajes.</p>
      ) : null}
      {pending ? null : (
      <ul className="divide-y divide-slate-100">
        {participantes.map((participante) => {
          const row = byId.get(String(participante.id));
          const promedio =
            row && row.promedio != null && row.promedio !== ""
              ? formatPuntaje(row.promedio)
              : "—";
          const cantidad = Number(row?.cantidad);
          return (
            <li key={participante.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <ParticipanteVotoIdentidad participante={participante} />
              <p className="shrink-0 text-right text-slate-700">
                <span className="font-semibold">{promedio}</span>
                {Number.isFinite(cantidad) && cantidad > 0 ? (
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {formatCantidadBoletas(cantidad)}
                  </span>
                ) : null}
              </p>
            </li>
          );
        })}
      </ul>
      )}
    </div>
  );
}

function InstanciaStaffCard({
  supabase,
  userId,
  instancia,
  otras,
  personas,
  promedios,
  now,
  onChanged,
  onVoted,
  askDiscard,
  onDirtyChange,
  discardNonce,
}) {
  const { confirm, dialog } = useConfirmDialog();
  const [editing, setEditing] = useState(false);
  const [titulo, setTitulo] = useState(instancia.titulo || "");
  const [abre, setAbre] = useState(() => toDatetimeLocalAR(instancia.abre_en));
  const [cierra, setCierra] = useState(() => toDatetimeLocalAR(instancia.cierra_en));
  const [obs, setObs] = useState({});
  const [saving, setSaving] = useState(false);
  const [rowBusy, setRowBusy] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const seenDiscard = useRef(discardNonce);

  useEffect(() => {
    if (editing) return;
    setTitulo(instancia.titulo || "");
    setAbre(toDatetimeLocalAR(instancia.abre_en));
    setCierra(toDatetimeLocalAR(instancia.cierra_en));
    const next = {};
    for (const participante of instancia.participantes) {
      next[String(participante.id)] = participante.observaciones || "";
    }
    setObs(next);
  }, [
    editing,
    instancia.id,
    instancia.titulo,
    instancia.abre_en,
    instancia.cierra_en,
    instancia.participantes,
  ]);

  useEffect(() => {
    if (seenDiscard.current === discardNonce) return;
    seenDiscard.current = discardNonce;
    setEditing(false);
  }, [discardNonce]);

  const dirty =
    editing &&
    (titulo !== (instancia.titulo || "") ||
      abre !== toDatetimeLocalAR(instancia.abre_en) ||
      cierra !== toDatetimeLocalAR(instancia.cierra_en) ||
      instancia.participantes.some(
        (participante) =>
          String(obs[String(participante.id)] ?? "") !==
          String(participante.observaciones || ""),
      ));

  useEffect(() => {
    onDirtyChange?.(String(instancia.id), dirty);
    return () => onDirtyChange?.(String(instancia.id), false);
  }, [dirty, instancia.id, onDirtyChange]);

  const empezar = () => {
    setTitulo(instancia.titulo || "");
    setAbre(toDatetimeLocalAR(instancia.abre_en));
    setCierra(toDatetimeLocalAR(instancia.cierra_en));
    const next = {};
    for (const participante of instancia.participantes) {
      next[String(participante.id)] = participante.observaciones || "";
    }
    setObs(next);
    setError("");
    setEditing(true);
  };

  const cancelar = async () => {
    if (dirty) {
      const ok = await askDiscard();
      if (!ok) return;
    }
    setEditing(false);
    setError("");
  };

  const saveVentana = async (event) => {
    event.preventDefault();
    const abreEn = fromDatetimeLocalAR(abre);
    const cierraEn = fromDatetimeLocalAR(cierra);
    if ((abre && !abreEn) || (cierra && !cierraEn)) {
      setError("Revisá la fecha y la hora.");
      return;
    }
    if (abreEn && cierraEn && new Date(abreEn).getTime() > new Date(cierraEn).getTime()) {
      setError("La apertura tiene que ser anterior o igual al cierre.");
      return;
    }
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setSaving(true);
    setError("");
    const { error: saveError } = await updateInstancia(supabase, instancia.id, {
      titulo: titulo.trim(),
      abreEn,
      cierraEn,
    });
    if (saveError) {
      setSaving(false);
      setError(errorText(saveError));
      return;
    }
    for (const participante of instancia.participantes) {
      const next = String(obs[String(participante.id)] ?? "").trim();
      if (next === String(participante.observaciones || "").trim()) continue;
      const { error: obsError } = await saveObservaciones(supabase, participante.id, next);
      if (obsError) {
        setSaving(false);
        setError(errorText(obsError));
        return;
      }
    }
    setSaving(false);
    setEditing(false);
    onChanged();
  };

  const quitarParticipante = async (participante) => {
    const ok = await confirm({
      title: "Quitar participante",
      message: `¿Quitar a ${nombresDe(participante)} de esta instancia?`,
      confirmText: "Quitar",
      destructive: true,
    });
    if (!ok) return;
    setRowBusy(true);
    const { error: deleteError } = await deleteParticipante(
      supabase,
      participante,
      instancia.id_gira,
    );
    setRowBusy(false);
    if (deleteError) {
      setError(errorText(deleteError));
      return;
    }
    onChanged();
  };

  const guardarParticipante = async (draft) => {
    if (!draft.idUno) return "Elegí al menos un integrante.";
    if (draft.idDos && String(draft.idDos) === String(draft.idUno)) {
      return "El dúo tiene que ser dos integrantes distintos.";
    }
    const integranteIds = [draft.idUno, draft.idDos].filter((id) => id != null && id !== "");
    const existente = modal?.participante;
    const { error: saveError } = await saveParticipante(supabase, {
      id: existente?.id,
      idInstancia: instancia.id,
      observaciones: String(draft.observaciones || "").trim(),
      orden: existente?.orden ?? nextOrden(instancia.participantes),
      integranteIds,
    });
    if (saveError) return errorText(saveError);
    setModal(null);
    onChanged();
    return "";
  };

  const eliminar = async () => {
    const ok = await confirm({
      title: "Eliminar instancia",
      message: `¿Eliminar «${instancia.titulo || "esta instancia"}» y sus participantes?`,
      confirmText: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    const { error: deleteError } = await deleteInstancia(supabase, instancia);
    if (deleteError) {
      setError(errorText(deleteError));
      return;
    }
    onChanged();
  };

  const abierta = windowState(instancia, now) === "open" && instancia.esElectorado;

  return (
    <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {dialog}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            {instancia.titulo || "Instancia"}
          </h3>
          <p className="text-sm text-slate-500">{giraSubtitulo(instancia.gira)}</p>
        </div>
        <button
          type="button"
          onClick={eliminar}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-rose-600 hover:bg-rose-50"
        >
          <IconTrash size={16} />
          Eliminar
        </button>
      </div>

      {editing ? (
        <form onSubmit={saveVentana} className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold uppercase text-slate-500 sm:col-span-2">
            Título
            <input
              className={`${fieldClass} mt-1 normal-case`}
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
            />
          </label>
          <label className="block text-xs font-bold uppercase text-slate-500">
            Abre
            <input
              type="datetime-local"
              className={`${fieldClass} mt-1`}
              value={abre}
              onChange={(event) => setAbre(event.target.value)}
            />
          </label>
          <label className="block text-xs font-bold uppercase text-slate-500">
            Cierra
            <input
              type="datetime-local"
              className={`${fieldClass} mt-1`}
              value={cierra}
              onChange={(event) => setCierra(event.target.value)}
            />
          </label>
          <p className="text-xs text-slate-500 sm:col-span-2">
            Horario de Argentina (UTC−3). Podés cerrar cuando quieras: la cantidad de boletas no
            condiciona el cierre.
          </p>
          {error ? <p className="text-sm text-rose-600 sm:col-span-2">{error}</p> : null}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={cancelar}
              disabled={saving}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-xs font-bold uppercase text-slate-500">Título</p>
            <p className="mt-1 text-sm text-slate-800">{instancia.titulo || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Abre</p>
            <p className="mt-1 text-sm text-slate-800">{fechaTexto(instancia.abre_en)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Cierra</p>
            <p className="mt-1 text-sm text-slate-800">{fechaTexto(instancia.cierra_en)}</p>
          </div>
          <p className="text-xs text-slate-500 sm:col-span-2">
            Horario de Argentina (UTC−3). Podés cerrar cuando quieras: la cantidad de boletas no
            condiciona el cierre.
          </p>
          {error ? <p className="text-sm text-rose-600 sm:col-span-2">{error}</p> : null}
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={empezar}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <IconEdit size={16} />
              Editar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Participantes
          </h4>
          <button
            type="button"
            onClick={() => setModal({ participante: null })}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            <IconPlus size={16} />
            Agregar
          </button>
        </div>
        {instancia.participantes.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no hay participantes.</p>
        ) : (
          <ConcertoParticipantesTable
            supabase={supabase}
            instancia={instancia}
            otras={otras}
            busy={rowBusy}
            editing={editing}
            observaciones={obs}
            onObservacion={(participanteId, value) =>
              setObs((prev) => ({ ...prev, [String(participanteId)]: value }))
            }
            onBusy={setRowBusy}
            onError={(message) => setError(message ? errorText({ message }) : "")}
            onChanged={onChanged}
            onEdit={(participante) => setModal({ participante })}
            onRemove={quitarParticipante}
          />
        )}
      </div>

      <Resultados participantes={instancia.participantes} promedios={promedios} />

      {abierta ? (
        <section className="space-y-3 border-t border-slate-200 pt-4">
          <h4 className="text-sm font-bold text-slate-800">Tu votación</h4>
          <ConcertoBallot
            supabase={supabase}
            userId={userId}
            instancia={instancia}
            now={now}
            onSaved={onVoted}
          />
        </section>
      ) : null}

      {modal ? (
        <ParticipanteModal
          title={modal.participante ? "Editar participante" : "Nuevo participante"}
          personas={personas}
          initial={
            modal.participante
              ? {
                  idUno: modal.participante.integrantes?.[0]?.id ?? null,
                  idDos: modal.participante.integrantes?.[1]?.id ?? null,
                  observaciones: modal.participante.observaciones || "",
                }
              : null
          }
          onClose={() => setModal(null)}
          onSubmit={guardarParticipante}
          saving={false}
        />
      ) : null}
    </article>
  );
}

export default function ConcertoCompetitionView({ supabase }) {
  const { user, roles } = useAuth();
  const isStaff = isConcertoStaff(roles);
  const userId = user?.id;
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [ediciones, setEdiciones] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [instancias, setInstancias] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [promedios, setPromedios] = useState({});
  const [promediosTick, setPromediosTick] = useState(0);
  const [editingEdition, setEditingEdition] = useState(false);
  const [nombre, setNombre] = useState("");
  const [visibleDesde, setVisibleDesde] = useState("");
  const [visibleHasta, setVisibleHasta] = useState("");
  const [editionError, setEditionError] = useState("");
  const [savingEdition, setSavingEdition] = useState(false);
  const [discardNonce, setDiscardNonce] = useState(0);
  const [showNuevaEdicion, setShowNuevaEdicion] = useState(false);
  const [showNuevaInstancia, setShowNuevaInstancia] = useState(false);
  const [creating, setCreating] = useState(false);
  const selectedRef = useRef(null);
  const requestRef = useRef(0);
  const dirtyMapRef = useRef({});
  const confirmRef = useRef(null);
  const { confirm, dialog: leaveDialog } = useConfirmDialog();
  confirmRef.current = confirm;

  const edicion = useMemo(
    () => ediciones.find((item) => String(item.id) === String(selectedId)) || null,
    [ediciones, selectedId],
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!edicion || editingEdition) return;
    setNombre(edicion.nombre || "");
    setVisibleDesde(toDatetimeLocalAR(edicion.visible_desde));
    setVisibleHasta(toDatetimeLocalAR(edicion.visible_hasta));
    setEditionError("");
  }, [edicion, editingEdition]);

  const editionDirty =
    editingEdition &&
    !!edicion &&
    (nombre !== (edicion.nombre || "") ||
      visibleDesde !== toDatetimeLocalAR(edicion.visible_desde) ||
      visibleHasta !== toDatetimeLocalAR(edicion.visible_hasta));

  const reportDirty = useCallback((key, value) => {
    dirtyMapRef.current[key] = value;
    const any = Object.values(dirtyMapRef.current).some(Boolean);
    if (any) markUnsavedWork(UNSAVED_TOKEN);
    else clearUnsavedWork(UNSAVED_TOKEN);
  }, []);

  useEffect(() => {
    reportDirty("edicion", editionDirty);
  }, [editionDirty, reportDirty]);

  useEffect(() => {
    return () => clearUnsavedWork(UNSAVED_TOKEN);
  }, []);

  useEffect(() => {
    return registerUnsavedLeaveGuard((proceed) => {
      const any = Object.values(dirtyMapRef.current).some(Boolean);
      if (!any) return true;
      confirmRef.current(DISCARD_CONFIRM).then((ok) => {
        if (!ok) return;
        dirtyMapRef.current = {};
        clearUnsavedWork(UNSAVED_TOKEN);
        setEditingEdition(false);
        setDiscardNonce((value) => value + 1);
        proceed();
      });
      return false;
    });
  }, []);

  const askDiscard = useCallback(() => confirm(DISCARD_CONFIRM), [confirm]);

  const leaveThen = useCallback(
    async (action) => {
      const any = Object.values(dirtyMapRef.current).some(Boolean);
      if (any) {
        const ok = await confirm(DISCARD_CONFIRM);
        if (!ok) return;
        dirtyMapRef.current = {};
        clearUnsavedWork(UNSAVED_TOKEN);
        setEditingEdition(false);
        setDiscardNonce((value) => value + 1);
      }
      action();
    },
    [confirm],
  );

  const loadBundle = useCallback(
    async (edicionId, requestId) => {
      const bundle = await fetchEditionBundle(supabase, edicionId, userId);
      if (requestId !== requestRef.current) return;
      if (bundle.error) {
        setLoadError(errorText(bundle.error));
        setInstancias([]);
        return;
      }
      setInstancias(bundle.instancias);
    },
    [supabase, userId],
  );

  const load = useCallback(async () => {
    if (userId == null) return;
    const requestId = ++requestRef.current;
    setLoadError("");
    const choices = await fetchEditionChoices(supabase, userId, isStaff);
    if (requestId !== requestRef.current) return;
    if (choices.error) {
      setLoadError(errorText(choices.error));
      setEdiciones([]);
      setInstancias([]);
      setLoading(false);
      return;
    }
    const list = choices.ediciones || [];
    const previous = selectedRef.current;
    const chosen =
      previous && list.some((item) => String(item.id) === String(previous))
        ? previous
        : pickDefaultEdition(list)?.id ?? null;
    selectedRef.current = chosen;
    setEdiciones(list);
    setSelectedId(chosen);
    if (!chosen) {
      setInstancias([]);
      setLoading(false);
      return;
    }
    await loadBundle(chosen, requestId);
    if (requestId === requestRef.current) setLoading(false);
  }, [supabase, userId, isStaff, loadBundle]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!isStaff) return;
    let cancelled = false;
    Promise.all([fetchProgramasOptions(supabase), fetchIntegrantesOptions(supabase)]).then(
      ([giras, people]) => {
        if (cancelled) return;
        if (!giras.error) setProgramas(giras.options);
        if (!people.error) setPersonas(people.options);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [isStaff, supabase]);

  const instanciaKey = instancias.map((instancia) => instancia.id).join(",");

  useEffect(() => {
    if (!isStaff || !userId || !instanciaKey) {
      setPromedios({});
      return;
    }
    let cancelled = false;
    const ids = instanciaKey.split(",").filter(Boolean);
    const tick = async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          const result = await fetchPromedios(supabase, userId, id);
          return [String(id), result];
        }),
      );
      if (!cancelled) setPromedios(Object.fromEntries(entries));
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [isStaff, userId, supabase, instanciaKey, promediosTick]);

  const selectEdition = async (id) => {
    await leaveThen(async () => {
      selectedRef.current = id;
      setSelectedId(id);
      const requestId = ++requestRef.current;
      setLoading(true);
      await loadBundle(id, requestId);
      if (requestId === requestRef.current) setLoading(false);
    });
  };

  const reload = () => {
    setLoading(false);
    setPromediosTick((value) => value + 1);
    load();
  };

  const guardarEdicion = async (event) => {
    event.preventDefault();
    if (!edicion) return;
    const desde = fromDatetimeLocalAR(visibleDesde);
    const hasta = fromDatetimeLocalAR(visibleHasta);
    if (!nombre.trim()) {
      setEditionError("El nombre es obligatorio.");
      return;
    }
    if (!desde || !hasta) {
      setEditionError("Completá la vigencia en horario de Argentina.");
      return;
    }
    if (new Date(desde).getTime() > new Date(hasta).getTime()) {
      setEditionError("El inicio de la vigencia tiene que ser anterior o igual al fin.");
      return;
    }
    setSavingEdition(true);
    setEditionError("");
    const { error } = await updateEdicion(supabase, edicion.id, {
      nombre: nombre.trim(),
      visibleDesde: desde,
      visibleHasta: hasta,
    });
    setSavingEdition(false);
    if (error) {
      setEditionError(errorText(error));
      return;
    }
    setEditingEdition(false);
    reload();
  };

  const crearEdicion = async ({ nombre: nextNombre, desde, hasta }) => {
    const visibleDesdeValue = fromDatetimeLocalAR(desde);
    const visibleHastaValue = fromDatetimeLocalAR(hasta);
    if (!String(nextNombre || "").trim()) return "El nombre es obligatorio.";
    if (!visibleDesdeValue || !visibleHastaValue) return "Completá la vigencia.";
    if (new Date(visibleDesdeValue) > new Date(visibleHastaValue)) {
      return "El inicio de la vigencia tiene que ser anterior o igual al fin.";
    }
    setCreating(true);
    const { id, error } = await createEdicion(supabase, {
      nombre: String(nextNombre).trim(),
      visibleDesde: visibleDesdeValue,
      visibleHasta: visibleHastaValue,
    });
    setCreating(false);
    if (error) return errorText(error);
    selectedRef.current = id;
    setShowNuevaEdicion(false);
    reload();
    return "";
  };

  const crearInstancia = async ({ idGira, titulo }) => {
    if (!edicion) return "Elegí una edición.";
    if (idGira == null || idGira === "") return "Elegí una gira.";
    if (!String(titulo || "").trim()) return "El título es obligatorio.";
    setCreating(true);
    const { error } = await createInstancia(supabase, {
      idEdicion: edicion.id,
      idGira,
      titulo: String(titulo).trim(),
      orden: nextOrden(instancias),
    });
    setCreating(false);
    if (error) return errorText(error);
    setShowNuevaInstancia(false);
    reload();
    return "";
  };

  const visibles = isStaff
    ? instancias
    : instancias.filter((instancia) => instancia.esElectorado);

  return (
    <div className="flex h-full min-w-0 flex-col overflow-x-hidden overflow-y-auto bg-slate-50 p-4 md:p-6">
      {leaveDialog}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconTrophy size={20} className="text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-800">Concerto Competition</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ediciones.length > 1 ? (
              <select
                className={`${fieldClass} w-auto min-w-[12rem]`}
                value={selectedId ?? ""}
                onChange={(event) => selectEdition(event.target.value)}
                aria-label="Edición"
              >
                {ediciones.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre || `Edición ${item.id}`}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              onClick={() => leaveThen(reload)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <IconRefresh size={16} />
              Actualizar
            </button>
            {isStaff ? (
              <button
                type="button"
                onClick={() => setShowNuevaEdicion(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700"
              >
                <IconPlus size={16} />
                Nueva edición
              </button>
            ) : null}
          </div>
        </div>

        {loadError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {loadError}
          </p>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <IconLoader size={18} />
            Cargando Concerto Competition...
          </div>
        ) : !edicion ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            {isStaff
              ? "Todavía no hay ediciones. Creá la primera para armar las instancias."
              : "No hay una edición de Concerto disponible para vos en este momento."}
          </div>
        ) : (
          <>
            {isStaff ? (
              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800">Edición</h2>
                {editingEdition ? (
                  <form onSubmit={guardarEdicion} className="space-y-3">
                    <label className="block text-xs font-bold uppercase text-slate-500">
                      Nombre
                      <input
                        className={`${fieldClass} mt-1 normal-case`}
                        value={nombre}
                        onChange={(event) => setNombre(event.target.value)}
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-bold uppercase text-slate-500">
                        Visible desde
                        <input
                          type="datetime-local"
                          className={`${fieldClass} mt-1`}
                          value={visibleDesde}
                          onChange={(event) => setVisibleDesde(event.target.value)}
                        />
                      </label>
                      <label className="block text-xs font-bold uppercase text-slate-500">
                        Visible hasta
                        <input
                          type="datetime-local"
                          className={`${fieldClass} mt-1`}
                          value={visibleHasta}
                          onChange={(event) => setVisibleHasta(event.target.value)}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-slate-500">
                      El menú de los músicos usa esta vigencia. Horario de Argentina (UTC−3).
                    </p>
                    {editionError ? <p className="text-sm text-rose-600">{editionError}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={savingEdition}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingEdition ? "Guardando…" : "Guardar cambios"}
                      </button>
                      <button
                        type="button"
                        disabled={savingEdition}
                        onClick={async () => {
                          if (editionDirty) {
                            const ok = await askDiscard();
                            if (!ok) return;
                          }
                          setEditingEdition(false);
                          setEditionError("");
                        }}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">Nombre</p>
                      <p className="mt-1 text-sm text-slate-800">{edicion.nombre || "—"}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Visible desde</p>
                        <p className="mt-1 text-sm text-slate-800">{fechaTexto(edicion.visible_desde)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Visible hasta</p>
                        <p className="mt-1 text-sm text-slate-800">{fechaTexto(edicion.visible_hasta)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      El menú de los músicos usa esta vigencia. Horario de Argentina (UTC−3).
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setNombre(edicion.nombre || "");
                        setVisibleDesde(toDatetimeLocalAR(edicion.visible_desde));
                        setVisibleHasta(toDatetimeLocalAR(edicion.visible_hasta));
                        setEditionError("");
                        setEditingEdition(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <IconEdit size={16} />
                      Editar
                    </button>
                  </div>
                )}
              </section>
            ) : (
              <p className="text-sm font-semibold text-slate-700">
                {edicion.nombre || "Concerto"}
              </p>
            )}

            {isStaff ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowNuevaInstancia(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  <IconPlus size={16} />
                  Nueva instancia
                </button>
              </div>
            ) : null}

            {visibles.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                {isStaff
                  ? "Esta edición todavía no tiene instancias."
                  : "No estás en el electorado de ninguna instancia de esta edición."}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {visibles.map((instancia) =>
                  isStaff ? (
                    <InstanciaStaffCard
                      key={instancia.id}
                      supabase={supabase}
                      userId={userId}
                      instancia={instancia}
                      otras={instancias.filter((item) => String(item.id) !== String(instancia.id))}
                      personas={personas}
                      promedios={promedios[String(instancia.id)]}
                      now={now}
                      onChanged={reload}
                      onVoted={() => setPromediosTick((value) => value + 1)}
                      askDiscard={askDiscard}
                      onDirtyChange={reportDirty}
                      discardNonce={discardNonce}
                    />
                  ) : (
                    <article
                      key={instancia.id}
                      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div>
                        <h3 className="text-base font-bold text-slate-800">
                          {instancia.titulo || "Instancia"}
                        </h3>
                        <p className="text-sm text-slate-500">{giraSubtitulo(instancia.gira)}</p>
                      </div>
                      <ConcertoBallot
                        supabase={supabase}
                        userId={userId}
                        instancia={instancia}
                        now={now}
                      />
                    </article>
                  ),
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showNuevaEdicion ? (
        <EdicionModal
          saving={creating}
          onClose={() => setShowNuevaEdicion(false)}
          onSubmit={crearEdicion}
        />
      ) : null}
      {showNuevaInstancia ? (
        <InstanciaModal
          programas={programas}
          saving={creating}
          onClose={() => setShowNuevaInstancia(false)}
          onSubmit={crearInstancia}
        />
      ) : null}
    </div>
  );
}
