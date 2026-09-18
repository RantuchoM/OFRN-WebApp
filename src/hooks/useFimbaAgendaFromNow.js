import { useEffect, useMemo, useState } from "react";
import { getNowLocal } from "../utils/dates";
import { splitFimbaAgendaFromNow } from "../utils/fimbaAgendaNow";

const NOW_TICK_MS = 60_000;

/**
 * Vista «desde ahora» sobre una lista ya filtrada.
 * `focusEventId` / `forceExpandIds` revelan el pasado si el ancla es anterior.
 *
 * @param {object[]} filteredEvents
 * @param {{
 *   focusEventId?: number|string|null,
 *   forceExpandIds?: Array<number|string|null|undefined>,
 *   getEndDate?: (ev: object) => Date|null|undefined,
 *   hidePreviousCalendarDays?: boolean,
 * }} [opts]
 */
export function useFimbaAgendaFromNow(filteredEvents, opts = {}) {
  const [showPast, setShowPast] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const getEndDate = opts.getEndDate;
  const hidePreviousCalendarDays = Boolean(opts.hidePreviousCalendarDays);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), NOW_TICK_MS);
    return () => clearInterval(t);
  }, []);

  const now = useMemo(() => {
    void nowTick;
    return getNowLocal();
  }, [nowTick]);

  const split = useMemo(
    () =>
      splitFimbaAgendaFromNow(filteredEvents, {
        now,
        showPast,
        getEndDate,
        hidePreviousCalendarDays,
      }),
    [filteredEvents, now, showPast, getEndDate, hidePreviousCalendarDays],
  );

  const focusKey = [
    opts.focusEventId,
    ...(Array.isArray(opts.forceExpandIds) ? opts.forceExpandIds : []),
  ]
    .filter((id) => id != null && id !== "")
    .map(String)
    .join(",");

  useEffect(() => {
    if (!focusKey) return;
    const ids = new Set(focusKey.split(","));
    if (split.pastEvents.some((ev) => ids.has(String(ev.id)))) {
      setShowPast(true);
    }
  }, [focusKey, split.pastEvents]);

  const toggleShowPast = () => setShowPast((v) => !v);

  return {
    showPast,
    setShowPast,
    toggleShowPast,
    now,
    ...split,
  };
}
