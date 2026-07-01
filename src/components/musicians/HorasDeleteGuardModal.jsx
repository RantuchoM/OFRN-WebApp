import React from "react";
import ConfirmModal from "../ui/ConfirmModal";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function buildHorasDeleteGuardMessage({ musicianName, origen, bajaMes, bajaAnio }) {
  const mesNombre = MESES[Math.max(0, Math.min(11, Number(bajaMes) - 1))] || String(bajaMes);
  const vigencia = `${mesNombre} de ${bajaAnio}`;

  return `Si querés <strong>dar de baja</strong> las horas de <strong>${musicianName}</strong>, <strong>no elimines</strong> registros del historial: ese dato se pierde y no se recupera desde la app.

En su lugar, cargá una <strong>novedad</strong> con <strong>0 horas</strong> en todos los conceptos, vigente desde <strong>${vigencia}</strong> (origen <strong>${origen}</strong>).

Si el músico tiene horas en <strong>CULTURA</strong> y <strong>EDUCACIÓN</strong>, puede hacer falta una novedad en 0 por cada origen.

Solo eliminá un registro si fue un error de carga y nunca debió existir.`;
}

export default function HorasDeleteGuardModal({
  isOpen,
  onClose,
  onConfirmDelete,
  onCargarBajaNovedad,
  musicianName,
  origen,
  bajaMes,
  bajaAnio,
  deleteLoading = false,
  deleteError = null,
}) {
  if (!isOpen) return null;

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirmDelete}
      title="No eliminar el historial de horas"
      message={buildHorasDeleteGuardMessage({ musicianName, origen, bajaMes, bajaAnio })}
      messageIsHtml
      errorMessage={deleteError}
      cancelText="Volver"
      confirmText="Eliminar igualmente (irreversible)"
      confirmLoading={deleteLoading}
      loadingText="Eliminando…"
      confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-all active:scale-[0.98] disabled:opacity-60"
      overlayClassName="z-[100]"
      secondaryAction={{
        label: "Cargar novedad de baja (0 hs)",
        onClick: () => {
          onCargarBajaNovedad?.();
          onClose();
        },
        disabled: deleteLoading,
        className:
          "w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md transition-all active:scale-[0.98] disabled:opacity-50",
      }}
    />
  );
}
