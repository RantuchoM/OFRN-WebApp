import React from "react";
import ConfirmModal from "./ConfirmModal";

/** Alias de {@link ConfirmModal} para confirmaciones destructivas o de salida. */
export default function ConfirmDialog(props) {
  return <ConfirmModal {...props} />;
}
