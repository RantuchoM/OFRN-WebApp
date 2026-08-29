/** True when focus is in a field that should keep native shortcuts (Ctrl+Z in inputs, etc.). */
export function isEditableKeyboardTarget(target) {
  if (!target || typeof target !== "object") return false;
  const el =
    typeof Element !== "undefined" && target instanceof Element
      ? target
      : null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return !!el.closest?.('[contenteditable="true"]');
}
