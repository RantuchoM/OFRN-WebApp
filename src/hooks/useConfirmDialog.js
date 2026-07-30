import React, { useCallback, useRef, useState } from "react";
import ConfirmDialog from "../components/ui/ConfirmDialog";

const DESTRUCTIVE_CLASS =
  "px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98]";

/**
 * Confirmaciones async con ConfirmDialog (reemplazo de window.confirm).
 *
 * @example
 * const { confirm, dialog } = useConfirmDialog();
 * if (!(await confirm({ title: "Eliminar", message: "¿Seguro?", destructive: true }))) return;
 * // ...
 * return <>{dialog}...</>;
 */
export function useConfirmDialog() {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const settle = useCallback((result) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setState(null);
    resolve?.(result);
  }, []);

  const confirm = useCallback((messageOrOptions) => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }

    const options =
      typeof messageOrOptions === "string"
        ? { message: messageOrOptions }
        : messageOrOptions || {};

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        title: options.title ?? "Confirmar",
        message: options.message ?? "",
        confirmText: options.confirmText ?? "Confirmar",
        cancelText: options.cancelText ?? "Cancelar",
        confirmClassName: options.destructive
          ? DESTRUCTIVE_CLASS
          : options.confirmClassName,
        messageIsHtml: !!options.messageIsHtml,
        overlayClassName: options.overlayClassName,
      });
    });
  }, []);

  const dialog = React.createElement(ConfirmDialog, {
    isOpen: !!state,
    title: state?.title,
    message: state?.message ?? "",
    messageIsHtml: state?.messageIsHtml,
    confirmText: state?.confirmText,
    cancelText: state?.cancelText,
    confirmClassName: state?.confirmClassName,
    overlayClassName: state?.overlayClassName,
    onClose: () => settle(false),
    onConfirm: () => settle(true),
  });

  return { confirm, dialog };
}

export default useConfirmDialog;
