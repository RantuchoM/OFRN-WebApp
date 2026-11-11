import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { IconLoader } from "../ui/Icons";

/** Amber when data is older than this (soft poll / catch-up keep it green while the app is open). */
export const AGENDA_BADGE_STALE_MS = 5 * 60_000;

/** Pure badge freshness — green only when subscribed, not dirty, and recently fetched. */
export function getAgendaBadgeFreshness({
  status,
  lastUpdate,
  hasPendingUpdates = false,
  updating = false,
  now = Date.now(),
  staleMs = AGENDA_BADGE_STALE_MS,
}) {
  const isSubscribed = status === "SUBSCRIBED";
  let ageMs = null;
  if (lastUpdate != null) {
    const ts = new Date(lastUpdate).getTime();
    if (!isNaN(ts)) ageMs = now - ts;
  }
  const isStale = ageMs == null || ageMs >= staleMs;
  const isFresh =
    isSubscribed && !hasPendingUpdates && !isStale && !updating;
  const needsAttention =
    !updating && (hasPendingUpdates || isStale || !isSubscribed);
  return { isSubscribed, ageMs, isStale, isFresh, needsAttention };
}

export default function ConnectionBadge({
  status,
  lastUpdate,
  onRefresh,
  isRefreshing,
  isUpdating,
  hasPendingUpdates = false,
}) {
  const updating = isUpdating ?? isRefreshing;
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  let timeText = "sin sync";
  try {
    if (lastUpdate && !isNaN(new Date(lastUpdate).getTime()) && es) {
      timeText = formatDistanceToNow(new Date(lastUpdate), {
        addSuffix: true,
        locale: es,
      });
    }
  } catch (err) {
    timeText = "hace un momento";
  }

  const { isSubscribed, isStale, isFresh, needsAttention } =
    getAgendaBadgeFreshness({
      status,
      lastUpdate,
      hasPendingUpdates,
      updating,
    });

  const baseClass =
    "flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-full font-bold shadow-sm border transition-all animate-in fade-in px-2 py-1 sm:px-3";
  const statusClass = isFresh
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
    : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
  const updatingClass = updating ? "opacity-80 cursor-wait" : "";

  let statusLabel = "Conectando...";
  if (updating) statusLabel = "Actualizando...";
  else if (hasPendingUpdates) statusLabel = "Hay cambios";
  else if (!isSubscribed) statusLabel = "Conectando...";
  else if (isStale) statusLabel = "Desactualizada";
  else statusLabel = "En línea";

  const title = updating
    ? "Actualizando..."
    : hasPendingUpdates
      ? "Hay cambios remotos. Tocá para actualizar."
      : isStale
        ? `Agenda desactualizada (Act. ${timeText}). Tocá para actualizar.`
        : `En línea · Act. ${timeText}`;

  const dotColor = isFresh ? "bg-emerald-500" : "bg-amber-500";
  const pingColor = isFresh ? "bg-emerald-400" : "bg-amber-400";

  return (
    <button
      onClick={onRefresh}
      disabled={updating}
      className={`${baseClass} ${statusClass} ${updatingClass}`}
      title={title}
      aria-label={title}
    >
      <span className="relative flex h-2.5 w-2.5 sm:h-2 sm:w-2 shrink-0">
        {isFresh && !updating && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pingColor} opacity-75`}
          />
        )}
        {updating ? (
          <IconLoader
            size={isSubscribed ? 10 : 12}
            className={`animate-spin ${
              isSubscribed ? "text-emerald-500" : "text-amber-500"
            }`}
            aria-hidden
          />
        ) : (
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 sm:h-2 sm:w-2 ${dotColor}`}
          />
        )}
      </span>
      {/* Mobile: always show age so green alone cannot imply “up to date”. */}
      <span className="sm:hidden text-[9px] font-semibold leading-none whitespace-nowrap opacity-90">
        {updating ? "Act…" : needsAttention && hasPendingUpdates ? "Cambios" : timeText}
      </span>
      <div className="hidden sm:flex flex-col items-start leading-tight">
        <span className="uppercase tracking-wider text-[9px]">{statusLabel}</span>
        {!updating && (
          <span className="font-normal opacity-80 text-[9px] normal-case whitespace-nowrap">
            Act. {timeText}
          </span>
        )}
      </div>
    </button>
  );
}
