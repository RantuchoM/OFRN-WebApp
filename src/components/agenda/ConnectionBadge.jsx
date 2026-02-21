import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { IconLoader } from "../ui/Icons";

export default function ConnectionBadge({
  status,
  lastUpdate,
  onRefresh,
  isRefreshing,
  isUpdating,
}) {
  const isOnline = status === "SUBSCRIBED";
  const updating = isUpdating ?? isRefreshing;
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  let timeText = "recién";
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

  const baseClass =
    "flex items-center gap-2 rounded-full font-bold shadow-sm border transition-all animate-in fade-in px-2 py-1 sm:px-3";
  const statusClass = isOnline
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
    : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
  const updatingClass = updating ? "opacity-80 cursor-wait" : "";

  return (
    <button
      onClick={onRefresh}
      disabled={updating}
      className={`${baseClass} ${statusClass} ${updatingClass}`}
      title={
        updating ? "Actualizando..." : `Estado: ${isOnline ? "En línea" : "Conectando"}`
      }
    >
      <span className="relative flex h-2.5 w-2.5 sm:h-2 sm:w-2 shrink-0">
        {isOnline && !updating && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        {updating ? (
          <IconLoader
            size={isOnline ? 10 : 12}
            className={`animate-spin ${isOnline ? "text-emerald-500" : "text-amber-500"}`}
            aria-hidden
          />
        ) : (
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 sm:h-2 sm:w-2 ${
              isOnline ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
        )}
      </span>
      <div className="hidden sm:flex flex-col items-start leading-tight">
        <span className="uppercase tracking-wider text-[9px]">
          {updating ? "Actualizando..." : isOnline ? "En línea" : "Conectando..."}
        </span>
        {!updating && (
          <span className="font-normal opacity-80 text-[9px] normal-case whitespace-nowrap">
            Act. {timeText}
          </span>
        )}
      </div>
    </button>
  );
}
