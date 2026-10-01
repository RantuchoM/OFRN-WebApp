import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconAlertTriangle,
  IconCalendar,
  IconClock,
  IconFileText,
  IconLoader,
  IconMapPin,
  IconMusic,
  IconX,
} from "../../components/ui/Icons";
import { formatDdMmYyyy, formatDdMmYyyyWeekday } from "../../utils/dates";
import { stripHtml } from "../../utils/eventDisplayUtils";
import { getProgramStyle } from "../../utils/giraUtils";
import { formatEventDurationLabel } from "../../utils/serviciosCantidad";
import { downloadEnsambleServiciosPdf } from "../../utils/serviciosEnsamblePdf";
import ConflictoEnsayoActions, {
  ConflictoEnsayoLayout,
} from "./ConflictoEnsayoActions";
import { EnsayoConflictoOverlapTitle } from "../../components/ensayos/EnsayoImpactTags";
import {
  applySessionResolvedToEnsambleRows,
  partitionConflictoEnsayos,
  resolvedConflictoHeading,
} from "../../utils/serviciosEnsayosConflicto";

function horaSlice(value) {
  return value ? String(value).slice(0, 5) : "";
}

function horaLabel(evt) {
  const a = horaSlice(evt?.hora_inicio);
  const b = horaSlice(evt?.hora_fin);
  if (!a && !b) return "";
  return b ? `${a}-${b}` : a;
}

function locacionLabel(evt) {
  return String(evt?.locaciones?.nombre || "").trim();
}

function eventTitle(evt) {
  const tipo = stripHtml(evt?.tipos_evento?.nombre) || "Evento";
  const desc = stripHtml(evt?.descripcion);
  if (desc && desc.toLowerCase() !== tipo.toLowerCase()) return desc;
  return tipo;
}

function ViaBadge({ via, familias, cfNames }) {
  if (via === "ENSAMBLE") {
    return (
      <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-px text-[10px] font-bold text-emerald-800">
        Ensamble
      </span>
    );
  }
  if (via === "FAMILIA") {
    return (
      <span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-px text-[10px] font-bold text-indigo-800">
        Familia{familias?.length ? ` · ${familias.join(", ")}` : ""}
      </span>
    );
  }
  if (via === "CF") {
    return (
      <span className="rounded border border-fuchsia-200 bg-fuchsia-50 px-1.5 py-px text-[10px] font-bold text-fuchsia-800">
        CF{cfNames?.length ? ` · ${cfNames.join(", ")}` : ""}
      </span>
    );
  }
  if (via === "EXCL_ENSAMBLE") {
    return (
      <span className="rounded border border-red-200 bg-red-50 px-1.5 py-px text-[10px] font-bold text-red-700 line-through">
        Excluido
      </span>
    );
  }
  return null;
}

