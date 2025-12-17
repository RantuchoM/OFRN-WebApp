import React from "react";
import { IconArrowLeft, IconPrinter } from "../../../components/ui/Icons";
import "./ViaticosSheet.css";

export default function ViaticosForm({
  onBack,
  initialData,
  configData,
  hideToolbar = false,
  hideAmounts = false,
}) {
  const data = initialData || {};
  const config = configData || {};

  // --- FORMATEADORES ---
  const formatCurrency = (amount) => {
    if (
      hideAmounts === true ||
      amount === undefined ||
      amount === null ||
      amount === ""
    )
      return "";
    const val = parseFloat(amount);
    if (isNaN(val)) return "";
    return `$ ${new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val)}`;
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return "";
    const [y, m, d] = isoStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const now = new Date();
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const fechaActualTexto = `${now.getDate()} de ${
    months[now.getMonth()]
  } de ${now.getFullYear()}`;
  const localidadMusico = data.ciudad_origen || "Viedma";

  // --- RENDER CHECKBOX ---
  const renderCheck = (isChecked) => (
    <div
      style={{
        width: "16px",
        height: "16px",
        border: "1px solid #000",
        backgroundColor: "#e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
      }}
    >
      {isChecked && (
        <span
          style={{
            fontWeight: "bold",
            fontSize: "14px",
            color: "#000",
            lineHeight: "1",
            display: "block",
            marginTop: "-1px",
          }}
        >
          ✓
        </span>
      )}
    </div>
  );

  const subtotalViaticos = data.subtotal; // Asumiendo que viene calculado del Manager

  const checkAereo = renderCheck(data.check_aereo);
  const checkTerrestre = renderCheck(data.check_terrestre);
  const checkPatenteOficial = renderCheck(data.check_patente_oficial);
  const checkPatenteParticular = renderCheck(data.check_patente_particular);
  const checkOtros = renderCheck(data.check_otros);

  // --- CONTENIDO DE LA HOJA (Extraído para limpieza) ---
  const SheetContent = () => (
    <div className="ritz grid-container" dir="ltr">
      <table className="waffle" cellSpacing="0" cellPadding="0">
        <colgroup>
          <col style={{ width: "146px" }} />
          <col style={{ width: "46px" }} />
          <col style={{ width: "106px" }} />
          <col style={{ width: "151px" }} />
          <col style={{ width: "106px" }} />
          <col style={{ width: "106px" }} />
          <col style={{ width: "106px" }} />
          <col style={{ width: "106px" }} />
        </colgroup>
        <tbody>
          <tr style={{ height: "30px" }}>
            <td className="s0" dir="ltr" colSpan="8">
              FORMULARIO PARA LA AUTORIZACIÓN DE LAS COMISIONES OFICIALES DENTRO
              DEL PAIS <br />
              Título I – DECTO-2025-867-E-GDERNE-RNE
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s1 softmerge" dir="ltr" colSpan={3}>
              <div
                className="softmerge-inner"
                style={{ width: "296px", left: "-1px" }}
              >
                Nombre y Apellido del agente:
              </div>
            </td>
            <td className="s4" dir="ltr" colSpan="5">
              {data.nombre} {data.apellido}
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s5" dir="ltr">
              Cargo o Función:
            </td>
            <td className="s6" dir="ltr" colSpan="7">
              {data.cargo || "Músico"}{" "}
            </td>
          </tr>
          <tr style={{ height: "25px" }}>
            <td className="s5" dir="ltr">
              Jornada laboral:
            </td>
            <td className="s6" dir="ltr" colSpan="7">
              {data.jornada_laboral || ""}{" "}
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s5" dir="ltr">
              Ciudad de Origen:
            </td>
            <td className="s7" dir="ltr"></td>
            <td className="s8" dir="ltr" colSpan="6">
              {localidadMusico}
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s1 softmerge" dir="ltr" colSpan={4}>
              <div
                className="softmerge-inner"
                style={{ width: "447px", left: "-1px" }}
              >
                Lugar o lugares de la comisión e intermedios:
              </div>
            </td>
            <td className="s4" dir="ltr" colSpan="4">
              {config.lugar_comision}
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s5" dir="ltr">
              Motivo:
            </td>
            <td className="s10" dir="ltr" colSpan="7">
              {config.motivo}
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s5" dir="ltr">
              Asiento habitual:
            </td>
            <td className="s7" dir="ltr"></td>
            <td className="s8" dir="ltr" colSpan="6">
              {localidadMusico}
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s11"></td>
            <td className="s12"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s13 softmerge" dir="ltr" colSpan={8}>
              <div
                className="softmerge-inner"
                style={{ width: "447px", left: "-1px" }}
              >
                Días y horarios estimados de salida y llegada:
              </div>
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s5" dir="ltr">
              Salida:
            </td>
            <td className="s5" dir="ltr">
              Día
            </td>
            <td className="s15" dir="ltr" colSpan="2">
              {formatDate(data.fecha_salida)}
            </td>
            <td className="s5" dir="ltr">
              Hora:
            </td>
            <td className="s15" dir="ltr" colSpan="2">
              {data.hora_salida}
            </td>
            <td className="s11"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s5" dir="ltr">
              Llegada:
            </td>
            <td className="s5" dir="ltr">
              Día
            </td>
            <td className="s15" dir="ltr" colSpan="2">
              {formatDate(data.fecha_llegada)}
            </td>
            <td className="s5" dir="ltr">
              Hora:
            </td>
            <td className="s15" dir="ltr" colSpan="2">
              {data.hora_llegada}
            </td>
            <td className="s11"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s1 softmerge" dir="ltr" colSpan={2}>
              <div
                className="softmerge-inner"
                style={{ width: "190px", left: "-1px" }}
              >
                Cantidad total de días:
              </div>
            </td>
            <td className="s16" dir="ltr" colSpan="2">
              {data.dias_computables}
            </td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s17" dir="ltr">
              Alojamiento
            </td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11" dir="ltr">
              Convenio
            </td>
            <td className="s18" dir="ltr" colSpan="2">
              {formatCurrency(data.gasto_alojamiento)}
            </td>
          </tr>
          <tr style={{ height: "8px" }}>
            <td className="s11" dir="ltr"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s13 softmerge" dir="ltr" colSpan={4}>
              <div
                className="softmerge-inner"
                style={{ width: "190px", left: "-1px" }}
              >
                Anticipo de viáticos
              </div>
            </td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s18" dir="ltr" colSpan="2">
              {formatCurrency(subtotalViaticos)}
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s19 softmerge" dir="ltr" colSpan={8}>
              <div className="softmerge-inner">
                {data.dias_computables} días de viáticos a razón de ${" "}
                {formatCurrency(data.valorDiarioCalc)} diarios -equivalentes al
                100% del viático diario
              </div>
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s19 softmerge" dir="ltr" colSpan={6}>
              <div
                className="softmerge-inner"
                style={{ width: "659px", left: "-1px" }}
              >
                Corresponde abonar 30% de incremento en virtud de zona y período
                específico .......
              </div>
            </td>

            <td className="s20 softmerge" dir="ltr">
              <div
                className="softmerge-inner"
                style={{ width: "161px", left: "-1px" }}
              >
                {renderCheck(data.es_temporada_alta)}
              </div>
            </td>
            <td className="s14" dir="ltr"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s13 softmerge" colSpan={7} dir="ltr">
              <div
                className="softmerge-inner"
                style={{ width: "447px", left: "-1px" }}
              >
                Medio de movilidad (marcar con x de corresponder)
              </div>
            </td>

            <td className="s11"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s5" dir="ltr">
              -Pasajes
            </td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s21" dir="ltr" colSpan="2">
              {formatCurrency(data.gasto_pasajes)}
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s5" dir="ltr">
              {" "}
              -aéreos
            </td>
            <td className="s18 softmerge" dir="ltr">
              <div
                className="softmerge-inner"
                style={{ width: "43px", left: "-1px" }}
              >
                {checkAereo}
              </div>
            </td>
            <td className="s5" dir="ltr">
              {" "}
              -terrestres
            </td>
            <td className="s18" dir="ltr">
              {checkTerrestre}
            </td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11" dir="ltr"></td>
            <td className="s11"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s1 softmerge" dir="ltr" colSpan={3}>
              <div
                className="softmerge-inner"
                style={{ width: "296px", left: "-1px" }}
              >
                Vehículo: -oficial Patente Nro
              </div>
            </td>
            <td className="s23" dir="ltr">
              {data.patente_oficial}
            </td>
            <td className="s24 softmerge" dir="ltr">
              <div
                className="softmerge-inner"
                style={{ width: "100px", left: "-1px" }}
              >
                {checkPatenteOficial}
              </div>
            </td>
            <td className="s14"></td>
            <td className="s14"></td>
            <td className="s11"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s1 softmerge" dir="ltr" colSpan={3}>
              <div
                className="softmerge-inner"
                style={{ width: "296px", left: "-1px" }}
              >
                -particular Patente Nro
              </div>
            </td>
            <td className="s23" dir="ltr">
              {data.patente_particular}
            </td>
            <td className="s24 softmerge" dir="ltr">
              <div
                className="softmerge-inner"
                style={{ width: "100px", left: "-1px" }}
              >
                {checkPatenteParticular}
              </div>
            </td>
            <td className="s14"></td>
            <td className="s14"></td>
            <td className="s11"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s1 softmerge" dir="ltr">
              <div
                className="softmerge-inner"
                style={{ width: "190px", left: "-1px", fontSize: "14px" }}
                colSpan={2}
              >
                Otro (indicar medio)
              </div>
            </td>
            <td className="s23" dir="ltr">
              {checkOtros}
            </td>
            <td className="s25" dir="ltr"></td>
            <td className="s25" dir="ltr"></td>
            <td className="s25" dir="ltr"></td>
            <td className="s25" dir="ltr"></td>
            <td className="s15" dir="ltr" colSpan="2">
              {formatCurrency(data.transporte_otros)}
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s13 softmerge" dir="ltr" colSpan={3}>
              <div
                className="softmerge-inner"
                style={{ width: "190px", left: "-1px" }}
              >
                Gastos de combustible
              </div>
            </td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s15" dir="ltr" colSpan="2">
              {formatCurrency(data.gasto_combustible)}
            </td>
          </tr>
          <tr style={{ height: "13px" }}>
            <td className="s25" dir="ltr"></td>
            <td className="s25" dir="ltr"></td>
            <td className="s25" dir="ltr"></td>
            <td className="s25" dir="ltr"></td>
            <td className="s25" dir="ltr"></td>
            <td className="s25" dir="ltr"></td>
            <td className="s26" dir="ltr"></td>
            <td className="s26" dir="ltr"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s25" dir="ltr">
              <span
                style={{
                  fontWeight: "bold",
                  textDecoration: "underline",
                }}
              >
                Otros gastos
              </span>
            </td>
            <td className="s25" dir="ltr" colSpan="5">
              (lubricantes, peaje, repuestos, etc.) -
            </td>
            <td className="s15" dir="ltr" colSpan="2">
              {formatCurrency(data.gasto_otros)}
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s27 softmerge" dir="ltr" colSpan={6}>
              <div
                className="softmerge-inner"
                style={{ width: "447px", left: "-1px" }}
              >
                Artículo 13º del Anexo del DECTO-2025-867-E-GDERNE-RNE
              </div>
            </td>
            <td className="s26"></td>
            <td className="s26"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s13 softmerge" dir="ltr" colSpan={6}>
              <div
                className="softmerge-inner"
                style={{ width: "553px", left: "-1px" }}
              >
                Gastos Artículo 11º del Anexo del DECTO-2025-867-E-GDERNE-RNE:
              </div>
            </td>
            <td className="s26" dir="ltr" colSpan="2"></td>
          </tr>
          <tr style={{ height: "10px" }}>
            <td className="s17" dir="ltr"></td>
            <td className="s11"></td>
            <td className="s11" dir="ltr"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s26" dir="ltr"></td>
            <td className="s26" dir="ltr"></td>
          </tr>
          <tr style={{ height: "26px" }}>
            <td className="s13 softmerge" dir="ltr" colSpan={6}>
              <div
                className="softmerge-inner"
                style={{ width: "190px", left: "-1px" }}
              >
                <span style={{ fontWeight: "normal" }}>• </span>
                <span style={{ fontWeight: "normal" }}>
                  Gastos de capacitación
                </span>
              </div>
            </td>
            <td className="s15" dir="ltr" colSpan="2">
              {formatCurrency(data.gastos_capacit)}
            </td>
          </tr>
          <tr style={{ height: "8px" }}>
            <td className="s17" dir="ltr"></td>
            <td className="s11"></td>
            <td className="s11" dir="ltr"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s26" dir="ltr"></td>
            <td className="s26" dir="ltr"></td>
          </tr>
          <tr style={{ height: "26px" }}>
            <td className="s13 softmerge" dir="ltr" colSpan={6}>
              <div
                className="softmerge-inner"
                style={{ width: "553px", left: "-1px" }}
              >
                <span style={{ fontWeight: "normal" }}>• </span>
                <span style={{ fontWeight: "normal" }}>
                  Gastos por servicio de Ceremonial
                </span>
                <span style={{ fontWeight: "normal" }}>
                  {" "}
                  (solo titular del organismo)
                </span>
              </div>
            </td>

            <td className="s15" dir="ltr" colSpan="2"></td>
          </tr>
          <tr style={{ height: "11px" }}>
            <td className="s11" dir="ltr"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s26" dir="ltr"></td>
            <td className="s26" dir="ltr"></td>
          </tr>
          <tr style={{ height: "26px" }}>
            <td className="s19 softmerge" dir="ltr" colSpan={6}>
              <div
                className="softmerge-inner"
                style={{ width: "553px", left: "-1px" }}
              >
                <span
                  style={{
                    fontWeight: "bold",
                    textDecoration: "underline",
                  }}
                >
                  Otros gastos de movilidad
                </span>{" "}
                (Artículo 14° del Anexo del Decreto N° 1847/17
              </div>
            </td>
            <td className="s15" dir="ltr" colSpan="2">
              {formatCurrency(data.gastos_movil_otros)}
            </td>
          </tr>
          <tr style={{ height: "16px" }}>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s26" dir="ltr"></td>
            <td className="s26"></td>
          </tr>
          <tr style={{ height: "26px" }}>
            <td className="s17" colSpan={6} dir="ltr">
              Total del Anticipo:
            </td>

            <td className="s15" dir="ltr" colSpan="2">
              {formatCurrency(data.totalFinal)}
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s19 softmerge" colSpan={8} dir="ltr">
              <div
                className="softmerge-inner"
                style={{ width: "765px", left: "-1px" }}
              >
                Autorizo al descuento en mi recibo de haberes sobre las sumas
                pendientes de rendición y/o devolución
              </div>
            </td>
          </tr>
          <tr style={{ height: "115px" }}>
            <td
              className="s34"
              colSpan={4}
              rowSpan={2}
              style={{
                verticalAlign: "center",
                textAlign: "center", // Alineación horizontal clásica
                height: "80px", // Asegura que ocupe el alto de las 4 filas (20px * 4)
              }}
            >
              {data.firma === "NULL" ? (
                <span></span>
              ) : data.firma ? (
                <img
                  src={data.firma}
                  alt="Firma Agente"
                  style={{
                    maxHeight: "120px", // Ajustado para no desbordar las 4 filas de 20px
                    objectFit: "contain",
                  }}
                />
              ) : (
                <span style={{ color: "#ccc", fontSize: "10pt" }}>
                  {data.apellido?.toUpperCase()}, {data.nombre?.toUpperCase()}
                </span>
              )}
            </td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
          </tr>
          <tr style={{ height: "45px" }}>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s11" colSpan="3"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s28" dir="ltr" colSpan="3">
              Firma del agente
            </td>
            <td className="s28"></td>
            <td className="s29"></td>
            <td className="s28" dir="ltr" colSpan="3">
              Firma del titular de la jurisdicción o funcionario autorizado
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s13 softmerge" dir="ltr" colSpan={3}>
              <div
                className="softmerge-inner"
                style={{ width: "296px", left: "-1px" }}
              >
                Lugar y fecha de solicitud
              </div>
            </td>
            <td className="s14"></td>
            <td className="s11" dir="ltr" colSpan="4">
              {localidadMusico}, {fechaActualTexto}
            </td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
            <td className="s11"></td>
          </tr>
          <tr style={{ height: "20px" }}>
            <td className="s30" dir="ltr" colSpan="8" rowSpan="2">
              1 Indicar el Nº de Resolución que delegó la facultad para
              autorización de las comisiones oficiales, en un funcionario con
              rango no inferior a Subsecretario, de conformidad con lo dispuesto
              por el artículo 3º del Anexo del DECTO-2025-867-E-GDERNE-RNE.
            </td>
          </tr>
          <tr style={{ height: "20px" }}></tr>
        </tbody>
      </table>
    </div>
  );
  return (
    <div
      className={`w-full h-full flex flex-col font-sans ${
        hideToolbar ? "bg-white" : "bg-slate-100"
      }`}
    >
      {!hideToolbar && (
        <div className="bg-white p-4 shadow-sm border-b border-slate-200 flex justify-between items-center print:hidden sticky top-0 z-50">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-medium transition-colors"
          >
            <IconArrowLeft size={20} /> Volver
          </button>
          <button
            onClick={() => window.print()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <IconPrinter size={20} /> Imprimir
          </button>
        </div>
      )}

      {/* CLASE PRINCIPAL DEL WRAPPER: Controlada por CSS print */}
      <div
        className={`viaticos-wrapper print:p-0 print:bg-white print:overflow-visible ${
          hideToolbar ? "p-0 bg-white items-start overflow-visible" : ""
        }`}
      >
        <div
          id="target-pdf-content"
          className={`viaticos-sheet print:shadow-none print:m-0 print:p-0 ${
            hideToolbar ? "shadow-none m-0" : ""
          }`}
          style={{
            margin: 0,
            padding: 0,
            height: "100%",
            backgroundColor: "white",
          }}
        >
          <SheetContent />
        </div>
      </div>
    </div>
  );
}
