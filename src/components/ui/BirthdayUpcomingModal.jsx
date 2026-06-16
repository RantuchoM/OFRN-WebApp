import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { formatMusicianName } from "../../utils/birthdayUtils";
import { IconCake, IconLoader, IconX } from "./Icons";

function formatFullName(person) {
  const nombre = (person?.nombre || "").trim();
  const apellido = (person?.apellido || "").trim();
  return [nombre, apellido].filter(Boolean).join(" ") || formatMusicianName(person);
}

function formatBirthdayDate(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatRelativeDay(daysUntil) {
  if (daysUntil === 0) return "Hoy";
  if (daysUntil === 1) return "Mañana";
  return `En ${daysUntil} días`;
}

function BirthdayRow({ person }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-800">
          {formatFullName(person)}
        </p>
        <p className="text-xs font-medium text-slate-500">
          {formatBirthdayDate(person.nextBirthdayDate)}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
          person.daysUntil === 0
            ? "bg-pink-600 text-white"
            : "bg-pink-50 text-pink-700"
        }`}
      >
        {formatRelativeDay(person.daysUntil)}
      </span>
    </li>
  );
}

function BirthdaySection({ title, subtitle, birthdays }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
            {title}
          </h3>
          {subtitle ? (
            <p className="text-xs font-medium text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-500">
          {birthdays.length}
        </span>
      </div>
      {birthdays.length > 0 ? (
        <ul className="space-y-2">
          {birthdays.map((person) => (
            <BirthdayRow key={person.id} person={person} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm font-medium text-slate-400">
          Sin cumpleaños en esta seccion.
        </p>
      )}
    </section>
  );
}

export default function BirthdayUpcomingModal({
  isOpen,
  onClose,
  birthdays = [],
  daysAhead = 30,
  isLoading = false,
  isFetchingMore = false,
  error = null,
  onLoadMore,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const todayBirthdays = birthdays.filter((person) => person.daysUntil === 0);
  const upcomingBirthdays = birthdays.filter((person) => person.daysUntil > 0);
  const rangeLabel = `próximos ${daysAhead} días`;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm animate-in fade-in duration-200 sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="birthday-modal-title"
      >
        <div className="flex items-start gap-3 border-b border-pink-100 bg-gradient-to-r from-pink-50 via-white to-amber-50 px-5 py-4">
          <div className="rounded-2xl bg-pink-600 p-3 text-white shadow-lg shadow-pink-200">
            <IconCake size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="birthday-modal-title"
              className="text-lg font-black text-slate-900"
            >
              Cumpleaños
            </h2>
            <p className="text-sm font-medium text-slate-500">
              Hoy y {rangeLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
            aria-label="Cerrar modal de cumpleaños"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="max-h-[min(70vh,34rem)] overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-8 text-sm font-bold text-slate-500">
              <IconLoader size={18} className="animate-spin" />
              Cargando cumpleaños...
            </div>
          ) : error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              No se pudieron cargar los cumpleaños.
            </p>
          ) : birthdays.length === 0 ? (
            <div className="space-y-4">
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-400">
                No hay cumpleaños hoy ni en los {rangeLabel}.
              </p>
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isFetchingMore}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-black text-pink-700 transition-all hover:bg-pink-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isFetchingMore ? (
                  <IconLoader size={16} className="animate-spin" />
                ) : null}
                {isFetchingMore ? "Cargando..." : "Ver un mes más"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <BirthdaySection
                title="Hoy"
                subtitle="Cumpleaños del dia"
                birthdays={todayBirthdays}
              />
              <BirthdaySection
                title={`Próximos ${daysAhead} días`}
                subtitle="Ordenados por fecha"
                birthdays={upcomingBirthdays}
              />
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isFetchingMore}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-black text-pink-700 transition-all hover:bg-pink-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isFetchingMore ? (
                  <IconLoader size={16} className="animate-spin" />
                ) : null}
                {isFetchingMore ? "Cargando..." : "Ver un mes más"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
