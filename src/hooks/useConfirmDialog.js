import React, { useCallback, useRef, useState } from "react";
import ConfirmDialog from "../components/ui/ConfirmDialog";

const DESTRUCTIVE_CLASS =
  "px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98]";

/**
 * Confirmaciones async con ConfirmDialog (reemplazo de window.confirm / alert).
 *
 * Con `secondaryAction` y/o `tertiaryAction` (o `choice: true`), resuelve
 * `"confirm" | "cancel" | secondaryAction.value | tertiaryAction.value`.
 * Sin acciones extra: boolean `true` / `false`.
 *
 * @example
 * const { confirm, alert, dialog } = useConfirmDialog();
 * if (!(await confirm({ title: "Eliminar", message: "¿Seguro?", destructive: true }))) return;
 * await alert({ title: "Aviso", message: "No hay datos." });
 * const choice = await confirm({
 *   title: "Cambios sin guardar",
 *   confirmText: "Guardar",
 *   secondaryAction: { label: "Descartar", value: "discard" },
 *   tertiaryAction: { label: "Otra opción", value: "other" },
 * });
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

  const open = useCallback((options = {}) => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }

    const secondary = options.secondaryAction || null;
    const tertiary = options.tertiaryAction || null;
    const choiceMode =
      Boolean(secondary) || Boolean(tertiary) || options.choice === true;

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        title: options.title ?? "Confirmar",
        message: options.message ?? "",
        confirmText: options.confirmText ?? "Confirmar",
        cancelText: options.cancelText ?? "Cancelar",
        hideCancel: !!options.hideCancel,
        confirmClassName: options.destructive
          ? DESTRUCTIVE_CLASS
          : options.confirmClassName,
        messageIsHtml: !!options.messageIsHtml,
        overlayClassName: options.overlayClassName,
        choiceMode,
        secondaryAction: secondary
          ? {
              label: secondary.label ?? "Secundario",
              className: secondary.className,
              value: secondary.value ?? "secondary",
            }
          : null,
        tertiaryAction: tertiary
          ? {
              label: tertiary.label ?? "Terciario",
              className: tertiary.className,
              value: tertiary.value ?? "tertiary",
            }
          : null,
      });
    });
  }, []);

  const confirm = useCallback((messageOrOptions) => {
    const options =
      typeof messageOrOptions === "string"
        ? { message: messageOrOptions }
        : messageOrOptions || {};
    return open(options);
  }, [open]);

  /** Aviso de un botón (reemplazo de window.alert). Siempre resuelve true al aceptar. */
  const alert = useCallback((messageOrOptions) => {
    const options =
      typeof messageOrOptions === "string"
        ? { message: messageOrOptions }
        : messageOrOptions || {};
    return open({
      title: options.title ?? "Aviso",
      message: options.message ?? "",
      confirmText: options.confirmText ?? "Entendido",
      hideCancel: true,
      confirmClassName: options.confirmClassName,
      messageIsHtml: options.messageIsHtml,
      overlayClassName: options.overlayClassName,
    });
  }, [open]);

  const dialog = React.createElement(ConfirmDialog, {
    isOpen: !!state,
    title: state?.title,
    message: state?.message ?? "",
    messageIsHtml: state?.messageIsHtml,
    confirmText: state?.confirmText,
    cancelText: state?.cancelText,
    hideCancel: state?.hideCancel,
    confirmClassName: state?.confirmClassName,
    overlayClassName: state?.overlayClassName,
    secondaryAction: state?.secondaryAction
      ? {
          label: state.secondaryAction.label,
          className: state.secondaryAction.className,
          onClick: () => settle(state.secondaryAction.value),
        }
      : null,
    tertiaryAction: state?.tertiaryAction
      ? {
          label: state.tertiaryAction.label,
          className: state.tertiaryAction.className,
          onClick: () => settle(state.tertiaryAction.value),
        }
      : null,
    onClose: () => settle(state?.choiceMode ? "cancel" : false),
    onConfirm: () => settle(state?.choiceMode ? "confirm" : true),
  });

  return { confirm, alert, dialog };
}

export default useConfirmDialog;
