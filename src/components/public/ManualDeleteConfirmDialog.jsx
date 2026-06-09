import React from "react";
import ConfirmDialog from "../ui/ConfirmDialog";

export default function ManualDeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Eliminar",
  confirmLoading = false,
}) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={message}
      confirmText={confirmText}
      confirmLoading={confirmLoading}
      loadingText="Eliminando…"
      confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md transition-all active:scale-[0.98]"
    />
  );
}
