import React from "react";

export default function ManagementSectionCard({
  title,
  subtitle,
  description,
  icon: Icon,
  cardClasses,
  iconClasses,
  titleClasses,
  onClick,
  badge = null,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-xl border bg-white p-5 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 ${cardClasses}`}
    >
      <div className="flex items-start gap-4">
        <div className={`rounded-lg p-3 transition-colors ${iconClasses}`}>
          <Icon size={24} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`min-w-0 text-xl font-bold transition-colors ${titleClasses}`}>
              {title}
            </h3>
            {badge != null && (
              <span
                className={`shrink-0 min-w-7 rounded-full px-1.5 py-0.5 text-center text-xs font-extrabold ${
                  Number(badge) > 0
                    ? "border border-amber-600 bg-amber-500 text-white shadow-sm"
                    : "border border-slate-300 bg-slate-200 text-slate-600"
                }`}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle?.trim() ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{subtitle}</p>
          ) : null}
          {description?.trim() ? (
            <p className="text-sm leading-snug text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}
