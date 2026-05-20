import React, { useEffect, useMemo, useState } from "react";
import { IconChevronDown, IconChevronUp, IconMap, IconX } from "../../../components/ui/Icons";
import {
  formatRecorridosSummary,
  parseLugarComisionStored,
  resolveLugarComisionDestaque,
  serializeRecorridos,
} from "../../../utils/destaquesLugarComisionRecorridos";

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
        {addableLocalities.length > 0 && (
          <select
            className="text-xs border border-slate-200 rounded px-2 py-1 max-w-[220px]"
            value=""
            onChange={(e) => {
              const id = Number(e.target.value);
              if (id && !orderedIds.includes(id)) onChange([...orderedIds, id]);
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
        )}
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

export default function DestaquesRecorridosModal({
  isOpen,
  onClose,
  storedValue,
  onSave,
  localities = [],
}) {
  const [recorrido1, setRecorrido1] = useState([]);
  const [recorrido2, setRecorrido2] = useState([]);
  const [useSecond, setUseSecond] = useState(false);

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

  useEffect(() => {
    if (!isOpen) return;
    const parsed = parseLugarComisionStored(storedValue);
    if (parsed.tipo === "recorridos" && parsed.recorridos.length > 0) {
      setRecorrido1(parsed.recorridos[0] || []);
      setRecorrido2(parsed.recorridos[1] || []);
      setUseSecond(parsed.recorridos.length > 1);
    } else {
      const allIds = localities.map((l) => l.id);
      setRecorrido1(allIds);
      setRecorrido2([]);
      setUseSecond(false);
    }
  }, [isOpen, storedValue, localities]);

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
    const serialized = serializeRecorridos(previewParsed.recorridos);
    return localities.map((loc) => ({
      ...loc,
      lugar: resolveLugarComisionDestaque(serialized, loc.id, nameById) || "—",
      enR1: recorrido1.includes(loc.id),
      enR2: useSecond && recorrido2.includes(loc.id),
    }));
  }, [previewParsed, localities, nameById, recorrido1, recorrido2, useSecond]);

  const summary = formatRecorridosSummary(previewParsed, nameById);

  const moveFromR1ToR2 = (index) => {
    const id = recorrido1[index];
    if (id == null) return;
    setRecorrido1(recorrido1.filter((_, i) => i !== index));
    if (!recorrido2.includes(id)) setRecorrido2([...recorrido2, id]);
  };

  const moveFromR2ToR1 = (index) => {
    const id = recorrido2[index];
    if (id == null) return;
    setRecorrido2(recorrido2.filter((_, i) => i !== index));
    if (!recorrido1.includes(id)) setRecorrido1([...recorrido1, id]);
  };

  const copyToR2 = (id) => {
    if (!recorrido2.includes(id)) setRecorrido2([...recorrido2, id]);
  };

  const copyToR1 = (id) => {
    if (!recorrido1.includes(id)) setRecorrido1([...recorrido1, id]);
  };

  const handleSave = () => {
    const recs = [recorrido1];
    if (useSecond && recorrido2.length > 0) recs.push(recorrido2);
    if (recs.every((r) => r.length === 0)) {
      alert("Agregá al menos una localidad a un recorrido.");
      return;
    }
    onSave(serializeRecorridos(recs));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200"
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
                Podés repetir una localidad en ambos recorridos (ej. ciudad final). Usá{" "}
                <strong>→ R2</strong> para mover y <strong>+ R2</strong> para duplicar.
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
          {localities.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              No hay localidades en el panel de destaques. Agregá músicos con localidad asignada primero.
            </p>
          ) : (
            <>
              <RecorridoEditor
                title="Recorrido 1"
                routeIndex={1}
                orderedIds={recorrido1}
                onChange={setRecorrido1}
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
                  onChange={(e) => setUseSecond(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                Usar segundo recorrido
              </label>

              {useSecond && (
                <RecorridoEditor
                  title="Recorrido 2"
                  routeIndex={2}
                  orderedIds={recorrido2}
                  onChange={setRecorrido2}
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
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1.5 font-bold">Localidad</th>
                        <th className="text-left px-2 py-1.5 font-bold">En</th>
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
    </div>
  );
}
