import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  getPartDisplayName,
  splitPartNameForTruncation,
  stripPartExtension,
} from "../../utils/partNameDisplay";

function tooltipPosition(rect) {
  const showBelow = rect.top < 44;
  const left = Math.min(
    Math.max(rect.left + rect.width / 2, 12),
    window.innerWidth - 12,
  );
  return {
    top: showBelow ? rect.bottom + 6 : rect.top - 6,
    left,
    showBelow,
  };
}

export function PartNameTooltipPortal({ pos, text }) {
  if (!pos || !text || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed z-[110] px-2 py-1 max-w-[min(18rem,calc(100vw-1.5rem))] bg-slate-800 text-white text-[10px] font-medium leading-snug rounded-md shadow-lg border border-slate-700 pointer-events-none animate-in fade-in duration-150"
      style={{
        top: pos.top,
        left: pos.left,
        transform: pos.showBelow
          ? "translate(-50%, 0)"
          : "translate(-50%, -100%)",
      }}
      role="tooltip"
    >
      {text}
    </div>,
    document.body,
  );
}

export function usePartNameTooltip() {
  const [tooltip, setTooltip] = useState(null);

  const showTooltip = useCallback((el, text) => {
    const label = stripPartExtension(text);
    if (!el || !label) return;
    setTooltip({ ...tooltipPosition(el.getBoundingClientRect()), text: label });
  }, []);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  useEffect(() => {
    if (!tooltip) return;
    const hide = () => setTooltip(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [tooltip]);

  return {
    tooltip,
    showTooltip,
    hideTooltip,
    tooltipNode: <PartNameTooltipPortal pos={tooltip} text={tooltip?.text} />,
  };
}

/**
 * Nombre de particella que, si no entra, conserva el final (nº / tonalidad)
 * y muestra el nombre completo en tooltip al hover.
 */
export default function PartNameLabel({
  name,
  part,
  className = "",
  textClassName = "",
  showTooltip = true,
}) {
  const fullName = stripPartExtension(name || getPartDisplayName(part));
  const { head, tail } = splitPartNameForTruncation(fullName);
  const { showTooltip: show, hideTooltip, tooltipNode } = usePartNameTooltip();

  if (!fullName) return null;

  const handleEnter = (event) => {
    if (!showTooltip) return;
    show(event.currentTarget, fullName);
  };

  return (
    <>
      <span
        className={`inline-flex min-w-0 max-w-full overflow-hidden items-baseline ${className}`}
        onMouseEnter={showTooltip ? handleEnter : undefined}
        onMouseLeave={showTooltip ? hideTooltip : undefined}
        onFocus={showTooltip ? handleEnter : undefined}
        onBlur={showTooltip ? hideTooltip : undefined}
        aria-label={fullName}
      >
        <span className={`truncate min-w-0 ${textClassName}`}>{head}</span>
        {tail ? (
          <span className={`shrink-0 whitespace-pre ${textClassName}`}>
            {tail}
          </span>
        ) : null}
      </span>
      {tooltipNode}
    </>
  );
}
