import React, { useEffect, useState } from "react";
import RepertoireWorkPickerModal, {
  RichTextPreview,
} from "../../components/repertoire/RepertoireWorkPickerModal";
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
  formatObraCompositores,
  formatParticipanteInstrumentos,
  formatParticipanteNombres,
  linkParticipanteObra,
  moveParticipante,
  moverEnLista,
  nextOrden,
  queueConcertoMutation,
  queueParticipanteReorder,
  tituloCortoObra,
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

function ObraBloque({ obra, compositor, sinGira, onUnlink, onPick }) {
  if (!obra) {
    return (
      <button
        type="button"
        disabled={sinGira}
        title={
          sinGira
            ? "Asigná una gira a la instancia para vincular una obra"
            : "Vincular obra de repertorio"
        }
        onClick={onPick}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
      >
        <IconSearch size={14} />
        Vincular
      </button>
    );
  }
  return (
    <div className="flex min-w-0 items-start gap-1">
      <div className="min-w-0 text-slate-800">
        {compositor ? (
          <span className="block text-[11px] font-semibold text-slate-600">{compositor}</span>
        ) : null}
        {obra.titulo ? (
          <RichTextPreview content={obra.titulo} className="[&_div]:my-0 [&_p]:my-0" />
        ) : (
          "Obra vinculada"
        )}
      </div>
      <button
        type="button"
        title="Desvincular obra"
        onClick={onUnlink}
        className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <IconX size={14} />
      </button>
    </div>
  );
}

function ParticipanteAcciones({
  participante,
  index,
  total,
  otras,
  moveFor,
  setMoveFor,
  onReorder,
  onEdit,
  onRemove,
  onMove,
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-0.5">
      <button
        type="button"
        disabled={index === 0}
        title="Subir"
        onClick={() => onReorder(participante.id, -1)}
        className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
      >
        <IconChevronUp size={16} />
      </button>
      <button
        type="button"
        disabled={index === total - 1}
        title="Bajar"
        onClick={() => onReorder(participante.id, 1)}
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
            <div className="absolute right-0 z-20 mt-1 w-56 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {otras.map((otra) => (
                <button
                  key={otra.id}
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => onMove(participante, otra)}
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
  );
}

function DriveLink({ href }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title="Abrir carpeta en Drive"
      className="inline-flex rounded-full bg-blue-50 p-1 text-blue-600 hover:bg-blue-600 hover:text-white"
    >
      <IconDrive size={14} />
    </a>
  );
}

function valorFragmento(draft, participante, campo) {
  if (draft && Object.prototype.hasOwnProperty.call(draft, campo)) return draft[campo];
  if (campo === "solista") return participante?.fragmento_solista || "";
  return participante?.fragmento_orquesta || "";
}

export function FragmentosCampos({
  participante,
  editing = false,
  value,
  onChange,
  compact = false,
}) {
  const solista = valorFragmento(value, participante, "solista");
  const orquesta = valorFragmento(value, participante, "orquesta");
  const width = compact ? "min-w-0" : "min-w-[12rem]";
  const inputClass = `mt-0.5 w-full ${width} rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500`;
  return (
    <div className="space-y-1.5">
      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Audición con orquesta</span>
        {editing ? (
          <input
            value={orquesta}
            onChange={(event) => onChange?.("orquesta", event.target.value)}
            className={inputClass}
            aria-label={`Audición con orquesta de ${nombresDe(participante)}`}
          />
        ) : (
          <p className={`${width} break-words text-sm text-slate-700`}>{String(orquesta || "").trim() || "—"}</p>
        )}
      </label>
      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Audición sin orquesta</span>
        {editing ? (
          <input
            value={solista}
            onChange={(event) => onChange?.("solista", event.target.value)}
            className={inputClass}
            aria-label={`Audición sin orquesta de ${nombresDe(participante)}`}
          />
        ) : (
          <p className={`${width} break-words text-sm text-slate-700`}>{String(solista || "").trim() || "—"}</p>
        )}
      </label>
    </div>
  );
}

