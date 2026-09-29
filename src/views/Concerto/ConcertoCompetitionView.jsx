import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import {
  IconChevronDown,
  IconChevronUp,
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
  queueConcertoMutation,
  queueParticipanteReorder,
  fetchEditionBundle,
  fetchEditionChoices,
  fetchIntegrantesOptions,
  fetchProgramasOptions,
  fetchPromedios,
  formatCantidadBoletas,
  formatDateTimeAR,
  formatGiraLabel,
  formatGiraRango,
  formatObraCompositores,
  formatParticipanteNombres,
  formatPersona,
  formatPuntaje,
  friendlySchemaError,
  fromDatetimeLocalAR,
  isConcertoStaff,
  nextOrden,
  pickDefaultEdition,
  saveFragmentos,
  saveParticipante,
  toDatetimeLocalAR,
  updateEdicion,
  updateInstancia,
} from "../../utils/concertoCompeticion";
import { RichTextPreview } from "../../components/repertoire/RepertoireWorkPickerModal";
import ConcertoBallot from "./ConcertoBallot";
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

function instrumentosDe(integrantes) {
  const labels = [];
  const seen = new Set();
  for (const persona of integrantes || []) {
    const name = String(persona?.instrumentos?.instrumento || "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    labels.push(name);
  }
  return labels;
}

function puntajeDe(row) {
  if (!row || row.promedio == null || row.promedio === "") return null;
  if (!(Number(row.cantidad) > 0)) return null;
  const n = Number(row.promedio);
  return Number.isFinite(n) ? n : null;
}

function filasRanking(instancias, promedios) {
  const rows = [];
  for (const instancia of instancias || []) {
    const byId = new Map(
      (promedios?.[String(instancia.id)]?.rows || []).map((row) => [String(row.id_participante), row]),
    );
    for (const participante of instancia.participantes || []) {
      const source = byId.get(String(participante.id));
      rows.push({
        participante,
        promedio: puntajeDe(source),
        cantidad: Number(source?.cantidad) || 0,
      });
    }
  }
  rows.sort((a, b) => {
    if (a.promedio == null && b.promedio != null) return 1;
    if (a.promedio != null && b.promedio == null) return -1;
    if (a.promedio != null && b.promedio != null && a.promedio !== b.promedio) {
      return b.promedio - a.promedio;
    }
    const an = formatParticipanteNombres(a.participante.integrantes) || "";
    const bn = formatParticipanteNombres(b.participante.integrantes) || "";
    const byName = an.localeCompare(bn, "es");
    if (byName !== 0) return byName;
    return Number(a.participante.id) - Number(b.participante.id);
  });
  return rows;
}

function ResultadoCard({ fila }) {
  const [open, setOpen] = useState(false);
  const { participante, promedio, cantidad } = fila;
  const integrantes = participante.integrantes || [];
  const instrumentos = instrumentosDe(integrantes);
  const obra = participante.repertorio_obra?.obras || null;
  const compositor = formatObraCompositores(obra);
  const nombre = integrantes.length
    ? integrantes.map((persona) => formatPersona(persona) || "Sin nombre").join("\n")
    : "Sin nombre";
  return (
    <li className="min-w-0 overflow-hidden rounded-lg border border-slate-200">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Detalle de ${nombre.replace(/\n/g, " y ")}`}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-w-0 items-start gap-2 px-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1">
          {integrantes.length ? (
            integrantes.map((persona) => (
              <span key={persona.id} className="block break-words font-medium text-slate-800">
                {formatPersona(persona) || "Sin nombre"}
              </span>
            ))
          ) : (
            <span className="block font-medium text-slate-800">Sin nombre</span>
          )}
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-semibold text-slate-800">
            {promedio == null ? "—" : formatPuntaje(promedio)}
          </span>
          {cantidad > 0 ? (
            <span className="block text-xs text-slate-500">{formatCantidadBoletas(cantidad)}</span>
          ) : null}
        </span>
        {open ? (
          <IconChevronUp size={16} className="mt-0.5 shrink-0 text-slate-400" />
        ) : (
          <IconChevronDown size={16} className="mt-0.5 shrink-0 text-slate-400" />
        )}
      </button>
      {open ? (
        <div className="space-y-2 border-t border-slate-100 px-3 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Instrumento</p>
            <p className="mt-1 break-words text-sm text-slate-700">
              {instrumentos.length ? instrumentos.join(" · ") : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Obra</p>
            <div className="mt-1 min-w-0 text-sm text-slate-800">
              {obra?.titulo || compositor ? (
                <>
                  {compositor ? (
                    <span className="block text-[11px] font-semibold text-slate-600">{compositor}</span>
                  ) : null}
                  {obra?.titulo ? (
                    <RichTextPreview content={obra.titulo} className="[&_div]:my-0 [&_p]:my-0" />
                  ) : null}
                </>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function Resultados({ instancias, promedios }) {
  const pending = (instancias || []).some((instancia) => promedios?.[String(instancia.id)] == null);
  const errors = (instancias || [])
    .map((instancia) => promedios?.[String(instancia.id)]?.error)
    .filter(Boolean);
  const rows = pending ? [] : filasRanking(instancias, promedios);
  const voted = rows.some((row) => row.promedio != null);
  return (
    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Resultados</h3>
      {errors.map((error) => (
        <p key={error} className="text-sm text-rose-600">
          {error}
        </p>
      ))}
      {pending ? <p className="text-sm text-slate-400">Cargando promedios…</p> : null}
      {!pending && !voted ? (
        <p className="text-sm text-slate-500">Todavía no hay puntajes.</p>
      ) : null}
      {pending || rows.length === 0 ? null : (
        <>
        <div className="hidden max-w-full min-w-0 overflow-x-auto md:block">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[18%]" />
              <col className="w-[40%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Nombre</th>
                <th className="px-2 py-2">Instrumento</th>
                <th className="px-2 py-2">Obra</th>
                <th className="px-2 py-2 text-right">Puntaje</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ participante, promedio, cantidad }) => {
                const integrantes = participante.integrantes || [];
                const instrumentos = instrumentosDe(integrantes);
                const obra = participante.repertorio_obra?.obras || null;
                const compositor = formatObraCompositores(obra);
                return (
                  <tr key={participante.id} className="border-b border-slate-100 align-top">
                    <td className="px-2 py-2 font-medium text-slate-800">
                      {integrantes.length
                        ? integrantes.map((persona) => (
                            <span key={persona.id} className="block">
                              {formatPersona(persona) || "Sin nombre"}
                            </span>
                          ))
                        : "Sin nombre"}
                    </td>
                    <td className="px-2 py-2 text-slate-700">
                      {instrumentos.length
                        ? instrumentos.map((nombre) => (
                            <span key={nombre} className="block">
                              {nombre}
                            </span>
                          ))
                        : "—"}
                    </td>
                    <td className="px-2 py-2 text-slate-800">
                      {obra?.titulo || compositor ? (
                        <>
                          {compositor ? (
                            <span className="block text-[11px] font-semibold text-slate-600">
                              {compositor}
                            </span>
                          ) : null}
                          {obra?.titulo ? (
                            <RichTextPreview
                              content={obra.titulo}
                              className="[&_div]:my-0 [&_p]:my-0"
                            />
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-700">
                      <span className="font-semibold">
                        {promedio == null ? "—" : formatPuntaje(promedio)}
                      </span>
                      {cantidad > 0 ? (
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {formatCantidadBoletas(cantidad)}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ul className="space-y-2 md:hidden">
          {rows.map((fila) => (
            <ResultadoCard key={fila.participante.id} fila={fila} />
          ))}
        </ul>
        </>
      )}
    </section>
  );
}

function InstanciaStaffCard({
  supabase,
  userId,
  instancia,
  otras,
  personas,
  now,
  onChanged,
  onReorder,
  onMove,
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
  const [fragmentos, setFragmentos] = useState({});
  const [saving, setSaving] = useState(false);
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
      next[String(participante.id)] = {
        solista: participante.fragmento_solista || "",
        orquesta: participante.fragmento_orquesta || "",
      };
    }
    setFragmentos(next);
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
      instancia.participantes.some((participante) => {
        const draft = fragmentos[String(participante.id)] || {};
        return (
          String(draft.solista ?? "") !== String(participante.fragmento_solista || "") ||
          String(draft.orquesta ?? "") !== String(participante.fragmento_orquesta || "")
        );
      }));

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
      next[String(participante.id)] = {
        solista: participante.fragmento_solista || "",
        orquesta: participante.fragmento_orquesta || "",
      };
    }
    setFragmentos(next);
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
      const draft = fragmentos[String(participante.id)] || {};
      const solista = String(draft.solista ?? "").trim();
      const orquesta = String(draft.orquesta ?? "").trim();
      if (
        solista === String(participante.fragmento_solista || "").trim() &&
        orquesta === String(participante.fragmento_orquesta || "").trim()
      ) {
        continue;
      }
      const { error: fragError } = await saveFragmentos(supabase, participante.id, solista, orquesta);
      if (fragError) {
        setSaving(false);
        setError(errorText(fragError));
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
    const next = instancia.participantes.filter(
      (item) => String(item.id) !== String(participante.id),
    );
    onReorder?.(next);
    queueParticipanteReorder(supabase, instancia.id_gira, next, instancia.id);
    queueConcertoMutation(supabase, [instancia.id_gira], () =>
      deleteParticipante(supabase, participante, instancia.id_gira, { reportDrive: true }),
    );
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
      fragmentoSolista: String(draft.fragmentoSolista || "").trim(),
      fragmentoOrquesta: String(draft.fragmentoOrquesta || "").trim(),
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
            editing={editing}
            fragmentos={fragmentos}
            onFragmento={(participanteId, campo, value) =>
              setFragmentos((prev) => {
                const current = prev[String(participanteId)] || { solista: "", orquesta: "" };
                return {
                  ...prev,
                  [String(participanteId)]: { ...current, [campo]: value },
                };
              })
            }
            onReorder={onReorder}
            onMove={(origenId, sourceNext, destinoId, destNext) =>
              onMove?.(origenId, sourceNext, destinoId, destNext)
            }
            onEdit={(participante) => setModal({ participante })}
            onRemove={quitarParticipante}
          />
        )}
      </div>

      {instancia.esElectorado ? (
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
                  fragmentoSolista: modal.participante.fragmento_solista || "",
                  fragmentoOrquesta: modal.participante.fragmento_orquesta || "",
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
  const [staffTab, setStaffTab] = useState("instancias");
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

  const aplicarOrdenLocal = (instanciaId, participantes) => {
    setInstancias((current) =>
      current.map((item) =>
        String(item.id) === String(instanciaId) ? { ...item, participantes } : item,
      ),
    );
  };

  const aplicarMovimiento = (origenId, sourceNext, destinoId, destNext) => {
    setInstancias((current) =>
      current.map((item) => {
        if (String(item.id) === String(origenId)) return { ...item, participantes: sourceNext };
        if (String(item.id) === String(destinoId)) return { ...item, participantes: destNext };
        return item;
      }),
    );
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
            {isStaff && staffTab === "instancias" ? (
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

        {isStaff && edicion && !loading ? (
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5"
            role="tablist"
            aria-label="Concerto Competition"
          >
            <button
              type="button"
              role="tab"
              aria-selected={staffTab === "instancias"}
              onClick={() => setStaffTab("instancias")}
              className={`rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${
                staffTab === "instancias"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Instancias
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={staffTab === "resultados"}
              onClick={() => setStaffTab("resultados")}
              className={`rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${
                staffTab === "resultados"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Resultados
            </button>
          </div>
        ) : null}

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
            <div className={isStaff && staffTab !== "instancias" ? "hidden" : "contents"}>
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
                      now={now}
                      onChanged={reload}
                      onReorder={(participantes) => aplicarOrdenLocal(instancia.id, participantes)}
                      onMove={aplicarMovimiento}
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
            </div>

            {isStaff ? (
              <div className={staffTab === "resultados" ? "contents" : "hidden"}>
                {visibles.length > 0 ? (
                  <Resultados instancias={visibles} promedios={promedios} />
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                    Esta edición todavía no tiene instancias.
                  </div>
                )}
              </div>
            ) : null}
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
