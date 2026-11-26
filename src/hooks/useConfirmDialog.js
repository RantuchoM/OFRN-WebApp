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
 * Con `checkbox`: resuelve `{ confirmed: boolean, checked: boolean }`.
 *
 * @example
 * const { confirm, alert, dialog } = useConfirmDialog();
 * if (!(await confirm({ title: "Eliminar", message: "¿Seguro?", destructive: true }))) return;
 * const result = await confirm({
 *   title: "Cancelar gira",
 *   checkbox: { label: "Notificar…", defaultChecked: true },
 * });
 * if (!result?.confirmed) return;
 */
export function useConfirmDialog() {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);
  const checkboxCheckedRef = useRef(false);

  const settledRef = useRef(false);

  const settle = useCallback((result) => {
    if (settledRef.current) return;
    settledRef.current = true;
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
    const checkbox = options.checkbox || null;
    const checkboxMode = Boolean(checkbox);
    const choiceMode =
      Boolean(secondary) || Boolean(tertiary) || options.choice === true;

    const defaultChecked = checkbox
      ? checkbox.disabled
        ? false
        : checkbox.defaultChecked !== false
      : false;
    checkboxCheckedRef.current = defaultChecked;

    settledRef.current = false;
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
        checkboxMode,
        checkbox: checkbox
          ? {
              label: checkbox.label ?? "",
              disabled: !!checkbox.disabled,
              hint: checkbox.hint || "",
              defaultChecked,
            }
          : null,
        checkboxChecked: defaultChecked,
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

  const setCheckboxChecked = useCallback((checked) => {
    checkboxCheckedRef.current = checked;
    setState((prev) =>
      prev ? { ...prev, checkboxChecked: checked } : prev,
    );
  }, []);

  const checkboxChildren =
    state?.checkbox &&
    React.createElement(
      "label",
      {
        className: `mt-3 flex items-start gap-2 rounded-lg border border-slate-200 p-2.5 ${
          state.checkbox.disabled
            ? "opacity-60 cursor-not-allowed"
            : "hover:bg-slate-50 cursor-pointer"
        }`,
      },
      React.createElement("input", {
        type: "checkbox",
        className:
          "mt-0.5 rounded text-indigo-600 accent-indigo-600 disabled:opacity-50",
        checked: !!state.checkboxChecked,
        disabled: state.checkbox.disabled,
        onChange: (e) => {
          if (!state.checkbox.disabled) {
            setCheckboxChecked(e.target.checked);
          }
        },
      }),
      React.createElement(
        "span",
        { className: "text-sm text-slate-700 leading-snug" },
        state.checkbox.label,
        state.checkbox.hint
          ? React.createElement(
              "span",
              { className: "block text-xs text-slate-400 mt-0.5" },
              state.checkbox.hint,
            )
          : null,
      ),
    );

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
    children: checkboxChildren || null,
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
    onClose: () => {
      if (state?.checkboxMode) {
        settle({ confirmed: false, checked: false });
        return;
      }
      settle(state?.choiceMode ? "cancel" : false);
    },
    onConfirm: () => {
      if (state?.checkboxMode) {
        settle({
          confirmed: true,
          checked: !!checkboxCheckedRef.current && !state?.checkbox?.disabled,
        });
        return;
      }
      settle(state?.choiceMode ? "confirm" : true);
    },
  });

  return { confirm, alert, dialog };
}

export default useConfirmDialog;