function ParticipanteCard({
  participante,
  obra,
  compositor,
  organico,
  drive,
  index,
  total,
  sinGira,
  editing,
  fragmentos,
  onFragmento,
  otras,
  moveFor,
  setMoveFor,
  onReorder,
  onEdit,
  onRemove,
  onMove,
  onUnlink,
  onPick,
}) {
  const [open, setOpen] = useState(false);
  const nombre = nombresDe(participante);
  const instrumentos = formatParticipanteInstrumentos(participante.integrantes);
  const tituloLinea = tituloCortoObra(obra?.titulo);
  return (
    <li className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Detalle de ${nombre}`}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-w-0 items-start gap-2 px-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words font-medium text-slate-800">{nombre}</span>
          {instrumentos ? (
            <span className="mt-0.5 block break-words text-xs text-slate-500">{instrumentos}</span>
          ) : null}
          {compositor ? (
            <span className="mt-0.5 block break-words text-[11px] font-semibold text-slate-600">
              {compositor}
            </span>
          ) : null}
          {tituloLinea ? (
            <span className="mt-0.5 block break-words text-sm text-slate-600">{tituloLinea}</span>
          ) : (
            <span className="mt-0.5 block break-words text-sm text-slate-600">—</span>
          )}
        </span>
        {open ? (
          <IconChevronUp size={16} className="mt-0.5 shrink-0 text-slate-400" />
        ) : (
          <IconChevronDown size={16} className="mt-0.5 shrink-0 text-slate-400" />
        )}
      </button>
      {open ? (
        <div className="space-y-3 border-t border-slate-100 px-3 py-3">
          {!participante.integrantes?.length ? (
            <p className="flex items-center gap-1 text-xs text-amber-700">
              <IconAlertTriangle size={14} />
              Sin integrantes asignados.
            </p>
          ) : null}
          <FragmentosCampos
            participante={participante}
            editing={editing}
            value={fragmentos}
            onChange={onFragmento}
            compact
          />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Obra</p>
            <div className="mt-1">
              <ObraBloque
                obra={obra}
                compositor={compositor}
                sinGira={sinGira}
                onUnlink={onUnlink}
                onPick={onPick}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Drive</p>
              <div className="mt-1">{drive ? <DriveLink href={drive} /> : <span className="text-sm text-slate-400">—</span>}</div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Orgánico</p>
              <p className="mt-1 break-words font-mono text-[11px] text-slate-600">{organico || "—"}</p>
            </div>
          </div>
          <ParticipanteAcciones
            participante={participante}
            index={index}
            total={total}
            otras={otras}
            moveFor={moveFor}
            setMoveFor={setMoveFor}
            onReorder={onReorder}
            onEdit={onEdit}
            onRemove={onRemove}
            onMove={onMove}
          />
        </div>
      ) : null}
    </li>
  );
}

export default function ConcertoParticipantesTable({
  supabase,
  instancia,
  otras,
  editing = false,
  fragmentos = {},
  onFragmento,
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
    <div className="max-w-full min-w-0">
      <div className="hidden max-w-full min-w-0 overflow-x-auto md:block">
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
            <th className="px-2 py-2">
              <span className="block">Audición con orquesta</span>
              <span className="block">Audición sin orquesta</span>
            </th>
            <th className="px-2 py-2">Obra de repertorio</th>
            <th className="px-2 py-2">Drive</th>
            <th className="px-2 py-2">Orgánico</th>
            <th className="px-2 py-2 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {participantes.map((participante, index) => {
            const obra = participante.repertorio_obra?.obras || null;
            const compositor = formatObraCompositores(obra);
            const instrumentos = formatParticipanteInstrumentos(participante.integrantes);
            const organico = organicoDe(obra);
            const drive = obra?.link_drive || "";
            return (
              <tr key={participante.id} className="border-b border-slate-100 align-top">
                <td className="px-2 py-2">
                  <p className="font-medium text-slate-800">{nombresDe(participante)}</p>
                  {instrumentos ? (
                    <p className="mt-0.5 text-xs text-slate-500">{instrumentos}</p>
                  ) : null}
                  {!participante.integrantes?.length ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                      <IconAlertTriangle size={14} />
                      Sin integrantes asignados.
                    </p>
                  ) : null}
                </td>
                <td className="px-2 py-2">
                  <FragmentosCampos
                    participante={participante}
                    editing={editing}
                    value={fragmentos[String(participante.id)]}
                    onChange={(campo, value) => onFragmento?.(participante.id, campo, value)}
                  />
                </td>
                <td className="px-2 py-2">
                  <ObraBloque
                    obra={obra}
                    compositor={compositor}
                    sinGira={sinGira}
                    onUnlink={() => desvincular(participante)}
                    onPick={() => setPicking(participante)}
                  />
                </td>
                <td className="px-2 py-2">
                  <DriveLink href={drive} />
                </td>
                <td className="overflow-hidden px-2 py-2">
                  {organico ? (
                    <span className="block break-words font-mono text-[11px] text-slate-600">{organico}</span>
                  ) : null}
                </td>
                <td className="px-2 py-2">
                  <ParticipanteAcciones
                    participante={participante}
                    index={index}
                    total={participantes.length}
                    otras={otras}
                    moveFor={moveFor}
                    setMoveFor={setMoveFor}
                    onReorder={reordenar}
                    onEdit={onEdit}
                    onRemove={onRemove}
                    onMove={moverA}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {participantes.map((participante, index) => {
          const obra = participante.repertorio_obra?.obras || null;
          const compositor = formatObraCompositores(obra);
          const organico = organicoDe(obra);
          const drive = obra?.link_drive || "";
          return (
            <ParticipanteCard
              key={participante.id}
              participante={participante}
              obra={obra}
              compositor={compositor}
              organico={organico}
              drive={drive}
              index={index}
              total={participantes.length}
              sinGira={sinGira}
              editing={editing}
              fragmentos={fragmentos[String(participante.id)]}
              onFragmento={(campo, value) => onFragmento?.(participante.id, campo, value)}
              otras={otras}
              moveFor={moveFor}
              setMoveFor={setMoveFor}
              onReorder={reordenar}
              onEdit={onEdit}
              onRemove={onRemove}
              onMove={moverA}
              onUnlink={() => desvincular(participante)}
              onPick={() => setPicking(participante)}
            />
          );
        })}
      </ul>
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
