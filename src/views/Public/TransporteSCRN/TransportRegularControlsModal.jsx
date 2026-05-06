import React, { useEffect, useState } from "react";

export default function TransportRegularControlsModal({
  supabase,
  transporte,
  onClose,
}) {
  const [errorMsg, setErrorMsg] = useState("");
  const [controlesFecha, setControlesFecha] = useState([]);
  const [controlesKm, setControlesKm] = useState([]);
  const [kmActual, setKmActual] = useState(null);
  const [nuevoFecha, setNuevoFecha] = useState({
    tipo: "",
    descripcion: "",
    vence_at: "",
    alertar_dias_antes: 30,
  });
  const [nuevoKm, setNuevoKm] = useState({
    tipo: "",
    descripcion: "",
    proximo_km: "",
    alertar_km_antes: 0,
  });

  const loadAll = async () => {
    if (!transporte?.id) return;
    setErrorMsg("");
    const [{ data: fRows, error: fErr }, { data: kmRows, error: kmErr }, { data: kmActualRow, error: kmActErr }] =
      await Promise.all([
        supabase
          .from("scrn_controles_vehiculos_fecha")
          .select("*")
          .eq("id_transporte", transporte.id)
          .eq("activo", true)
          .order("vence_at", { ascending: true }),
        supabase
          .from("scrn_controles_vehiculos_kilometros")
          .select("*")
          .eq("id_transporte", transporte.id)
          .eq("activo", true)
          .order("proximo_km", { ascending: true }),
        supabase
          .from("scrn_v_km_actual_por_transporte")
          .select("km_actual")
          .eq("id_transporte", transporte.id)
          .maybeSingle(),
      ]);
    if (fErr || kmErr || kmActErr) {
      setErrorMsg(fErr?.message || kmErr?.message || kmActErr?.message || "Error cargando");
      return;
    }
    setControlesFecha(fRows || []);
    setControlesKm(kmRows || []);
    setKmActual(kmActualRow?.km_actual ?? null);
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transporte?.id]);

  const addControlFecha = async () => {
    if (!nuevoFecha.tipo.trim() || !nuevoFecha.vence_at) return;
    const { error } = await supabase.from("scrn_controles_vehiculos_fecha").insert({
      id_transporte: transporte.id,
      tipo: nuevoFecha.tipo.trim(),
      descripcion: nuevoFecha.descripcion.trim() || null,
      vence_at: nuevoFecha.vence_at,
      alertar_dias_antes: Number(nuevoFecha.alertar_dias_antes || 0),
    });
    if (error) return setErrorMsg(error.message || "No se pudo crear control por fecha");
    setNuevoFecha({ tipo: "", descripcion: "", vence_at: "", alertar_dias_antes: 30 });
    await loadAll();
  };

  const addControlKm = async () => {
    if (!nuevoKm.tipo.trim() || nuevoKm.proximo_km === "") return;
    const { error } = await supabase.from("scrn_controles_vehiculos_kilometros").insert({
      id_transporte: transporte.id,
      tipo: nuevoKm.tipo.trim(),
      descripcion: nuevoKm.descripcion.trim() || null,
      proximo_km: Number(nuevoKm.proximo_km),
      alertar_km_antes: Number(nuevoKm.alertar_km_antes || 0),
    });
    if (error) return setErrorMsg(error.message || "No se pudo crear control por km");
    setNuevoKm({ tipo: "", descripcion: "", proximo_km: "", alertar_km_antes: 0 });
    await loadAll();
  };

  const renovarFecha = async (item) => {
    const mode = window.prompt(
      "Renovar control por fecha:\n- 'fijo:YYYY-MM-DD'\n- 'desde_hoy:2y' o 'desde_hoy:6m'",
      "desde_hoy:1y",
    );
    if (!mode) return;
    let nextDate = null;
    if (mode.startsWith("fijo:")) nextDate = mode.slice(5).trim();
    else if (mode.startsWith("desde_hoy:")) {
      const rule = mode.slice(10).trim().toLowerCase();
      const m = rule.match(/^(\d+)([ym])$/);
      if (!m) return;
      const base = new Date();
      const n = Number(m[1]);
      if (m[2] === "y") base.setFullYear(base.getFullYear() + n);
      if (m[2] === "m") base.setMonth(base.getMonth() + n);
      nextDate = base.toISOString().slice(0, 10);
    }
    if (!nextDate) return;
    const { error } = await supabase
      .from("scrn_controles_vehiculos_fecha")
      .update({ vence_at: nextDate, ultimo_hecho_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) return setErrorMsg(error.message || "No se pudo renovar control por fecha");
    await loadAll();
  };

  const renovarKm = async (item) => {
    const mode = window.prompt("Renovar control km:\n- 'fijo:120000'\n- 'en:15000'", "en:15000");
    if (!mode) return;
    let nextKm = null;
    if (mode.startsWith("fijo:")) nextKm = Number(mode.slice(5).trim());
    else if (mode.startsWith("en:")) nextKm = Number(kmActual || 0) + Number(mode.slice(3).trim());
    if (!Number.isFinite(nextKm) || nextKm < 0) return;
    const { error } = await supabase
      .from("scrn_controles_vehiculos_kilometros")
      .update({
        proximo_km: Math.floor(nextKm),
        ultimo_hecho_at: new Date().toISOString(),
        ultimo_hecho_km: kmActual == null ? null : Number(kmActual),
      })
      .eq("id", item.id);
    if (error) return setErrorMsg(error.message || "No se pudo renovar control por km");
    await loadAll();
  };

  return (
    <div
      className="fixed inset-0 z-[230] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold uppercase text-slate-800">Controles del vehículo</h3>
            <p className="text-xs text-slate-500">{transporte?.nombre} · {transporte?.patente}</p>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-full border border-slate-300">×</button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-64px)]">
          {errorMsg ? <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">{errorMsg}</div> : null}

          <section className="rounded-xl border border-slate-200 p-3 space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-700">Controles por fecha</h4>
            <div className="grid md:grid-cols-4 gap-2">
              <input value={nuevoFecha.tipo} onChange={(e) => setNuevoFecha((p) => ({ ...p, tipo: e.target.value }))} placeholder="Tipo" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
              <input type="date" value={nuevoFecha.vence_at} onChange={(e) => setNuevoFecha((p) => ({ ...p, vence_at: e.target.value }))} className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
              <input type="number" min={0} value={nuevoFecha.alertar_dias_antes} onChange={(e) => setNuevoFecha((p) => ({ ...p, alertar_dias_antes: e.target.value }))} placeholder="Alertar días antes" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
              <button type="button" onClick={() => void addControlFecha()} className="rounded border border-blue-300 bg-blue-50 text-blue-800 text-xs font-bold">Agregar</button>
            </div>
            <div className="space-y-2">
              {controlesFecha.map((c) => {
                const dias = Math.ceil((new Date(`${c.vence_at}T00:00:00`).getTime() - Date.now()) / 86400000);
                return (
                  <div key={c.id} className="rounded border border-slate-200 px-2 py-1.5 text-xs flex items-center justify-between gap-2">
                    <span><span className="font-bold">{c.tipo}</span> · vence {c.vence_at} · {dias} días</span>
                    <button type="button" onClick={() => void renovarFecha(c)} className="rounded border border-indigo-300 bg-indigo-50 text-indigo-800 px-2 py-1 font-semibold">Marcar hecho y renovar</button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 p-3 space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-700">Controles por kilometraje</h4>
            <div className="text-[11px] text-slate-600">Km actual: {kmActual ?? "—"}</div>
            <div className="grid md:grid-cols-4 gap-2">
              <input value={nuevoKm.tipo} onChange={(e) => setNuevoKm((p) => ({ ...p, tipo: e.target.value }))} placeholder="Tipo" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
              <input type="number" min={0} value={nuevoKm.proximo_km} onChange={(e) => setNuevoKm((p) => ({ ...p, proximo_km: e.target.value }))} placeholder="Próximo km" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
              <input type="number" min={0} value={nuevoKm.alertar_km_antes} onChange={(e) => setNuevoKm((p) => ({ ...p, alertar_km_antes: e.target.value }))} placeholder="Alertar km antes" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
              <button type="button" onClick={() => void addControlKm()} className="rounded border border-blue-300 bg-blue-50 text-blue-800 text-xs font-bold">Agregar</button>
            </div>
            <div className="space-y-2">
              {controlesKm.map((c) => {
                const restantes = c.proximo_km - Number(kmActual || 0);
                return (
                  <div key={c.id} className="rounded border border-slate-200 px-2 py-1.5 text-xs flex items-center justify-between gap-2">
                    <span><span className="font-bold">{c.tipo}</span> · próximo {c.proximo_km} · restan {restantes}</span>
                    <button type="button" onClick={() => void renovarKm(c)} className="rounded border border-indigo-300 bg-indigo-50 text-indigo-800 px-2 py-1 font-semibold">Marcar hecho y renovar</button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

