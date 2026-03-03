import React from "react";
import {
  IconPhone,
  IconMail,
  IconPencil,
  IconTrash,
  IconExchange,
  IconUserMinus,
  IconLink,
  IconX,
} from "../ui/Icons";
import WhatsAppLink from "../ui/WhatsAppLink";

/**
 * Una fila de la tabla del roster de gira.
 * Baja (ausente/desconvocar) pasa por ventana 5s con Deshacer; no reordena hasta efectivizar.
 */
export default function RosterTableRow({
  musician: m,
  index: idx,
  isSelected,
  rowClassName,
  rowStyle,
  visibleColumns,
  isEditor,
  rolesList,
  defaultRolId,
  onToggleSelection,
  onChangeRole,
  onEdit,
  onSwap,
  onDeleteVacancy,
  onToggleStatus,
  onRequestBaja,
  onCancelBaja,
  pendingBajaForRow,
  onCopyLink,
}) {
  return (
    <tr
      id={`row-integrante-${m.id}`}
      className={`${rowClassName || ""} border-b border-slate-100`}
      style={rowStyle}
    >
      {/* CHECKBOX */}
      <td className="py-1.5 px-3 text-center border-r border-slate-100/50">
        <div>
          <span className="text-[10px] text-slate-400 font-mono w-5 text-right inline-block">
            {idx + 1}
          </span>{" "}
          <input
            type="checkbox"
            className="rounded border-slate-300 text-fixed-indigo-600 focus:ring-fixed-indigo-500 cursor-pointer"
            checked={isSelected}
            onChange={() => onToggleSelection(m.id)}
          />
        </div>
      </td>

      {/* ROL / INSTR */}
      <td className="py-1.5 px-2 pl-3 border-r border-slate-100/50 w-20 max-w-[5rem] sm:w-28 sm:max-w-[7rem]">
        {isEditor && !m.es_simulacion ? (
          <select
            className="text-[11px] font-bold uppercase border-none bg-transparent outline-none cursor-pointer w-full -ml-1 text-slate-700 truncate"
            value={m.rol_gira || defaultRolId}
            onChange={(e) => onChangeRole(m, e.target.value)}
          >
            {rolesList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-[11px] font-bold uppercase text-slate-600 block truncate">
            {m.rol_gira || defaultRolId}
          </span>
        )}
        <span className="text-[10px] text-slate-400 block font-medium mt-0.5 truncate">
          {m.instrumentos?.instrumento || "-"}
        </span>
      </td>

      {/* APELLIDO, NOMBRE + NOTA INTERNA */}
      <td className="py-1.5 px-3 border-r border-slate-100/50 font-bold text-slate-700 w-56 max-w-[16rem]">
        <div className="flex flex-col gap-1.5 truncate">
          <div className="flex items-center gap-2 truncate">
            {m.apellido}, {m.nombre}
            {m.es_simulacion && (
              <span className="bg-amber-100 text-amber-700 text-[9px] px-1 rounded border border-amber-200 font-black tracking-wider">
                VACANTE
              </span>
            )}
          </div>
          {m.nota_interna && (
            <div className="group relative w-fit">
              <div className="bg-yellow-100 border border-yellow-200 text-yellow-800 text-[10px] px-2 py-0.5 rounded-sm shadow-sm flex items-center gap-1 cursor-help transform -rotate-1 hover:rotate-0 transition-transform origin-left max-w-[160px]">
                <span className="text-[9px]">📝</span>
                <span className="truncate font-normal">{m.nota_interna}</span>
              </div>
              <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-56 bg-yellow-50 border border-yellow-200 shadow-xl p-2 rounded text-xs font-normal text-slate-700 z-[60] whitespace-normal animate-in fade-in zoom-in-95">
                {m.nota_interna}
              </div>
            </div>
          )}
        </div>
      </td>

      {/* GÉNERO */}
      {visibleColumns.genero && (
        <td className="py-1.5 px-3 text-xs text-slate-600 text-center border-r border-slate-100/50">
          {m.genero || "-"}
        </td>
      )}

      {/* ENSAMBLES */}
      {visibleColumns.ensambles && (
        <td className="hidden md:table-cell py-1.5 px-3 border-r border-slate-100/50 max-w-[180px]">
          <div className="flex flex-wrap gap-1">
            {m.integrantes_ensambles && m.integrantes_ensambles.length > 0 ? (
              m.integrantes_ensambles.map((ie) => (
                <span
                  key={ie.ensambles?.id || Math.random()}
                  className="text-[9px] bg-white/50 border border-slate-300 px-1 rounded text-slate-500 truncate max-w-[80px]"
                >
                  {ie.ensambles?.ensamble}
                </span>
              ))
            ) : (
              <span className="text-slate-300 text-[10px]">-</span>
            )}
          </div>
        </td>
      )}

      {/* UBICACIÓN */}
      {visibleColumns.localidad && (
        <td className="hidden md:table-cell py-1.5 px-3 text-xs text-slate-600 border-r border-slate-100/50">
          {m.localidades ? (
            <div>
              <span className="font-semibold block">
                {m.localidades.localidad}
              </span>
              <span className="text-[9px] text-slate-400 block">
                {m.localidades.regiones?.region}
              </span>
            </div>
          ) : (
            <span className="text-slate-300">-</span>
          )}
        </td>
      )}

      {/* CONTACTO (sólo escritorio) */}
      <td className="hidden md:table-cell py-1.5 px-3 border-r border-slate-100/50 text-xs">
        <div className="flex flex-col gap-1">
          {m.telefono && (
            <div className="flex items-center gap-1 text-slate-600">
              <IconPhone size={10} className="text-slate-400" />
              <span>{m.telefono}</span>
              <WhatsAppLink phone={m.telefono} iconSize={14} />
            </div>
          )}
          {m.mail && (
            <div
              className="flex items-center gap-1 max-w-[180px] truncate"
              title={m.mail}
            >
              <IconMail size={10} className="text-slate-400 shrink-0" />
              <span className="text-slate-500 truncate">{m.mail}</span>
            </div>
          )}
        </div>
      </td>

      {/* ALIMENTACIÓN */}
      {visibleColumns.alimentacion && (
        <td className="hidden md:table-cell py-1.5 px-3 text-xs text-slate-600 truncate max-w-[100px] border-r border-slate-100/50">
          {m.alimentacion || "-"}
        </td>
      )}

      {/* ESTADO: P con X/tachito (ausente/desconvocar) → 5s con A + Deshacer; luego efectiviza y reordena */}
      <td className="py-1.5 px-3 text-center border-r border-slate-100/50">
        <div className="flex items-center justify-center">
          {m.es_simulacion ? (
            <span className="text-[9px] text-slate-400">—</span>
          ) : pendingBajaForRow ? (
            <div className="relative w-10 h-10 rounded flex items-center justify-center bg-white border-2 border-red-200 text-red-600 mx-auto">
              <span className="text-[11px] font-bold relative z-10">A</span>
              {/* Círculo que se consume (countdown circular) */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="rgb(254 226 226)"
                  strokeWidth="2.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="rgb(239 68 68)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={88}
                  strokeDashoffset={88 - (pendingBajaForRow.countdown / 5) * 88}
                  className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute -top-4 -right-1 z-10">
                <button
                  type="button"
                  onClick={() => onCancelBaja()}
                  className="text-[8px] font-black bg-amber-400 hover:bg-amber-500 text-amber-900 px-1.5 py-0.5 rounded shadow leading-tight animate-titilar"
                >
                  Deshacer
                </button>
              </div>
            </div>
          ) : m.estado_gira === "ausente" ? (
            <button
              type="button"
              onClick={() => isEditor && onToggleStatus(m)}
              disabled={!isEditor}
              className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold bg-white text-red-600 border border-red-200 hover:bg-red-50 shadow-sm mx-auto transition-all"
              title="Marcar presente"
            >
              A
            </button>
          ) : (
            <div className="relative w-8 h-8 mx-auto">
              <div
                className="w-full h-full rounded flex items-center justify-center text-[10px] font-bold bg-emerald-500 text-white border border-emerald-600 shadow-sm"
                title="Presente"
              >
                P
              </div>
              {isEditor && (
                <button
                  type="button"
                  onClick={() => onRequestBaja(m, m.es_adicional ? "desconvocar" : "ausente")}
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-white border border-slate-300 shadow flex items-center justify-center text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                  title={m.es_adicional ? "Desconvocar" : "Marcar ausente"}
                >
                  {m.es_adicional ? (
                    <IconTrash size={10} />
                  ) : (
                    <IconX size={10} />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </td>

      {/* ACCIONES: Mail, WhatsApp, Editar, Link acceso (grid 2x2) */}
      <td className="py-1.5 px-1 pr-2 text-right w-[88px]">
        <div className="mx-auto inline-grid grid-cols-2 gap-1 justify-items-center w-[76px]">
          {/* Mail */}
          <button
            type="button"
            disabled={!m.mail}
            onClick={() => {
              if (m.mail) window.location.href = `mailto:${m.mail}`;
            }}
            className={`w-7 h-7 flex items-center justify-center rounded ${
              m.mail
                ? "text-slate-500 hover:text-fixed-indigo-600 hover:bg-white"
                : "text-slate-300 cursor-default"
            } transition-colors`}
            title={m.mail || "Sin mail"}
          >
            <IconMail size={14} />
          </button>

          {/* WhatsApp */}
          <div className="w-7 h-7 flex items-center justify-center rounded hover:bg-white transition-colors">
            {m.telefono ? (
              <WhatsAppLink phone={m.telefono} iconSize={16} />
            ) : (
              <IconPhone size={14} className="text-slate-300" />
            )}
          </div>

          {/* Editar */}
          <button
            type="button"
            onClick={() => onEdit(m)}
            className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-fixed-indigo-600 hover:bg-white transition-colors"
            title="Editar"
          >
            <IconPencil size={14} />
          </button>

          {/* Link de acceso */}
          <button
            type="button"
            onClick={() => onCopyLink(m)}
            className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-fixed-indigo-600 hover:bg-white transition-colors"
            title="Copiar link de acceso"
          >
            <IconLink size={14} />
          </button>

          {/* Vacantes: botón ASIGNAR y borrar siguen disponibles justo debajo en escritorio */}
          {m.es_simulacion && (
            <div className="col-span-2 hidden md:flex justify-end items-center gap-1 mt-1">
              <button
                type="button"
                onClick={() => onSwap(m)}
                className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1"
                title="Asignar titular"
              >
                <IconExchange size={10} /> ASIGNAR
              </button>
              <button
                type="button"
                onClick={() => onDeleteVacancy(m)}
                className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Eliminar Vacante"
              >
                <IconTrash size={14} />
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
