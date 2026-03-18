import React, { useEffect, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import ManualHeader from "../../components/public/ManualHeader";
import {
  exportViaticosToPDFForm,
  sumRendicion,
} from "../../utils/pdfFormExporter";
import {
  IconDownload,
  IconFileDownload,
  IconTrash,
  IconUpload,
} from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { calculateDaysDiff } from "../../hooks/viaticos/useViaticosIndividuales";

const STORAGE_KEY = "ofrn_manual_viatico_data";
const LOCALIDADES_DATALIST_ID = "viaticos_manual_localidades";
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSbSsEWy2XWoa-NLD4a_vk8XdUWo2a9qz9y-hKQKaljcptw_eSy-C3mRU7Kb8IwO2pnD3sL7qt-dWbd/pub?gid=0&single=true&output=csv";

const normalizeHeader = (h) =>
  String(h || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

const completedFieldClass =
  "border-emerald-300 bg-emerald-50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500";
const baseFieldClass =
  "border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none px-3 py-2";
const inputClass = (val) => {
  const isFilled =
    String(val ?? "").trim() !== "" && String(val ?? "").trim() !== "0";
  return `${baseFieldClass} ${isFilled ? completedFieldClass : "bg-white"}`;
};

const round2 = (num) =>
  Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

const toNumber = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const fmtMoneyPreview = (val) =>
  toNumber(val).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && c === ",") {
      pushCell();
      continue;
    }
    if (!inQuotes && (c === "\n" || c === "\r")) {
      if (c === "\r" && next === "\n") i++;
      pushCell();
      pushRow();
      continue;
    }
    cell += c;
  }
  pushCell();
  const isLastRowEmpty = row.every((v) => String(v || "").trim() === "");
  if (!isLastRowEmpty) pushRow();
  return rows;
};

const calcDiff = (ant, rend) => {
  const a = toNumber(ant);
  const r = toNumber(rend);
  const diff = r - a;
  return {
    dev: diff < 0 ? Math.abs(diff) : 0,
    reint: diff > 0 ? diff : 0,
  };
};

const DEFAULT_BASE = {
  apellido: "",
  nombre: "",
  dni: "",
  cargo: "",
  jornada_laboral: "",
  ciudad_origen: "",
  asiento_habitual: "",
  lugar_comision: "",
  motivo: "",
  fecha_salida: "",
  hora_salida: "",
  fecha_llegada: "",
  hora_llegada: "",
  valor_diario_base: 0,
  porcentaje: 100,
  temporada_alta: false,
};

const ZERO_REND = {
  rendicion_viaticos: 0,
  rendicion_gasto_alojamiento: 0,
  rendicion_transporte_otros: 0,
  rendicion_gasto_combustible: 0,
  rendicion_gastos_movil_otros: 0,
  rendicion_gastos_capacit: 0,
  rendicion_gasto_ceremonial: 0,
  rendicion_gasto_otros: 0,
};