function ProgramRow({ row, showChips = true, bordered = true }) {
  const style = getProgramStyle(row.tipo);
  return (
    <div
      className={`flex items-start justify-between gap-3 px-3 py-2 ${
        bordered ? "border-t border-slate-100 first:border-t-0" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-800">{row.label}</div>
        <div className="text-[11px] text-slate-500">
          {formatDdMmYyyy(row.fechaDesde) || row.fechaDesde}
          {row.fechaHasta && row.fechaHasta !== row.fechaDesde
            ? ` – ${formatDdMmYyyy(row.fechaHasta) || row.fechaHasta}`
            : ""}
        </div>
      </div>
      {showChips ? (
        <div className="flex shrink-0 flex-col items-end gap-1">
          {row.tipo ? (
            <span
              className={`rounded border px-1.5 py-px text-[10px] font-bold ${style.color || "border-slate-200 text-slate-600"}`}
            >
              {row.tipo}
            </span>
          ) : null}
          <ViaBadge via={row.via} familias={row.familias} cfNames={row.cfNames} />
        </div>
      ) : null}
    </div>
  );
}

function ConcertItem({ evt }) {
  const fecha = formatDdMmYyyy(evt.fecha) || evt.fecha || "—";
  const desde = horaSlice(evt.hora_inicio) || "—";
  const hasta = horaSlice(evt.hora_fin) || "—";
  const loc = locacionLabel(evt) || "Sin locación";
  return (
    <li className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-slate-100 px-3 py-2 first:border-t-0 text-sm text-slate-700">
      <span className="inline-flex items-center gap-1 font-medium text-slate-800">
        <IconCalendar size={13} className="shrink-0 text-indigo-500" />
        {fecha}
      </span>
      <span className="inline-flex items-center gap-1 tabular-nums text-slate-600">
        <IconClock size={13} className="shrink-0 text-slate-400" />
        {desde}
        <span className="text-slate-400">–</span>
        {hasta}
      </span>
      <span className="inline-flex min-w-0 items-center gap-1 text-slate-600">
        <IconMapPin size={13} className="shrink-0 text-fuchsia-500" />
        <span className="truncate">{loc}</span>
      </span>
    </li>
  );
}

function ConflictoEventMeta({ evt, conflicto }) {
  const dur = formatEventDurationLabel(evt);
  const durText = dur && dur !== "—" ? dur : "";
  return (
    <div className="min-w-[12.5rem]">
      <div className="text-sm font-medium text-slate-800">
        <span className="whitespace-nowrap">
          {formatDdMmYyyyWeekday(evt.fecha) || evt.fecha}
        </span>
        {horaLabel(evt) ? (
          <span className="ml-1.5 whitespace-nowrap text-xs font-normal text-slate-500">
            {horaLabel(evt)}
          </span>
        ) : null}
      </div>
      <div className="text-xs italic text-slate-500">{eventTitle(evt)}</div>
      <EnsayoConflictoOverlapTitle impact={conflicto} />
      {durText ? (
        <div className="text-[10px] text-slate-400">{durText}</div>
      ) : null}
    </div>
  );
}

function EnsambleConflictoItem({
  event,
  conflicto,
  supabase,
  ensambles,
  onOpenPeople,
  onChanged,
}) {
  return (
    <li
      className={`border-t border-slate-100 px-3 py-2 ${
        conflicto?.resolvedKind ? "bg-slate-50/80" : ""
      }`}
    >
      <ConflictoEnsayoLayout
        giras={conflicto.overlappingGiras}
        people={conflicto.people}
        resolvedKind={conflicto.resolvedKind}
        justificacion={conflicto.justificacion}
        countButton={
          <button
            type="button"
            onClick={onOpenPeople}
            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold tabular-nums text-amber-900 hover:bg-amber-100"
            title="Ver quién está convocado a gira"
          >
            <IconAlertTriangle size={12} />
            {conflicto.count}
          </button>
        }
        actions={
          <ConflictoEnsayoActions
            eventId={event.id}
            supabase={supabase}
            ensambles={ensambles}
            onChanged={onChanged}
          />
        }
      >
        <ConflictoEventMeta evt={event} conflicto={conflicto} />
      </ConflictoEnsayoLayout>
    </li>
  );
}

function SectionCount({ children }) {
  return (
    <span className="ml-2 text-lg font-bold tabular-nums leading-none text-indigo-600">
      {children}
    </span>
  );
}

function Section({ title, count, children, empty }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200">
      <h4 className="flex items-center bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-800">
        {title}
        <SectionCount>{count}</SectionCount>
      </h4>
      {count === 0 ? (
        <p className="px-3 py-4 text-xs text-slate-400">{empty}</p>
      ) : (
        <div>{children}</div>
      )}
    </section>
  );
}

export default function EnsambleServiciosModal({
  report,
  loading,
  error,
  fechaDesde,
  fechaHasta,
  supabase,
  ensambles,
  sessionByEventId,
  onSessionResolved,
  onChanged,
  onClose,
}) {
  const [peopleEnsayo, setPeopleEnsayo] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const displayConflicto = useMemo(
    () =>
      applySessionResolvedToEnsambleRows(
        report?.ensayosConflicto,
        sessionByEventId,
        report?.ensamble,
      ),
    [report, sessionByEventId],
  );
  const { pending: pendingConflicto, resolved: resolvedConflicto } = useMemo(
    () =>
      partitionConflictoEnsayos(
        displayConflicto.map((row) => ({
          ...row.conflicto,
          _row: row,
        })),
      ),
    [displayConflicto],
  );
  const pendingRows = pendingConflicto.map((c) => c._row);
  const resolvedRows = resolvedConflicto.map((c) => c._row);
  const pendingCount = pendingRows.length;

  const handleDownloadPdf = async () => {
    if (!report || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadEnsambleServiciosPdf({
        report,
        fechaDesde,
        fechaHasta,
        pendingRows,
        resolvedRows,
        resolvedHeading: resolvedConflictoHeading(
          resolvedRows.map((r) => r.conflicto),
        ),
      });
    } finally {
      setPdfBusy(false);
    }
  };

  const handleRowChanged = (event, conflicto, kind, extra) => {
    const justificacion =
      extra?.justificacion ?? conflicto?.justificacion ?? null;
    onSessionResolved?.({
      eventId: event.id,
      ensambleId: report?.ensamble?.id,
      ensambleName: report?.ensambleName,
      kind,
      justificacion,
      ensayo: {
        ...conflicto,
        eventId: event.id,
        resolvedKind: kind,
        justificacion,
      },
    });
    onChanged?.(kind);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !peopleEnsayo) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, peopleEnsayo]);

  const familiaHint = useMemo(() => {
    if (!report) return "";
    const bits = [];
    if (report.storedFamilia) bits.push(`Familia ${report.storedFamilia}`);
    if (report.storedCfNames?.length) bits.push(`CF ${report.storedCfNames.join(", ")}`);
    else if (report.storedCfName) bits.push(`CF ${report.storedCfName}`);
    if (!bits.length) {
      return "Sin familia/CF en Ensambles: solo convocatoria directa de ensamble. Giras = Sinfónico y Camerata Filarmónica.";
    }
    return `${bits.join(" · ")}. EXCL_ENSAMBLE manda. Giras = Sinfónico y Camerata Filarmónica.`;
  }, [report]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !peopleEnsayo) onClose();
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ensamble-servicios-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-indigo-50 px-4 py-3">
          <div className="min-w-0">
            <h3
              id="ensamble-servicios-title"
              className="flex items-center gap-2 text-base font-bold text-slate-900"
            >
              <IconMusic size={18} className="text-indigo-600" />
              {report?.ensambleName || "Informe de ensamble"}
            </h3>
            <p className="text-xs text-slate-500">
              {fechaDesde && fechaHasta
                ? `${formatDdMmYyyy(fechaDesde)} – ${formatDdMmYyyy(fechaHasta)}. `
                : ""}
              {report?.regionName ? `${report.regionName}. ` : ""}
              {familiaHint}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!report || loading || pdfBusy}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:border-indigo-300 disabled:opacity-50"
              title="Descargar PDF de este informe"
            >
              {pdfBusy ? (
                <IconLoader size={14} className="animate-spin" />
              ) : (
                <IconFileText size={14} />
              )}
              Descargar PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
              aria-label="Cerrar"
            >
              <IconX size={20} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {loading && !report ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <IconLoader size={18} className="animate-spin text-indigo-600" />
              Armando informe…
            </div>
          ) : error ? (
            <p className="px-2 py-8 text-center text-sm text-red-600">
              {error.message || "No se pudo cargar el informe."}
            </p>
          ) : !report ? (
            <p className="px-2 py-8 text-center text-sm text-slate-400">
              Elegí un ensamble.
            </p>
          ) : (
            <>
              <Section
                title="Giras convocadas (Sinfónico y Camerata Filarmónica)"
                count={report.giras.length}
                empty="Ninguna gira Sinfónico/CF lo convoca en este rango."
              >
                {report.giras.map((row) => (
                  <ProgramRow key={`g-${row.id}`} row={row} />
                ))}
              </Section>

              <Section
                title="Programas y conciertos de ensamble"
                count={
                  report.programasPropios.length +
                  (report.conciertosSueltos?.length || 0)
                }
                empty="No hay programas propios ni conciertos vinculados."
              >
                {report.programasPropios.map((row) => (
                  <div
                    key={`p-${row.id}`}
                    className="border-t border-slate-100 first:border-t-0"
                  >
                    <ProgramRow row={row} showChips={false} bordered={false} />
                    {row.conciertos?.length ? (
                      <ul className="border-t border-slate-100 bg-slate-50/80 pl-5">
                        {row.conciertos.map((evt) => (
                          <ConcertItem key={`c-${evt.id}`} evt={evt} />
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
                {(report.conciertosSueltos || []).length ? (
                  <ul className="border-t border-slate-100 bg-slate-50/80">
                    {(report.conciertosSueltos || []).map((evt) => (
                      <ConcertItem key={`c-${evt.id}`} evt={evt} />
                    ))}
                  </ul>
                ) : null}
              </Section>

              <section className="overflow-hidden rounded-lg border border-slate-200">
                <h4 className="flex flex-wrap items-center gap-x-2 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-800">
                  Ensayos de ensamble
                  <SectionCount>
                    {report.ensayosNeto ?? report.ensayosTotal}
                  </SectionCount>
                  {pendingCount ? (
                    <span className="text-xs font-medium text-amber-700">
                      {pendingCount} en conflicto
                    </span>
                  ) : null}
                </h4>
                {report.ensayosTotal === 0 &&
                pendingRows.length === 0 &&
                resolvedRows.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-slate-400">
                    No hay ensayos de este ensamble en el rango.
                  </p>
                ) : pendingRows.length || resolvedRows.length ? (
                  <>
                    {pendingRows.length ? (
                      <ul>
                        {pendingRows.map(({ event, conflicto }) => (
                          <EnsambleConflictoItem
                            key={`e-${event.id}`}
                            event={event}
                            conflicto={conflicto}
                            supabase={supabase}
                            ensambles={ensambles}
                            onOpenPeople={() => setPeopleEnsayo(conflicto)}
                            onChanged={(kind, extra) =>
                              handleRowChanged(event, conflicto, kind, extra)
                            }
                          />
                        ))}
                      </ul>
                    ) : null}
                    {resolvedRows.length ? (
                      <>
                        <h5 className="border-t border-emerald-100 bg-emerald-50/70 px-3 py-1.5 text-xs font-bold text-emerald-800">
                          {resolvedConflictoHeading(
                            resolvedRows.map((r) => r.conflicto),
                          )}
                        </h5>
                        <ul>
                          {resolvedRows.map(({ event, conflicto }) => (
                            <EnsambleConflictoItem
                              key={`er-${event.id}`}
                              event={event}
                              conflicto={conflicto}
                              supabase={supabase}
                              ensambles={ensambles}
                              onOpenPeople={() => setPeopleEnsayo(conflicto)}
                            />
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </>
                ) : (
                  <p className="px-3 py-3 text-xs text-slate-500">
                    {report.ensayosNeto ?? report.ensayosTotal} ensayo
                    {(report.ensayosNeto ?? report.ensayosTotal) === 1
                      ? ""
                      : "s"}
                    . Ninguno en
                    conflicto.
                  </p>
                )}
              </section>

              {report.excluded.length > 0 ? (
                <Section
                  title="Excluidos en el programa (no cuentan)"
                  count={report.excluded.length}
                  empty=""
                >
                  {report.excluded.map((row) => (
                    <ProgramRow key={`x-${row.id}`} row={row} />
                  ))}
                </Section>
              ) : null}
            </>
          )}
        </div>
      </div>

      {peopleEnsayo ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPeopleEnsayo(null);
          }}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-amber-50 px-4 py-3">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900">
                  {peopleEnsayo.count} convocado
                  {peopleEnsayo.count === 1 ? "" : "s"} a gira
                </h4>
                <p className="text-xs text-slate-500">
                  {formatDdMmYyyy(peopleEnsayo.fecha) || peopleEnsayo.fecha}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPeopleEnsayo(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-white"
                aria-label="Cerrar"
              >
                <IconX size={18} />
              </button>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto p-2">
              {peopleEnsayo.people.map((person) => (
                <li
                  key={person.id}
                  className="border-b border-slate-100 px-2 py-2 last:border-b-0"
                >
                  <div className="text-sm font-medium text-slate-800">
                    {person.name}
                  </div>
                  <ul className="mt-0.5 text-[11px] text-slate-500">
                    {person.giras.map((g) => (
                      <li key={g.program.id}>{g.label}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
