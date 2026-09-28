import React, { useEffect, useState } from "react";
import RepertoireWorkPickerModal from "../../components/repertoire/RepertoireWorkPickerModal";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconDrive,
  IconEdit,
  IconExchange,
  IconSearch,
  IconTrash,
  IconX,
} from "../../components/ui/Icons";
import { calculateInstrumentation } from "../../utils/instrumentation";
import {
  formatParticipanteNombres,
  linkParticipanteObra,
  moveParticipante,
  moverEnLista,
  nextOrden,
  plainWorkTitle,
  queueConcertoMutation,
  queueParticipanteReorder,
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
  editing = false,
  observaciones = {},
  onObservacion,
  onEdit,
  onRemove,
  onReorder,
  onMove,
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

  const reordenar = (participanteId, direction) => {
    const next = moverEnLista(participantes, participanteId, direction);
    if (!next) return;
    onReorder?.(next);
    queueParticipanteReorder(supabase, instancia.id_gira, next, instancia.id);
  };

  const vincular = (participante, workId, work) => {
    setPicking(null);
    if (!workId) return;
    const obra = work || { id: workId, titulo: "" };
    onReorder?.(
      participantes.map((item) =>
        String(item.id) === String(participante.id)
          ? {
              ...item,
              repertorio_obra: {
                id: item.id_repertorio_obra,
                id_obra: obra.id ?? workId,
                obras: obra,
              },
            }
          : item,
      ),
    );
    queueConcertoMutation(supabase, [instancia.id_gira], () =>
      linkParticipanteObra(supabase, {
        participante,
        idGira: instancia.id_gira,
        idObra: workId,
        reportDrive: true,
      }),
    );
  };

  const desvincular = (participante) => {
    onReorder?.(
      participantes.map((item) =>
        String(item.id) === String(participante.id)
          ? { ...item, id_repertorio_obra: null, repertorio_obra: null }
          : item,
      ),
    );
    queueConcertoMutation(supabase, [instancia.id_gira], () =>
      unlinkParticipanteObra(supabase, {
        participante,
        idGira: instancia.id_gira,
        reportDrive: true,
      }),
    );
  };

  const moverA = (participante, destino) => {
    setMoveFor(null);
    const orden = nextOrden(destino.participantes || []);
    const moving = { ...participante, id_instancia: destino.id, orden };
    if (destino.id_gira == null) {
      moving.id_repertorio_obra = null;
      moving.repertorio_obra = null;
    }
    const sourceNext = participantes.filter((item) => String(item.id) !== String(participante.id));
    const destNext = [...(destino.participantes || []), moving];
    onMove?.(instancia.id, sourceNext, destino.id, destNext);
    const same = String(instancia.id_gira ?? "") === String(destino.id_gira ?? "");
    if (same) {
      queueParticipanteReorder(supabase, instancia.id_gira, sourceNext, instancia.id);
      queueParticipanteReorder(supabase, destino.id_gira, destNext, destino.id);
    } else {
      queueParticipanteReorder(supabase, instancia.id_gira, sourceNext, instancia.id);
    }
    queueConcertoMutation(supabase, [instancia.id_gira, destino.id_gira], async () => {
      const result = await moveParticipante(supabase, {
        participante,
        origenGiraId: instancia.id_gira,
        destino,
        orden,
        reportDrive: true,
      });
      if (!result.error && !same && destino.id_gira != null) {
        queueParticipanteReorder(supabase, destino.id_gira, destNext, destino.id);
      }
      return result;
    });
  };

  return (
    <div className="max-w-full min-w-0 overflow-x-auto">
      <table className="w-full min-w-[880px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[22%]" />
          <col className="w-[22%]" />
          <col className="w-[8%]" />
          <col className="w-[18%]" />
          <col className="w-[12%]" />
        </colgroup>
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
                        title="Desvincular obra"
                        onClick={() => desvincular(participante)}
                        className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={sinGira}
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
                <td className="overflow-hidden px-2 py-2">
                  {organico ? (
                    <span className="block break-words font-mono text-[11px] text-slate-600">{organico}</span>
                  ) : null}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      title="Subir"
                      onClick={() => reordenar(participante.id, -1)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <IconChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={index === participantes.length - 1}
                      title="Bajar"
                      onClick={() => reordenar(participante.id, 1)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <IconChevronDown size={16} />
                    </button>
                    <button
                      type="button"
                      title="Editar integrantes"
                      onClick={() => onEdit(participante)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100"
                    >
                      <IconEdit size={16} />
                    </button>
                    {otras.length > 0 ? (
                      <div className="relative" data-concerto-move="">
                        <button
                          type="button"
                          title="Mover a otra instancia"
                          onClick={() =>
                            setMoveFor((current) =>
                              String(current) === String(participante.id) ? null : participante.id,
                            )
                          }
                          className="rounded p-1 text-slate-500 hover:bg-slate-100"
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
                                onClick={() => moverA(participante, otra)}
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
                      title="Quitar"
                      onClick={() => onRemove(participante)}
                      className="rounded p-1 text-rose-600 hover:bg-rose-50"
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
      {picking ? (
        <RepertoireWorkPickerModal
          supabase={supabase}
          programId={instancia.id_gira}
          applyGiraInstrumentationDefaults={false}
          mode="select"
          title="Obra de repertorio"
          showCreateRequest={false}
          onClose={() => setPicking(null)}
          onSelectWork={(workId, work) => vincular(picking, workId, work)}
        />
      ) : null}
    </div>
  );
}
