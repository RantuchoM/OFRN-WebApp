import { useEffect, useState } from "react";

/**
 * Visible “filter applying” flag with a short delay so instant filters
 * (< delayMs) do not flash a spinner.
 *
 * @param {boolean} isBusy - true while deferred filter work / fetch is in flight
 * @param {number} [delayMs=50]
 * @returns {boolean} showPending
 */
export function useFimbaFilterPending(isBusy, delayMs = 50) {
  const [showPending, setShowPending] = useState(false);

  useEffect(() => {
    if (!isBusy) {
      setShowPending(false);
      return undefined;
    }
    const t = setTimeout(() => setShowPending(true), delayMs);
    return () => clearTimeout(t);
  }, [isBusy, delayMs]);

  return showPending;
}
