import React from "react";
import { formatDdMmYyyy } from "../../utils/dates";
import EnsambleProyeccionEnsayosEditor from "./EnsambleProyeccionEnsayosEditor";

function fmt(n) {
  const v = Math.round(Number(n) * 100) / 100;
  if (!Number.isFinite(v)) return "—";
  return String(v).replace(".", ",");
}

/**
 * Detalle por ensamble (contenido alineado a las hojas individuales del PDF/Excel informe).
 */
export default function EnsambleProyeccionDetalle({
  detail,
  ensambleId,
  locaciones = [],
  ensayosStats = null,
  onEnsayoSlotsChange,
}) {
  if (!detail) {
    return (
      <p className="px-3 py-6 text-center text-xs text-slate-400">
        Elegí un ensamble para ver el detalle de proyección (como en el PDF).
      </p>
    );
  }

  return (
    <div className="space-y-4 px-3 py-3 text-[11px] text-slate-800">
      <div>
        <h3 className="text-sm font-bold text-slate-900">
          Detalle — {detail.ensamble}{" "}
          <span className="font-normal text-slate-500">
            ({detail.sede || "sin sede"})
          </span>
        </h3>
      </div>

      <section>
        <h4 className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
          Resumen
        </h4>
        <dl className="grid gap-1 sm:grid-cols-2">
          <div className="flex justify-between gap-2 rounded bg-slate-50 px-2 py-1">
            <dt className="text-slate-500">Giras fuera / en casa / total</dt>
            <dd className="font-bold tabular-nums">
              {fmt(detail.girasFuera)} / {fmt(detail.girasCasa)} /{" "}
              {fmt(detail.girasTotal)}
            </dd>
          </div>
          <div className="flex justify-between gap-2 rounded bg-teal-50 px-2 py-1">
            <dt className="text-teal-800">PCV</dt>
            <dd className="font-bold tabular-nums text-teal-900">
              {fmt(detail.pcv)}
            </dd>
          </div>
          <div className="flex justify-between gap-2 rounded bg-pink-50 px-2 py-1">
            <dt className="text-pink-800">Feriados</dt>
            <dd className="font-bold tabular-nums text-pink-900">
              {detail.feriados}
            </dd>
          </div>
          {ensayosStats ? (
            <>
              <div className="flex justify-between gap-2 rounded bg-violet-50 px-2 py-1">
                <dt className="text-violet-800">Ens. netos</dt>
                <dd className="font-bold tabular-nums text-violet-900">
                  {fmt(ensayosStats.ensayosNetos)}
                </dd>
              </div>
              <div className="flex justify-between gap-2 rounded bg-violet-50/60 px-2 py-1 sm:col-span-2">
                <dt className="text-violet-700">
                  Ensayos (brutos − conflicto)
                </dt>
                <dd className="font-medium tabular-nums text-violet-900">
                  {fmt(ensayosStats.ensayosServiciosBrutos)} −{" "}
                  {fmt(ensayosStats.ensayosServiciosConflicto)} ·{" "}
                  {ensayosStats.ensayosSemanaModelo} slots ×{" "}
                  {ensayosStats.semanasProyectadas} sem.
                </dd>
              </div>
            </>
          ) : null}
        </dl>
      </section>

      <EnsambleProyeccionEnsayosEditor
        ensambleId={ensambleId}
        locaciones={locaciones}
        onSlotsChange={onEnsayoSlotsChange}
      />

      {ensayosStats?.conflictos?.length ? (
        <section>
          <h4 className="mb-1 rounded bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900">
            Ensayos en conflicto ({ensayosStats.ensayosConflicto})
          </h4>
          <div className="max-h-40 overflow-auto">
            <table className="min-w-full text-left">
              <thead className="sticky top-0 bg-white text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-1 py-1">Fecha</th>
                  <th className="px-1 py-1">Hora</th>
                  <th className="px-1 py-1">Serv.</th>
                  <th className="px-1 py-1">Giras</th>
                </tr>
              </thead>
              <tbody>
                {ensayosStats.conflictos.slice(0, 40).map((c, i) => (
                  <tr
                    key={`${c.fecha}-${c.hora}-${i}`}
                    className="border-t border-slate-100"
                  >
                    <td className="px-1 py-1 whitespace-nowrap">
                      {formatDdMmYyyy(c.fecha)}
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap text-slate-600">
                      {c.hora}
                    </td>
                    <td className="px-1 py-1 tabular-nums">{fmt(c.servicio)}</td>
                    <td className="px-1 py-1 text-slate-600">{c.giras}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ensayosStats.conflictos.length > 40 ? (
              <p className="px-1 py-1 text-[10px] text-slate-400">
                … y {ensayosStats.conflictos.length - 40} más (ver PDF/Excel)
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section>
        <h4 className="mb-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-900">
          Giras en casa
        </h4>
        {!detail.enCasa?.length ? (
          <p className="px-1 text-slate-400 italic">(ninguna)</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-1 py-1">Gira</th>
                  <th className="px-1 py-1">Fechas</th>
                  <th className="px-1 py-1">Vía</th>
                </tr>
              </thead>
              <tbody>
                {detail.enCasa.map((g) => (
                  <tr key={g.giraId} className="border-t border-slate-100">
                    <td className="px-1 py-1 font-medium">{g.nombre}</td>
                    <td className="px-1 py-1 whitespace-nowrap text-slate-600">
                      {formatDdMmYyyy(g.desde)} → {formatDdMmYyyy(g.hasta)}
                    </td>
                    <td className="px-1 py-1 text-slate-500">{g.via || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h4 className="mb-1 rounded bg-teal-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-teal-900">
          Giras fuera / mixtas + franja PCV
        </h4>
        {!detail.fuera?.length ? (
          <p className="px-1 text-slate-400 italic">(ninguna)</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-1 py-1">Gira</th>
                  <th className="px-1 py-1">Fechas</th>
                  <th className="px-1 py-1">PCV</th>
                  <th className="px-1 py-1">Franja</th>
                  <th className="px-1 py-1">Nota</th>
                </tr>
              </thead>
              <tbody>
                {detail.fuera.map((g) => (
                  <tr key={g.giraId} className="border-t border-slate-100">
                    <td className="px-1 py-1 font-medium">
                      {g.nombre}
                      {g.casaFuera?.startsWith("Mixto") ? (
                        <span className="ml-1 text-[9px] text-amber-700">
                          {g.casaFuera}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap text-slate-600">
                      {formatDdMmYyyy(g.desde)} → {formatDdMmYyyy(g.hasta)}
                    </td>
                    <td className="px-1 py-1 font-bold tabular-nums text-teal-900">
                      {fmt(g.pcv)}
                    </td>
                    <td className="px-1 py-1 text-slate-600 max-w-[14rem]">
                      {g.pcvFranja || "—"}
                    </td>
                    <td className="px-1 py-1 text-slate-500 max-w-[16rem]">
                      {g.pcvNota || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h4 className="mb-1 rounded bg-pink-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-pink-900">
          Feriados / no laborables / domingos en gira
        </h4>
        {!detail.feriadosHits?.length ? (
          <p className="px-1 text-slate-400 italic">(ninguno)</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-1 py-1">Fecha</th>
                  <th className="px-1 py-1">Detalle</th>
                  <th className="px-1 py-1">Tipo</th>
                  <th className="px-1 py-1">Gira</th>
                </tr>
              </thead>
              <tbody>
                {detail.feriadosHits.map((f) => (
                  <tr
                    key={`${f.fecha}-${f.gira}`}
                    className="border-t border-slate-100"
                  >
                    <td className="px-1 py-1 whitespace-nowrap font-medium">
                      {formatDdMmYyyy(f.fecha)}
                    </td>
                    <td className="px-1 py-1">{f.detalle}</td>
                    <td className="px-1 py-1 text-pink-800">{f.tipo}</td>
                    <td className="px-1 py-1 text-slate-600">{f.gira}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
