import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import RichTextEditor from "../../../components/ui/RichTextEditor";
import { supabase } from "../../../services/supabase";
import {
  adminUpdateUsuarioRol,
  adminUpsertConcierto,
  adminUpsertPrograma,
  blobToPdfBase64ForMail,
  buildEntradasReservaPdfConDataUrls,
  computeDisponibles,
  crearReserva,
  cancelarReserva,
  descargarPdfDesdeReservaRow,
  enviarMailCancelacionReserva,
  enviarMailReserva,
  getConciertoBySlug,
  listAdminData,
  listConciertoIdsConReservaActiva,
  listarMisReservas,
  listProgramasConConciertos,
  tokenToQrDataUrl,
  validarYConsumirQr,
} from "../../../services/entradaService";
import { downloadEntradasReservaPdfBlob } from "../../../utils/entradasReservaPdf";

const ADMIN_TABS = ["programas", "conciertos", "usuarios"];

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
}

export default function EntradasMain({ user, profile, onLogout }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [programas, setProgramas] = useState([]);
  const [selectedConcierto, setSelectedConcierto] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [creatingReserva, setCreatingReserva] = useState(false);
  const [reservaResult, setReservaResult] = useState(null);
  const [misReservas, setMisReservas] = useState([]);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [scannerToken, setScannerToken] = useState("");
  const [scannerModo, setScannerModo] = useState("entrada");
  const [confirmParcial, setConfirmParcial] = useState(false);
  const [pendingWarning, setPendingWarning] = useState(null);
  const [cancelReservaTarget, setCancelReservaTarget] = useState(null);
  const [cancelingReserva, setCancelingReserva] = useState(false);
  const [conciertosConReservaActiva, setConciertosConReservaActiva] = useState([]);
  const [downloadingPdfReservaId, setDownloadingPdfReservaId] = useState(null);
  const scannerRef = useRef(null);
  const [adminData, setAdminData] = useState({ programas: [], conciertos: [], usuarios: [] });
  const [eventosConcierto, setEventosConcierto] = useState([]);
  const [adminTab, setAdminTab] = useState("programas");
  const [programaForm, setProgramaForm] = useState({ nombre: "", detalle_richtext: "", activo: true });
  const [conciertoForm, setConciertoForm] = useState({
    ofrn_evento_id: "",
    nombre: "",
    detalle_richtext: "",
    imagen_drive_url: "",
    capacidad_maxima: 100,
    reservas_habilitadas: true,
    activo: true,
  });

  const canAdmin = profile?.rol === "admin";
  const canRecepcion = profile?.rol === "recepcionista" || profile?.rol === "admin";
  const section = searchParams.get("view") || "catalogo";
  const conciertoSlug = searchParams.get("concierto") || "";

  const loadBase = async () => {
    setLoading(true);
    try {
      const [data, idsReservados] = await Promise.all([
        listProgramasConConciertos(),
        listConciertoIdsConReservaActiva(),
      ]);
      setConciertosConReservaActiva(idsReservados);
      setProgramas(data);
      if (conciertoSlug) {
        const concierto = await getConciertoBySlug(conciertoSlug);
        setSelectedConcierto(concierto);
      } else {
        setSelectedConcierto(null);
      }
      if (section === "mis-reservas") {
        const reservas = await listarMisReservas();
        setMisReservas(reservas);
      }
      if (canAdmin && section === "admin") {
        setAdminData(await listAdminData());
        const { data: eventosData, error: eventosError } = await supabase
          .from("eventos")
          .select(
            "id, id_gira, fecha, hora_inicio, descripcion, tipos_evento(nombre), locaciones(nombre, localidades(localidad)), programas!eventos_id_gira_fkey(id, nomenclador, subtitulo)",
          )
          .eq("is_deleted", false)
          .is("deleted_at", null)
          .order("fecha", { ascending: false });
        if (eventosError) throw eventosError;
        const onlyConciertos = (eventosData || []).filter((ev) =>
          String(ev?.tipos_evento?.nombre || "").toLowerCase().includes("concierto"),
        );
        setEventosConcierto(onlyConciertos);
      }
    } catch (error) {
      toast.error(error?.message || "No se pudo cargar Entradas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, conciertoSlug]);

  const concertosFlat = useMemo(
    () =>
      programas.flatMap((programa) =>
        (programa.entrada_concierto || []).map((concierto) => ({
          ...concierto,
          programa,
        })),
      ),
    [programas],
  );

  const tieneReservaEnConcierto = (conciertoId) =>
    conciertosConReservaActiva.includes(Number(conciertoId));

  const handlePickConcierto = (slug) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", "catalogo");
    params.set("concierto", slug);
    setSearchParams(params);
  };

  const handleCreateReserva = async () => {
    if (!selectedConcierto?.id) return;
    setCreatingReserva(true);
    try {
      const result = await crearReserva({ conciertoId: selectedConcierto.id, cantidad });
      const reservaQr = await tokenToQrDataUrl(result.qr_reserva_token);
      const entriesQr = await Promise.all((result.qr_entrada_tokens || []).map((token) => tokenToQrDataUrl(token)));
      setReservaResult({ ...result, reservaQr, entriesQr, cantidad_solicitada: cantidad });
      let pdfBase64;
      try {
        const { blob, filename } = await buildEntradasReservaPdfConDataUrls({
          concierto: selectedConcierto,
          reserva: { codigo_reserva: result.codigo_reserva, cantidad_solicitada: cantidad },
          reservaQrDataUrl: reservaQr,
          entriesQrDataUrls: entriesQr,
        });
        downloadEntradasReservaPdfBlob(blob, filename);
        pdfBase64 = await blobToPdfBase64ForMail(blob);
      } catch (pdfErr) {
        console.error(pdfErr);
        toast.message("Reserva creada. No se pudo generar el PDF; podés intentar desde «Mis reservas» luego.");
      }
      try {
        await enviarMailReserva({
          reservaId: result.reserva_id,
          qrReservaToken: result.qr_reserva_token,
          qrEntradaTokens: result.qr_entrada_tokens || [],
          pdfBase64,
        });
        if (pdfBase64) {
          toast.success("Reserva confirmada: se descargó el PDF y el mail se envió con el mismo adjunto.");
        } else {
          toast.success("Reserva confirmada y mail enviado. El PDF no se generó; probá descargar desde «Mis reservas».");
        }
      } catch {
        toast.message(
          pdfBase64
            ? "Reserva creada y PDF generado, pero el mail no pudo enviarse."
            : "Reserva creada. El mail no pudo enviarse automáticamente.",
        );
      }
      await loadBase();
    } catch (error) {
      toast.error(error?.message || "No se pudo crear la reserva.");
    } finally {
      setCreatingReserva(false);
    }
  };

  const consumeToken = async ({ forceParcial = false } = {}) => {
    const result = await validarYConsumirQr({
      token: scannerToken,
      modo: scannerModo,
      confirmarParcial: forceParcial || confirmParcial,
    });
    if (result?.warning || result?.reason === "reserva_uso_parcial") {
      setPendingWarning(result);
      return;
    }
    if (!result?.ok) {
      toast.error(`No válido: ${result?.reason || "error"}`);
      return;
    }
    toast.success("Ingreso registrado correctamente.");
    setScannerToken("");
  };

  const startScanner = async () => {
    if (!canRecepcion || scannerRunning) return;
    try {
      const html5QrCode = new Html5Qrcode("entrada-qr-reader");
      scannerRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          setScannerToken(decodedText);
        },
        () => {},
      );
      setScannerRunning(true);
    } catch (err) {
      console.error(err);
      toast.error(
        "No se pudo usar la cámara. En Android, desactivá burbujas/superposiciones de otras apps; cerrá lo que use la cámara; aceptá el permiso. Si ves el aviso del sistema sobre permisos, seguí esa indicación. También podés pegar el token manualmente abajo.",
        { duration: 14000 },
      );
    }
  };

  const stopScanner = async () => {
    if (!scannerRef.current) return;
    await scannerRef.current.stop();
    await scannerRef.current.clear();
    scannerRef.current = null;
    setScannerRunning(false);
  };

  const submitPrograma = async (event) => {
    event.preventDefault();
    await adminUpsertPrograma(programaForm);
    toast.success("Programa guardado.");
    setProgramaForm({ nombre: "", detalle_richtext: "", activo: true });
    setAdminData(await listAdminData());
  };

  const handleConfirmCancelReserva = async () => {
    if (!cancelReservaTarget?.id) return;
    setCancelingReserva(true);
    try {
      await cancelarReserva(cancelReservaTarget.id);
      try {
        await enviarMailCancelacionReserva({ reservaId: cancelReservaTarget.id });
        toast.success("Reserva cancelada. Revisá tu correo para la confirmación.");
      } catch {
        toast.message("Reserva cancelada. No pudimos enviar el mail de confirmación.");
      }
      setCancelReservaTarget(null);
      await loadBase();
    } catch (err) {
      toast.error(err?.message || "No se pudo cancelar la reserva.");
    } finally {
      setCancelingReserva(false);
    }
  };

  const submitConcierto = async (event) => {
    event.preventDefault();
    await adminUpsertConcierto(conciertoForm);
    toast.success("Concierto guardado.");
    setConciertoForm({
      ofrn_evento_id: "",
      nombre: "",
      detalle_richtext: "",
      imagen_drive_url: "",
      capacidad_maxima: 100,
      reservas_habilitadas: true,
      activo: true,
    });
    setAdminData(await listAdminData());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <span className="text-sm uppercase tracking-wide font-semibold text-slate-500">Cargando entradas...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">Entradas OFRN</h1>
            <p className="text-xs text-slate-500">{profile.apellido}, {profile.nombre}</p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 sm:flex gap-2">
          <button className={`rounded-xl px-3 py-2 text-xs font-bold ${section === "catalogo" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`} onClick={() => setSearchParams({ view: "catalogo" })}>Catálogo</button>
          <button className={`rounded-xl px-3 py-2 text-xs font-bold ${section === "mis-reservas" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`} onClick={() => setSearchParams({ view: "mis-reservas" })}>Mis reservas</button>
          {canRecepcion && <button className={`rounded-xl px-3 py-2 text-xs font-bold ${section === "recepcion" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`} onClick={() => setSearchParams({ view: "recepcion" })}>Recepción</button>}
          {canAdmin && <button className={`rounded-xl px-3 py-2 text-xs font-bold ${section === "admin" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`} onClick={() => setSearchParams({ view: "admin" })}>Admin</button>}
        </div>

        {section === "catalogo" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Programas y conciertos</h2>
              <div className="space-y-3">
                {programas.map((programa) => (
                  <article key={programa.id} className="rounded-xl border border-slate-200 p-3">
                    <h3 className="font-bold text-slate-800">{programa.nombre}</h3>
                    <div className="mt-2 space-y-2">
                      {(programa.entrada_concierto || []).map((concierto) => (
                        <button
                          key={concierto.id}
                          type="button"
                          className="w-full text-left rounded-lg border border-slate-200 hover:border-indigo-300 px-3 py-2"
                          onClick={() => handlePickConcierto(concierto.slug_publico)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-700">{concierto.nombre}</p>
                            {tieneReservaEnConcierto(concierto.id) && (
                              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                                Con reserva
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{formatDate(concierto.fecha_hora)}</p>
                          {concierto.lugar_nombre && <p className="text-xs text-slate-500">{concierto.lugar_nombre}</p>}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              {!selectedConcierto && <p className="text-sm text-slate-500">Seleccioná un concierto para ver su URL compartible y reservar.</p>}
              {selectedConcierto && (
                <>
                  <h3 className="text-lg font-bold text-slate-800">{selectedConcierto.nombre}</h3>
                  <p className="text-xs text-slate-500">{formatDate(selectedConcierto.fecha_hora)}</p>
                  {selectedConcierto.lugar_nombre && <p className="text-xs text-slate-500">{selectedConcierto.lugar_nombre}</p>}
                  {selectedConcierto.imagen_drive_url && (
                    <img src={selectedConcierto.imagen_drive_url} alt={selectedConcierto.nombre} className="w-full h-44 rounded-xl object-cover border border-slate-200" />
                  )}
                  <div className="prose prose-sm prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: selectedConcierto.detalle_richtext || "" }} />
                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
                    Disponibles: <strong>{computeDisponibles(selectedConcierto)}</strong> / {selectedConcierto.capacidad_maxima}
                  </div>
                  <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs break-all">
                    URL: {window.location.origin}/entradas?view=catalogo&concierto={selectedConcierto.slug_publico}
                  </div>
                  {tieneReservaEnConcierto(selectedConcierto.id) && (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Ya tenés una reserva activa para este concierto. Podés verla en &quot;Mis reservas&quot;.
                    </p>
                  )}
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Cantidad</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                    value={cantidad}
                    onChange={(event) => setCantidad(Number(event.target.value))}
                    disabled={tieneReservaEnConcierto(selectedConcierto.id)}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (<option key={n} value={n}>{n} entrada{n > 1 ? "s" : ""}</option>))}
                  </select>
                  <button
                    onClick={handleCreateReserva}
                    disabled={
                      creatingReserva
                      || !selectedConcierto.reservas_habilitadas
                      || computeDisponibles(selectedConcierto) < cantidad
                      || tieneReservaEnConcierto(selectedConcierto.id)
                    }
                    className="w-full rounded-lg bg-blue-700 text-white py-2 text-sm font-semibold disabled:bg-slate-300"
                  >
                    {creatingReserva ? "Reservando..." : "Reservar"}
                  </button>
                  {reservaResult && (
                    <div className="space-y-2 border-t border-slate-200 pt-3">
                      <p className="text-sm font-bold text-emerald-700">Reserva #{reservaResult.codigo_reserva}</p>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!selectedConcierto) return;
                          try {
                            const { blob, filename } = await buildEntradasReservaPdfConDataUrls({
                              concierto: selectedConcierto,
                              reserva: {
                                codigo_reserva: reservaResult.codigo_reserva,
                                cantidad_solicitada: reservaResult.cantidad_solicitada ?? cantidad,
                              },
                              reservaQrDataUrl: reservaResult.reservaQr,
                              entriesQrDataUrls: reservaResult.entriesQr,
                            });
                            downloadEntradasReservaPdfBlob(blob, filename);
                          } catch (e) {
                            toast.error(e?.message || "No se pudo generar el PDF.");
                          }
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-800"
                      >
                        Descargar PDF (detalle y QRs)
                      </button>
                      <img src={reservaResult.reservaQr} alt="QR reserva general" className="w-40 h-40 border border-slate-200 rounded-lg" />
                      <div className="grid grid-cols-2 gap-2">
                        {reservaResult.entriesQr.map((qr, idx) => (
                          <img key={idx} src={qr} alt={`QR entrada ${idx + 1}`} className="w-full border border-slate-200 rounded-lg" />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}

        {section === "mis-reservas" && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Mis reservas</h2>
            <div className="space-y-2">
              {misReservas.map((reserva) => {
                const ingresadas = (reserva.entradas || []).filter((x) => x.estado_ingreso === "ingresada").length;
                const esActiva = reserva.estado === "activa";
                return (
                  <article key={reserva.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{reserva.concierto?.nombre} · {reserva.codigo_reserva}</p>
                        <p className="text-xs text-slate-500">{formatDate(reserva.concierto?.fecha_hora)}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          esActiva ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {esActiva ? "Activa" : "Cancelada"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Entradas: {reserva.cantidad_solicitada} · Ingresadas: {ingresadas}
                    </p>
                    {esActiva && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          disabled={downloadingPdfReservaId === reserva.id}
                          onClick={async () => {
                            setDownloadingPdfReservaId(reserva.id);
                            try {
                              await descargarPdfDesdeReservaRow(reserva);
                            } catch (e) {
                              toast.error(e?.message || "No se pudo generar el PDF.");
                            } finally {
                              setDownloadingPdfReservaId(null);
                            }
                          }}
                          className="w-full sm:w-auto rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100 disabled:opacity-60"
                        >
                          {downloadingPdfReservaId === reserva.id ? "Generando PDF…" : "Descargar PDF (detalle y QRs)"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelReservaTarget(reserva)}
                          className="w-full sm:w-auto rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100"
                        >
                          Cancelar reserva
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
              {misReservas.length === 0 && <p className="text-sm text-slate-500">Aún no tenés reservas.</p>}
            </div>
          </section>
        )}

        {section === "recepcion" && canRecepcion && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Escaneo de QR</h2>
            <p className="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
              <strong className="text-amber-900">Android:</strong> si aparece &quot;Este sitio no puede solicitarte permiso&quot;, el sistema bloquea el permiso de cámara mientras haya <strong>burbujas o superposiciones</strong> de otras apps (WhatsApp, Messenger, grabadores, filtros de pantalla, etc.). Cerrá esas funciones o la app flotante y tocá &quot;Iniciar cámara&quot; de nuevo. Si sigue fallando, podés pegar el token abajo.
            </p>
            <div id="entrada-qr-reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-xl border border-slate-200" />
            <div className="grid grid-cols-2 gap-2">
              <button className="rounded-lg border border-slate-300 py-2 text-sm font-semibold" onClick={startScanner} disabled={scannerRunning}>Iniciar cámara</button>
              <button className="rounded-lg border border-slate-300 py-2 text-sm font-semibold" onClick={stopScanner} disabled={!scannerRunning}>Detener</button>
            </div>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={scannerModo} onChange={(event) => setScannerModo(event.target.value)}>
              <option value="entrada">Modo QR individual</option>
              <option value="reserva">Modo QR reserva completa</option>
            </select>
            <input value={scannerToken} onChange={(event) => setScannerToken(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Token escaneado o ingreso manual" />
            <button onClick={() => consumeToken()} className="w-full rounded-lg bg-emerald-600 text-white py-2 text-sm font-semibold" disabled={!scannerToken.trim()}>
              Validar y registrar ingreso
            </button>
          </section>
        )}

        {section === "admin" && canAdmin && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
            <div className="flex gap-2">
              {ADMIN_TABS.map((tab) => (
                <button key={tab} className={`rounded-lg px-3 py-2 text-xs font-bold uppercase ${adminTab === tab ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => setAdminTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>

            {adminTab === "programas" && (
              <form className="space-y-3" onSubmit={submitPrograma}>
                <input value={programaForm.nombre} onChange={(event) => setProgramaForm((prev) => ({ ...prev, nombre: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nombre del programa" required />
                <RichTextEditor value={programaForm.detalle_richtext} onChange={(value) => setProgramaForm((prev) => ({ ...prev, detalle_richtext: value }))} placeholder="Detalle del programa (texto enriquecido)" />
                <button type="submit" className="rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-semibold">Guardar programa</button>
                <div className="space-y-2">
                  {adminData.programas.map((programa) => <div key={programa.id} className="rounded-lg border border-slate-200 p-2 text-sm">{programa.nombre}</div>)}
                </div>
              </form>
            )}

            {adminTab === "conciertos" && (
              <form className="space-y-3" onSubmit={submitConcierto}>
                <select value={conciertoForm.ofrn_evento_id} onChange={(event) => setConciertoForm((prev) => ({ ...prev, ofrn_evento_id: Number(event.target.value) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
                  <option value="">Seleccionar evento OFRN (tipo concierto)</option>
                  {eventosConcierto.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {(ev.programas?.nomenclador || `Programa ${ev.id_gira || "-"}`) + " · " + ev.fecha + " " + (ev.hora_inicio || "")}
                    </option>
                  ))}
                </select>
                <input value={conciertoForm.nombre} onChange={(event) => setConciertoForm((prev) => ({ ...prev, nombre: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nombre del concierto" required />
                <p className="text-xs text-slate-500">Fecha, hora y lugar se toman del evento OFRN seleccionado.</p>
                <input value={conciertoForm.imagen_drive_url} onChange={(event) => setConciertoForm((prev) => ({ ...prev, imagen_drive_url: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="URL pública de portada (Google Drive)" />
                <input type="number" min={1} value={conciertoForm.capacidad_maxima} onChange={(event) => setConciertoForm((prev) => ({ ...prev, capacidad_maxima: Number(event.target.value) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Capacidad máxima" required />
                <RichTextEditor value={conciertoForm.detalle_richtext} onChange={(value) => setConciertoForm((prev) => ({ ...prev, detalle_richtext: value }))} placeholder="Detalle del concierto" />
                <button type="submit" className="rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-semibold">Guardar concierto</button>
                <div className="space-y-2">
                  {adminData.conciertos.map((concierto) => (
                    <div key={concierto.id} className="rounded-lg border border-slate-200 p-2 text-sm">
                      {concierto.nombre} · {formatDate(concierto.fecha_hora)}{concierto.lugar_nombre ? ` · ${concierto.lugar_nombre}` : ""}
                    </div>
                  ))}
                </div>
              </form>
            )}

            {adminTab === "usuarios" && (
              <div className="space-y-2">
                {adminData.usuarios.map((usr) => (
                  <div key={usr.id} className="rounded-lg border border-slate-200 p-2 flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-700">{usr.apellido}, {usr.nombre}</p>
                    <select
                      value={usr.rol}
                      onChange={async (event) => {
                        await adminUpdateUsuarioRol({ id: usr.id, rol: event.target.value });
                        setAdminData(await listAdminData());
                      }}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    >
                      <option value="personal">personal</option>
                      <option value="recepcionista">recepcionista</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <ConfirmModal
        isOpen={Boolean(pendingWarning)}
        onClose={() => setPendingWarning(null)}
        title="La reserva ya tuvo ingresos parciales"
        message={`Se detectaron ${pendingWarning?.ingresadas || 0} entradas ya usadas. ¿Confirmás consumir las ${pendingWarning?.pendientes || 0} pendientes?`}
        confirmText="Consumir pendientes"
        onConfirm={async () => {
          await consumeToken({ forceParcial: true });
          setPendingWarning(null);
        }}
      />

      <ConfirmModal
        isOpen={Boolean(cancelReservaTarget)}
        onClose={() => !cancelingReserva && setCancelReservaTarget(null)}
        title="Cancelar reserva"
        message={
          cancelReservaTarget
            ? `¿Seguro que querés cancelar la reserva ${cancelReservaTarget.codigo_reserva}?\n\nLos códigos QR dejarán de valer y las plazas se liberarán para otras personas.${
                (cancelReservaTarget.entradas || []).some((e) => e.estado_ingreso === "ingresada")
                  ? "\n\nNota: si ya ingresó alguien con una entrada, esa asistencia no se borra; solo se anulan las entradas pendientes."
                  : ""
              }`
            : ""
        }
        confirmText={cancelingReserva ? "Cancelando…" : "Sí, cancelar reserva"}
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md"
        onConfirm={handleConfirmCancelReserva}
      />
    </div>
  );
}
