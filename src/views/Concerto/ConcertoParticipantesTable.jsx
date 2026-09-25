import React, { useEffect, useState } from "react";
import RepertoireWorkPickerModal from "../../components/repertoire/RepertoireWorkPickerModal";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconDrive,
  IconEdit,
  IconExchange,
  IconLoader,
  IconSearch,
  IconTrash,
  IconX,
} from "../../components/ui/Icons";
import { calculateInstrumentation } from "../../utils/instrumentation";
import {
  formatParticipanteNombres,
  linkParticipanteObra,
  moveParticipante,
  nextOrden,
  plainWorkTitle,
  reorderParticipante,
  unlinkParticipanteObra,
} from "../../utils/concertoCompeticion";

function nombresDe(participante) {
  return formatParticipanteNombres(participante.integrantes) || "Sin nombre";
}

function organicoDe(obra) {
  if (!obra) return "";
  const stored = String(obra.instrumentacion || "").trim();
  if (stored) return stored;
  return calculateInstrumentation(obra.obras_particellas || []) || "";
}

function ObservacionesCell({ participante, editing, value, onChange }) {
  if (!editing) {
    const text = String(participante.observaciones || "").trim();
    return text ? (
      <p className="min-w-[12rem] text-sm text-slate-700">{text}</p>
    ) : (
      <p className="text-sm text-slate-400">—</p>
    );
  }
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full min-w-[12rem] rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      aria-label={`Observaciones de ${nombresDe(participante)}`}
    />
  );
}

export default function ConcertoParticipantesTable({
  supabase,
  instancia,
  otras,
  busy,
  editing = false,
  observaciones = {},
  onObservacion,
  onBusy,
  onError,
  onChanged,
  onEdit,
  onRemove,
}) {
  const [picking, setPicking] = useState(null);
  const [moveFor, setMoveFor] = useState(null);

  useEffect(() => {
    if (moveFor == null) return undefined;
    const close = (event) => {
      if (event.target.closest("[data-concerto-move]")) return;
      setMoveFor(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [moveFor]);
  const participantes = instancia.participantes || [];
  const sinGira = instancia.id_gira == null;

  const run = async (action) => {
    onBusy(true);
    onError("");
    try {
      const { error } = await action();
      if (error) {
        onError(error.message || "No se pudo guardar.");
        return;
      }
      onChanged();
    } finally {
      onBusy(false);
    }
  };

  const vincular = (participante, workId) => {
    setPicking(null);
    if (!workId) return;
    run(() =>
      linkParticipanteObra(supabase, {
        participante,
        idGira: instancia.id_gira,
        idObra: workId,
      }),
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <th className="px-2 py-2">Participantes</th>
            <th className="px-2 py-2">Observaciones</th>
            <th className="px-2 py-2">Obra de repertorio</th>
            <th className="px-2 py-2">Drive</th>
            <th className="px-2 py-2">Orgánico</th>
            <th className="px-2 py-2 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {participantes.map((participante, index) => {
            const obra = participante.repertorio_obra?.obras || null;
            const titulo = plainWorkTitle(obra?.titulo);
            const organico = organicoDe(obra);
            const drive = obra?.link_drive || "";
            return (
              <tr key={participante.id} className="border-b border-slate-100 align-top">
                <td className="px-2 py-2">
                  <p className="font-medium text-slate-800">{nombresDe(participante)}</p>
                  {!participante.integrantes?.length ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                      <IconAlertTriangle size={14} />
                      Sin integrantes asignados.
                    </p>
                  ) : null}
                </td>
                <td className="px-2 py-2">
                  <ObservacionesCell
                    participante={participante}
                    editing={editing}
                    value={observaciones[String(participante.id)] ?? participante.observaciones ?? ""}
                    onChange={(value) => onObservacion?.(participante.id, value)}
                  />
                </td>
                <td className="px-2 py-2">
                  {obra ? (
                    <div className="flex items-start gap-1">
                      <p className="min-w-0 text-slate-800">{titulo || "Obra vinculada"}</p>
                      <button
                        type="button"
                        disabled={busy}
                        title="Desvincular obra"
                        onClick={() =>
                          run(() =>
                            unlinkParticipanteObra(supabase, {
                              participante,
                              idGira: instancia.id_gira,
                            }),
                          )
                        }
                        className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={busy || sinGira}
                      title={
                        sinGira
                          ? "Asigná una gira a la instancia para vincular una obra"
                          : "Vincular obra de repertorio"
                      }
                      onClick={() => setPicking(participante)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      <IconSearch size={14} />
                      Vincular
                    </button>
                  )}
                </td>
                <td className="px-2 py-2">
                  {drive ? (
                    <a
                      href={drive}
                      target="_blank"
                      rel="noreferrer"
                      title="Abrir carpeta en Drive"
                      className="inline-flex rounded-full bg-blue-50 p-1 text-blue-600 hover:bg-blue-600 hover:text-white"
                    >
                      <IconDrive size={14} />
                    </a>
                  ) : null}
                </td>
                <td className="max-w-[16rem] px-2 py-2">
                  {organico ? (
                    <span className="font-mono text-[11px] text-slate-600">{organico}</span>
                  ) : null}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      disabled={busy || index === 0}
                      title="Subir"
                      onClick={() =>
                        run(() =>
                          reorderParticipante(
                            supabase,
                            participantes,
                            participante.id,
                            -1,
                            instancia.id_gira,
                          ),
                        )
                      }
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <IconChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === participantes.length - 1}
                      title="Bajar"
                      onClick={() =>
                        run(() =>
                          reorderParticipante(
                            supabase,
                            participantes,
                            participante.id,
                            1,
                            instancia.id_gira,
                          ),
                        )
                      }
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <IconChevronDown size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      title="Editar integrantes"
                      onClick={() => onEdit(participante)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                    >
                      <IconEdit size={16} />
                    </button>
                    {otras.length > 0 ? (
                      <div className="relative" data-concerto-move="">
                        <button
                          type="button"
                          disabled={busy}
                          title="Mover a otra instancia"
                          onClick={() =>
                            setMoveFor((current) =>
                              String(current) === String(participante.id) ? null : participante.id,
                            )
                          }
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                        >
                          <IconExchange size={16} />
                        </button>
                        {String(moveFor) === String(participante.id) ? (
                          <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                            {otras.map((otra) => (
                              <button
                                key={otra.id}
                                type="button"
                                className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => {
                                  setMoveFor(null);
                                  run(() =>
                                    moveParticipante(supabase, {
                                      participante,
                                      origenGiraId: instancia.id_gira,
                                      destino: otra,
                                      orden: nextOrden(otra.participantes || []),
                                    }),
                                  );
                                }}
                              >
                                {otra.titulo || `Instancia ${otra.id}`}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      title="Quitar"
                      onClick={() => onRemove(participante)}
                      className="rounded p-1 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {busy ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          <IconLoader size={12} className="animate-spin" />
          Guardando…
        </p>
      ) : null}
      {picking ? (
        <RepertoireWorkPickerModal
          supabase={supabase}
          programId={instancia.id_gira}
          applyGiraInstrumentationDefaults={false}
          mode="select"
          title="Obra de repertorio"
          showCreateRequest={false}
          onClose={() => setPicking(null)}
          onSelectWork={(workId) => vincular(picking, workId)}
        />
      ) : null}
    </div>
  );
}
