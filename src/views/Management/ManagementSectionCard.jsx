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
        <div className="space-y-1">
          <h3 className={`text-xl font-bold transition-colors ${titleClasses}`}>
            {title}
          </h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {subtitle}
          </p>
          <p className="text-sm leading-snug text-slate-500">{description}</p>
        </div>
      </div>
    </button>
  );
}
