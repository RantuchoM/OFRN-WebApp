import React from "react";

/**
 * Fila de encabezado de grupo en el roster (contenedor de cuerdas o instrumento).
 * Primera celda: checkbox de selección del grupo; resto: etiqueta.
 */
export default function RosterGroupSeparatorRow({
  colSpan,
  label,
  type,
  checked = false,
  indeterminate = false,
  disabled = false,
  onToggle,
}) {
  const isContainer = type === "container";
  const checkboxRef = React.useRef(null);

  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const rowToneClass = isContainer
    ? "bg-slate-100 border-t-2 border-b border-slate-200"
    : "bg-slate-100/80 border-t border-slate-200";

  return (
    <tr className="select-none">
      <td
        className={`py-1 px-0.5 md:px-3 w-[10%] md:w-10 text-center border-r border-slate-200/60 align-middle ${rowToneClass}`}
      >
        <input
          ref={checkboxRef}
          type="checkbox"
          className="rounded border-slate-300 text-fixed-indigo-600 focus:ring-fixed-indigo-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          checked={checked}
          disabled={disabled}
          onChange={() => onToggle?.()}
          aria-label={`Seleccionar ${label}`}
        />
      </td>
      <td colSpan={Math.max(1, colSpan - 1)} className="p-0 border-0 align-middle">
        <div
          className={`flex items-center px-2 md:px-4 ${
            isContainer ? "py-1.5" : "py-1"
          } ${rowToneClass}`}
        >
          <span
            className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wide truncate ${
              isContainer ? "text-slate-700" : "text-slate-600"
            }`}
          >
            {label}
          </span>
        </div>
      </td>
    </tr>
  );
}