export default function RendicionesManual() {
  const fileRef = useRef(null);
  const [loadedFromStorage] = useState(() => {
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  });
  const [base, setBase] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [personas, setPersonas] = useState([]); // [{...}]
  const [localidades, setLocalidades] = useState([]); // [string]
  const [montoDefault, setMontoDefault] = useState(0);
  const [csvStatus, setCsvStatus] = useState({ loading: true, error: "" });
  const [selectedPersonaId, setSelectedPersonaId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const computeDefaultAnt = (b) => {
    const dias = toNumber(b?.dias_computables);
    const vd = toNumber(b?.valorDiarioCalc || b?.valor_diario_base);
    return {
      // Viáticos anticipados: días * valor diario
      rendicion_viaticos: dias * vd,
      rendicion_gasto_alojamiento: toNumber(b?.gasto_alojamiento),
      rendicion_transporte_otros: toNumber(
        b?.gasto_pasajes || b?.gastos_movilidad,
      ),
      rendicion_gasto_combustible: toNumber(b?.gasto_combustible),
      rendicion_gastos_movil_otros: toNumber(b?.gastos_movil_otros),
      rendicion_gastos_capacit: toNumber(b?.gastos_capacit),
      rendicion_gasto_ceremonial: toNumber(b?.gasto_ceremonial),
      rendicion_gasto_otros: toNumber(b?.gasto_otros),
    };
  };

  const autoAntViaticosRef = useRef(0);

  const [ant, setAnt] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return obj?.manual_rendicion?.ant || computeDefaultAnt(obj);
    } catch {
      return computeDefaultAnt({});
    }
  });

  const porcentajeNum = toNumber(base?.porcentaje || 100);
  const factor_temporada = base?.temporada_alta ? 0.3 : 0;

  const dias_computables = useMemo(() => {
    return calculateDaysDiff(
      base?.fecha_salida || "",
      base?.hora_salida || "",
      base?.fecha_llegada || "",
      base?.hora_llegada || "",
    );
  }, [
    base?.fecha_salida,
    base?.hora_salida,
    base?.fecha_llegada,
    base?.hora_llegada,
  ]);

  const valorDiarioCalc = useMemo(() => {
    const baseVD = toNumber(base?.valor_diario_base);
    const pct = porcentajeNum / 100;
    const basePorcentaje = round2(baseVD * pct);
    return round2(basePorcentaje * (1 + factor_temporada));
  }, [base?.valor_diario_base, porcentajeNum, factor_temporada]);

  const subtotal = useMemo(() => {
    return round2(toNumber(dias_computables) * toNumber(valorDiarioCalc));
  }, [dias_computables, valorDiarioCalc]);

  // Guardar derivados en base para export/PDF y sincronización con Viáticos.
  useEffect(() => {
    setBase((prev) => {
      const next = {
        ...prev,
        dias_computables,
        valorDiarioCalc,
        subtotal,
        factor_temporada,
      };
      const same =
        toNumber(prev?.dias_computables) === toNumber(dias_computables) &&
        toNumber(prev?.valorDiarioCalc) === toNumber(valorDiarioCalc) &&
        toNumber(prev?.subtotal) === toNumber(subtotal) &&
        toNumber(prev?.factor_temporada) === toNumber(factor_temporada);
      return same ? prev : next;
    });
  }, [dias_computables, valorDiarioCalc, subtotal, factor_temporada]);

  // Mantener actualizado el anticipo de viáticos (días * valor diario),
  // sin pisar si el usuario lo editó manualmente.
  useEffect(() => {
    const computed = toNumber(dias_computables) * toNumber(valorDiarioCalc);
    const prevAuto = toNumber(autoAntViaticosRef.current);
    autoAntViaticosRef.current = computed;

    setAnt((prev) => {
      const current = toNumber(prev?.rendicion_viaticos);
      const rawCurrent = String(prev?.rendicion_viaticos ?? "").trim();
      const isEmpty = rawCurrent === "";
      const isStillAuto = Math.abs(current - prevAuto) < 0.000001;
      if (!isEmpty && !isStillAuto) return prev; // el usuario lo tocó
      return { ...prev, rendicion_viaticos: computed };
    });
  }, [dias_computables, valorDiarioCalc]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setCsvStatus({ loading: true, error: "" });
      try {
        const res = await fetch(CSV_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();

        const rawRows = parseCsv(text || "");
        if (!rawRows || rawRows.length === 0) throw new Error("CSV vacío");

        const header = rawRows[0].map(normalizeHeader);
        const idx = (name) => header.indexOf(normalizeHeader(name));
        const idxFirstMatch = (pred) => header.findIndex((h) => pred(h));
        const idxLocalidades =
          idx("localidades") !== -1
            ? idx("localidades")
            : idxFirstMatch((h) => h.includes("localidad"));

        const get = (row, name) => {
          const i = idx(name);
          if (i < 0) return "";
          return row[i] ?? "";
        };
        const getByIdx = (row, i) => (i >= 0 ? (row[i] ?? "") : "");

        const people = [];
        const locSet = new Set();
        let maxValorDiario = 0;

        for (let r = 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length === 0) continue;

          // Localidades y valor diario pueden venir en filas no asociadas a una persona.
          const locRaw = String(getByIdx(row, idxLocalidades) || "").trim();
          if (locRaw) {
            locRaw
              .split(/[;|]/g)
              .map((s) => s.trim())
              .filter(Boolean)
              .forEach((l) => locSet.add(l));
          }

          const valorDiario = toNumber(get(row, "valor_diario"));
          if (valorDiario > maxValorDiario) maxValorDiario = valorDiario;

          const apellido = String(get(row, "apellido") || "").trim();
          const nombre = String(get(row, "nombre") || "").trim();
          if (!apellido || !nombre) continue;

          const dni = String(get(row, "dni") || "").trim();
          const cargo = String(get(row, "cargo") || "").trim();
          const jornada = String(get(row, "jornada") || "").trim();
          const ciudad_origen = String(get(row, "ciudad_origen") || "").trim();
          const asiento_habitual = String(
            get(row, "asiento_habitual") || "",
          ).trim();

          people.push({
            id: `${apellido}__${nombre}__${dni || r}`,
            apellido,
            nombre,
            dni,
            cargo,
            jornada,
            ciudad_origen,
            asiento_habitual,
          });
        }

        const locs = Array.from(locSet).sort((a, b) =>
          a.localeCompare(b, "es"),
        );
        if (!cancelled) {
          setPersonas(people);
          setLocalidades(locs);
          setMontoDefault(maxValorDiario || 0);
          setCsvStatus({ loading: false, error: "" });

          if ((maxValorDiario || 0) > 0) {
            setBase((prev) => {
              const current = toNumber(prev.valor_diario_base);
              if (current > 0) return prev;
              return { ...prev, valor_diario_base: maxValorDiario };
            });
          }
        }
      } catch (e) {
        if (cancelled) return;
        setCsvStatus({
          loading: false,
          error:
            "No se pudo cargar la base externa (CSV). Podés completar manualmente.",
        });
        setPersonas([]);
        setLocalidades([]);
        setMontoDefault(0);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [loadedFromStorage]);

  const personaOptions = useMemo(() => {
    return (personas || []).map((p) => ({
      id: p.id,
      label: `${p.apellido}, ${p.nombre}${p.dni ? ` (${p.dni})` : ""}`,
      subLabel: [p.cargo, p.jornada].filter(Boolean).join(" · "),
    }));
  }, [personas]);

  const handleImportPersona = (id) => {
    setSelectedPersonaId(id);
    const p = (personas || []).find((x) => String(x.id) === String(id));
    if (!p) return;
    setBase((prev) => ({
      ...prev,
      apellido: p.apellido || "",
      nombre: p.nombre || "",
      dni: p.dni || "",
      cargo: p.cargo || prev.cargo || "",
      jornada_laboral: p.jornada || prev.jornada_laboral || "",
      ciudad_origen: p.ciudad_origen || prev.ciudad_origen || "",
      asiento_habitual: p.asiento_habitual || prev.asiento_habitual || "",
    }));
  };

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        const obj = e.newValue ? JSON.parse(e.newValue) : {};
        setBase(obj || {});
        setAnt(obj?.manual_rendicion?.ant || computeDefaultAnt(obj || {}));
        setRend(
          obj?.manual_rendicion?.rend || {
            rendicion_viaticos: 0,
            rendicion_gasto_alojamiento: 0,
            rendicion_transporte_otros: 0,
            rendicion_gasto_combustible: 0,
            rendicion_gastos_movil_otros: 0,
            rendicion_gastos_capacit: 0,
            rendicion_gasto_ceremonial: 0,
            rendicion_gasto_otros: 0,
          },
        );
      } catch {
        setBase({});
        setAnt(computeDefaultAnt({}));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const [rend, setRend] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return obj?.manual_rendicion?.rend || { ...ZERO_REND };
    } catch {
      return { ...ZERO_REND };
    }
  });

  // Persistencia: guardamos base + rendición (ant/rend) en la misma clave.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...base,
          manual_rendicion: { ant, rend },
        }),
      );
    } catch {}
  }, [base, ant, rend]);

  const concepts = useMemo(() => {
    return [
      {
        key: "rendicion_viaticos",
        label: "Viáticos",
      },
      { key: "rendicion_gasto_alojamiento", label: "Alojamiento" },
      { key: "rendicion_transporte_otros", label: "Movilidad / Pasajes" },
      { key: "rendicion_gasto_combustible", label: "Combustible" },
      { key: "rendicion_gastos_movil_otros", label: "Otros movilidad" },
      { key: "rendicion_gastos_capacit", label: "Capacitación" },
      { key: "rendicion_gasto_ceremonial", label: "Ceremonial" },
      { key: "rendicion_gasto_otros", label: "Otros" },
    ];
  }, []);

  const totals = useMemo(() => {
    const totalAnt = Object.keys(ant || {}).reduce(
      (acc, k) => acc + toNumber(ant[k]),
      0,
    );
    const totalRend = sumRendicion({ ...rend });
    const { dev, reint } = calcDiff(totalAnt, totalRend);
    return { totalAnt, totalRend, dev, reint };
  }, [ant, rend]);

  const updateRend = (key) => (e) => {
    setRend((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const updateAnt = (key) => (e) => {
    setAnt((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const updateBase = (key) => (e) => {
    setBase((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleImportCsv = async (file) => {
    const text = await file.text();
    const rows = parseCsv(text || "");
    if (!rows || rows.length < 2) return;
    const header = rows[0].map((h) => String(h || "").trim());
    const row = rows[1];
    const has = (name) => header.includes(name);
    const get = (name) => {
      const idx = header.indexOf(name);
      if (idx < 0) return "";
      return row[idx] ?? "";
    };
    const merged = {
      ...base,
      apellido: get("apellido") || base.apellido,
      nombre: get("nombre") || base.nombre,
      dni: get("dni") || base.dni,
      cargo: get("cargo") || base.cargo,
      jornada_laboral: get("jornada_laboral") || base.jornada_laboral,
      ciudad_origen: get("ciudad_origen") || base.ciudad_origen,
      asiento_habitual: get("asiento_habitual") || base.asiento_habitual,
      lugar_comision: get("lugar_comision") || base.lugar_comision,
      motivo: get("motivo") || base.motivo,
      fecha_salida: get("fecha_salida") || base.fecha_salida,
      hora_salida: get("hora_salida") || base.hora_salida,
      fecha_llegada: get("fecha_llegada") || base.fecha_llegada,
      hora_llegada: get("hora_llegada") || base.hora_llegada,
      valor_diario_base: toNumber(
        get("valor_diario_base") || base.valor_diario_base,
      ),
      porcentaje: toNumber(get("porcentaje") || base.porcentaje || 100) || 100,
      temporada_alta:
        String(
          get("temporada_alta") || base.temporada_alta || "",
        ).toLowerCase() === "true" ||
        String(get("temporada_alta") || "").trim() === "1",
      subtotal: toNumber(get("subtotal") || base.subtotal),
      gasto_alojamiento: toNumber(
        get("gasto_alojamiento") || base.gasto_alojamiento,
      ),
      gasto_pasajes: toNumber(get("gasto_pasajes") || base.gasto_pasajes),
      gastos_movilidad: toNumber(
        get("gastos_movilidad") || base.gastos_movilidad,
      ),
      gasto_combustible: toNumber(
        get("gasto_combustible") || base.gasto_combustible,
      ),
      gasto_otros: toNumber(get("gasto_otros") || base.gasto_otros),
      gastos_movil_otros: toNumber(
        get("gastos_movil_otros") || base.gastos_movil_otros,
      ),
      gastos_capacit: toNumber(get("gastos_capacit") || base.gastos_capacit),
      gasto_ceremonial: toNumber(
        get("gasto_ceremonial") || base.gasto_ceremonial,
      ),
      totalFinal: toNumber(get("totalFinal") || base.totalFinal),
      factor_temporada: toNumber(
        get("factor_temporada") || base.factor_temporada,
      ),
    };
    setBase(merged);
    const nextAnt = has("ant_rendicion_viaticos")
      ? {
          rendicion_viaticos: get("ant_rendicion_viaticos"),
          rendicion_gasto_alojamiento: get("ant_rendicion_gasto_alojamiento"),
          rendicion_transporte_otros: get("ant_rendicion_transporte_otros"),
          rendicion_gasto_combustible: get("ant_rendicion_gasto_combustible"),
          rendicion_gastos_movil_otros: get("ant_rendicion_gastos_movil_otros"),
          rendicion_gastos_capacit: get("ant_rendicion_gastos_capacit"),
          rendicion_gasto_ceremonial: get("ant_rendicion_gasto_ceremonial"),
          rendicion_gasto_otros: get("ant_rendicion_gasto_otros"),
        }
      : computeDefaultAnt(merged);
    setAnt(nextAnt);

    const nextRend = has("rendicion_viaticos")
      ? {
          ...ZERO_REND,
          rendicion_viaticos: get("rendicion_viaticos"),
          rendicion_gasto_alojamiento: get("rendicion_gasto_alojamiento"),
          rendicion_transporte_otros: get("rendicion_transporte_otros"),
          rendicion_gasto_combustible: get("rendicion_gasto_combustible"),
          rendicion_gastos_movil_otros: get("rendicion_gastos_movil_otros"),
          rendicion_gastos_capacit: get("rendicion_gastos_capacit"),
          rendicion_gasto_ceremonial: get("rendicion_gasto_ceremonial"),
          rendicion_gasto_otros: get("rendicion_gasto_otros"),
        }
      : rend;
    setRend(nextRend);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...merged,
          manual_rendicion: {
            ant: nextAnt,
            rend: nextRend,
          },
        }),
      );
    } catch {}
  };

  const handleClear = () => {
    const ok = confirm(
      "¿Limpiar planilla? Se perderán los datos cargados en esta vista.",
    );
    if (!ok) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setBase({ ...DEFAULT_BASE });
    setAnt(computeDefaultAnt(DEFAULT_BASE));
    setRend({ ...ZERO_REND });
  };

  const handleExportCsv = () => {
    const payload = {
      ...base,
      dias_computables,
      factor_temporada,
      valorDiarioCalc,
      subtotal,

      // Anticipos (compatibles con CSV de viáticos)
      gasto_alojamiento: toNumber(ant.rendicion_gasto_alojamiento),
      gasto_pasajes: 0,
      gastos_movilidad: toNumber(ant.rendicion_transporte_otros),
      gasto_combustible: toNumber(ant.rendicion_gasto_combustible),
      gasto_otros: toNumber(ant.rendicion_gasto_otros),
      gastos_movil_otros: toNumber(ant.rendicion_gastos_movil_otros),
      gastos_capacit: toNumber(ant.rendicion_gastos_capacit),
      gasto_ceremonial: toNumber(ant.rendicion_gasto_ceremonial),
      totalFinal: totals.totalAnt,

      // Para retomar rendición
      ...rend,
      ant_rendicion_viaticos: ant.rendicion_viaticos,
      ant_rendicion_gasto_alojamiento: ant.rendicion_gasto_alojamiento,
      ant_rendicion_transporte_otros: ant.rendicion_transporte_otros,
      ant_rendicion_gasto_combustible: ant.rendicion_gasto_combustible,
      ant_rendicion_gastos_movil_otros: ant.rendicion_gastos_movil_otros,
      ant_rendicion_gastos_capacit: ant.rendicion_gastos_capacit,
      ant_rendicion_gasto_ceremonial: ant.rendicion_gasto_ceremonial,
      ant_rendicion_gasto_otros: ant.rendicion_gasto_otros,
    };

    const keys = Object.keys(payload);
    const escape = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      const needs = /[",\n\r]/.test(s);
      const safe = s.replace(/"/g, '""');
      return needs ? `"${safe}"` : safe;
    };
    const csv = `${keys.join(",")}\n${keys.map((k) => escape(payload[k])).join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const safeName =
      `${(base.apellido || "Rendicion").trim()}_${(base.nombre || "Manual").trim()}`
        .replace(/[^\w\-]+/g, "_")
        .slice(0, 80);
    saveAs(blob, `${safeName}_Rendicion_Datos.csv`);
  };

  const handleDownload = async () => {
    const configData = {
      lugar_comision: base.lugar_comision || "",
      motivo: base.motivo || "",
      factor_temporada: toNumber(base.factor_temporada) || 0,
      keep_editable: true,
    };

    const data = {
      apellido: base.apellido || "",
      nombre: base.nombre || "",
      dni: base.dni || "",
      cargo: base.cargo || "",
      jornada_laboral: base.jornada_laboral || "",
      ciudad_origen: base.ciudad_origen || "",
      asiento_habitual: base.asiento_habitual || "",

      motivo: base.motivo || "",
      fecha_salida: base.fecha_salida || "",
      hora_salida: base.hora_salida || "",
      fecha_llegada: base.fecha_llegada || "",
      hora_llegada: base.hora_llegada || "",
      dias_computables,
      porcentaje: porcentajeNum || 100,
      valorDiarioCalc,

      // Anticipados editables
      subtotal: toNumber(ant.rendicion_viaticos),
      gasto_alojamiento: toNumber(ant.rendicion_gasto_alojamiento),
      gastos_movilidad: toNumber(ant.rendicion_transporte_otros),
      gasto_combustible: toNumber(ant.rendicion_gasto_combustible),
      gastos_movil_otros: toNumber(ant.rendicion_gastos_movil_otros),
      gastos_capacit: toNumber(ant.rendicion_gastos_capacit),
      gasto_ceremonial: toNumber(ant.rendicion_gasto_ceremonial),
      gasto_otros: toNumber(ant.rendicion_gasto_otros),
      totalFinal: totals.totalAnt,

      // rendiciones
      ...Object.fromEntries(
        Object.entries(rend).map(([k, v]) => [k, toNumber(v)]),
      ),

      firma: null,
    };

    const pdfBytes = await exportViaticosToPDFForm(
      {},
      [data],
      configData,
      "rendicion",
    );
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const safeName =
      `${(base.apellido || "Rendicion").trim()}_${(base.nombre || "Manual").trim()}`
        .replace(/[^\w\-]+/g, "_")
        .slice(0, 80);
    saveAs(blob, `${safeName}_Rendicion.pdf`);
  };

  const hasSyncedData = Object.values(base || {}).some(
    (v) => String(v ?? "").trim() !== "",
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <ManualHeader
          rightActions={
            <div className="inline-flex rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 text-slate-700 text-sm font-black hover:bg-slate-50 active:bg-slate-50 transition"
                title="Importar CSV"
              >
                <IconUpload size={18} className="text-slate-600" />
                Importar
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportCsv(f);
                  e.target.value = "";
                }}
              />
              <div className="w-px bg-slate-200" />
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 px-3 py-2 text-slate-700 text-sm font-black hover:bg-slate-50 active:bg-slate-50 transition"
                title="Exportar CSV (para retomar rendición)"
              >
                <IconDownload size={18} className="text-slate-600" />
                Exportar
              </button>
              <div className="w-px bg-slate-200" />
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-2 px-3 py-2 text-rose-700 bg-rose-50 text-sm font-black hover:bg-rose-100 active:bg-rose-100 transition"
                title="Limpiar planilla"
              >
                <IconTrash size={18} className="text-slate-600" />
                Limpiar planilla
              </button>
              <div className="w-px bg-slate-200" />
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 transition"
                title="Descargar PDF"
              >
                <IconFileDownload size={18} />
                Descargar Rendición
              </button>
            </div>
          }
        />

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 pt-5">
            <h1 className="text-xl font-black text-slate-800">
              Rendiciones Manual (Secretaría)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Cargá importes rendidos y generá el PDF de rendición. Los datos
              personales se sincronizan con Viáticos.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Comunes (mismo formato que Viáticos) */}
            <section className="space-y-3">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 md:p-5">
                <button
                  type="button"
                  onClick={() => setImportOpen((v) => !v)}
                  className="w-full flex items-start justify-between gap-4 text-left"
                  aria-expanded={importOpen}
                >
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-widest text-indigo-700">
                      Importar y editar datos de persona (base externa)
                    </div>
                    <div className="text-[11px] text-indigo-800/80 mt-1">
                      Completá rápidamente datos personales y localidades desde
                      Google Sheets.
                    </div>
                  </div>
                  <div className="shrink-0 text-indigo-700 font-black text-xs mt-0.5">
                    {importOpen ? "Ocultar ▴" : "Mostrar ▾"}
                  </div>
                </button>

                {importOpen && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch mt-4">
                    <div className="h-full rounded-xl border border-indigo-100 bg-white/70 px-4 py-3 flex flex-col">
                      <div className="text-xs font-bold text-indigo-900/80">
                        Importar Datos de Persona
                      </div>
                      <div className="mt-2">
                        <SearchableSelect
                          options={personaOptions}
                          value={selectedPersonaId}
                          onChange={handleImportPersona}
                          placeholder={
                            csvStatus.loading
                              ? "Cargando base..."
                              : personas.length > 0
                                ? "Buscar por apellido/nombre/DNI..."
                                : "Base no disponible (carga manual)"
                          }
                        />
                      </div>
                    </div>

                    <div className="h-full rounded-xl border border-indigo-100 bg-white/70 px-4 py-3 flex flex-col">
                      <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                        Valor diario maestro (CSV)
                      </div>
                      <div className="mt-1 text-sm font-black text-slate-800">
                        {montoDefault > 0 ? fmtMoneyPreview(montoDefault) : "—"}
                      </div>
                      {!csvStatus.loading &&
                        !csvStatus.error &&
                        localidades.length === 0 && (
                          <div className="mt-1 text-[11px] text-slate-600">
                            No se encontraron localidades en el CSV (columna{" "}
                            <strong>localidades</strong>).
                          </div>
                        )}
                      {csvStatus.error && (
                        <div className="mt-1 text-[11px] text-slate-600">
                          {csvStatus.error}
                        </div>
                      )}
                      <div className="flex-1" />
                    </div>

                    <div className="h-full rounded-xl border border-indigo-100 bg-white/70 px-4 py-3 flex flex-col justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                          Datos base
                        </div>
                        <div className="mt-1 text-[11px] text-indigo-700/80 leading-snug">
                          Tené en cuenta que tarda unos minutos en actualizar
                        </div>
                      </div>
                      <a
                        href="https://docs.google.com/spreadsheets/d/1qMaN5c8Ss3QNk2QPAQZ86X1jM8J4f8mToM2600Dls1M/edit?gid=657797988#gid=657797988"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 active:scale-[0.99] transition"
                        title="Editar datos base (Google Sheets)"
                      >
                        Editar datos base
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Datos personales
              </div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <label className="text-xs font-bold text-slate-600 md:col-span-2">
                  Apellido
                  <input
                    className={`mt-1 w-full ${inputClass(base.apellido)}`}
                    value={base.apellido || ""}
                    onChange={updateBase("apellido")}
                    placeholder="Apellido"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 md:col-span-2">
                  Nombre
                  <input
                    className={`mt-1 w-full ${inputClass(base.nombre)}`}
                    value={base.nombre || ""}
                    onChange={updateBase("nombre")}
                    placeholder="Nombre"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 md:col-span-2">
                  DNI
                  <input
                    className={`mt-1 w-full ${inputClass(base.dni)}`}
                    value={base.dni || ""}
                    onChange={updateBase("dni")}
                    placeholder="DNI"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 md:col-span-4">
                  Cargo
                  <input
                    className={`mt-1 w-full ${inputClass(base.cargo)}`}
                    value={base.cargo || ""}
                    onChange={updateBase("cargo")}
                    placeholder="Cargo"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 md:col-span-2">
                  Jornada
                  <input
                    className={`mt-1 w-full ${inputClass(base.jornada_laboral)}`}
                    value={base.jornada_laboral || ""}
                    onChange={updateBase("jornada_laboral")}
                    placeholder="Ej: 8 a 14"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 md:col-span-3">
                  Ciudad origen
                  <input
                    type="text"
                    autoComplete="off"
                    list={LOCALIDADES_DATALIST_ID}
                    className={`mt-1 w-full ${inputClass(base.ciudad_origen)}`}
                    value={base.ciudad_origen || ""}
                    onChange={updateBase("ciudad_origen")}
                    placeholder="Ciudad origen (p/ el campo Lugar y fecha)"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 md:col-span-3">
                  Asiento habitual
                  <input
                    type="text"
                    autoComplete="off"
                    list={LOCALIDADES_DATALIST_ID}
                    className={`mt-1 w-full ${inputClass(base.asiento_habitual)}`}
                    value={base.asiento_habitual || ""}
                    onChange={updateBase("asiento_habitual")}
                    placeholder="Asiento habitual"
                  />
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Comisión
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <label className="text-xs font-bold text-slate-600 md:col-span-2">
                  Motivo
                  <input
                    className={`mt-1 w-full ${inputClass(base.motivo)}`}
                    value={base.motivo || ""}
                    onChange={updateBase("motivo")}
                    placeholder="Motivo"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 md:col-span-2">
                  Lugar comisión
                  <input
                    type="text"
                    autoComplete="off"
                    list={LOCALIDADES_DATALIST_ID}
                    className={`mt-1 w-full ${inputClass(base.lugar_comision)}`}
                    value={base.lugar_comision || ""}
                    onChange={updateBase("lugar_comision")}
                    placeholder="Lugar"
                  />
                </label>

                <label className="text-xs font-bold text-slate-600 md:row-start-2 md:col-start-1">
                  Fecha salida
                  <div className="mt-1">
                    <DateInput
                      value={base.fecha_salida || ""}
                      onChange={(v) =>
                        setBase((p) => ({ ...p, fecha_salida: v }))
                      }
                      showDayName={false}
                      className={`!py-1.5 !pl-8 !pr-2 !rounded-lg text-xs ${
                        base.fecha_salida
                          ? "!border-emerald-200 !bg-emerald-50/50"
                          : ""
                      }`}
                    />
                  </div>
                </label>

                <label className="text-xs font-bold text-slate-600 md:row-start-2 md:col-start-2">
                  Hora salida
                  <div className="mt-1">
                    <TimeInput
                      value={base.hora_salida || ""}
                      onChange={(v) =>
                        setBase((p) => ({ ...p, hora_salida: v || "" }))
                      }
                      className={`border border-slate-300 rounded-lg outline-none px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500/30 ${
                        String(base.hora_salida || "").trim()
                          ? "border-emerald-300 bg-emerald-50"
                          : "bg-white"
                      }`}
                    />
                  </div>
                </label>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 md:row-start-2 md:col-start-3 md:col-span-2 md:row-span-2 md:self-stretch">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Resumen (anticipo)
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span>Días</span>
                      <span className="font-black">
                        {toNumber(dias_computables) || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valor diario</span>
                      <span className="font-black">
                        {fmtMoneyPreview(valorDiarioCalc)}
                      </span>
                    </div>
                    <div className="col-span-2 flex justify-between pt-2 border-t border-slate-200 text-slate-700">
                      <span className="font-black">Viáticos anticipados</span>
                      <span className="font-black">
                        {fmtMoneyPreview(ant.rendicion_viaticos)}
                      </span>
                    </div>
                  </div>
                </div>

                <label className="text-xs font-bold text-slate-600 md:row-start-3 md:col-start-1">
                  Fecha llegada
                  <div className="mt-1">
                    <DateInput
                      value={base.fecha_llegada || ""}
                      onChange={(v) =>
                        setBase((p) => ({ ...p, fecha_llegada: v }))
                      }
                      showDayName={false}
                      className={`!py-1.5 !pl-8 !pr-2 !rounded-lg text-xs ${
                        base.fecha_llegada
                          ? "!border-emerald-200 !bg-emerald-50/50"
                          : ""
                      }`}
                    />
                  </div>
                </label>

                <label className="text-xs font-bold text-slate-600 md:row-start-3 md:col-start-2">
                  Hora llegada
                  <div className="mt-1">
                    <TimeInput
                      value={base.hora_llegada || ""}
                      onChange={(v) =>
                        setBase((p) => ({ ...p, hora_llegada: v || "" }))
                      }
                      className={`border border-slate-300 rounded-lg outline-none px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500/30 ${
                        String(base.hora_llegada || "").trim()
                          ? "border-emerald-300 bg-emerald-50"
                          : "bg-white"
                      }`}
                    />
                  </div>
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Financieros
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <label className="text-xs font-bold text-slate-600">
                  Valor diario base
                  <input
                    inputMode="decimal"
                    className={`mt-1 w-full ${inputClass(base.valor_diario_base)}`}
                    value={base.valor_diario_base ?? 0}
                    onChange={updateBase("valor_diario_base")}
                    onFocus={() => {
                      if (String(base.valor_diario_base ?? "").trim() === "0")
                        setBase((p) => ({ ...p, valor_diario_base: "" }));
                    }}
                    placeholder="0"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  % viático
                  <select
                    className={`mt-1 w-full ${baseFieldClass} bg-emerald-50 border-emerald-300`}
                    value={String(base?.porcentaje ?? 100)}
                    onChange={updateBase("porcentaje")}
                  >
                    <option value="100">100%</option>
                    <option value="80">80%</option>
                    <option value="0">0%</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-3 border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                  <div>
                    <div className="text-xs font-black text-slate-700">
                      Temporada alta
                    </div>
                    <div className="text-[11px] text-slate-500">
                      +30% (factor 0,30)
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!base?.temporada_alta}
                    onChange={updateBase("temporada_alta")}
                    className="h-5 w-5 accent-indigo-600"
                  />
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:self-stretch">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Valor diario calculado
                  </div>
                  <div className="mt-1 text-sm font-black text-slate-800">
                    {fmtMoneyPreview(valorDiarioCalc)}
                  </div>
                </div>
              </div>
            </section>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs">
                  <tr>
                    <th className="text-left px-4 py-3 font-black uppercase tracking-wider">
                      Concepto
                    </th>
                    <th className="text-right px-4 py-3 font-black uppercase tracking-wider">
                      Anticipado
                    </th>
                    <th className="text-right px-4 py-3 font-black uppercase tracking-wider">
                      Rendido
                    </th>
                    <th className="text-right px-4 py-3 font-black uppercase tracking-wider">
                      Devolución
                    </th>
                    <th className="text-right px-4 py-3 font-black uppercase tracking-wider">
                      Reintegro
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {concepts.map((c) => {
                    const antVal = toNumber(ant[c.key]);
                    const rendVal = toNumber(rend[c.key]);
                    const { dev, reint } = calcDiff(antVal, rendVal);
                    return (
                      <tr key={c.key}>
                        <td className="px-4 py-3 font-bold text-slate-700">
                          {c.label}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            inputMode="decimal"
                            className="w-32 text-right border border-slate-300 rounded-lg px-2 py-1 bg-white"
                            value={ant[c.key]}
                            onChange={updateAnt(c.key)}
                            onFocus={() => {
                              if (String(ant[c.key] ?? "").trim() === "0")
                                setAnt((p) => ({ ...p, [c.key]: "" }));
                            }}
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            inputMode="decimal"
                            className="w-32 text-right border border-slate-300 rounded-lg px-2 py-1 bg-white"
                            value={rend[c.key]}
                            onChange={updateRend(c.key)}
                            onFocus={() => {
                              if (String(rend[c.key] ?? "").trim() === "0")
                                setRend((p) => ({ ...p, [c.key]: "" }));
                            }}
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                          {dev > 0 ? fmtMoneyPreview(dev) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                          {reint > 0 ? fmtMoneyPreview(reint) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td className="px-4 py-3 font-black text-slate-700">
                      Totales
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">
                      {fmtMoneyPreview(totals.totalAnt)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">
                      {fmtMoneyPreview(totals.totalRend)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">
                      {totals.dev > 0 ? fmtMoneyPreview(totals.dev) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">
                      {totals.reint > 0 ? fmtMoneyPreview(totals.reint) : "—"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <datalist id={LOCALIDADES_DATALIST_ID}>
              {(localidades || []).map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </div>
        </div>
      </div>
    </div>
  );
}
